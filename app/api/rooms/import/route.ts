import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import Room from '@/app/models/Room';

export async function POST(request: Request) {
  try {
    const { campId, rooms } = await request.json();

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

    for (const roomData of rooms) {
      try {
        // Oda numarası ve şantiye kontrolü
        if (!roomData['Oda No'] || !roomData['Şantiyesi']) {
          results.failed++;
          results.errors.push(`Oda No ${roomData['Oda No'] || 'Bilinmeyen'}: Oda numarası veya şantiye bilgisi eksik`);
          continue;
        }

        // Mevcut oda kontrolü
        const existingRoom = await Room.findOne({
          campId,
          number: roomData['Oda No'].toString(),
          project: roomData['Şantiyesi']
        });

        if (existingRoom) {
          results.failed++;
          results.errors.push(`Oda No ${roomData['Oda No']}: Bu oda zaten mevcut`);
          continue;
        }

        // Yeni oda oluştur
        const newRoom = new Room({
          campId,
          number: roomData['Oda No'].toString(),
          capacity: parseInt(roomData['Kapasite']) || 4,
          project: roomData['Şantiyesi'],
          company: 'Slava',
          workers: [],
          availableBeds: parseInt(roomData['Kapasite']) || 4
        });

        await newRoom.save();
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Oda No ${roomData['Oda No'] || 'Bilinmeyen'}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: `${results.success} oda başarıyla içe aktarıldı, ${results.failed} oda aktarılamadı`,
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Bir hata oluştu' },
      { status: 500 }
    );
  }
} 