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
import { getRooms, getWorkers, getCampStats } from '@/app/services/api';

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
  siteStats: {
    [key: string]: {
      rooms: number;
      capacity: number;
      workers: number;
      occupancyRate: number;
    };
  };
  availableSites: Array<{
    name: string;
    _id: string;
  }>;
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
    averageOccupancyPerRoom: 0,
    mostOccupiedRoom: '',
    leastOccupiedRoom: '',
    recentWorkers: 0,
    projectDistribution: {},
    crossProjectStats: {},
    siteStats: {},
    availableSites: []
  });
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [currentCamp, setCurrentCamp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const updateChartData = (siteStats: any, totalCapacity: number, occupiedBeds: number) => {
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
    const siteNames = Object.keys(siteStats);
    const siteWorkers = siteNames.map(siteName => siteStats[siteName].workers || 0);
    const colors = ['#60A5FA', '#818CF8', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

    setBarData({
      labels: siteNames,
      datasets: [
        {
          label: 'İşçi Sayısı',
          data: siteWorkers,
          backgroundColor: siteNames.map((_, index) => colors[index % colors.length]),
          borderRadius: 4,
          barThickness: 40
        }
      ]
    });
  };

  useEffect(() => {
    const campData = localStorage.getItem('currentCamp');
    if (campData) {
      const camp = JSON.parse(campData);
      setCurrentCamp(camp);
      if (camp?._id) {
        loadData(camp._id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (campId: string) => {
    try {
      setLoading(true);
      // Optimize edilmiş istatistik API'sini kullan
      const statsData = await getCampStats(campId);
  
      if (statsData.error) {
        console.error('Stats API error:', statsData.error);
        return;
      }

      // Temel istatistikleri set et
      setStats({
        totalRooms: statsData.totalRooms,
        totalCapacity: statsData.totalCapacity,
        occupiedBeds: statsData.totalWorkers,
        availableBeds: statsData.availableBeds,
        totalWorkers: statsData.totalWorkers,
        occupancyRate: statsData.occupancyRate,
        averageOccupancyPerRoom: statsData.averageOccupancyPerRoom,
        mostOccupiedRoom: statsData.mostOccupiedRoom,
        leastOccupiedRoom: statsData.leastOccupiedRoom,
        recentWorkers: 0, // Bu bilgi için ayrı sorgu gerekebilir
        projectDistribution: statsData.siteStats || {},
        crossProjectStats: statsData.crossProjectStats || {},
        siteStats: statsData.siteStats || {},
        availableSites: statsData.availableSites || []
      });

      // Grafik verilerini güncelle
      updateChartData(
        statsData.siteStats || {},
        statsData.totalCapacity,
        statsData.totalWorkers
      );

      // Detaylı veriler için ayrı çağrılar (gerekirse)
      const roomsData = await getRooms(campId);
      console.log('API\'den gelen odalar:', roomsData);
      if (Array.isArray(roomsData)) {
        setRooms(roomsData);
      }

      const workersData = await getWorkers(campId);
      console.log('API\'den gelen işçiler:', workersData);
      if (Array.isArray(workersData)) {
        setWorkers(workersData);
      }

    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: string) => {
    console.log('Tıklanan şantiye:', project);
    console.log('Mevcut odalar:', rooms);
    console.log('Odaların proje alanları:', rooms.map(room => ({ number: room.number, project: room.project })));
    
    // Daha esnek filtreleme - trim ve case insensitive
    const projectRooms = rooms.filter(room => 
      room.project && 
      room.project.trim().toLowerCase() === project.trim().toLowerCase()
    );
    console.log('Filtrelenmiş odalar:', projectRooms);
    
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
    if (!currentCamp) return;

    const campName = currentCamp.name.replace(/\s+/g, '_');
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    const fileName = `${campName}_${formattedDate}.xlsx`;

    const headerCellStyle: CellStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      font: { name: 'Times New Roman', bold: true, sz: 13 }
    };

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
      s: headerCellStyle
    }]], { origin: 'B2' });

    // B2 ve C2 hücrelerini birleştir
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 1, c: 1 }, e: { r: 1, c: 2 } });

    // Genel Durum başlığını ekle ve hücrelerini birleştir
    XLSX.utils.sheet_add_aoa(ws, [[{
      v: 'Genel Durum',
      s: headerStyle
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
      s: headerStyle
    }]], { origin: 'F4' });
    ws['!merges'].push({ s: { r: 3, c: 5 }, e: { r: 3, c: 6 } });

    // Oda Sayısı verileri
    const siteRoomsData = Object.entries(stats.siteStats).map(([siteName, siteData]) => [
      { v: siteName, s: baseStyle },
      { v: siteData.rooms, t: 'n', s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } } }
    ]);
    XLSX.utils.sheet_add_aoa(ws, siteRoomsData, { origin: 'F5' });

    // Oda Dolulukları bölümünü ekle
    XLSX.utils.sheet_add_aoa(ws, [[{
      v: 'Oda Dolulukları',
      s: headerStyle
    }]], { origin: 'I4' });
    ws['!merges'].push({ s: { r: 3, c: 8 }, e: { r: 3, c: 9 } });

    // Şantiye başlıkları
    const siteHeaders = Object.keys(stats.siteStats).map(siteName => ({
      v: siteName, 
      s: { ...headerStyle, alignment: { horizontal: 'center', vertical: 'center' } }
    }));
    XLSX.utils.sheet_add_aoa(ws, [siteHeaders], { origin: 'I5' });

    // Şantiye toplamları
    const siteTotals = Object.keys(stats.siteStats).map(siteName => ({
      v: stats.crossProjectStats[siteName]?.totalWorkers || 0, 
      t: 'n', 
      s: { ...baseStyle, fill: { fgColor: { rgb: 'D0CECE' } } }
    }));
    XLSX.utils.sheet_add_aoa(ws, [siteTotals], { origin: 'I6' });

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
      const siteWorkers = Object.keys(stats.siteStats).map(siteName => 
        roomWorkers.filter((worker: Worker) => worker.project === siteName).length
      );

      return [
        { v: index + 1, t: 'n', s: rowStyle },
        { v: room.project, s: rowStyle },
        { v: room.number, t: 'n', s: rowStyle },
        { v: room.capacity, t: 'n', s: rowStyle },
        { v: occupiedBeds, t: 'n', s: rowStyle },
        { v: availableBeds, t: 'n', s: availableBeds > 0 ? { ...rowStyle, fill: { fgColor: { rgb: 'FF0000' } } } : rowStyle },
        { v: `${typeof occupancyRate === 'number' && !isNaN(occupancyRate) ? occupancyRate.toFixed(0) : '0'}%`, s: rowStyle },
        ...siteWorkers.map(workerCount => ({ v: workerCount, t: 'n', s: rowStyle }))
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
      ...Object.keys(stats.siteStats).map(siteName => ({ v: siteName, s: headerStyle }))
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
      { v: `${((rooms.reduce((sum: number, room: Room) => sum + room.workers.length, 0) / rooms.reduce((sum: number, room: Room) => sum + room.capacity, 0)) * 100) ? 
        ((rooms.reduce((sum: number, room: Room) => sum + room.workers.length, 0) / rooms.reduce((sum: number, room: Room) => sum + room.capacity, 0)) * 100).toFixed(0) : '0'}%`, s: totalRowStyle },  // Doluluk Oranı - normal hesaplama
      ...Object.keys(stats.siteStats).map((_, index) => ({ 
        f: `SUBTOTAL(9,${String.fromCharCode(73 + index)}10:${String.fromCharCode(73 + index)}28)`, 
        t: 'n', 
        s: totalRowStyle 
      }))
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
    XLSX.utils.book_append_sheet(wb, ws, 'Kamp Raporu');

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
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-[url('/arka-plan-guncel-2.jpg')] bg-cover bg-center bg-fixed">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Görünümü */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Raporlar Yükleniyor</h3>
                <p className="text-sm text-gray-500 text-center">
                  Kamp verileri ve istatistikler hazırlanıyor, lütfen bekleyin...
                </p>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
            <p className="text-3xl font-bold text-green-600">%{typeof stats.occupancyRate === 'number' && !isNaN(stats.occupancyRate) ? stats.occupancyRate.toFixed(1) : '0.0'}</p>
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
                {Object.entries(stats.siteStats).map(([siteName, siteData], index) => {
                  const colors = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange'];
                  const color = colors[index % colors.length];
                  return (
                    <div key={siteName} className={`p-4 bg-${color}-50 rounded-lg`}>
                      <p className={`text-sm font-medium text-${color}-700`}>{siteName}</p>
                      <p className={`text-2xl font-semibold text-${color}-900`}>{siteData.workers}</p>
                    </div>
                  );
                })}
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
              {Object.entries(stats.siteStats).map(([siteName, siteData], index) => {
                const gradients = [
                  'from-blue-500 to-blue-600',
                  'from-indigo-500 to-indigo-600',
                  'from-purple-500 to-purple-600',
                  'from-pink-500 to-pink-600',
                  'from-red-500 to-red-600',
                  'from-orange-500 to-orange-600'
                ];
                const gradient = gradients[index % gradients.length];
                const borderColor = gradient.split('-')[1]; // blue, indigo, etc.
                
                return (
                  <div 
                    key={siteName}
                    className={`p-4 bg-gradient-to-r ${gradient} rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200`}
                    onClick={() => handleProjectClick(siteName)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-white">{siteName}</h3>
                        <p className="text-sm text-white opacity-80">Toplam {siteData.rooms} Oda</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">
                          {typeof siteData.occupancyRate === 'number' && !isNaN(siteData.occupancyRate) ? 
                            siteData.occupancyRate.toFixed(1) : '0.0'}%
                        </p>
                        <p className="text-sm text-white opacity-80">Doluluk</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                      <div className="flex justify-between items-center text-white">
                        <p className="text-sm opacity-90">Toplam İşçi</p>
                        <p className="text-lg font-semibold">{stats.crossProjectStats[siteName]?.totalWorkers || 0} Kişi</p>
                      </div>
                      <div className="flex justify-between items-center text-white mt-2">
                        <p className="text-sm opacity-90">Farklı Projede Çalışan</p>
                        <p className="text-lg font-semibold">{stats.crossProjectStats[siteName]?.otherProjectWorkers || 0} Kişi</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    {typeof stats.averageOccupancyPerRoom === 'number' && !isNaN(stats.averageOccupancyPerRoom) ? stats.averageOccupancyPerRoom.toFixed(1) : '0.0'}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
          onClick={() => setShowRoomModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-8 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{selectedProject} Projesindeki Odalar</h2>
            <div className="max-h-96 overflow-y-auto">
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
                        %{((room.workers.length / room.capacity) * 100) ? ((room.workers.length / room.capacity) * 100).toFixed(1) : '0.0'}
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
                         selectedRooms.reduce((sum, room) => sum + room.capacity, 0) * 100) ? 
                         (selectedRooms.reduce((sum, room) => sum + room.workers.length, 0) / 
                          selectedRooms.reduce((sum, room) => sum + room.capacity, 0) * 100).toFixed(1) : '0.0'}
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