import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Camp from '@/app/models/Camp';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    const { userEmail } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Kullanıcı email gerekli' }, { status: 400 });
    }

    await connectDB();

    // Kullanıcının yetkisini kontrol et
    const user = await User.findOne({ email: userEmail });
    if (!user || !['kurucu_admin', 'merkez_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Şantiye alanı boş olan tüm kampları bul
    const campsWithoutSite = await Camp.find({ 
      $or: [
        { site: { $exists: false } },
        { site: null },
        { site: '' }
      ]
    });

    let updatedCount = 0;
    let errors = [];

    // Her kamp için oluşturan kullanıcının şantiyesini al ve kampa ata
    for (const camp of campsWithoutSite) {
      try {
        const campOwner = await User.findOne({ email: camp.userEmail });
        
        if (campOwner && campOwner.site) {
          await Camp.findByIdAndUpdate(camp._id, { site: campOwner.site });
          updatedCount++;
        } else {
          errors.push(`Kamp: ${camp.name} - Kullanıcı şantiye bilgisi bulunamadı: ${camp.userEmail}`);
        }
      } catch (error) {
        errors.push(`Kamp: ${camp.name} - Güncelleme hatası: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount} kamp güncellendi`,
      updatedCount,
      totalCamps: campsWithoutSite.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Kamp şantiye düzeltme hatası:', error);
    return NextResponse.json(
      { error: 'Kamp şantiye alanları düzeltilirken hata oluştu' },
      { status: 500 }
    );
  }
} 