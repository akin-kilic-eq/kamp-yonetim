import JobTitle from '@/app/models/JobTitle';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Tüm görev tanımlarını sil
export async function DELETE(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site');
    
    if (!site) {
      return NextResponse.json(
        { error: 'Şantiye bilgisi zorunludur' },
        { status: 400 }
      );
    }
    
    // Şantiyeye ait tüm görev tanımlarını sil
    const result = await JobTitle.deleteMany({ site });
    
    return NextResponse.json({
      message: `${result.deletedCount} görev tanımı başarıyla silindi`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Görev tanımları toplu silme hatası:', error);
    return NextResponse.json(
      { error: 'Görev tanımları silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
