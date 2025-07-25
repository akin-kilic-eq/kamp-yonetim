'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cache } from '@/app/lib/cache';

interface Room {
  id: number;
  number: string;
  capacity: number;
  company: string;
  project: string;
  availableBeds: number;
  workers: Worker[];
}

interface Worker {
  id: number;
  name: string;
  surname: string;
  registrationNumber: string;
  project: string;
}

interface CampStats {
  name: string;
  totalRooms: number;
  totalCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
  totalWorkers: number;
  occupancyRate: number;
}

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  site?: string;
  isPublic?: boolean;
  sharedWithSites?: string[];
}

interface Site {
  _id: string;
  name: string;
  description?: string;
}

interface SiteStats {
  [key: string]: {
    rooms: number;
    capacity: number;
    workers: number;
    occupancyRate: number;
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [campStats, setCampStats] = useState<CampStats[]>([]);
  const [siteStats, setSiteStats] = useState<SiteStats>({});
  const [totalStats, setTotalStats] = useState({
    totalRooms: 0,
    totalCapacity: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0,
  });
  const [currentCamp, setCurrentCamp] = useState<Camp | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde cache'i kontrol et ve gerekirse temizle
    if (typeof window !== 'undefined') {
      // Performance Navigation API ile sayfa yenilenip yenilenmediğini kontrol et
      if (performance.navigation.type === 1) {
        cache.forceClear();
        console.log('Raporlar: Sayfa yenilendi, cache temizlendi');
      }
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Kamp bilgilerini al
        const campData = localStorage.getItem('currentCamp');
        if (campData) {
          const camp = JSON.parse(campData) as Camp;
          setCurrentCamp(camp);
          
          // Şantiyeleri getir
          const sitesResponse = await fetch('/api/sites');
          const sitesData = await sitesResponse.json();
          setSites(sitesData);
          
          // Kamp ortak kullanım ayarlarına göre şantiyeleri belirle
          let availableSites: Site[] = [];
          
          console.log('Kamp bilgileri:', camp);
          console.log('Tüm şantiyeler:', sitesData);
          
          if (camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) {
            // Ortak kullanım açıksa, paylaşılan şantiyeler + kampın kendi şantiyesi
            availableSites = sitesData.filter((site: Site) => 
              site.name === camp.site || camp.sharedWithSites!.includes(site._id)
            );
            console.log('Ortak kullanım açık, kullanılabilir şantiyeler:', availableSites);
          } else {
            // Ortak kullanım kapalıysa, sadece kampın kendi şantiyesi
            const campSite = sitesData.find((site: Site) => site.name === camp.site);
            if (campSite) {
              availableSites = [campSite];
            }
            console.log('Ortak kullanım kapalı, kamp şantiyesi:', campSite);
          }
          
          // Kamp ortak kullanım ayarlarına göre odaları getir
          const roomsResponse = await fetch(`/api/rooms?campId=${camp._id}`);
          const allRooms = await roomsResponse.json();
          
          console.log('Tüm odalar:', allRooms);
          
          // Sadece mevcut şantiyelerin odalarını filtrele
          const filteredRooms = allRooms.filter((room: any) => 
            availableSites.some(site => site.name === room.project)
          );
          
          console.log('Filtrelenmiş odalar:', filteredRooms);
          
          setRooms(filteredRooms);
          
          // Şantiye bazlı istatistikleri hesapla
          const siteStatsData: SiteStats = {};
          availableSites.forEach(site => {
            siteStatsData[site.name] = { rooms: 0, capacity: 0, workers: 0, occupancyRate: 0 };
          });
          
          filteredRooms.forEach((room: any) => {
            if (siteStatsData[room.project]) {
              siteStatsData[room.project].rooms += 1;
              siteStatsData[room.project].capacity += room.capacity;
              siteStatsData[room.project].workers += (room.workers?.length || 0);
            }
          });
          
          // Doluluk oranlarını hesapla
          Object.keys(siteStatsData).forEach(siteName => {
            if (siteStatsData[siteName].capacity > 0) {
              siteStatsData[siteName].occupancyRate = (siteStatsData[siteName].workers / siteStatsData[siteName].capacity) * 100;
            }
          });
          
          setSiteStats(siteStatsData);
          calculateStats(filteredRooms, camp, sitesData);
        }
      } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const calculateStats = (rooms: Room[], camp: Camp, sites: Site[]) => {
    // Kamp ortak kullanım ayarlarına göre şantiyeleri belirle
    let availableSites: Site[] = [];
    
    if (camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) {
      // Ortak kullanım açıksa, paylaşılan şantiyeler + kampın kendi şantiyesi
      availableSites = sites.filter(site => 
        site.name === camp.site || camp.sharedWithSites!.includes(site._id)
      );
    } else {
      // Ortak kullanım kapalıysa, sadece kampın kendi şantiyesi
      const campSite = sites.find(site => site.name === camp.site);
      if (campSite) {
        availableSites = [campSite];
      }
    }
    
    // Her şantiye için istatistikleri hesapla
    const stats = availableSites.map(site => {
      const siteRooms = rooms.filter(room => room.project === site.name);
      const totalRooms = siteRooms.length;
      const totalCapacity = siteRooms.reduce((sum, room) => sum + room.capacity, 0);
      const availableBeds = siteRooms.reduce((sum, room) => sum + room.availableBeds, 0);
      const occupiedBeds = totalCapacity - availableBeds;
      const totalWorkers = siteRooms.reduce((sum, room) => sum + (room.workers?.length || 0), 0);
      const occupancyRate = totalCapacity > 0 ? (occupiedBeds / totalCapacity) * 100 : 0;

      return {
        name: site.name,
        totalRooms,
        totalCapacity,
        occupiedBeds,
        availableBeds,
        totalWorkers,
        occupancyRate
      };
    });

    setCampStats(stats);

    // Genel istatistikleri hesapla (zaten filtrelenmiş odalar)
    const total = {
      totalRooms: rooms.length,
      totalCapacity: rooms.reduce((sum, room) => sum + room.capacity, 0),
      availableBeds: rooms.reduce((sum, room) => sum + room.availableBeds, 0),
      occupiedBeds: rooms.reduce((sum, room) => sum + (room.capacity - room.availableBeds), 0),
      occupancyRate: 0
    };
    total.occupancyRate = total.totalCapacity > 0 ? (total.occupiedBeds / total.totalCapacity) * 100 : 0;

    setTotalStats(total);
  };

  const handleLogout = () => {
    localStorage.removeItem('selectedCampId');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Üst Menü */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img
                  src="/antteq-logo.png"
                  alt="ANTTEQ Logo"
                  className="h-8 w-auto"
                />
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Ana Sayfa
                </Link>
                <Link
                  href="/dashboard/workers"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  İşçiler
                </Link>
                <Link
                  href="/dashboard/rooms"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Odalar
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Raporlar
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button 
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="flex justify-center items-center h-96">
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
          ) : (
            <>
              {/* Genel İstatistikler */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Genel İstatistikler</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-gray-500">Toplam Oda</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalStats.totalRooms}</dd>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-gray-500">Toplam Yatak</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalStats.totalCapacity}</dd>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-gray-500">Dolu Yatak</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalStats.occupiedBeds}</dd>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-gray-500">Boş Yatak</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalStats.availableBeds}</dd>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-gray-500">Doluluk Oranı</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">%{totalStats.occupancyRate.toFixed(1)}</dd>
                </div>
              </div>
            </div>
          </div>

          {/* Şantiye Bazında İstatistikler */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Şantiye Bazında İstatistikler</h3>
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şantiye
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oda Sayısı
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam Yatak
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dolu Yatak
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boş Yatak
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşçi Sayısı
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doluluk Oranı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(siteStats).map(([siteName, siteData]) => (
                    <tr key={siteName}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {siteName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {siteData.rooms}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {siteData.capacity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {siteData.workers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {siteData.capacity - siteData.workers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {siteData.workers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        %{siteData.occupancyRate.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 