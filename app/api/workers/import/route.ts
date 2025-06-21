import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import Worker from '@/app/models/Worker';
import Room from '@/app/models/Room';
import Camp from '@/app/models/Camp';
import { Types } from 'mongoose';

// Yardımcı fonksiyon: Yazma iznini kontrol et
async function checkWritePermission(userEmail: string, campId: string): Promise<boolean> {
  const camp = await Camp.findById(campId);
  if (!camp) return false;

  const isOwner = camp.userEmail === userEmail;
  const hasWritePermission = camp.sharedWith?.some(
    (share: { email: string; permission: string }) => 
      share.email === userEmail && share.permission === 'write'
  );

  return isOwner || hasWritePermission;
}

const parseCustomDate = (dateString: string | undefined): string => {
  if (dateString) {
    const parts = dateString.toString().split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        // JavaScript Date constructor month is 0-indexed
        return new Date(Date.UTC(year, month - 1, day)).toISOString();
      }
    }
  }
  // Fallback to today's date if format is incorrect or date is not provided
  return new Date().toISOString();
};

export async function POST(request: Request) {
  try {
    const { campId, workers, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const hasPermission = await checkWritePermission(userEmail, campId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Yazma izniniz bulunmuyor' }, { status: 403 });
    }

    if (!campId || !workers || !Array.isArray(workers)) {
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

    // Odaları numaralarına göre maple
    const roomsByNumber = new Map();
    const rooms = await Room.find({ campId });
    rooms.forEach(room => {
      roomsByNumber.set(room.number.toString(), room);
    });

    // Kullanıcının kamplarını bul (sicil numarası kontrolü için)
    const userCamps = await Camp.find({
      $or: [
        { userEmail: userEmail },
        { 'sharedWith.email': userEmail }
      ]
    });
    
    const userCampIds = userCamps.map(camp => camp._id);
    const userRooms = await Room.find({ campId: { $in: userCampIds } });
    const userRoomIds = userRooms.map(room => room._id);

    const totalWorkers = workers.length;

    for (let i = 0; i < workers.length; i++) {
      const workerData = workers[i];
      
      try {
        console.log(`Processing worker ${i + 1}/${totalWorkers}:`, workerData);

        // Zorunlu alan kontrolü
        if (!workerData['SICIL NO'] || !workerData['ADI SOYADI'] || !workerData['ÇALIŞTIĞI ŞANTİYE']) {
          results.failed++;
          results.errors.push(`Sicil No ${workerData['SICIL NO'] || 'Bilinmeyen'}: Zorunlu alanlar eksik`);
          continue;
        }

        // Mevcut işçi kontrolü - kullanıcının tüm kamplarında kontrol et
        const existingWorker = await Worker.findOne({
          registrationNumber: workerData['SICIL NO'].toString(),
          roomId: { $in: userRoomIds }
        });

        if (existingWorker) {
          results.failed++;
          results.errors.push(`Sicil No ${workerData['SICIL NO']}: Bu işçi zaten mevcut`);
          continue;
        }

        // İsim ve soyisim ayırma
        const fullName = (workerData['ADI SOYADI'] || '').toString().trim();
        const nameParts = fullName.split(/\s+/).filter((part: string) => part);

        let name = '';
        let surname = '';

        if (nameParts.length > 1) {
          surname = nameParts.pop() || '';
          name = nameParts.join(' ');
        } else {
          name = fullName;
          surname = '-';
        }

        // Oda kontrolü ve atama
        let roomId = null;
        if (workerData['KALDIĞI ODA']) {
          const room = roomsByNumber.get(workerData['KALDIĞI ODA'].toString());

          if (!room) {
            results.failed++;
            results.errors.push(`Sicil No ${workerData['SICIL NO']}: Belirtilen oda (${workerData['KALDIĞI ODA']}) bulunamadı`);
            continue;
          }

          if (room.availableBeds <= 0) {
            results.failed++;
            results.errors.push(`Sicil No ${workerData['SICIL NO']}: Oda ${workerData['KALDIĞI ODA']} dolu (boş yatak yok)`);
            continue;
          }

          roomId = room._id;

          try {
            await Room.findByIdAndUpdate(roomId, {
              $inc: { availableBeds: -1 },
              $addToSet: { workers: workerData['SICIL NO'].toString() }
            });
          } catch (updateError) {
            console.error('Room update error:', updateError);
            results.failed++;
            results.errors.push(`Sicil No ${workerData['SICIL NO']}: Oda güncellenirken hata oluştu`);
            continue;
          }
        }

        const entryDate = parseCustomDate(workerData['Odaya Giriş Tarihi']);

        // Yeni işçi oluştur
        const workerToSave = {
          campId: new Types.ObjectId(campId),
          name,
          surname,
          registrationNumber: workerData['SICIL NO'].toString(),
          project: workerData['ÇALIŞTIĞI ŞANTİYE'],
          roomId: roomId ? new Types.ObjectId(roomId.toString()) : null,
          entryDate: entryDate,
        };

        console.log('Saving worker:', workerToSave);

        const newWorker = new Worker(workerToSave);
        await newWorker.save();

        results.success++;
        
        // Her 5 işçide bir console'a ilerleme yazdır
        if ((i + 1) % 5 === 0 || i === totalWorkers - 1) {
          const progress = Math.round(((i + 1) / totalWorkers) * 100);
          console.log(`Import progress: ${progress}% (${i + 1}/${totalWorkers})`);
        }
        
      } catch (error: any) {
        console.error('Worker import error:', error);
        results.failed++;
        results.errors.push(`Sicil No ${workerData['SICIL NO'] || 'Bilinmeyen'}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: `${results.success} işçi başarıyla içe aktarıldı, ${results.failed} işçi aktarılamadı`,
      results
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Bir hata oluştu' },
      { status: 500 }
    );
  }
} 