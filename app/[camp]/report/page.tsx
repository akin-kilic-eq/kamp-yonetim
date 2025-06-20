'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Room, Worker } from '../types';
import { FaChartPie, FaBed, FaUserFriends } from 'react-icons/fa';
import XLSX from 'xlsx-js-style';
import { getRooms, getWorkers } from '@/app/services/api';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Stats {
  totalRooms: number;
  totalCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
  totalWorkers: number;
  occupancyRate: number;
  slava4Rooms: number;
  slava23Rooms: number;
  slava4Workers: number;
  slava23Workers: number;
  averageOccupancyPerRoom: number;
  mostOccupiedRoom: string;
  leastOccupiedRoom: string;
  recentWorkers: number;
  projectDistribution: {
    [key: string]: {
      rooms: number;
      workers: number;
      occupancyRate: number;
    };
  };
  crossProjectStats: {
    [key: string]: {
      totalWorkers: number;
      sameProjectWorkers: number;
      otherProjectWorkers: number;
    };
  };
}

interface CellStyle {
  alignment?: {
    horizontal: 'left' | 'center' | 'right';
    vertical?: 'top' | 'center' | 'bottom';
  };
  border?: {
    top: { style: string };
    left: { style: string };
    bottom: { style: string };
    right: { style: string };
  };
  fill?: {
    fgColor: { rgb: string };
  };
  font?: {
    name?: string;
    bold?: boolean;
    sz?: number;
    color?: { rgb: string };
  };
}

interface Cell {
  v: string | number;
  t?: 'n' | 's';
  s: CellStyle;
}

