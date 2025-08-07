import JobTitle from '@/app/models/JobTitle';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Görev tanımını güncelle
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
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
    
    const updatedJobTitle = await JobTitle.findByIdAndUpdate(
      id,
      {
        title,
        description,
        site,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedJobTitle) {
      return NextResponse.json(
        { error: 'Görev tanımı bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedJobTitle);
  } catch (error) {
    console.error('Görev tanımı güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Görev tanımı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Görev tanımını sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const deletedJobTitle = await JobTitle.findByIdAndDelete(id);
    
    if (!deletedJobTitle) {
      return NextResponse.json(
        { error: 'Görev tanımı bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Görev tanımı başarıyla silindi' });
  } catch (error) {
    console.error('Görev tanımı silme hatası:', error);
    return NextResponse.json(
      { error: 'Görev tanımı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
