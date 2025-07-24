'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface Worker {
  id: number;
  name: string;
  surname: string;
  registrationNumber: string;
  project: string;
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

interface ProjectOption {
  company: string;
  project: string;
  label: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);
  const [newRoom, setNewRoom] = useState({
    number: '',
    capacity: 1,
    projectOption: ''
  });
  const [newWorker, setNewWorker] = useState({
    name: '',
    surname: '',
    registrationNumber: '',
    project: ''
  });
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [editWorker, setEditWorker] = useState({
    name: '',
    surname: '',
    registrationNumber: '',
    project: ''
  });

  const projectOptions: ProjectOption[] = [
    { company: 'Slava', project: '4', label: 'Slava 4' },
    { company: 'Slava', project: '2-3', label: 'Slava 2-3' }
  ];

  // Örnek veriler
  const defaultRooms: Room[] = [
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
  ];

  const [rooms, setRooms] = useState<Room[]>([]);

  // LocalStorage'dan odaları yükle
  useEffect(() => {
    const savedRooms = localStorage.getItem('rooms');
    if (savedRooms) {
      setRooms(JSON.parse(savedRooms));
    } else {
      // İlk kez yükleniyorsa örnek verileri kaydet
      setRooms(defaultRooms);
      localStorage.setItem('rooms', JSON.stringify(defaultRooms));
    }
  }, []);

  // Odalar değiştiğinde localStorage ve istatistikleri güncelle
  useEffect(() => {
    if (rooms.length > 0) {
      localStorage.setItem('rooms', JSON.stringify(rooms));
      updateDashboardStats();
    }
  }, [rooms]);

  // Dashboard istatistiklerini güncelle
  const updateDashboardStats = () => {
    const totalWorkers = rooms.reduce((sum, room) => sum + room.workers.length, 0);
    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const availableBeds = rooms.reduce((sum, room) => sum + room.availableBeds, 0);
    const occupiedBeds = totalBeds - availableBeds;
    const availableRooms = rooms.filter(room => room.availableBeds > 0).length;
    const occupiedRooms = rooms.filter(room => room.availableBeds === 0).length;

    const dashboardStats = {
      totalWorkers,
      availableRooms,
      occupiedRooms,
      totalCapacity: rooms.length,
      totalBeds,
      availableBeds,
      occupiedBeds
    };

    localStorage.setItem('dashboardStats', JSON.stringify(dashboardStats));
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProject = projectOptions.find(opt => opt.label === newRoom.projectOption);
    if (!selectedProject) return;

    const room: Room = {
      id: Math.max(0, ...rooms.map(r => r.id)) + 1,
      number: newRoom.number,
      capacity: newRoom.capacity,
      company: selectedProject.company,
      project: selectedProject.project,
      availableBeds: newRoom.capacity,
      workers: []
    };

    setRooms([...rooms, room]);
    setShowAddRoomModal(false);
    setNewRoom({
      number: '',
      capacity: 1,
      projectOption: ''
    });
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const worker: Worker = {
      id: Math.max(0, ...selectedRoom.workers.map(w => w.id)) + 1,
      name: newWorker.name,
      surname: newWorker.surname,
      registrationNumber: newWorker.registrationNumber,
      project: newWorker.project
    };

    const updatedRooms = rooms.map(room => {
      if (room.id === selectedRoom.id) {
        return {
          ...room,
          workers: [...room.workers, worker],
          availableBeds: room.availableBeds - 1
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    setShowAddWorkerModal(false);
    setNewWorker({
      name: '',
      surname: '',
      registrationNumber: '',
      project: ''
    });
  };

  const toggleRoomExpand = (room: Room) => {
    if (expandedRoomId === room.id) {
      setExpandedRoomId(null);
    } else {
      setExpandedRoomId(room.id);
    }
  };

  const handleDeleteRoom = (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation();
    if (window.confirm('Bu odayı silmek istediğinizden emin misiniz?')) {
      setRooms(rooms.filter(room => room.id !== roomId));
    }
  };

  const handleEditWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !selectedWorker) return;

    const updatedRooms = rooms.map(room => {
      if (room.id === selectedRoom.id) {
        const updatedWorkers = room.workers.map(worker => {
          if (worker.id === selectedWorker.id) {
            return {
              ...worker,
              name: editWorker.name,
              surname: editWorker.surname,
              registrationNumber: editWorker.registrationNumber,
              project: editWorker.project
            };
          }
          return worker;
        });
        return { ...room, workers: updatedWorkers };
      }
      return room;
    });

    setRooms(updatedRooms);
    setShowEditWorkerModal(false);
    setSelectedWorker(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('selectedCampId');
    router.push('/login');
  };

  // İşçiyi odadan silme fonksiyonu
  const handleRemoveWorker = (roomNumber: string, workerId: number) => {
    const updatedRooms = rooms.map(room => {
      if (room.number === roomNumber) {
        return {
          ...room,
          workers: room.workers.filter(worker => worker.id !== workerId),
          availableBeds: room.availableBeds + 1
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));
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
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Odalar</h3>
              <button
                onClick={() => {
                  // İlk şantiye seçeneğini default olarak seç
                  if (projectOptions.length > 0) {
                    setNewRoom(prev => ({ ...prev, projectOption: projectOptions[0].label }));
                  }
                  setShowAddRoomModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Yeni Oda Ekle
              </button>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {rooms.map((room) => (
                  <li key={room.id} className="hover:bg-gray-50">
                    <div 
                      className="px-4 py-4 sm:px-6 cursor-pointer"
                      onClick={() => toggleRoomExpand(room)}
                    >
                      <div className="flex items-center">
                        <div className={`h-3 w-3 rounded-full ${room.availableBeds > 0 ? 'bg-green-500' : 'bg-red-500'} mr-4`}></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-gray-900">
                                Oda {room.number}
                              </p>
                              <span className="text-gray-400">|</span>
                              <p className="text-sm text-gray-500">
                                Kapasite: {room.capacity}
                              </p>
                              <span className="text-gray-400">|</span>
                              <p className="text-sm text-gray-500">
                                {room.company} {room.project}
                              </p>
                              <span className="text-gray-400">|</span>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm ${room.availableBeds > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {room.capacity - room.availableBeds}/{room.capacity} Dolu Yatak
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={(e) => handleDeleteRoom(e, room.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Oda Detayları */}
                    {expandedRoomId === room.id && (
                      <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-900">Odada Kalanlar</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoom(room);
                                // Seçili odanın şantiyesini default olarak seç
                                setNewWorker(prev => ({ ...prev, project: room.project }));
                                setShowAddWorkerModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-2"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Yeni İşçi Ekle</span>
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ad Soyad
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sicil No
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Şantiye
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    İşlemler
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {room.workers.map((worker) => (
                                  <tr key={worker.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {worker.name} {worker.surname}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {worker.registrationNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {worker.project}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => {
                                            setSelectedRoom(room);
                                            setSelectedWorker(worker);
                                            setEditWorker({
                                              name: worker.name,
                                              surname: worker.surname,
                                              registrationNumber: worker.registrationNumber,
                                              project: worker.project
                                            });
                                            setShowEditWorkerModal(true);
                                          }}
                                          className="text-gray-400 hover:text-gray-500"
                                        >
                                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleRemoveWorker(room.number, worker.id)}
                                          className="text-gray-400 hover:text-red-500"
                                        >
                                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {room.availableBeds > 0 && Array.from({ length: room.availableBeds }).map((_, index) => (
                                  <tr key={`empty-${index}`} className="group hover:bg-gray-50">
                                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRoom(room);
                                          setShowAddWorkerModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-2"
                                      >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Yeni İşçi Ekle</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Yeni Oda Ekleme Modalı */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
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

      {/* İşçi Ekleme Modalı */}
      {showAddWorkerModal && selectedRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Oda {selectedRoom.number} - Yeni İşçi Ekle
              </h2>
              <button
                onClick={() => setShowAddWorkerModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div>
                <label htmlFor="worker-name" className="block text-sm font-medium text-gray-700">
                  Ad
                </label>
                <input
                  type="text"
                  id="worker-name"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({...newWorker, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="worker-surname" className="block text-sm font-medium text-gray-700">
                  Soyad
                </label>
                <input
                  type="text"
                  id="worker-surname"
                  value={newWorker.surname}
                  onChange={(e) => setNewWorker({...newWorker, surname: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="worker-registration" className="block text-sm font-medium text-gray-700">
                  Sicil Numarası
                </label>
                <input
                  type="text"
                  id="worker-registration"
                  value={newWorker.registrationNumber}
                  onChange={(e) => setNewWorker({...newWorker, registrationNumber: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="worker-project" className="block text-sm font-medium text-gray-700">
                  Şantiye
                </label>
                <select
                  id="worker-project"
                  value={newWorker.project}
                  onChange={(e) => setNewWorker({...newWorker, project: e.target.value})}
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
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
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

      {/* İşçi Düzenleme Modalı */}
      {showEditWorkerModal && selectedRoom && selectedWorker && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                İşçi Bilgilerini Düzenle
              </h2>
              <button
                onClick={() => setShowEditWorkerModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditWorker} className="space-y-4">
              <div>
                <label htmlFor="edit-worker-name" className="block text-sm font-medium text-gray-700">
                  Ad
                </label>
                <input
                  type="text"
                  id="edit-worker-name"
                  value={editWorker.name}
                  onChange={(e) => setEditWorker({...editWorker, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-worker-surname" className="block text-sm font-medium text-gray-700">
                  Soyad
                </label>
                <input
                  type="text"
                  id="edit-worker-surname"
                  value={editWorker.surname}
                  onChange={(e) => setEditWorker({...editWorker, surname: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-worker-registration" className="block text-sm font-medium text-gray-700">
                  Sicil Numarası
                </label>
                <input
                  type="text"
                  id="edit-worker-registration"
                  value={editWorker.registrationNumber}
                  onChange={(e) => setEditWorker({...editWorker, registrationNumber: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-worker-project" className="block text-sm font-medium text-gray-700">
                  Şantiye
                </label>
                <select
                  id="edit-worker-project"
                  value={editWorker.project}
                  onChange={(e) => setEditWorker({...editWorker, project: e.target.value})}
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
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditWorkerModal(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 