type ExcelRow = (string | number | Cell)[];
type ExcelData = ExcelRow[];

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRooms: 0,
    totalCapacity: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    totalWorkers: 0,
    occupancyRate: 0,
    slava4Rooms: 0,
    slava23Rooms: 0,
    slava4Workers: 0,
    slava23Workers: 0,
    averageOccupancyPerRoom: 0,
    mostOccupiedRoom: '',
    leastOccupiedRoom: '',
    recentWorkers: 0,
    projectDistribution: {},
    crossProjectStats: {}
  });
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentCamp, setCurrentCamp] = useState<any>(null);
  const [pieData, setPieData] = useState({
    labels: ['Dolu Yatak', 'Boş Yatak'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#F87171', '#34D399'],
        borderColor: ['#F87171', '#34D399'],
        borderWidth: 2
      }
    ]
  });
  const [barData, setBarData] = useState({
    labels: ['Slava 4', 'Slava 2-3'],
    datasets: [
      {
        label: 'İşçi Sayısı',
        data: [0, 0],
        backgroundColor: ['#60A5FA', '#818CF8'],
        borderRadius: 4,
        barThickness: 40
      }
    ]
  });

  const updateChartData = (projectCounts: any, totalCapacity: number, occupiedBeds: number) => {
    // Pasta grafik verilerini güncelle
    setPieData({
      labels: ['Dolu Yatak', 'Boş Yatak'],
      datasets: [
        {
          data: [occupiedBeds, totalCapacity - occupiedBeds],
          backgroundColor: ['#F87171', '#34D399'],
          borderColor: ['#F87171', '#34D399'],
          borderWidth: 2
        }
      ]
    });

    // Çubuk grafik verilerini güncelle
    setBarData({
      labels: ['Slava 4', 'Slava 2-3'],
      datasets: [
        {
          label: 'İşçi Sayısı',
          data: [projectCounts['Slava 4'] || 0, projectCounts['Slava 2-3'] || 0],
          backgroundColor: ['#60A5FA', '#818CF8'],
          borderRadius: 4,
          barThickness: 40
        }
      ]
    });
  };

  useEffect(() => {
    // Oturum kontrolü
    const userSession = sessionStorage.getItem('currentUser');
    if (!userSession) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userSession);
    setCurrentUser(user);

    // Mevcut kampı kontrol et
    const currentCampData = localStorage.getItem('currentCamp');
    if (!currentCampData) {
      router.push('/camps');
      return;
    }

    const camp = JSON.parse(currentCampData);
    
    // Erişim kontrolü - hem kamp sahibi hem de paylaşılan kullanıcılar erişebilir
    const hasAccess = camp.userEmail === user.email || (camp.sharedWith || []).includes(user.email);
    if (!hasAccess) {
      router.push('/camps');
      return;
    }

    setCurrentCamp(camp);

    // Verileri API'den çek
    const loadData = async () => {
      try {
        // Odaları çek
        const roomsData = await getRooms(camp._id);
        if (!Array.isArray(roomsData)) return;
        setRooms(roomsData);

        // İşçileri çek
        const workersData = await getWorkers(camp._id);
        if (!Array.isArray(workersData)) return;
        setWorkers(workersData);

        // Proje bazlı işçi dağılımını hesapla
        const workerProjectStats: { [key: string]: number } = {
          'Slava 4': 0,
          'Slava 2-3': 0
        };

        // Her işçinin projesine göre sayıları hesapla
        workersData.forEach((worker: Worker) => {
          if (worker.project === 'Slava 4') {
            workerProjectStats['Slava 4']++;
          } else if (worker.project === 'Slava 2-3') {
            workerProjectStats['Slava 2-3']++;
          }
        });

        // Oda bazlı proje dağılımını hesapla
        const roomProjectStats: { [key: string]: { rooms: number, capacity: number, workers: number } } = {
          'Slava 4': { rooms: 0, capacity: 0, workers: 0 },
          'Slava 2-3': { rooms: 0, capacity: 0, workers: 0 }
        };

        // Her odanın projesine göre istatistikleri hesapla
        roomsData.forEach((room: Room) => {
          if (room.project) {
            roomProjectStats[room.project].rooms += 1;
            roomProjectStats[room.project].capacity += room.capacity;
            // Odadaki dolu yatak sayısını hesapla
            const roomWorkers = workersData.filter((worker: Worker) => {
              if (typeof worker.roomId === 'string') {
                return worker.roomId === room._id;
              }
              const roomIdObj = worker.roomId as { _id: string };
              return roomIdObj._id === room._id;
            });
            roomProjectStats[room.project].workers += roomWorkers.length;
          }
        });

        // Proje dağılımını hesapla
        const projectDistribution: Stats['projectDistribution'] = {
          'Slava 4': {
            rooms: roomProjectStats['Slava 4'].rooms,
            workers: roomProjectStats['Slava 4'].workers,
            occupancyRate: roomProjectStats['Slava 4'].capacity > 0 ? 
              (roomProjectStats['Slava 4'].workers / roomProjectStats['Slava 4'].capacity) * 100 : 0
          },
          'Slava 2-3': {
            rooms: roomProjectStats['Slava 2-3'].rooms,
            workers: roomProjectStats['Slava 2-3'].workers,
            occupancyRate: roomProjectStats['Slava 2-3'].capacity > 0 ? 
              (roomProjectStats['Slava 2-3'].workers / roomProjectStats['Slava 2-3'].capacity) * 100 : 0
          }
        };

        // Genel istatistikleri hesapla
        const totalRooms = roomsData.length;
        const totalCapacity = roomsData.reduce((sum: number, room: Room) => sum + room.capacity, 0);
        const occupiedBeds = workersData.length; // Toplam işçi sayısı
        const availableBeds = totalCapacity - occupiedBeds;
        const occupancyRate = totalCapacity > 0 ? (occupiedBeds / totalCapacity) * 100 : 0;

        // Grafik verilerini güncelle
        updateChartData(workerProjectStats, totalCapacity, occupiedBeds);

        // Her oda için farklı projede çalışan işçileri hesapla
        type ProjectType = 'Slava 4' | 'Slava 2-3';
        type ProjectStats = {
          totalInRooms: number;
          sameProject: number;
        };
        
        const projectWorkerStats: Record<ProjectType, ProjectStats> = {
          'Slava 4': {
            totalInRooms: 0,
            sameProject: 0
          },
          'Slava 2-3': {
            totalInRooms: 0,
            sameProject: 0
          }
        };

        // Her oda için işçileri kontrol et
        roomsData.forEach((room: Room) => {
          if (room.project && (room.project === 'Slava 4' || room.project === 'Slava 2-3')) {
            const roomWorkers = workersData.filter((worker: Worker) => {
              if (typeof worker.roomId === 'string') {
                return worker.roomId === room._id;
              }
              const roomIdObj = worker.roomId as { _id: string };
              return roomIdObj._id === room._id;
            });

            roomWorkers.forEach((worker: Worker) => {
              projectWorkerStats[room.project as ProjectType].totalInRooms++;
              if (worker.project === room.project) {
                projectWorkerStats[room.project as ProjectType].sameProject++;
              }
            });
          }
        });

        // En dolu ve en boş odaları bul
        let mostOccupiedRoom = '';
        let leastOccupiedRoom = '';
        let maxOccupancyRate = -1;
        let minOccupancyRate = Number.MAX_VALUE;

        roomsData.forEach((room: Room) => {
          const roomWorkers = workersData.filter((worker: Worker) => {
            if (typeof worker.roomId === 'string') {
              return worker.roomId === room._id;
            }
            const roomIdObj = worker.roomId as { _id: string };
            return roomIdObj._id === room._id;
          });

          const occupancy = roomWorkers.length;
          const occupancyRate = (occupancy / room.capacity) * 100;
          
          if (occupancyRate > maxOccupancyRate) {
            maxOccupancyRate = occupancyRate;
            mostOccupiedRoom = `Oda ${room.number} (${occupancy}/${room.capacity})`;
          }
          
          if (occupancyRate < minOccupancyRate) {
            minOccupancyRate = occupancyRate;
            leastOccupiedRoom = `Oda ${room.number} (${occupancy}/${room.capacity})`;
          }
        });

        // Son 7 gün içinde giriş yapan işçileri hesapla
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentWorkers = workersData.filter((worker: Worker) => {
          if (!worker.entryDate) return false;
          const entryDate = new Date(worker.entryDate);
          return entryDate >= sevenDaysAgo;
        }).length;

        setStats({
          totalRooms,
          totalCapacity,
          occupiedBeds,
          availableBeds,
          totalWorkers: occupiedBeds,
          occupancyRate,
          slava4Rooms: roomProjectStats['Slava 4'].rooms,
          slava23Rooms: roomProjectStats['Slava 2-3'].rooms,
          slava4Workers: workerProjectStats['Slava 4'],
          slava23Workers: workerProjectStats['Slava 2-3'],
          averageOccupancyPerRoom: totalRooms > 0 ? occupiedBeds / totalRooms : 0,
          mostOccupiedRoom,
          leastOccupiedRoom,
          recentWorkers,
          projectDistribution,
          crossProjectStats: {
            'Slava 4': {
              totalWorkers: projectWorkerStats['Slava 4'].totalInRooms,
              sameProjectWorkers: projectWorkerStats['Slava 4'].sameProject,
              otherProjectWorkers: projectWorkerStats['Slava 4'].totalInRooms - projectWorkerStats['Slava 4'].sameProject
            },
            'Slava 2-3': {
              totalWorkers: projectWorkerStats['Slava 2-3'].totalInRooms,
              sameProjectWorkers: projectWorkerStats['Slava 2-3'].sameProject,
              otherProjectWorkers: projectWorkerStats['Slava 2-3'].totalInRooms - projectWorkerStats['Slava 2-3'].sameProject
            }
          }
        });

      } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
      }
    };

    loadData();
  }, [router]);

  const handleProjectClick = (project: string) => {
    const projectRooms = rooms.filter(room => room.project === project);
    setSelectedRooms(projectRooms);
    setSelectedProject(project);
    setShowRoomModal(true);
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20
        }
      }
    },
    cutout: '50%'
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const handleExportExcel = () => {
    // Güncel tarihi formatla
    const today = new Date();
    const formattedDate = today.toLocaleDateString('tr-TR').replace(/\./g, '-');

    // Temel stiller
    const baseStyle: CellStyle = {
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const headerStyle: CellStyle = {
      ...baseStyle,
      fill: { fgColor: { rgb: '525252' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } }
    };

    const totalRowStyle: CellStyle = {
      ...baseStyle,
      fill: { fgColor: { rgb: 'D0CECE' } },
      font: { bold: true }
    };

    const rowStyle: CellStyle = {
      ...baseStyle,
      fill: { fgColor: { rgb: 'F2F2F2' } }
    };

    // Excel dosyasını oluştur
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Excel görünüm ayarları
    ws['!showGridLines'] = false;

    // Tarih bilgisini ekle
    XLSX.utils.sheet_add_aoa(ws, [[{
      v: 'Tarih: ' + today.toLocaleDateString('tr-TR'),
      s: {
        font: { name: 'Times New Roman', bold: true, sz: 13 },
        alignment: { horizontal: 'left' }
      }
    }]], { origin: 'B2' });

    // B2 ve C2 hücrelerini birleştir
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 1, c: 1 }, e: { r: 1, c: 2 } });

    // Genel Durum başlığını ekle ve hücrelerini birleştir
    XLSX.utils.sheet_add_aoa(ws, [[{
      v: 'Genel Durum',
      s: {
        ...headerStyle,
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }]], { origin: 'B4' });
    ws['!merges'].push({ s: { r: 3, c: 1 }, e: { r: 3, c: 3 } });

    // Genel Durum verileri
    XLSX.utils.sheet_add_aoa(ws, [
      [
        { v: 'Kapasite', s: baseStyle },
        { v: 'Dolu', s: baseStyle },
        { v: 'Boş', s: baseStyle }
      ],
      [
        { v: stats.totalCapacity, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } },
        { v: stats.occupiedBeds, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } },
        { v: stats.availableBeds, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } }
      ]
    ], { origin: 'B5' });

    // Oda Sayısı başlığını ekle ve hücrelerini birleştir
    XLSX.utils.sheet_add_aoa(ws, [[{
      v: 'Oda Sayısı',
      s: {
        ...headerStyle,
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }]], { origin: 'F4' });
    ws['!merges'].push({ s: { r: 3, c: 5 }, e: { r: 3, c: 6 } });

    // Oda Sayısı verileri
    XLSX.utils.sheet_add_aoa(ws, [
      [
        { v: 'Slava 2-3', s: baseStyle },
        { v: stats.slava23Rooms, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } }
      ],
      [
        { v: 'Slava 4', s: baseStyle },
        { v: stats.slava4Rooms, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } }
      ]
    ], { origin: 'F5' });

    // Oda Dolulukları bölümünü ekle
    XLSX.utils.sheet_add_aoa(ws, [[{
      v: 'Oda Dolulukları',
      s: {
        ...headerStyle,
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }]], { origin: 'I4' });
    ws['!merges'].push({ s: { r: 3, c: 8 }, e: { r: 3, c: 9 } });

    // Şantiye başlıkları
    XLSX.utils.sheet_add_aoa(ws, [[
      { v: 'Slava 4', s: { ...headerStyle, alignment: { horizontal: 'center', vertical: 'center' } } },
      { v: 'Slava 2-3', s: { ...headerStyle, alignment: { horizontal: 'center', vertical: 'center' } } }
    ]], { origin: 'I5' });

    // Şantiye toplamları
    const slava4Total = stats.crossProjectStats['Slava 4']?.totalWorkers || 0;
    const slava23Total = stats.crossProjectStats['Slava 2-3']?.totalWorkers || 0;

    XLSX.utils.sheet_add_aoa(ws, [[
      { v: slava4Total, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } },
      { v: slava23Total, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } }
    ]], { origin: 'I6' });

    // Tablo verilerini hazırla
    const tableData = rooms.map((room: Room, index: number) => {
      const roomWorkers = workers.filter((worker: Worker) => {
        if (typeof worker.roomId === 'string') {
          return worker.roomId === room._id;
        }
        const roomIdObj = worker.roomId as { _id: string };
        return roomIdObj._id === room._id;
      });

      const occupiedBeds = roomWorkers.length;
      const availableBeds = room.capacity - occupiedBeds;
      const occupancyRate = (occupiedBeds / room.capacity) * 100;
      const slava4Workers = roomWorkers.filter((worker: Worker) => worker.project === 'Slava 4').length;
      const slava23Workers = roomWorkers.filter((worker: Worker) => worker.project === 'Slava 2-3').length;

      return [
        { v: index + 1, t: 'n', s: rowStyle },
        { v: room.project, s: rowStyle },
        { v: room.number, t: 'n', s: rowStyle },
        { v: room.capacity, t: 'n', s: rowStyle },
        { v: occupiedBeds, t: 'n', s: rowStyle },
        { v: availableBeds, t: 'n', s: availableBeds > 0 ? { ...rowStyle, fill: { fgColor: { rgb: 'FF0000' } } } : rowStyle },
        { v: `${occupancyRate.toFixed(0)}%`, s: rowStyle },
        { v: slava4Workers, t: 'n', s: rowStyle },
        { v: slava23Workers, t: 'n', s: rowStyle }
      ];
    });

    // Başlık satırı
    const headerRow = [
      { v: 'S.N', s: headerStyle },
      { v: 'Şantiyesi', s: headerStyle },
      { v: 'Oda No', s: headerStyle },
      { v: 'Kapasite', s: headerStyle },
      { v: 'Dolu Yatak', s: headerStyle },
      { v: 'Boş Yatak', s: headerStyle },
      { v: 'Doluluk Oranı', s: headerStyle },
      { v: 'Slava 4', s: headerStyle },
      { v: 'Slava 2-3', s: headerStyle }
    ];

    // Tabloyu ekle
    XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: 'B9' });
    XLSX.utils.sheet_add_aoa(ws, tableData, { origin: 'B10' });

    // Filtre ekle
    ws['!autofilter'] = { ref: 'B9:J28' };

    // Toplam satırını güncelle - SUBTOTAL formülleri ile
    const totalFormulas = [
      { v: 'Toplam', s: totalRowStyle },
      { v: '', s: totalRowStyle },
      { v: '', s: totalRowStyle },
      { f: 'SUBTOTAL(9,E10:E28)', t: 'n', s: totalRowStyle },  // Kapasite toplamı
      { f: 'SUBTOTAL(9,F10:F28)', t: 'n', s: totalRowStyle },  // Dolu Yatak toplamı
      { f: 'SUBTOTAL(9,G10:G28)', t: 'n', s: totalRowStyle },  // Boş Yatak toplamı
      { v: `${((rooms.reduce((sum: number, room: Room) => sum + room.workers.length, 0) / rooms.reduce((sum: number, room: Room) => sum + room.capacity, 0)) * 100).toFixed(0)}%`, s: totalRowStyle },  // Doluluk Oranı - normal hesaplama
      { f: 'SUBTOTAL(9,I10:I28)', t: 'n', s: totalRowStyle },  // Slava 4 toplamı
      { f: 'SUBTOTAL(9,J10:J28)', t: 'n', s: totalRowStyle }   // Slava 2-3 toplamı
    ];

    XLSX.utils.sheet_add_aoa(ws, [totalFormulas], { origin: 'B8' });

    // Ana rapor sayfasının satır yüksekliklerini ayarla
    const rowInfo: Array<{ hpt: number }> = [];
    
    // Özel yükseklikli satırlar
    [0, 2, 6].forEach(i => {
      rowInfo[i] = { hpt: 5 };
    });

    // Diğer satırlar için varsayılan yükseklik
    for (let i = 0; i < 100; i++) {
      if (![0, 2, 6].includes(i)) {
        rowInfo[i] = { hpt: 18 };
      }
    }

    // Ana rapor sayfasının sütun genişliklerini ayarla
    ws['!cols'] = [
      { wch: 2 },  // A
      { wch: 15 }, // B
      { wch: 15 }, // C
      { wch: 15 }, // D
      { wch: 15 }, // E
      { wch: 15 }, // F
      { wch: 15 }, // G
      { wch: 15 }, // H
      { wch: 15 }, // I
      { wch: 15 }  // J
    ];

    ws['!rows'] = rowInfo;

    // Excel dosyasını oluştur
    const wb = XLSX.utils.book_new();
    
    // Ana rapor sayfasını ekle
    XLSX.utils.book_append_sheet(wb, ws, 'Rapor');

    // Oda Detayları sayfasını oluştur
    const wsRooms = XLSX.utils.aoa_to_sheet([]);

    // Başlık satırı
    const roomsHeaderRow = [
      { v: 'Oda No', s: headerStyle },
      { v: 'Şantiyesi', s: headerStyle },
      { v: 'Kapasite', s: headerStyle },
      { v: 'Boş Yatak', s: headerStyle },
      { v: 'Doluluk', s: headerStyle },
      { v: 'İşçi Bilgileri', s: headerStyle }
    ];

    // Oda verilerini hazırla
    let currentRow = 1; // Başlık satırından sonra başla
    wsRooms['!merges'] = [];

    rooms.forEach((room: Room) => {
      const roomWorkers = workers.filter((worker: Worker) => {
        if (typeof worker.roomId === 'string') {
          return worker.roomId === room._id;
        }
        const roomIdObj = worker.roomId as { _id: string };
        return roomIdObj._id === room._id;
      });

      const workerCount = roomWorkers.length || 1; // En az 1 satır (boş oda için)
      
      // Her işçi için bir satır oluştur
      const roomData = roomWorkers.length > 0 ? roomWorkers.map((worker: Worker) => [
        { v: room.number, s: rowStyle },
        { v: room.project, s: rowStyle },
        { v: room.capacity, t: 'n', s: rowStyle },
        { v: room.availableBeds || 0, t: 'n', s: { 
          ...rowStyle,
          font: { color: { rgb: (room.availableBeds || 0) > 0 ? '008000' : 'FF0000' } }
        }},
        { v: room.capacity - (room.availableBeds || 0), t: 'n', s: rowStyle },
        { v: `${worker.name} ${worker.surname} (${worker.registrationNumber}) - ${worker.project}`, s: {
          ...rowStyle,
          alignment: { horizontal: 'left', vertical: 'center' }
        }}
      ]) : [[
        { v: room.number, s: rowStyle },
        { v: room.project, s: rowStyle },
        { v: room.capacity, t: 'n', s: rowStyle },
        { v: room.capacity, t: 'n', s: { ...rowStyle, font: { color: { rgb: '008000' } } }},
        { v: 0, t: 'n', s: rowStyle },
        { v: 'Boş Oda', s: { ...rowStyle, alignment: { horizontal: 'left', vertical: 'center' } }}
      ]];

      // Verileri ekle
      XLSX.utils.sheet_add_aoa(wsRooms, roomData, { origin: `A${currentRow + 1}` });

      // Oda bilgilerini merge et
      if (workerCount > 1 && wsRooms['!merges']) {
        for (let col = 0; col < 5; col++) {
          wsRooms['!merges'].push({
            s: { r: currentRow, c: col },
            e: { r: currentRow + workerCount - 1, c: col }
          });
        }
      }

      currentRow += workerCount;
    });

    // Başlık satırını en son ekle
    XLSX.utils.sheet_add_aoa(wsRooms, [roomsHeaderRow], { origin: 'A1' });

    // Filtre ekle
    wsRooms['!autofilter'] = { ref: `A1:F${currentRow}` };

    // Sütun genişliklerini ayarla
    wsRooms['!cols'] = [
      { wch: 10 },  // Oda No
      { wch: 15 },  // Şantiyesi
      { wch: 10 },  // Kapasite
      { wch: 10 },  // Boş Yatak
      { wch: 10 },  // Doluluk
      { wch: 50 }   // İşçi Bilgileri
    ];

    // Satır yüksekliklerini ayarla
    const roomsRowInfo: Array<{ hpt: number }> = [];
    roomsRowInfo[0] = { hpt: 30 }; // Başlık satırı yüksekliği

    // Tüm satırlar için standart yükseklik
    for (let i = 1; i <= currentRow; i++) {
      roomsRowInfo[i] = { hpt: 25 };
    }

    wsRooms['!rows'] = roomsRowInfo;

    // Oda Detayları sayfasını ekle
    XLSX.utils.book_append_sheet(wb, wsRooms, 'Oda Detayları');

    // İşçi Listesi sayfasını oluştur
    const wsWorkers = XLSX.utils.aoa_to_sheet([]);

    // Başlık satırı
    const workersHeaderRow = [
      { v: 'Sicil No', s: headerStyle },
      { v: 'Adı Soyadı', s: headerStyle },
      { v: 'Kaldığı Oda', s: headerStyle },
      { v: 'Çalıştığı Şantiye', s: headerStyle },
      { v: 'Odaya Giriş Tarihi', s: headerStyle }
    ];

    // İşçi verilerini hazırla
    const workersData = workers.map((worker: Worker) => {
      const room = rooms.find((r: Room) => {
        if (typeof worker.roomId === 'string') {
          return r._id === worker.roomId;
        }
        const roomIdObj = worker.roomId as { _id: string };
        return roomIdObj._id === r._id;
      }) || null;

      return [
        { v: worker.registrationNumber, s: rowStyle },
        { v: `${worker.name} ${worker.surname}`, s: rowStyle },
        { v: room ? room.number : '-', s: rowStyle },
        { v: worker.project, s: rowStyle },
        { v: worker.entryDate ? new Date(worker.entryDate).toLocaleDateString('tr-TR') : '-', s: rowStyle }
      ];
    });

    // Başlık ve verileri ekle
    XLSX.utils.sheet_add_aoa(wsWorkers, [workersHeaderRow], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(wsWorkers, workersData, { origin: 'A2' });

    // Filtre ekle
    wsWorkers['!autofilter'] = { ref: `A1:E${workersData.length + 1}` };

    // Sütun genişliklerini ayarla
    wsWorkers['!cols'] = [
      { wch: 15 },  // Sicil No
      { wch: 30 },  // Adı Soyadı
      { wch: 12 },  // Kaldığı Oda
      { wch: 20 },  // Çalıştığı Şantiye
      { wch: 15 }   // Odaya Giriş Tarihi
    ];

    // Satır yüksekliklerini ayarla
    const workersRowInfo: Array<{ hpt: number }> = [];
    workersRowInfo[0] = { hpt: 30 }; // Başlık satırı yüksekliği

    // Tüm satırlar için standart yükseklik
    for (let i = 1; i <= workersData.length + 1; i++) {
      workersRowInfo[i] = { hpt: 25 };
    }

    wsWorkers['!rows'] = workersRowInfo;

    // İşçi Listesi sayfasını ekle
    XLSX.utils.book_append_sheet(wb, wsWorkers, 'İşçi Listesi');

    // Excel dosyasını indir
    XLSX.writeFile(wb, `Kamp Raporu, ${formattedDate}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[url('/arka-plan-guncel-2.jpg')] bg-cover bg-center bg-fixed">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Başlık ve Excel İndirme Butonu */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
              <p className="text-gray-600">Detaylı istatistikler ve raporlar</p>
            </div>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel'e Aktar
            </button>
          </div>
        </div>

        {/* Genel İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Toplam Kapasite</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalCapacity}</p>
            <p className="text-sm text-gray-500 mt-2">Yatak</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Doluluk Oranı</h3>
            <p className="text-3xl font-bold text-green-600">%{typeof stats.occupancyRate === 'number' ? stats.occupancyRate.toFixed(1) : '0.0'}</p>
            <p className="text-sm text-gray-500 mt-2">Ortalama</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Toplam İşçi</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.totalWorkers}</p>
            <p className="text-sm text-gray-500 mt-2">Kişi</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni İşçiler</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.recentWorkers}</p>
            <p className="text-sm text-gray-500 mt-2">Son 7 gün</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Yatak Durumu */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Yatak Durumu</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64">
                <Pie data={pieData} options={pieOptions} />
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Dolu Yatak</p>
                  <p className="text-2xl font-semibold text-red-900">{stats.occupiedBeds}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-700">Boş Yatak</p>
                  <p className="text-2xl font-semibold text-green-900">{stats.availableBeds}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Şantiye Bazlı İşçi Dağılımı */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Şantiye Bazlı İşçi Dağılımı</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64">
                <Bar data={barData} options={barOptions} />
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">Slava 4</p>
                  <p className="text-2xl font-semibold text-blue-900">{stats.slava4Workers}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-medium text-indigo-700">Slava 2-3</p>
                  <p className="text-2xl font-semibold text-indigo-900">{stats.slava23Workers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detaylı İstatistikler */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Şantiye Bazlı Oda Dağılımı */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Şantiye Bazlı Oda Dağılımı</h2>
            <div className="space-y-6">
              <div 
                className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200"
                onClick={() => handleProjectClick('Slava 4')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-white">Slava 4</h3>
                    <p className="text-sm text-blue-100">Toplam {stats.slava4Rooms} Oda</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {stats.projectDistribution['Slava 4']?.occupancyRate ? 
                        stats.projectDistribution['Slava 4'].occupancyRate.toFixed(1) : '0.0'}%
                    </p>
                    <p className="text-sm text-blue-100">Doluluk</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-400 border-opacity-30">
                  <div className="flex justify-between items-center text-white">
                    <p className="text-sm opacity-90">Toplam İşçi</p>
                    <p className="text-lg font-semibold">{stats.crossProjectStats['Slava 4']?.totalWorkers || 0} Kişi</p>
                  </div>
                  <div className="flex justify-between items-center text-white mt-2">
                    <p className="text-sm opacity-90">Farklı Projede Çalışan</p>
                    <p className="text-lg font-semibold">{stats.crossProjectStats['Slava 4']?.otherProjectWorkers || 0} Kişi</p>
                  </div>
                </div>
              </div>

              <div 
                className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200"
                onClick={() => handleProjectClick('Slava 2-3')}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-white">Slava 2-3</h3>
                    <p className="text-sm text-indigo-100">Toplam {stats.slava23Rooms} Oda</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {stats.projectDistribution['Slava 2-3']?.occupancyRate ? 
                        stats.projectDistribution['Slava 2-3'].occupancyRate.toFixed(1) : '0.0'}%
                    </p>
                    <p className="text-sm text-indigo-100">Doluluk</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-400 border-opacity-30">
                  <div className="flex justify-between items-center text-white">
                    <p className="text-sm opacity-90">Toplam İşçi</p>
                    <p className="text-lg font-semibold">{stats.crossProjectStats['Slava 2-3']?.totalWorkers || 0} Kişi</p>
                  </div>
                  <div className="flex justify-between items-center text-white mt-2">
                    <p className="text-sm opacity-90">Farklı Projede Çalışan</p>
                    <p className="text-lg font-semibold">{stats.crossProjectStats['Slava 2-3']?.otherProjectWorkers || 0} Kişi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Oda İstatistikleri */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Oda İstatistikleri</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-700">Ortalama Doluluk</p>
                  <p className="text-2xl font-semibold text-purple-900">
                    {stats.averageOccupancyPerRoom.toFixed(1)}
                  </p>
                  <p className="text-sm text-purple-600">Kişi/Oda</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-700">Toplam Oda</p>
                  <p className="text-2xl font-semibold text-orange-900">{stats.totalRooms}</p>
                  <p className="text-sm text-orange-600">Adet</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">En Dolu Oda</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.mostOccupiedRoom}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">En Boş Oda</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.leastOccupiedRoom}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Oda Detayları Modalı */}
      {showRoomModal && selectedProject && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{selectedProject} Odaları</h3>
              <button
                onClick={() => setShowRoomModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oda No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kapasite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doluluk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doluluk Oranı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedRooms.map((room) => (
                    <tr key={room._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {room.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {room.capacity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {room.workers.length}/{room.capacity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        %{((room.workers.length / room.capacity) * 100).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Toplam
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {selectedRooms.reduce((sum, room) => sum + room.capacity, 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {selectedRooms.reduce((sum, room) => sum + room.workers.length, 0)}/
                      {selectedRooms.reduce((sum, room) => sum + room.capacity, 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      %{(selectedRooms.reduce((sum, room) => sum + room.workers.length, 0) / 
                         selectedRooms.reduce((sum, room) => sum + room.capacity, 0) * 100).toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 