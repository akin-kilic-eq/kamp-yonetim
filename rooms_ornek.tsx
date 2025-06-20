'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Room, Worker, Camp } from '../types';

export default function RoomsPage() {
  const params = useParams();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [campName, setCampName] = useState('');
  const [newRoom, setNewRoom] = useState({
    number: '',
    capacity: 0,
    project: ''
  });

  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({
    name: '',
    registrationNumber: '',
    project: '',
    entryDate: new Date().toISOString().split('T')[0]
  });
  
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [workerMenuPosition, setWorkerMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);

  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
  const [selectedRoomForChange, setSelectedRoomForChange] = useState('');
  const [currentCamp, setCurrentCamp] = useState<Camp | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; camps: string[] } | null>(null);

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

    // Odaları yükle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const campRooms = allRooms.filter((room: Room) => room.campId === camp.id);
    setRooms(campRooms);
    setFilteredRooms(campRooms);

    // Kamp adını ayarla
    setCampName(camp.name);
  }, [router]);

  // Arama fonksiyonu
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter(room =>
        room.number.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRooms(filtered);
    }
  }, [searchTerm, rooms]);

  const handleAddRoom = () => {
    if (!newRoom.number || !newRoom.capacity || !newRoom.project) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    // Kampı bul
    const camps = JSON.parse(localStorage.getItem('camps') || '[]');
    const currentCamp = camps.find((camp: any) => 
      camp.name.toLowerCase().replace(/\s+/g, '') === params.camp
    );

    if (!currentCamp) {
      alert('Kamp bulunamadı');
      return;
    }

    const roomData = {
      id: Date.now().toString(),
      campId: currentCamp.id,
      number: newRoom.number,
      capacity: parseInt(newRoom.capacity),
      project: newRoom.project,
      workers: [],
      availableBeds: parseInt(newRoom.capacity)
    };

    // Tüm odaları al ve yeni odayı ekle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const updatedRooms = [...allRooms, roomData];
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));

    // State'i güncelle
    setRooms(updatedRooms.filter((room: Room) => room.campId === currentCamp.id));
    setFilteredRooms(updatedRooms.filter((room: Room) => room.campId === currentCamp.id));
    setShowAddModal(false);
    setNewRoom({ number: '', capacity: 0, project: '' });
  };

  const handleAddWorker = () => {
    if (!selectedRoom || !newWorker.name || !newWorker.registrationNumber || !newWorker.project || !newWorker.entryDate) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    if (selectedRoom.workers.length >= selectedRoom.capacity) {
      alert('Bu odada boş yatak bulunmamaktadır');
      return;
    }

    // Kampı bul
    const camps = JSON.parse(localStorage.getItem('camps') || '[]');
    const currentCamp = camps.find((camp: any) => 
      camp.name.toLowerCase().replace(/\s+/g, '') === params.camp
    );

    if (!currentCamp) {
      alert('Kamp bulunamadı');
      return;
    }

    const newWorkerData: Worker = {
      id: Date.now().toString(),
      name: newWorker.name,
      registrationNumber: newWorker.registrationNumber,
      project: newWorker.project,
      entryDate: newWorker.entryDate,
      roomId: selectedRoom.id
    };

    // Tüm odaları al ve seçili odayı güncelle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const updatedRooms = allRooms.map((room: Room) => {
      if (room.id === selectedRoom.id) {
        return {
          ...room,
          workers: [...room.workers, newWorkerData]
        };
      }
      return room;
    });

    // Odaları güncelle
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));

    // Tüm işçileri al ve yeni işçiyi ekle
    const allWorkers = JSON.parse(localStorage.getItem('workers') || '[]');
    const updatedWorkers = [...allWorkers, newWorkerData];
    localStorage.setItem('workers', JSON.stringify(updatedWorkers));

    // State'i güncelle
    setRooms(updatedRooms.filter((room: Room) => room.campId === currentCamp.id));
    setFilteredRooms(updatedRooms.filter((room: Room) => room.campId === currentCamp.id));
    setShowAddWorkerModal(false);
    setNewWorker({
      name: '',
      registrationNumber: '',
      project: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleEditRoom = () => {
    if (!selectedRoom) return;

    // Eğer oda numarası "Oda" ile başlamıyorsa ekle
    if (!selectedRoom.number.startsWith('Oda ')) {
      selectedRoom.number = `Oda ${selectedRoom.number}`;
    }

    const updatedRooms = rooms.map(room => 
      room.id === selectedRoom.id ? selectedRoom : room
    );

    // Local storage güncelle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const otherRooms = allRooms.filter((room: Room) => room.campId !== currentCamp.id);
    localStorage.setItem('rooms', JSON.stringify([...otherRooms, ...updatedRooms]));

    setRooms(updatedRooms);
    setFilteredRooms(updatedRooms);
    setShowEditModal(false);
    setSelectedRoom(null);
  };

  const handleDeleteRoom = (room: Room) => {
    if (!window.confirm('Bu odayı silmek istediğinize emin misiniz?')) return;

    // Odadaki işçileri bul
    const workersInRoom = room.workers || [];

    // Odayı sil ve diğer odaları güncelle
    const updatedRooms = rooms.filter(r => r.id !== room.id);

    // Local storage'daki tüm odaları al
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const otherRooms = allRooms.filter((r: Room) => r.campId !== currentCamp.id);

    // Silinen odadaki işçilerin bilgilerini güncelle
    const updatedAllRooms = [...otherRooms, ...updatedRooms].map((r: Room) => ({
      ...r,
      workers: r.workers.map((w: Worker) => 
        workersInRoom.some(worker => worker.id === w.id)
          ? { ...w, roomId: "", entryDate: "-" }
          : w
      )
    }));

    // Local storage'ı güncelle
    localStorage.setItem('rooms', JSON.stringify(updatedAllRooms));

    // State'leri güncelle
    setRooms(updatedRooms);
    setFilteredRooms(updatedRooms);
    setActiveMenu(null);
    setSelectedRoom(null);
  };

  const toggleRoomDetails = (roomId: string) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.three-dots-menu') && !target.closest('.three-dots-button')) {
        setActiveMenu(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteWorker = (workerId: string) => {
    if (!window.confirm('Bu işçiyi silmek istediğinizden emin misiniz?')) return;

    const updatedRooms = rooms.map(room => {
      return {
        ...room,
        workers: room.workers.filter(w => w.id !== workerId)
      };
    });

    setRooms(updatedRooms);
    localStorage.setItem(`rooms_${campName}`, JSON.stringify(updatedRooms));
    setActiveMenu(null);
  };

  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setNewWorker({
      name: worker.name,
      registrationNumber: worker.registrationNumber,
      project: worker.project,
      entryDate: worker.entryDate
    });
    setShowEditWorkerModal(true);
    setActiveMenu(null);
  };

  const handleUpdateWorker = (worker: Worker) => {
    if (!selectedWorker || !newWorker.name || !newWorker.registrationNumber || !newWorker.project) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    const workerData: Worker = {
      ...selectedWorker,
      name: newWorker.name,
      registrationNumber: newWorker.registrationNumber,
      project: newWorker.project,
      entryDate: newWorker.entryDate
    };

    // Odaları güncelle
    const updatedRooms = rooms.map((room: Room) => {
      if (room.workers.some(w => w.id === selectedWorker.id)) {
        return {
          ...room,
          workers: room.workers.map(w => 
            w.id === selectedWorker.id ? workerData : w
          )
        };
      }
      return room;
    });

    // Local storage güncelle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const otherRooms = allRooms.filter((room: Room) => room.campId !== currentCamp.id);
    localStorage.setItem('rooms', JSON.stringify([...otherRooms, ...updatedRooms]));

    // State'leri güncelle
    setRooms(updatedRooms);
    setFilteredRooms(updatedRooms);

    // Modalı kapat
    setShowEditWorkerModal(false);
    setSelectedWorker(null);
    setNewWorker({
      name: '',
      registrationNumber: '',
      project: '',
      entryDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleChangeRoom = () => {
    if (!selectedWorker || !selectedRoomForChange) return;

    // Mevcut odayı bul
    const currentRoom = rooms.find(room => room.workers.some(w => w.id === selectedWorker.id));
    if (!currentRoom) return;

    // Hedef odayı bul
    const targetRoom = rooms.find(room => room.id === selectedRoomForChange);
    if (!targetRoom) return;

    // Odaları güncelle
    const updatedRooms = rooms.map(room => {
      if (room.id === currentRoom.id) {
        return {
          ...room,
          workers: room.workers.filter(w => w.id !== selectedWorker.id),
          availableBeds: room.availableBeds + 1
        };
      }
      if (room.id === targetRoom.id) {
        return {
          ...room,
          workers: [...room.workers, { ...selectedWorker, roomId: room.id }],
          availableBeds: room.availableBeds - 1
        };
      }
      return room;
    });

    // Local storage'ı güncelle
    localStorage.setItem('rooms', JSON.stringify(updatedRooms));

    // State'i güncelle
    setRooms(updatedRooms);
    setFilteredRooms(updatedRooms);
    setShowChangeRoomModal(false);
    setSelectedRoomForChange('');
    setSelectedWorker(null);
  };

  const handleRemoveWorker = (room: Room, worker: Worker) => {
    // Odalardan işçiyi sil ve workers listesini güncelle
    const updatedRooms = rooms.map((r: Room) => {
      const workerInRoom = r.workers.find(w => w.id === worker.id);
      if (workerInRoom) {
        // İşçiyi odadan sil ve boş yatak sayısını güncelle
        return {
          ...r,
          workers: r.workers.filter(w => w.id !== worker.id),
          availableBeds: r.availableBeds + 1
        };
      }
      return r;
    });

    // Local storage'daki tüm odaları güncelle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const otherRooms = allRooms.filter((r: Room) => r.campId !== currentCamp.id);
    
    // Sadece silinen işçinin bilgilerini güncelle
    const updatedAllRooms = [...otherRooms, ...updatedRooms].map((r: Room) => ({
      ...r,
      workers: r.workers.map((w: Worker) => 
        w.id === worker.id 
          ? { ...w, roomId: "", entryDate: "-" }
          : w
      )
    }));

    // Local storage'ı güncelle
    localStorage.setItem('rooms', JSON.stringify(updatedAllRooms));

    // State'i güncelle
    setRooms(updatedRooms);
    setShowDeleteModal(false);
    setSelectedWorker(null);
    setActiveMenu(null);
  };

  const handleUpdateRoom = (room: Room) => {
    if (!room || !room.name || !room.capacity) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    // Odaları güncelle
    const updatedRooms = rooms.map((r: Room) => 
      r.id === room.id ? room : r
    );

    // Local storage güncelle
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');
    const otherRooms = allRooms.filter((r: Room) => r.campId !== currentCamp.id);
    localStorage.setItem('rooms', JSON.stringify([...otherRooms, ...updatedRooms]));

    // State'leri güncelle
    setRooms(updatedRooms);
    setFilteredRooms(updatedRooms);

    // Modalı kapat
    setShowEditModal(false);
    setSelectedRoom(null);
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-bold text-gray-900">Odalar</h1>
              <p className="mt-2 text-sm text-gray-600">Kamp içerisindeki tüm odaların listesi ve detayları</p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                Yeni Oda Ekle
              </button>
            </div>
          </div>
        </div>

        {/* Arama çubuğu */}
        <div className="mt-4 mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Oda numarasına göre ara..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10 py-2"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr className="divide-x divide-gray-200">
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Oda No
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Şantiyesi
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Kapasite
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Boş Yatak
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Doluluk
                      </th>
                      <th scope="col" className="relative px-4 py-3">
                        <span className="sr-only">İşlemler</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredRooms.map((room) => (
                      <React.Fragment key={room.id}>
                        <tr className="divide-x divide-gray-200">
                          <td 
                            className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center space-x-2 cursor-pointer"
                            onClick={() => toggleRoomDetails(room.id)}
                          >
                            <span className={`inline-block w-3 h-3 rounded-full ${room.workers.length < room.capacity ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span>{room.number}</span>
                          </td>
                          <td 
                            className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                            onClick={() => toggleRoomDetails(room.id)}
                          >
                            {room.project}
                          </td>
                          <td 
                            className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                            onClick={() => toggleRoomDetails(room.id)}
                          >
                            {room.capacity}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${(room.capacity - room.workers.length) > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`}>
                            {room.capacity - room.workers.length}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {room.workers.length}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeMenu === room.id) {
                                    setActiveMenu(null);
                                    setMenuPosition(null);
                                  } else {
                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                    setMenuPosition({
                                      left: rect.left - 160,
                                      top: rect.top + window.scrollY - 80
                                    });
                                    setActiveMenu(room.id);
                                  }
                                }}
                                className="text-gray-400 hover:text-gray-600 three-dots-button w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                              >
                                •••
                              </button>
                              {activeMenu === room.id && menuPosition && (
                                <div 
                                  className="fixed three-dots-menu rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[1000]"
                                  style={{
                                    width: '12rem',
                                    left: `${menuPosition.left}px`,
                                    top: `${menuPosition.top}px`
                                  }}
                                >
                                  <div className="py-1">
                                    <button
                                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      onClick={() => {
                                        setSelectedRoom(room);
                                        setShowEditModal(true);
                                        setActiveMenu(null);
                                      }}
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                      onClick={() => {
                                        handleDeleteRoom(room);
                                        setActiveMenu(null);
                                      }}
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedRoomId === room.id && (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 bg-gray-50">
                              <div className="border rounded-lg bg-white">
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
                                        Giriş Tarihi
                                      </th>
                                      <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">İşlemler</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {room.workers.map((worker) => (
                                      <tr key={worker.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {worker.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {worker.registrationNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {worker.project}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(worker.entryDate).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <div className="relative">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (activeMenu === worker.id) {
                                                  setActiveMenu(null);
                                                  setWorkerMenuPosition(null);
                                                } else {
                                                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                                                  setWorkerMenuPosition({
                                                    left: rect.left - 160,
                                                    top: rect.top + window.scrollY
                                                  });
                                                  setActiveMenu(worker.id);
                                                }
                                              }}
                                              className="text-gray-400 hover:text-gray-600 three-dots-button w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                                            >
                                              •••
                                            </button>
                                            {activeMenu === worker.id && workerMenuPosition && (
                                              <div 
                                                className="fixed three-dots-menu rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[1000]"
                                                style={{
                                                  width: '12rem',
                                                  left: `${workerMenuPosition.left}px`,
                                                  top: `${workerMenuPosition.top}px`
                                                }}
                                              >
                                                <div className="py-1">
                                                  <button
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    onClick={() => {
                                                      handleEditWorker(worker);
                                                    }}
                                                  >
                                                    Düzenle
                                                  </button>
                                                  <button
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    onClick={() => {
                                                      setSelectedWorker(worker);
                                                      setShowChangeRoomModal(true);
                                                      setActiveMenu(null);
                                                    }}
                                                  >
                                                    Oda Değiştir
                                                  </button>
                                                  <button
                                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (window.confirm('Bu işçiyi silmek istediğinizden emin misiniz?')) {
                                                        handleRemoveWorker(room, worker);
                                                        setActiveMenu(null);
                                                      }
                                                    }}
                                                  >
                                                    Sil
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                    {/* Boş yataklar için işçi ekleme butonları */}
                                    {Array.from({ length: room.capacity - room.workers.length }).map((_, index) => (
                                      <tr key={`empty-${index}`}>
                                        <td colSpan={4} className="px-6 py-4">
                                          <button
                                            onClick={() => {
                                              setSelectedRoom(room);
                                              setShowAddWorkerModal(true);
                                            }}
                                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                          >
                                            + Yeni İşçi Ekle
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Oda Ekle</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700">
                    Oda Numarası
                  </label>
                  <input
                    type="text"
                    id="roomNumber"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="project" className="block text-sm font-medium text-gray-700">
                    Şantiye
                  </label>
                  <select
                    id="project"
                    value={newRoom.project}
                    onChange={(e) => setNewRoom({ ...newRoom, project: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Slava 4">Slava 4</option>
                    <option value="Slava 2-3">Slava 2-3</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                    Kapasite
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    min="1"
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddRoom}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedRoom && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Oda Düzenle</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="editRoomNumber" className="block text-sm font-medium text-gray-700">
                    Oda Numarası
                  </label>
                  <input
                    type="text"
                    id="editRoomNumber"
                    value={selectedRoom.number}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="editProject" className="block text-sm font-medium text-gray-700">
                    Şantiye
                  </label>
                  <select
                    id="editProject"
                    value={selectedRoom.project}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, project: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Slava 4">Slava 4</option>
                    <option value="Slava 2-3">Slava 2-3</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="editCapacity" className="block text-sm font-medium text-gray-700">
                    Kapasite
                  </label>
                  <input
                    type="number"
                    id="editCapacity"
                    min="1"
                    value={selectedRoom.capacity.toString()}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, capacity: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRoom(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditRoom}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* İşçi Ekleme Modalı */}
        {showAddWorkerModal && selectedRoom && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni İşçi Ekle</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="workerName" className="block text-sm font-medium text-gray-700">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="workerName"
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700">
                    Sicil No
                  </label>
                  <input
                    type="text"
                    id="registrationNumber"
                    value={newWorker.registrationNumber}
                    onChange={(e) => setNewWorker({ ...newWorker, registrationNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="workerProject" className="block text-sm font-medium text-gray-700">
                    Şantiye
                  </label>
                  <select
                    id="workerProject"
                    value={newWorker.project}
                    onChange={(e) => setNewWorker({ ...newWorker, project: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Slava 4">Slava 4</option>
                    <option value="Slava 2-3">Slava 2-3</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700">
                    Odaya Giriş Tarihi
                  </label>
                  <input
                    type="date"
                    id="entryDate"
                    value={newWorker.entryDate}
                    onChange={(e) => setNewWorker({ ...newWorker, entryDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddWorkerModal(false);
                    setNewWorker({ name: '', registrationNumber: '', project: '', entryDate: new Date().toISOString().split('T')[0] });
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddWorker}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* İşçi Düzenleme Modalı */}
        {showEditWorkerModal && selectedWorker && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">İşçi Düzenle</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="editWorkerName" className="block text-sm font-medium text-gray-700">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="editWorkerName"
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="editRegistrationNumber" className="block text-sm font-medium text-gray-700">
                    Sicil No
                  </label>
                  <input
                    type="text"
                    id="editRegistrationNumber"
                    value={newWorker.registrationNumber}
                    onChange={(e) => setNewWorker({ ...newWorker, registrationNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="editProject" className="block text-sm font-medium text-gray-700">
                    Şantiye
                  </label>
                  <select
                    id="editProject"
                    value={newWorker.project}
                    onChange={(e) => setNewWorker({ ...newWorker, project: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Slava 4">Slava 4</option>
                    <option value="Slava 2-3">Slava 2-3</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="editEntryDate" className="block text-sm font-medium text-gray-700">
                    Odaya Giriş Tarihi
                  </label>
                  <input
                    type="date"
                    id="editEntryDate"
                    value={newWorker.entryDate}
                    onChange={(e) => setNewWorker({ ...newWorker, entryDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditWorkerModal(false);
                    setSelectedWorker(null);
                    setNewWorker({ name: '', registrationNumber: '', project: '', entryDate: new Date().toISOString().split('T')[0] });
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    if (selectedWorker) {
                      handleUpdateWorker(selectedWorker);
                    }
                  }}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Oda Değiştirme Modalı */}
        {showChangeRoomModal && selectedWorker && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Oda Değiştir</h3>
              <p className="text-sm text-gray-600 mb-2">
                {selectedWorker.name} isimli işçinin;
              </p>
              {/* Mevcut oda bilgisi */}
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <p className="text-sm font-medium text-gray-700">
                  Mevcut Odası: {rooms.find(room => room.workers.some(w => w.id === selectedWorker.id))?.number || '-'}
                </p>
              </div>
              <div className="mb-4">
                <label htmlFor="newRoom" className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Oda Seç
                </label>
                <select
                  id="newRoom"
                  value={selectedRoomForChange}
                  onChange={(e) => setSelectedRoomForChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Oda Seçin</option>
                  {rooms
                    .filter(room => {
                      // Mevcut odayı hariç tut
                      const isCurrentRoom = room.workers.some(w => w.id === selectedWorker.id);
                      // Boş yatağı olan odaları göster
                      const hasAvailableBeds = room.capacity > room.workers.length;
                      // Aynı kamptaki odaları göster
                      const isInSameCamp = room.campId === currentCamp?.id;
                      return !isCurrentRoom && hasAvailableBeds && isInSameCamp;
                    })
                    .map(room => {
                      const availableBeds = room.capacity - room.workers.length;
                      return (
                        <option key={room.id} value={room.id}>
                          Oda {room.number} ({availableBeds} Boş Yatak)
                        </option>
                      );
                    })}
                </select>
                {rooms.filter(room => {
                  const isCurrentRoom = room.workers.some(w => w.id === selectedWorker.id);
                  const hasAvailableBeds = room.capacity > room.workers.length;
                  const isInSameCamp = room.campId === currentCamp?.id;
                  return !isCurrentRoom && hasAvailableBeds && isInSameCamp;
                }).length === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    Şu anda boş yatak bulunan oda bulunmamaktadır.
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowChangeRoomModal(false);
                    setSelectedRoomForChange('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleChangeRoom}
                  disabled={!selectedRoomForChange}
                  className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                    selectedRoomForChange ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Değiştir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 