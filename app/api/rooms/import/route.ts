import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import Room from '@/app/models/Room';
import Camp from '@/app/models/Camp';
import User from '@/app/models/User';

// Yardımcı fonksiyon: Yazma iznini kontrol et
async function checkWritePermission(userEmail: string, campId: string): Promise<boolean> {
  const camp = await Camp.findById(campId);
  if (!camp) return false;

  const isOwner = camp.userEmail === userEmail;
  const hasWritePermission = camp.sharedWith?.some(
    (share: { email: string; permission: string }) => 
      share.email === userEmail && share.permission === 'write'
  );

  if (isOwner || hasWritePermission) {
    return true;
  }

  // Kurucu admin ve merkez admin için tam yetki
  const user = await User.findOne({ email: userEmail });
  if (user && (user.role === 'kurucu_admin' || user.role === 'merkez_admin')) {
    return true;
  }

  // Şantiye admini kontrolü - kendi şantiyesindeki user'ların kamplarını düzenleyebilir
  if (user && user.role === 'santiye_admin' && user.site) {
    // Kamp sahibinin şantiye bilgisini kontrol et
    const campOwner = await User.findOne({ email: camp.userEmail });
    if (campOwner && campOwner.site === user.site) {
      return true; // Aynı şantiyedeki user'ın kampı
    }
  }
  
  // User rolündeki kullanıcılar için şantiye erişim yetkisi ve izin kontrolü
  if (user && user.role === 'user') {
    if (camp.userEmail === userEmail) {
      return true; // Kendi kampında tam yetki
    } else if (user.siteAccessApproved && user.sitePermissions?.canEditCamps && user.site) {
      const campOwner = await User.findOne({ email: camp.userEmail });
      if (campOwner && campOwner.site === user.site) {
        return true; // Şantiye erişim yetkisi ve düzenleme izni varsa
      }
    }
    return false; // Diğer durumlarda sadece görüntüleme
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const { campId, rooms, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const hasPermission = await checkWritePermission(userEmail, campId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Yazma izniniz bulunmuyor' }, { status: 403 });
    }

    if (!campId || !rooms || !Array.isArray(rooms)) {
      return NextResponse.json(
        { error: 'Geçersiz veri formatı' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const totalRooms = rooms.length;

    for (let i = 0; i < rooms.length; i++) {
      const roomData = rooms[i];
      
      try {
        console.log(`Processing room ${i + 1}/${totalRooms}:`, roomData);

        // Gerekli alanların kontrolü
        if (!roomData['Oda No'] || !roomData['Şantiyesi'] || !roomData['Kapasite']) {
          results.failed++;
          results.errors.push(`Satır ${i + 2}: 'Oda No', 'Şantiyesi' ve 'Kapasite' sütunları zorunludur.`);
          continue;
        }

        const roomNumber = roomData['Oda No'].toString();
        const project = roomData['Şantiyesi'];
        const capacity = parseInt(roomData['Kapasite']);

        if (isNaN(capacity) || capacity < 1) {
            results.failed++;
            results.errors.push(`Oda No ${roomNumber}: Geçersiz kapasite değeri: ${roomData['Kapasite']}`);
            continue;
        }

        // Mevcut odayı bul
        const existingRoom = await Room.findOne({
          campId,
          number: roomNumber,
          project: project
        });

        if (existingRoom) {
          // Mevcut odayı güncelle
          const currentWorkersCount = existingRoom.workers?.length || 0;
          if (capacity < currentWorkersCount) {
            results.failed++;
            results.errors.push(`Oda No ${roomNumber}: Yeni kapasite (${capacity}), mevcut işçi sayısından (${currentWorkersCount}) az olamaz.`);
            continue;
          }
          existingRoom.capacity = capacity;
          existingRoom.availableBeds = capacity - currentWorkersCount;
          
          await existingRoom.save();
          results.success++;
        } else {
          // Yeni oda oluştur
          const newRoom = new Room({
            campId,
            number: roomNumber,
            capacity: capacity,
            project: project,
            company: 'Slava', // Bu bilgi kamp modelinden alınabilir
            workers: [],
            availableBeds: capacity
          });

          await newRoom.save();
          results.success++;
        }
        
        // Her 3 odada bir console'a ilerleme yazdır
        if ((i + 1) % 3 === 0 || i === totalRooms - 1) {
          const progress = Math.round(((i + 1) / totalRooms) * 100);
          console.log(`Import progress: ${progress}% (${i + 1}/${totalRooms})`);
        }
        
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Oda No ${roomData['Oda No'] || 'Bilinmeyen'}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: `${results.success} oda başarıyla işlendi (eklendi/güncellendi), ${results.failed} oda hatalı.`,
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Bir hata oluştu' },
      { status: 500 }
    );
  }
} 