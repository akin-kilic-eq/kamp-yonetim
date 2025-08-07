import Company from '@/app/models/Company';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Şirketi güncelle
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
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
    
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        name,
        description,
        site,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedCompany) {
      return NextResponse.json(
        { error: 'Şirket bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Şirket güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Şirket güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Şirketi sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const deletedCompany = await Company.findByIdAndDelete(id);
    
    if (!deletedCompany) {
      return NextResponse.json(
        { error: 'Şirket bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Şirket başarıyla silindi' });
  } catch (error) {
    console.error('Şirket silme hatası:', error);
    return NextResponse.json(
      { error: 'Şirket silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
