'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaBed, FaUserFriends, FaChartPie, FaBuilding, FaDoorOpen, FaUsersCog, FaChartBar } from 'react-icons/fa';
import { getRooms } from '@/app/services/api';

interface Stats {
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
  userEmail: string;
  sharedWith?: { email: string; permission: 'read' | 'write' }[];
}

export default function CampDashboard({ params }: { params: { camp: string } }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalRooms: 0,
    totalCapacity: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    totalWorkers: 0,
    occupancyRate: 0
  });
  const [currentCamp, setCurrentCamp] = useState<Camp | null>(null);

  useEffect(() => {
    const campDataFromStorage = localStorage.getItem('currentCamp');
    if (campDataFromStorage) {
      const camp: Camp = JSON.parse(campDataFromStorage);
      setCurrentCamp(camp);
      loadStats(camp._id);
    }
  }, []);

  const loadStats = async (campId: string) => {
    try {
      const rooms = await getRooms(campId);
      if (!Array.isArray(rooms)) return;

      const totalRooms = rooms.length;
      const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
      const occupiedBeds = rooms.reduce((sum, room) => sum + (room.capacity - room.availableBeds), 0);
      const availableBeds = rooms.reduce((sum, room) => sum + room.availableBeds, 0);
      const totalWorkers = occupiedBeds;
      const occupancyRate = totalCapacity > 0 ? (occupiedBeds / totalCapacity) * 100 : 0;

      setStats({
        totalRooms,
        totalCapacity,
        occupiedBeds,
        availableBeds,
        totalWorkers,
        occupancyRate
      });
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[url('/arka-plan-guncel-2.jpg')] bg-cover bg-center bg-fixed">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 mb-8">
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentCamp?.name}</h1>
            <h2 className="text-xl text-gray-700">Kamp Yönetim Paneli</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Toplam Oda</h3>
                <FaBuilding className="text-blue-600 text-2xl" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-blue-600">{stats.totalRooms}</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Toplam Yatak</h3>
                <FaBed className="text-indigo-600 text-2xl" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-indigo-600">{stats.totalCapacity}</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Dolu Yatak</h3>
                <FaBed className="text-red-600 text-2xl" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-red-600">{stats.occupiedBeds}</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Boş Yatak</h3>
                <FaBed className="text-green-600 text-2xl" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-green-600">{stats.availableBeds}</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Toplam İşçi</h3>
                <FaUserFriends className="text-purple-600 text-2xl" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-purple-600">{stats.totalWorkers}</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Doluluk Oranı</h3>
                <FaChartPie className="text-orange-600 text-2xl" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-orange-600">%{stats.occupancyRate.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-8">
          <div 
            onClick={() => router.push(`/${params.camp}/workers`)}
            className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
          >
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <FaUsersCog className="text-white text-3xl" />
                <div>
                  <h3 className="text-lg font-medium text-white">İşçi Yönetimi</h3>
                  <p className="mt-2 text-sm text-blue-100">İşçileri görüntüle, ekle, düzenle ve sil</p>
                </div>
              </div>
            </div>
          </div>

          <div 
            onClick={() => router.push(`/${params.camp}/rooms`)}
            className="bg-gradient-to-br from-purple-500 to-purple-600 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
          >
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <FaDoorOpen className="text-white text-3xl" />
                <div>
                  <h3 className="text-lg font-medium text-white">Oda Yönetimi</h3>
                  <p className="mt-2 text-sm text-purple-100">Odaları görüntüle, ekle, düzenle ve sil</p>
                </div>
              </div>
            </div>
          </div>

          <div 
            onClick={() => router.push(`/${params.camp}/report`)}
            className="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer sm:col-span-2"
          >
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <FaChartBar className="text-white text-3xl" />
                <div>
                  <h3 className="text-lg font-medium text-white">Raporlar</h3>
                  <p className="mt-2 text-sm text-green-100">Detaylı istatistikleri ve raporları görüntüle</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}