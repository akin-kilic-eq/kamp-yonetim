import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Worker from '@/app/models/Worker';
import Room from '@/app/models/Room';
import mongoose from 'mongoose';

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
    const { name, surname, registrationNumber, project, roomId, campId } = await request.json();

    await connectDB();

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

    // Kayıt numarası kontrolü
    const existingWorker = await Worker.findOne({ registrationNumber });
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
    const { _id, name, surname, registrationNumber, project, roomId, campId } = await request.json();

    await connectDB();

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

    // Eğer oda değiştiyse, eski ve yeni odaları güncelle
    if (oldRoomId && oldRoomId !== newRoomId) {
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

    // İşçiyi güncelle
    const worker = await Worker.findByIdAndUpdate(
      _id,
      { name, surname, registrationNumber, project, roomId },
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
    const { _id } = await request.json();

    await connectDB();

    // İşçiyi bul
    const worker = await Worker.findById(_id);
    if (!worker) {
      return NextResponse.json(
        { error: 'İşçi bulunamadı' },
        { status: 404 }
      );
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