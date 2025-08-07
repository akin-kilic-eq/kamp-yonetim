import Personnel from '@/app/models/Personnel';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Personel listesini getir
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const site = searchParams.get('site');
    const unknownSite = searchParams.get('unknownSite');
    
    console.log('API Debug - Site:', site);
    console.log('API Debug - Status:', status);
    console.log('API Debug - Search:', search);
    console.log('API Debug - UnknownSite:', unknownSite);
    
    let query: any = {};
    
    // Şantiye filtresi (personel admin ve user için)
    if (site) {
      query.site = site;
    }
    
    // Bilinmeyen şantiye için site alanı boş olan personeli getir
    if (unknownSite === 'true') {
      query.$or = [
        { site: { $exists: false } },
        { site: null },
        { site: '' },
        { site: { $regex: /^\s*$/ } } // Sadece boşluk karakterleri
      ];
    }
    
    // Durum filtresi
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Arama filtresi
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { passportNumber: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('API Debug - Final Query:', query);
    
    const personnel = await Personnel.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'email');
    
    console.log('API Debug - Found Personnel Count:', personnel.length);
    console.log('API Debug - First Personnel Sample:', personnel[0]);
    
    const response = NextResponse.json(personnel);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Personel listesi getirme hatası:', error);
    return NextResponse.json(
      { error: 'Personel listesi getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni personel ekle
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      firstName,
      lastName,
      employeeId,
      passportNumber,
      country,
      hireDate,
      jobTitle,
      company,
      userEmail
    } = body;
    
    // Zorunlu alanları kontrol et
    if (!firstName || !lastName || !employeeId || !passportNumber || !country || !hireDate || !jobTitle || !company || !userEmail) {
      return NextResponse.json(
        { error: 'Tüm zorunlu alanlar doldurulmalıdır' },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı bul
    const User = (await import('@/app/models/User')).default;
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    // Sicil numarası ve pasaport numarası benzersizlik kontrolü (şantiye bazında)
    const existingEmployee = await Personnel.findOne({
      site: user.site,
      $or: [
        { employeeId: employeeId },
        { passportNumber: passportNumber }
      ]
    });
    
    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Bu sicil numarası veya pasaport numarası bu şantiyede zaten kullanılıyor' },
        { status: 400 }
      );
    }
    
    console.log('API Debug - User Site:', user.site);
    console.log('API Debug - User ID:', user._id);
    
    // Tarih validasyonu ve dönüşümü
    let parsedHireDate;
    try {
      // Türkçe tarih formatını parse et (dd.mm.yyyy)
      if (typeof hireDate === 'string' && hireDate.includes('.')) {
        const [day, month, year] = hireDate.split('.');
        parsedHireDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsedHireDate = new Date(hireDate);
      }
      
      // Geçerli tarih kontrolü (gelecek tarihler de kabul edilir)
      if (isNaN(parsedHireDate.getTime())) {
        return NextResponse.json(
          { error: 'Geçersiz tarih formatı. Lütfen dd.mm.yyyy formatında girin' },
          { status: 400 }
        );
      }
      
      // Gelecek tarih uyarısı (isteğe bağlı)
      const today = new Date();
      if (parsedHireDate > today) {
        console.log('Uyarı: Gelecek tarih girildi:', parsedHireDate);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Tarih dönüştürme hatası' },
        { status: 400 }
      );
    }

    const newPersonnel = new Personnel({
      firstName,
      lastName,
      employeeId,
      passportNumber,
      country,
      hireDate: parsedHireDate,
      jobTitle,
      company,
      site: user.site, // Kullanıcının şantiyesini ekle
      createdBy: user._id
    });
    
    console.log('API Debug - New Personnel Object:', newPersonnel);
    
    await newPersonnel.save();
    
    console.log('API Debug - Personnel Saved Successfully');
    
    return NextResponse.json(newPersonnel, { status: 201 });
  } catch (error) {
    console.error('Personel ekleme hatası:', error);
    
    // MongoDB duplicate key error kontrolü
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return NextResponse.json(
        { error: `${field} alanı için "${value}" değeri zaten kullanılıyor` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Personel eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Tüm personeli sil (şantiye bazında)
export async function DELETE(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site');
    
    if (!site) {
      return NextResponse.json(
        { error: 'Şantiye bilgisi gerekli' },
        { status: 400 }
      );
    }
    
    const result = await Personnel.deleteMany({ site });
    
    return NextResponse.json({
      message: 'Tüm personel başarıyla silindi',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Personel silme hatası:', error);
    return NextResponse.json(
      { error: 'Personel silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
