import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Worker from '@/app/models/Worker';
import Room from '@/app/models/Room';
import Camp from '@/app/models/Camp';
import mongoose from 'mongoose';

// Yetki kontrolü için yardımcı fonksiyon
async function checkWritePermission(campId: string, userEmail: string): Promise<boolean> {
  const camp = await Camp.findById(campId);
  if (!camp) return false;

  if (camp.userEmail === userEmail) {
    return true;
  }

  return camp.sharedWith.some(
    (share: { email: string; permission: string }) =>
      share.email === userEmail && share.permission === 'write'
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campId = searchParams.get('campId');
    const roomId = searchParams.get('roomId');

    await connectDB();

    let query: any = {};
    
    if (roomId) {
      // Belirli bir odadaki işçileri getir
      query.roomId = new mongoose.Types.ObjectId(roomId);
    } else if (campId) {
      // Kamp bazlı işçileri getir
      const rooms = await Room.find({ campId: new mongoose.Types.ObjectId(campId) });
      const roomIds = rooms.map(room => room._id);
      query.roomId = { $in: roomIds };
    }

    const workers = await Worker.find(query).populate('roomId', 'number project');
    return NextResponse.json(workers);
  } catch (error) {
    console.error('Workers GET error:', error);
    return NextResponse.json(
      { error: 'İşçiler getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, surname, registrationNumber, project, roomId, campId, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();

    const hasPermission = await checkWritePermission(campId, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Oda kontrolü
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Oda bulunamadı' },
        { status: 404 }
      );
    }

    // Kamp kontrolü
    if (room.campId.toString() !== campId) {
      return NextResponse.json(
        { error: 'Oda bu kampa ait değil' },
        { status: 400 }
      );
    }

    // Boş yatak kontrolü
    if (room.availableBeds <= 0) {
      return NextResponse.json(
        { error: 'Bu odada boş yatak bulunmamaktadır' },
        { status: 400 }
      );
    }

    // Kayıt numarası kontrolü - sadece kullanıcının kendi kamplarında kontrol et
    // Kullanıcının sahip olduğu kampları bul
    const userCamps = await Camp.find({
      $or: [
        { userEmail: userEmail }, // Kendi oluşturduğu kamplar
        { 'sharedWith.email': userEmail } // Paylaşıldığı kamplar
      ]
    });
    
    const userCampIds = userCamps.map(camp => camp._id);
    
    // Kullanıcının kamplarındaki odaları bul
    const userRooms = await Room.find({ campId: { $in: userCampIds } });
    const userRoomIds = userRooms.map(room => room._id);
    
    // Sadece kullanıcının kamplarındaki işçiler arasında sicil numarası kontrolü yap
    const existingWorker = await Worker.findOne({
      registrationNumber,
      roomId: { $in: userRoomIds }
    });
    
    if (existingWorker) {
      return NextResponse.json(
        { error: 'Bu kayıt numarası zaten kullanımda' },
        { status: 400 }
      );
    }

    const worker = await Worker.create({
      name,
      surname,
      registrationNumber,
      project,
      roomId,
      campId,
      entryDate: new Date()
    });

    // Odayı güncelle
    await Room.findByIdAndUpdate(roomId, {
      $push: { workers: worker._id },
      $inc: { availableBeds: -1 }
    });

    const populatedWorker = await Worker.findById(worker._id).populate('roomId', 'number');
    return NextResponse.json(populatedWorker);
  } catch (error) {
    console.error('Worker POST error:', error);
    return NextResponse.json(
      { error: 'İşçi oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { _id, name, surname, registrationNumber, project, roomId, campId, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();

    const hasPermission = await checkWritePermission(campId, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Önce mevcut işçiyi bul
    const oldWorker = await Worker.findById(_id);
    if (!oldWorker) {
      return NextResponse.json(
        { error: 'İşçi bulunamadı' },
        { status: 404 }
      );
    }

    const oldRoomId = oldWorker.roomId?.toString();
    const newRoomId = roomId;

    // Sadece yeni bir roomId gönderildiyse oda değiştirme işlemini yap
    if (newRoomId && oldRoomId !== newRoomId) {
      // Yeni oda kontrolü
      const newRoom = await Room.findById(newRoomId);
      if (!newRoom) {
        return NextResponse.json(
          { error: 'Yeni oda bulunamadı' },
          { status: 404 }
        );
      }

      // Kamp kontrolü
      if (newRoom.campId.toString() !== campId) {
        return NextResponse.json(
          { error: 'Yeni oda bu kampa ait değil' },
          { status: 400 }
        );
      }

      if (newRoom.availableBeds <= 0) {
        return NextResponse.json(
          { error: 'Yeni odada boş yatak bulunmamaktadır' },
          { status: 400 }
        );
      }

      // Eski odadan çıkar
      await Room.findByIdAndUpdate(oldRoomId, {
        $pull: { workers: _id },
        $inc: { availableBeds: 1 }
      });

      // Yeni odaya ekle
      await Room.findByIdAndUpdate(newRoomId, {
        $push: { workers: _id },
        $inc: { availableBeds: -1 }
      });
    }

    // İşçiyi güncellemek için veri objesi oluştur
    const updateData: any = { name, surname, registrationNumber, project };
    if (newRoomId) {
      updateData.roomId = newRoomId;
    }

    // Sicil numarası kontrolü - sadece kullanıcının kendi kamplarında kontrol et (mevcut işçi hariç)
    // Kullanıcının sahip olduğu kampları bul
    const userCamps = await Camp.find({
      $or: [
        { userEmail: userEmail }, // Kendi oluşturduğu kamplar
        { 'sharedWith.email': userEmail } // Paylaşıldığı kamplar
      ]
    });
    
    const userCampIds = userCamps.map(camp => camp._id);
    
    // Kullanıcının kamplarındaki odaları bul
    const userRooms = await Room.find({ campId: { $in: userCampIds } });
    const userRoomIds = userRooms.map(room => room._id);
    
    // Sadece kullanıcının kamplarındaki işçiler arasında sicil numarası kontrolü yap (mevcut işçi hariç)
    const existingWorker = await Worker.findOne({
      registrationNumber,
      roomId: { $in: userRoomIds },
      _id: { $ne: _id } // Mevcut işçiyi hariç tut
    });
    
    if (existingWorker) {
      return NextResponse.json(
        { error: 'Bu kayıt numarası zaten kullanımda' },
        { status: 400 }
      );
    }

    // İşçiyi güncelle
    const worker = await Worker.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    ).populate('roomId', 'number');

    return NextResponse.json(worker);
  } catch (error) {
    console.error('Worker PUT error:', error);
    return NextResponse.json(
      { error: 'İşçi güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { _id, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();

    // İşçiyi bul
    const worker = await Worker.findById(_id);
    if (!worker) {
      return NextResponse.json(
        { error: 'İşçi bulunamadı' },
        { status: 404 }
      );
    }
    
    // İşçinin ait olduğu kampı bul ve yetkiyi kontrol et
    const room = await Room.findById(worker.roomId);
    if (room) {
        const hasPermission = await checkWritePermission(room.campId, userEmail);
        if (!hasPermission) {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
        }
    } else {
        // Oda bilgisi olmayan bir işçi silinemez veya yetki kontrolü yapılamaz
        return NextResponse.json({ error: 'İşçinin oda ataması bulunamadığından silinemedi.'}, { status: 400 });
    }

    // İşçiyi sil
    await Worker.findByIdAndDelete(_id);

    // Odayı güncelle
    if (worker.roomId) {
      await Room.findByIdAndUpdate(worker.roomId, {
        $pull: { workers: _id },
        $inc: { availableBeds: 1 }
      });
    }

    return NextResponse.json({ message: 'İşçi başarıyla silindi' });
  } catch (error) {
    console.error('Worker DELETE error:', error);
    return NextResponse.json(
      { error: 'İşçi silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 