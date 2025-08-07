import JobTitle from '@/app/models/JobTitle';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Görev tanımlarını getir
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
    
    const jobTitles = await JobTitle.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'email');
    
    return NextResponse.json(jobTitles);
  } catch (error) {
    console.error('Görev tanımları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Görev tanımları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni görev tanımı ekle
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { title, description, site, userEmail } = body;
    
    // Zorunlu alanları kontrol et
    if (!title || !site || !userEmail) {
      return NextResponse.json(
        { error: 'Görev tanımı ve şantiye bilgisi zorunludur' },
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
    
    const newJobTitle = new JobTitle({
      title,
      description,
      site,
      createdBy: user._id
    });
    
    await newJobTitle.save();
    
    return NextResponse.json(newJobTitle, { status: 201 });
  } catch (error) {
    console.error('Görev tanımı ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Görev tanımı eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
