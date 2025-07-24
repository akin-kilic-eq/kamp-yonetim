import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Room from '@/app/models/Room';
import Worker from '@/app/models/Worker';
import Camp from '@/app/models/Camp';
import Site from '@/app/models/Site';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campId = searchParams.get('campId');

    if (!campId) {
      return NextResponse.json({ error: 'Kamp ID gerekli' }, { status: 400 });
    }

    await connectDB();

    // Kamp bilgilerini al
    const camp = await Camp.findById(campId);
    if (!camp) {
      return NextResponse.json({ error: 'Kamp bulunamadı' }, { status: 404 });
    }

    // Şantiyeleri getir
    const sites = await Site.find({});
    
    // Kamp ortak kullanım ayarlarına göre şantiyeleri belirle
    let availableSites: any[] = [];
    
    if (camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) {
      // Ortak kullanım açıksa, paylaşılan şantiyeler + kampın kendi şantiyesi
      availableSites = sites.filter(site => 
        site.name === camp.site || camp.sharedWithSites!.includes(site._id.toString())
      );
    } else {
      // Ortak kullanım kapalıysa, sadece kampın kendi şantiyesi
      const campSite = sites.find(site => site.name === camp.site);
      if (campSite) {
        availableSites = [campSite];
      }
    }

    // Tek aggregate sorgusu ile tüm istatistikleri çek
    const stats = await Room.aggregate([
      { $match: { campId: new mongoose.Types.ObjectId(campId) } },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: 'roomId',
          as: 'workers'
        }
      },
      {
        $group: {
          _id: null,
          totalRooms: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalWorkers: { $sum: { $size: '$workers' } },
          projectStats: {
            $push: {
              project: '$project',
              roomNumber: '$number',
              roomId: '$_id',
              capacity: '$capacity',
              workers: '$workers',
              occupancy: { $size: '$workers' }
            }
          }
        }
      },
      {
        $addFields: {
          availableBeds: { $subtract: ['$totalCapacity', '$totalWorkers'] },
          occupancyRate: {
            $multiply: [
              { $divide: ['$totalWorkers', '$totalCapacity'] },
              100
            ]
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return NextResponse.json({
        totalRooms: 0,
        totalCapacity: 0,
        totalWorkers: 0,
        availableBeds: 0,
        occupancyRate: 0,
        projectStats: [],
        siteStats: [],
        availableSites: availableSites.map(site => ({ name: site.name, _id: site._id }))
      });
    }

    const result = stats[0];
    
    // Şantiye bazlı istatistikleri hesapla
    const siteStats: { [key: string]: { rooms: number, capacity: number, workers: number, occupancyRate: number } } = {};
    
    // Mevcut şantiyeler için başlangıç değerleri
    availableSites.forEach(site => {
      siteStats[site.name] = { rooms: 0, capacity: 0, workers: 0, occupancyRate: 0 };
    });

    // Proje bazlı istatistikleri hesapla
    result.projectStats.forEach((room: any) => {
      if (siteStats[room.project]) {
        siteStats[room.project].rooms += 1;
        siteStats[room.project].capacity += room.capacity;
        siteStats[room.project].workers += room.occupancy;
      }
    });

    // Doluluk oranlarını hesapla
    Object.keys(siteStats).forEach(siteName => {
      if (siteStats[siteName].capacity > 0) {
        siteStats[siteName].occupancyRate = (siteStats[siteName].workers / siteStats[siteName].capacity) * 100;
      }
    });

    // En çok ve en az dolu odaları bul
    const roomOccupancy = result.projectStats.map((room: any) => ({
      number: room.roomNumber,
      occupancy: room.occupancy,
      capacity: room.capacity,
      occupancyRate: room.capacity > 0 ? (room.occupancy / room.capacity) * 100 : 0
    }));

    const sortedRooms = roomOccupancy.sort((a: any, b: any) => b.occupancyRate - a.occupancyRate);
    const mostOccupiedRoom = sortedRooms.length > 0 ? 
      `Oda ${sortedRooms[0].number} (${sortedRooms[0].occupancy}/${sortedRooms[0].capacity})` : '';
    const leastOccupiedRoom = sortedRooms.length > 0 ? 
      `Oda ${sortedRooms[sortedRooms.length - 1].number} (${sortedRooms[sortedRooms.length - 1].occupancy}/${sortedRooms[sortedRooms.length - 1].capacity})` : '';

    // Cross-project istatistiklerini hesapla
    const crossProjectStats: { [key: string]: { totalWorkers: number, sameProjectWorkers: number, otherProjectWorkers: number } } = {};

    // Mevcut şantiyeler için başlangıç değerleri
    availableSites.forEach(site => {
      crossProjectStats[site.name] = { totalWorkers: 0, sameProjectWorkers: 0, otherProjectWorkers: 0 };
    });

    // Her oda için işçileri analiz et
    result.projectStats.forEach((room: any) => {
      if (crossProjectStats[room.project]) {
        // Bu odadaki işçileri analiz et
        room.workers.forEach((worker: any) => {
          crossProjectStats[room.project].totalWorkers++;
          if (worker.project === room.project) {
            crossProjectStats[room.project].sameProjectWorkers++;
          } else {
            crossProjectStats[room.project].otherProjectWorkers++;
          }
        });
      }
    });

    return NextResponse.json({
      totalRooms: result.totalRooms,
      totalCapacity: result.totalCapacity,
      totalWorkers: result.totalWorkers,
      availableBeds: result.availableBeds,
      occupancyRate: result.occupancyRate,
      averageOccupancyPerRoom: result.totalRooms > 0 ? result.totalWorkers / result.totalRooms : 0,
      mostOccupiedRoom,
      leastOccupiedRoom,
      projectStats: result.projectStats,
      siteStats,
      crossProjectStats,
      availableSites: availableSites.map(site => ({ name: site.name, _id: site._id }))
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'İstatistikler getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 