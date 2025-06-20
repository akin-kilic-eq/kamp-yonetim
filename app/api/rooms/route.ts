import Worker from '@/app/models/Worker';
import Room from '@/app/models/Room';
import Camp from '@/app/models/Camp';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campId = searchParams.get('campId');
    console.log('API/ROOMS campId:', campId);

    await connectDB();

    const rooms = await Room.find({ campId }).populate('workers');
    // Her oda için işçi sayısını ve boş yatak sayısını hesapla
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const occupancy = await Worker.countDocuments({ roomId: room._id });
        const availableBeds = room.capacity - occupancy;
        return {
          ...room.toObject(),
          occupancy,
          availableBeds
        };
      })
    );
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
    const { number, capacity, company, project, campId } = await request.json();

    await connectDB();

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
    const { _id, number, capacity, company, project, availableBeds } = await request.json();

    await connectDB();

    // Mevcut odayı bul
    const currentRoom = await Room.findById(_id);
    if (!currentRoom) {
      return NextResponse.json(
        { error: 'Oda bulunamadı' },
        { status: 404 }
      );
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

    const room = await Room.findByIdAndUpdate(
      _id,
      { 
        number: number.trim(), 
        capacity, 
        company, 
        project, 
        availableBeds 
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
    const { _id, campId } = await request.json();

    await connectDB();

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