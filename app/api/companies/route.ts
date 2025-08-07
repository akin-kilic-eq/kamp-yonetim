import Company from '@/app/models/Company';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Şirketleri getir
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site');
    
    let query: any = {};
    
    // Şantiye filtresi
    if (site) {
      query.site = site;
    }
    
    const companies = await Company.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'email');
    
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Şirketler getirme hatası:', error);
    return NextResponse.json(
      { error: 'Şirketler getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni şirket ekle
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, site, userEmail } = body;
    
    // Zorunlu alanları kontrol et
    if (!name || !site || !userEmail) {
      return NextResponse.json(
        { error: 'Şirket adı ve şantiye bilgisi zorunludur' },
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
    
    const newCompany = new Company({
      name,
      description,
      site,
      createdBy: user._id
    });
    
    await newCompany.save();
    
    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error('Şirket ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Şirket eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
