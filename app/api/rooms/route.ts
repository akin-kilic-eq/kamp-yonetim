import Worker from '@/app/models/Worker';
import Room from '@/app/models/Room';
import Camp from '@/app/models/Camp';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import mongoose from 'mongoose';

async function checkWritePermission(campId: string, userEmail: string): Promise<boolean> {
  const camp = await Camp.findById(campId);
  if (!camp) return false; // Kamp bulunamadı

  // Kullanıcı kampın sahibi mi?
  if (camp.userEmail === userEmail) {
    return true;
  }

  // Kullanıcının paylaşım listesinde yazma izni var mı?
  const hasPermission = camp.sharedWith.some(
    (share: { email: string; permission: string }) =>
      share.email === userEmail && share.permission === 'write'
  );

  if (hasPermission) {
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campId = searchParams.get('campId');
    console.log('API/ROOMS campId:', campId);

    await connectDB();

    // Aggregate pipeline ile tek sorguda tüm verileri çek
    const roomsWithCounts = await Room.aggregate([
      { $match: { campId: new mongoose.Types.ObjectId(campId!) } },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: 'roomId',
          as: 'workers'
        }
      },
      {
        $addFields: {
          occupancy: { $size: '$workers' },
          availableBeds: { $subtract: ['$capacity', { $size: '$workers' }] }
        }
      },
      {
        $project: {
          _id: 1,
          number: 1,
          capacity: 1,
          company: 1,
          project: 1,
          availableBeds: 1,
          workers: 1,
          occupancy: 1,
          campId: 1,
          createdAt: 1
        }
      }
    ]);

    return NextResponse.json(roomsWithCounts);
  } catch (error) {
    console.error('API/ROOMS GET ERROR:', error);
    return NextResponse.json(
      { error: 'Odalar getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { number, capacity, company, project, campId, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();
    
    const hasPermission = await checkWritePermission(campId, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Kamp kontrolü
    const camp = await Camp.findById(campId);
    if (!camp) {
      return NextResponse.json(
        { error: 'Kamp bulunamadı' },
        { status: 404 }
      );
    }

    // Oda numarası kontrolü - kamptaki tüm odalarda aynı numara var mı?
    const existingRoom = await Room.findOne({ 
      number: number.trim(),
      campId
    });
    
    if (existingRoom) {
      return NextResponse.json(
        { error: 'Bu oda numarası zaten kullanımda' },
        { status: 400 }
      );
    }

    const room = await Room.create({
      number: number.trim(),
      capacity,
      company,
      project,
      availableBeds: capacity,
      workers: [],
      campId
    });

    // Kampın odalar listesine ekle
    await Camp.findByIdAndUpdate(campId, {
      $push: { rooms: room._id }
    });

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { error: 'Oda oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { _id, number, capacity, company, project, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    
    await connectDB();

    // Mevcut odayı bul ve kampId'sini al
    const currentRoom = await Room.findById(_id);
    if (!currentRoom) {
      return NextResponse.json(
        { error: 'Oda bulunamadı' },
        { status: 404 }
      );
    }
    
    const hasPermission = await checkWritePermission(currentRoom.campId, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Eğer oda numarası değiştiyse, aynı numaralı başka oda var mı kontrol et
    if (number.trim() !== currentRoom.number) {
      const existingRoom = await Room.findOne({
        _id: { $ne: _id }, // kendisi hariç
        number: number.trim(),
        campId: currentRoom.campId
      });

      if (existingRoom) {
        return NextResponse.json(
          { error: 'Bu oda numarası zaten kullanımda' },
          { status: 400 }
        );
      }
    }

    // Kapasite değişikliği varsa, mevcut işçi sayısını kontrol et
    if (capacity !== currentRoom.capacity) {
      const currentWorkerCount = await Worker.countDocuments({ roomId: _id });
      if (capacity < currentWorkerCount) {
        return NextResponse.json(
          { error: `Kapasite ${currentWorkerCount} işçiden az olamaz. Odada ${currentWorkerCount} işçi bulunuyor.` },
          { status: 400 }
        );
      }
    }

    // Yeni availableBeds değerini hesapla
    const currentWorkerCount = await Worker.countDocuments({ roomId: _id });
    const newAvailableBeds = capacity - currentWorkerCount;

    const room = await Room.findByIdAndUpdate(
      _id,
      { 
        number: number.trim(), 
        capacity, 
        company, 
        project, 
        availableBeds: newAvailableBeds
      },
      { new: true }
    ).populate('workers');

    return NextResponse.json(room);
  } catch (error) {
    console.error('Oda güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Oda güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { _id, campId, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();

    const hasPermission = await checkWritePermission(campId, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Odayı bul
    const room = await Room.findById(_id);
    if (!room) {
      return NextResponse.json(
        { error: 'Oda bulunamadı' },
        { status: 404 }
      );
    }

    // Odadaki işçileri sil
    await Worker.deleteMany({ roomId: _id });

    // Odayı sil
    await Room.findByIdAndDelete(_id);

    // Kampın odalar listesinden çıkar
    await Camp.findByIdAndUpdate(campId, {
      $pull: { rooms: _id }
    });

    return NextResponse.json({ message: 'Oda ve içindeki işçiler başarıyla silindi' });
  } catch (error) {
    console.error('Oda silme hatası:', error);
    return NextResponse.json(
      { error: 'Oda silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 