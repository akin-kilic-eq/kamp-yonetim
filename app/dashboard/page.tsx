'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cache } from '@/app/lib/cache';
import PWAInstallButton from '../../components/PWAInstallButton';

interface Worker {
  id: number;
  name: string;
  surname: string;
  registrationNumber: string;
  project: string;
  roomNumber?: string;
}

interface Room {
  id: number;
  number: string;
  capacity: number;
  company: string;
  project: string;
  availableBeds: number;
  workers: Worker[];
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

export default function DashboardPage() {
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    number: '',
    capacity: 1,
    projectOption: ''
  });
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  
  const [stats, setStats] = useState({
    totalWorkers: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    totalCapacity: 0,
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0
  });

  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [step, setStep] = useState<'search' | 'select'>('search');

  const router = useRouter();
  const [currentCamp, setCurrentCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde cache'i kontrol et ve gerekirse temizle
    if (typeof window !== 'undefined') {
      // Performance Navigation API ile sayfa yenilenip yenilenmediğini kontrol et
      if (performance.navigation.type === 1) {
        cache.forceClear();
        console.log('Dashboard: Sayfa yenilendi, cache temizlendi');
      }
    }

    const loadCampData = async () => {
      try {
        setLoading(true);
        
        // Kamp bilgilerini al
        const campData = localStorage.getItem('currentCamp');
        if (campData) {
          const camp = JSON.parse(campData) as Camp;
          setCurrentCamp(camp);
        }
      } catch (error) {
        console.error('Kamp verileri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCampData();
  }, []);

  // Sayfa yüklendiğinde animasyonları tetikle
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoaded(true);
    }, 500); // Daha yumuşak geçiş için süreyi artırdım
    return () => clearTimeout(timer);
  }, []);

  const projectOptions = [
    { company: 'Slava', project: '4', label: 'Slava 4' },
    { company: 'Slava', project: '2-3', label: 'Slava 2-3' }
  ];

  // Örnek odalar verisi (gerçek uygulamada API'den gelecek)
  const [exampleRooms] = useState<Room[]>([
    {
      id: 1,
      number: "101",
      capacity: 4,
      company: "Slava",
      project: "4",
      availableBeds: 1,
      workers: [
        {
          id: 1,
          name: "Ahmet",
          surname: "Yılmaz",
          registrationNumber: "SLV001",
          project: "Slava 4"
        },
        {
          id: 2,
          name: "Mehmet",
          surname: "Kaya",
          registrationNumber: "SLV002",
          project: "Slava 4"
        },
        {
          id: 3,
          name: "Ali",
          surname: "Demir",
          registrationNumber: "SLV003",
          project: "Slava 4"
        }
      ]
    },
    {
      id: 2,
      number: "102",
      capacity: 4,
      company: "Slava",
      project: "2-3",
      availableBeds: 0,
      workers: [
        {
          id: 4,
          name: "Veli",
          surname: "Şahin",
          registrationNumber: "SLV004",
          project: "Slava 2-3"
        },
        {
          id: 5,
          name: "Hasan",
          surname: "Yıldız",
          registrationNumber: "SLV005",
          project: "Slava 2-3"
        },
        {
          id: 6,
          name: "Hüseyin",
          surname: "Çelik",
          registrationNumber: "SLV006",
          project: "Slava 2-3"
        },
        {
          id: 7,
          name: "İbrahim",
          surname: "Arslan",
          registrationNumber: "SLV007",
          project: "Slava 2-3"
        }
      ]
    },
    {
      id: 3,
      number: "103",
      capacity: 6,
      company: "Slava",
      project: "4",
      availableBeds: 2,
      workers: [
        {
          id: 8,
          name: "Mustafa",
          surname: "Aydın",
          registrationNumber: "SLV008",
          project: "Slava 4"
        },
        {
          id: 9,
          name: "Kemal",
          surname: "Özdemir",
          registrationNumber: "SLV009",
          project: "Slava 4"
        },
        {
          id: 10,
          name: "Osman",
          surname: "Kılıç",
          registrationNumber: "SLV010",
          project: "Slava 4"
        },
        {
          id: 11,
          name: "Yaşar",
          surname: "Erdoğan",
          registrationNumber: "SLV011",
          project: "Slava 4"
        }
      ]
    }
  ]);

  // Örnek odaları rooms state'ine aktar
  useEffect(() => {
    setRooms(exampleRooms);
  }, [exampleRooms]);

  // İstatistikleri localStorage'dan yükle
  useEffect(() => {
    const loadStats = () => {
      const savedStats = localStorage.getItem('dashboardStats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    };

    // Sayfa yüklendiğinde ve her 2 saniyede bir istatistikleri güncelle
    loadStats();
    const interval = setInterval(loadStats, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Odaları localStorage'dan al
    const savedRooms = localStorage.getItem('rooms');
    if (savedRooms) {
      const parsedRooms = JSON.parse(savedRooms);
      setRooms(parsedRooms);
      
      // Tüm odalardaki işçileri topla
      const allWorkers: Worker[] = [];
      parsedRooms.forEach((room: Room) => {
        room.workers.forEach(worker => {
          allWorkers.push({
            ...worker,
            roomNumber: room.number
          });
        });
      });
      setWorkers(allWorkers);
    }
  }, []);

  // İşçileri filtrele
  const filteredWorkers = workers.filter(worker => {
    const fullName = `${worker.name} ${worker.surname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Oda değiştirme işlemi
  const handleChangeRoom = () => {
    if (!selectedWorker || !selectedRoom) return;

    const updatedRooms = rooms.map(room => {
      if (room.number === selectedRoom) {
        // Eğer işçi başka bir odada kalıyorsa, o odadan çıkar
        const oldRoom = rooms.find(r => 
          r.workers.some(w => w.registrationNumber === selectedWorker.registrationNumber)
        );
        if (oldRoom) {
          oldRoom.workers = oldRoom.workers.filter(
            w => w.registrationNumber !== selectedWorker.registrationNumber
          );
          oldRoom.availableBeds += 1;
        }

        // Yeni odaya ekle
        return {
          ...room,
          workers: [...room.workers, selectedWorker],
          availableBeds: room.availableBeds - 1
        };
      }
      return room;
    });

    // İşçi listesini güncelle
    const updatedWorkers = workers.map(worker => {
      if (worker.id === selectedWorker.id) {
        return { ...worker, roomNumber: selectedRoom };
      }
      return worker;
    });

    setRooms(updatedRooms);
    setWorkers(updatedWorkers);
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));
    setShowChangeRoomModal(false);
    setSelectedWorker(null);
    setSelectedRoom('');
    setStep('search');
    setSearchTerm('');
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    // localStorage'dan mevcut odaları al
    const savedRooms = localStorage.getItem('rooms');
    const currentRooms = savedRooms ? JSON.parse(savedRooms) : [];
    
    // Oda numarası kontrolü
    const isRoomExists = currentRooms.some((room: Room) => room.number === newRoom.number);
    if (isRoomExists) {
      alert('Bu oda numarası zaten kullanımda!');
      return;
    }

    const selectedProject = projectOptions.find(opt => opt.label === newRoom.projectOption);
    if (!selectedProject) {
      alert('Lütfen bir şantiye seçin!');
      return;
    }

    const room: Room = {
      id: Math.max(0, ...currentRooms.map((r: Room) => r.id)) + 1,
      number: newRoom.number,
      capacity: newRoom.capacity,
      company: selectedProject.company,
      project: selectedProject.project,
      availableBeds: newRoom.capacity,
      workers: []
    };

    // Yeni odayı ekle ve localStorage'ı güncelle
    const updatedRooms = [...currentRooms, room];
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));

    // Dashboard istatistiklerini güncelle
    const totalWorkers = updatedRooms.reduce((sum, r) => sum + r.workers.length, 0);
    const totalBeds = updatedRooms.reduce((sum, r) => sum + r.capacity, 0);
    const availableBeds = updatedRooms.reduce((sum, r) => sum + r.availableBeds, 0);
    const occupiedBeds = totalBeds - availableBeds;
    const availableRooms = updatedRooms.filter(r => r.availableBeds > 0).length;
    const occupiedRooms = updatedRooms.filter(r => r.availableBeds === 0).length;

    const dashboardStats = {
      totalWorkers,
      availableRooms,
      occupiedRooms,
      totalCapacity: updatedRooms.length,
      totalBeds,
      availableBeds,
      occupiedBeds
    };

    localStorage.setItem('dashboardStats', JSON.stringify(dashboardStats));

    setShowAddRoomModal(false);
    setNewRoom({ number: '', capacity: 1, projectOption: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('selectedCampId');
    router.push('/login');
  };

  return (
    <div className={`min-h-screen bg-gray-50 transition-all duration-700 ease-out ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Üst Menü */}
      <nav className={`bg-white shadow-lg transition-all duration-500 ease-out ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
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
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Raporlar
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <PWAInstallButton />
              <button
                onClick={() => router.push('/camps')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 hover:scale-105 transition-all duration-300 ease-out transform hover:shadow-lg"
              >
                Kamplarım
              </button>
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
      <main className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 transition-all duration-600 ease-out ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* İstatistik Kartları */}
        <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-700 ease-out ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-600 ease-out hover:shadow-xl hover:scale-105 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.1s' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Toplam İşçi
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalWorkers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-600 ease-out hover:shadow-xl hover:scale-105 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.2s' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Boş Odalar
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.availableRooms}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-600 ease-out hover:shadow-xl hover:scale-105 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.3s' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Boş Yataklar
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.availableBeds}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-600 ease-out hover:shadow-xl hover:scale-105 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.4s' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Dolu Yataklar
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.occupiedBeds}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hızlı İşlemler Başlığı */}
        <div className={`mt-12 transition-all duration-700 ease-out ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.5s' }}>
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Hızlı İşlemler</h2>
        </div>

        {/* Oda Değiştirme Kartı */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 ease-out ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.6s' }}>
          <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-600 ease-out hover:shadow-xl hover:scale-105 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.7s' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Oda Değiştir
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        Hızlı İşlem
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <button
                  onClick={() => {
                    setShowChangeRoomModal(true);
                    setStep('search');
                  }}
                  className="font-medium text-blue-600 hover:text-blue-900"
                >
                  İşçi Seç ve Oda Değiştir
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Oda Ekleme Modalı */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center transition-all duration-300 ease-out animate-in fade-in">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4 scale-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Yeni Oda Ekle</h2>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label htmlFor="room-number" className="block text-sm font-medium text-gray-700">
                  Oda Numarası
                </label>
                <input
                  type="text"
                  id="room-number"
                  value={newRoom.number}
                  onChange={(e) => setNewRoom({...newRoom, number: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="project" className="block text-sm font-medium text-gray-700">
                  Şantiye
                </label>
                <select
                  id="project"
                  value={newRoom.projectOption}
                  onChange={(e) => setNewRoom({...newRoom, projectOption: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Şantiye Seçin</option>
                  {projectOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                  Kapasite
                </label>
                <input
                  type="number"
                  id="capacity"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  min="1"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Oda Değiştirme Modalı */}
      {showChangeRoomModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center transition-all duration-300 ease-out animate-in fade-in">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4 scale-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {step === 'search' ? 'İşçi Ara' : 'Oda Seç'}
              </h3>
              <button
                onClick={() => {
                  setShowChangeRoomModal(false);
                  setSelectedWorker(null);
                  setSelectedRoom('');
                  setStep('search');
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {step === 'search' ? (
              <>
                <div className="mb-4">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    İşçi İsmi veya Soyismi
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Aramak için yazın..."
                  />
                </div>

                <div className="max-h-60 overflow-y-auto mb-4">
                  {filteredWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      onClick={() => {
                        setSelectedWorker(worker);
                        setStep('select');
                      }}
                      className="p-3 hover:bg-gray-100 cursor-pointer rounded-md"
                    >
                      <div className="font-medium">{worker.name} {worker.surname}</div>
                      <div className="text-sm text-gray-500">
                        Sicil No: {worker.registrationNumber}
                        {worker.roomNumber && ` - Oda: ${worker.roomNumber}`}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="font-medium mb-2">Seçili İşçi:</div>
                  <div className="text-sm text-gray-500">
                    {selectedWorker?.name} {selectedWorker?.surname} - {selectedWorker?.registrationNumber}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="room" className="block text-sm font-medium text-gray-700">
                    Yeni Oda
                  </label>
                  <select
                    id="room"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Oda Seçin</option>
                    {rooms
                      .filter(room => {
                        // İşçinin projesini parçala (örn: "Slava 4" -> "4")
                        const workerProjectNumber = selectedWorker?.project.split(' ')[1];
                        return (
                          room.availableBeds > 0 &&
                          room.project === workerProjectNumber &&
                          room.number !== selectedWorker?.roomNumber
                        );
                      })
                      .map(room => (
                        <option key={room.id} value={room.number}>
                          Oda {room.number} ({room.availableBeds} boş yatak)
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowChangeRoomModal(false);
                  setSelectedWorker(null);
                  setSelectedRoom('');
                  setStep('search');
                  setSearchTerm('');
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                İptal
              </button>
              {step === 'select' && (
                <button
                  onClick={handleChangeRoom}
                  disabled={!selectedRoom}
                  className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    selectedRoom ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Odasını Değiştir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 