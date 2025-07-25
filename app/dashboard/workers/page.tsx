'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Örnek işçi verileri
  const exampleWorkers: Worker[] = [
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
      project: "Slava 2-3"
    }
  ];

  // Sayfa yüklendiğinde animasyonları tetikle
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // İşçileri ve odaları yükle
  useEffect(() => {
    // localStorage'dan odaları al
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
    } else {
      setWorkers(exampleWorkers);
    }
  }, []);

  // İşçiyi odaya ata
  const handleAssignRoom = () => {
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
    setShowAssignModal(false);
    setSelectedWorker(null);
    setSelectedRoom('');
  };

  const handleDeleteWorker = (workerId: number) => {
    const updatedWorkers = workers.filter(w => w.id !== workerId);
    
    // Odalardan da işçiyi sil
    const updatedRooms = rooms.map(room => {
      const workerInRoom = room.workers.find(w => w.id === workerId);
      if (workerInRoom) {
        return {
          ...room,
          workers: room.workers.filter(w => w.id !== workerId),
          availableBeds: room.availableBeds + 1
        };
      }
      return room;
    });

    setWorkers(updatedWorkers);
    setRooms(updatedRooms);
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));
  };

  const handleLogout = () => {
    localStorage.removeItem('selectedCampId');
    router.push('/login');
  };

  // İşçileri filtrele
  const filteredWorkers = workers.filter(worker => {
    const fullName = `${worker.name} ${worker.surname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

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
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  İşçiler
                </Link>
                <Link
                  href="/dashboard/rooms"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Odalar
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/camps')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 hover:scale-105 transition-all duration-300 ease-out"
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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className={`px-4 py-6 sm:px-0 transition-opacity duration-500 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {/* Arama Kutusu */}
          <div className={`mb-6 transition-all duration-500 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '0.1s' }}>
            <div className="max-w-md">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                İşçi Ara
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="İsim veya soyisim ile ara..."
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
              />
            </div>
          </div>

          <div className={`bg-white shadow overflow-hidden sm:rounded-lg transition-all duration-500 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '0.15s' }}>
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">İşçi Listesi</h3>
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İsim Soyisim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sicil No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şantiye
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oda No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkers.map((worker, index) => (
                    <tr key={worker.id} className={`transition-all duration-500 ${isPageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${0.2 + index * 0.03}s` }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {worker.name} {worker.surname}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{worker.registrationNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{worker.project}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {worker.roomNumber || 'Atanmamış'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(showDropdown === worker.id ? null : worker.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          {showDropdown === worker.id && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setShowDropdown(null);
                                    setSelectedWorker(worker);
                                    setShowAssignModal(true);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Oda Değiştir
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (confirm('Bu işçiyi silmek istediğinize emin misiniz?')) {
                                      handleDeleteWorker(worker.id);
                                    }
                                    setShowDropdown(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  İşçiyi Sil
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Oda Atama Modalı */}
      {showAssignModal && selectedWorker && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Oda Ata</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedWorker(null);
                  setSelectedRoom('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>İşçi:</strong> {selectedWorker.name} {selectedWorker.surname}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sicil No:</strong> {selectedWorker.registrationNumber}
              </p>
            </div>
            <div className="mb-6">
              <label htmlFor="room" className="block text-sm font-medium text-gray-700">
                Oda Seç
              </label>
              <select
                id="room"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Oda Seçin</option>
                {console.log('Selected Worker:', selectedWorker)}
                {console.log('Available Rooms:', rooms)}
                {rooms
                  .filter(room => {
                    console.log('Room:', room.number, 'Project:', room.project, 'Worker Project:', selectedWorker.project);
                    console.log('Available Beds:', room.availableBeds);
                    return (
                      room.availableBeds > 0 &&
                      room.number !== selectedWorker.roomNumber
                    );
                  })
                  .map(room => (
                    <option key={room.id} value={room.number}>
                      Oda {room.number} ({room.availableBeds} boş yatak)
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedWorker(null);
                  setSelectedRoom('');
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                İptal
              </button>
              <button
                onClick={handleAssignRoom}
                disabled={!selectedRoom}
                className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Oda Ata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 