'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getRooms, createRoom, updateRoom, deleteRoom, createWorker, getWorkers, updateWorker, deleteWorker, importRooms } from '../../services/api';
import { Room, Worker, Camp } from '../types';
import ImportExcel from '@/components/ImportExcel';
import PreviewModal from '@/components/PreviewModal';

export default function RoomsPage() {
  const router = useRouter();
  const params = useParams();
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({
    number: '',
    capacity: 1,
    project: ''
  });
  const [newWorker, setNewWorker] = useState({
    name: '',
    surname: '',
    registrationNumber: '',
    project: '',
    entryDate: new Date().toISOString().split('T')[0]
  });
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [editWorkerData, setEditWorkerData] = useState({
    _id: '',
    name: '',
    surname: '',
    registrationNumber: '',
    project: '',
    roomId: '',
    campId: ''
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentCamp, setCurrentCamp] = useState<Camp | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [roomWorkers, setRoomWorkers] = useState<{ [roomId: string]: Worker[] }>({});
  const [editFullName, setEditFullName] = useState('');
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Proje seçenekleri (örnek)
  const projectOptions = [
    { company: 'Slava', project: '4', label: 'Slava 4' },
    { company: 'Slava', project: '2-3', label: 'Slava 2-3' }
  ];

  // Kullanıcı ve kamp bilgisini al ve odaları yükle
  useEffect(() => {
    const campData = localStorage.getItem('currentCamp');
    if (campData) {
      const camp = JSON.parse(campData);
      setCurrentCamp(camp);
      if (camp?._id) {
        loadRooms(camp._id);
      }
    }
  }, []);

  const loadRooms = async (campId: string) => {
    try {
      setLoading(true);
      setError('');

      // Odaları çek
      const response = await getRooms(campId);
      if ('error' in response && typeof response.error === 'string') {
        setError(response.error);
        return;
      }
      // Gelen odaları numaralarına göre sırala
      const sortedRooms = response.sort((a, b) => {
        // 'number' alanının sayısal olarak karşılaştırılması
        return a.number.localeCompare(b.number, undefined, { numeric: true });
      });
      setRooms(sortedRooms);
    } catch (error) {
      setError('Odalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Oda ekle
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.number || !newRoom.capacity || !newRoom.project || !currentCamp) return;
    try {
      const response = await createRoom({
        ...newRoom,
        campId: currentCamp._id,
        company: currentCamp.name,
        availableBeds: newRoom.capacity
      });
      if ('error' in response && typeof response.error === 'string') {
        setError(response.error);
        return;
      }
      const updatedRooms = [...rooms, response];
      updatedRooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      setRooms(updatedRooms);
      setShowAddRoomModal(false);
      setNewRoom({ number: '', capacity: 1, project: '' });
    } catch (error) {
      setError('Oda eklenirken hata oluştu');
    }
  };

  // Oda sil
  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentCamp) return;

    // Odadaki işçi sayısını kontrol et
    const room = rooms.find(r => r._id === roomId);
    if (!room) return;

    const workerCount = room.capacity - room.availableBeds;
    let confirmMessage = 'Bu odayı silmek istediğinizden emin misiniz?';
    if (workerCount > 0) {
      confirmMessage = `Bu odada ${workerCount} işçi bulunuyor. Odayı sildiğinizde işçiler de silinecektir. Devam etmek istiyor musunuz?`;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await deleteRoom(roomId);
      if ('error' in response && typeof response.error === 'string') {
        setError(response.error);
        return;
      }

      // Silme başarılı olduğunda
      setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
      
      // Eğer silinen oda genişletilmiş durumdaysa, genişletmeyi kapat
      if (expandedRoomId === roomId) {
        setExpandedRoomId(null);
      }

      // İşçi listesini güncelle
      const updatedRoomWorkers = { ...roomWorkers };
      delete updatedRoomWorkers[roomId];
      setRoomWorkers(updatedRoomWorkers);

      setError('Oda başarıyla silindi');
    } catch (error) {
      console.error('Oda silme hatası:', error);
      setError('Oda silinirken bir hata oluştu');
    }
  };

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

  // Oda detayını aç/kapat (id/_id uyumu)
  const toggleRoomDetails = (roomId: string) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

  // Menü dışına tıklama kapatma
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

  // Oda detayını açınca işçileri çek
  useEffect(() => {
    if (expandedRoomId && currentCamp?._id) {
      getWorkers(currentCamp._id, expandedRoomId).then((data) => {
        if (Array.isArray(data)) {
          setRoomWorkers((prev) => ({ ...prev, [expandedRoomId]: data }));
        }
      });
    }
  }, [expandedRoomId, currentCamp]);

  // İşçi düzenleme modalı açıldığında editFullName'i doldur
  useEffect(() => {
    if (showEditWorkerModal && selectedWorker) {
      setEditFullName(`${selectedWorker.name}${selectedWorker.surname ? ' ' + selectedWorker.surname : ''}`);
    }
  }, [showEditWorkerModal, selectedWorker]);

  // İşçi düzenleme modalı açıldığında formu doldur
  useEffect(() => {
    if (showEditWorkerModal && selectedWorker) {
       const roomId = typeof selectedWorker.roomId === 'object' && selectedWorker.roomId !== null 
        ? selectedWorker.roomId._id 
        : selectedWorker.roomId as string;

      setEditWorkerData({
        _id: selectedWorker._id,
        name: selectedWorker.name,
        surname: selectedWorker.surname,
        registrationNumber: selectedWorker.registrationNumber,
        project: selectedWorker.project,
        roomId: roomId,
        campId: currentCamp?._id || ''
      });
    }
  }, [showEditWorkerModal, selectedWorker, currentCamp]);

  const handleImportPreview = (data: any[]) => {
    setImportData(data);
    setShowImportModal(true);
  };

  const handleImportConfirm = async () => {
    if (!currentCamp || !importData.length) return;

    setIsImporting(true);
    try {
      const response = await importRooms(currentCamp._id, importData);
      
      if ('error' in response) {
        setError(response.error);
      } else {
        setError(`${response.results.success} oda başarıyla içe aktarıldı`);
        if (response.results.failed > 0) {
          console.error('Import hataları:', response.results.errors);
        }
        setShowImportModal(false);
        setImportData([]);
        if (currentCamp) loadRooms(currentCamp._id);
      }
    } catch (error: any) {
      setError(error.message || 'İçe aktarma sırasında bir hata oluştu');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Oda güncelleme
  const handleUpdateRoom = async (roomId: string, updatedData: any) => {
    if (!currentCamp) return;
    try {
      const res = await updateRoom({ _id: roomId, ...updatedData });
      if (!res.error) {
        setShowEditRoomModal(false);
        setSelectedRoom(null);
        if (currentCamp) loadRooms(currentCamp._id);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Oda güncellenirken bir hata oluştu');
    }
  };

  // Oda detaylarını göster/gizle
  const handleRoomClick = async (roomId: string) => {
    if (expandedRoomId === roomId) {
      setExpandedRoomId(null);
      return;
    }

    setExpandedRoomId(roomId);
    
    try {
      const response = await getWorkers(currentCamp!._id, roomId);
      if ('error' in response && typeof response.error === 'string') {
        setError(response.error);
        return;
      }
      setRoomWorkers(prev => ({ ...prev, [roomId]: response }));
    } catch (error) {
      setError('İşçi bilgileri yüklenirken bir hata oluştu');
    }
  };

  const handleAddWorker = async (roomId: string) => {
    if (!currentCamp) return;
    if (!newWorker.name || !newWorker.surname || !newWorker.registrationNumber || !newWorker.project || !newWorker.entryDate) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      setShowAddWorkerModal(false);
      setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', entryDate: new Date().toISOString().split('T')[0] });
      return;
    }
    try {
      const res = await createWorker({
        ...newWorker,
        roomId,
        campId: currentCamp._id,
      });
      if (!res.error) {
        setShowAddWorkerModal(false);
        setNewWorker({ 
          name: '', 
          surname: '', 
          registrationNumber: '', 
          project: '', 
          entryDate: new Date().toISOString().split('T')[0] 
        });
        getWorkers(currentCamp._id, roomId).then((data) => {
          if(Array.isArray(data)) setRoomWorkers((prev) => ({ ...prev, [roomId]: data }));
        });
        if (currentCamp) loadRooms(currentCamp._id);
      } else {
        setError(res.error);
        setShowAddWorkerModal(false);
        setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', entryDate: new Date().toISOString().split('T')[0] });
      }
    } catch (err) {
      setError('İşçi eklenirken bir hata oluştu.');
      setShowAddWorkerModal(false);
      setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', entryDate: new Date().toISOString().split('T')[0] });
    }
  };

  const handleUpdateWorker = async () => {
    if (!currentCamp || !editWorkerData._id) {
      return;
    }
    try {
      const res = await updateWorker(editWorkerData);
      if (!res.error) {
        setShowEditWorkerModal(false);
        setSelectedWorker(null);
        const roomId = typeof res.roomId === 'object' ? res.roomId._id : res.roomId;
        if (roomId) {
            getWorkers(currentCamp._id, roomId).then((data) => {
              if (Array.isArray(data)) setRoomWorkers((prev) => ({ ...prev, [roomId]: data }));
            });
        }
        loadRooms(currentCamp._id);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('İşçi güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteWorker = async (workerId: string, roomId: string) => {
    if (!currentCamp) return;
    if (!window.confirm('Bu işçiyi silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await deleteWorker(workerId);
      if (!res.error) {
        const campId = currentCamp._id;
        getWorkers(campId, roomId).then((data) => {
          if(Array.isArray(data)) setRoomWorkers((prev) => ({ ...prev, [roomId]: data }));
        });
        loadRooms(campId);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('İşçi silinirken bir hata oluştu.');
    }
  };

  const handleChangeWorkerRoom = async (workerId: string, newRoomId: string) => {
    if (!currentCamp || !selectedWorker) {
      return;
    }
    
    const oldRoomId = typeof selectedWorker.roomId === 'object' 
      ? selectedWorker.roomId._id 
      : selectedWorker.roomId;
      
    if (!oldRoomId) {
        setError("İşçinin mevcut oda bilgisi bulunamadı.");
        return;
    }

    try {
      const res = await updateWorker({
        _id: workerId,
        roomId: newRoomId,
        campId: currentCamp._id,
      });

      if (!res.error) {
        setShowChangeRoomModal(false);
        setSelectedWorker(null);

        // Eski ve yeni odaların işçi listelerini güncelle
        const campId = currentCamp!._id;
        getWorkers(campId, oldRoomId).then((data) => {
          if (Array.isArray(data)) setRoomWorkers((prev) => ({ ...prev, [oldRoomId]: data }));
        });
        getWorkers(campId, newRoomId).then((data) => {
          if (Array.isArray(data)) setRoomWorkers((prev) => ({ ...prev, [newRoomId]: data }));
        });
        // Genel oda listesini de güncelle (doluluk oranları için)
        loadRooms(campId);
        
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('İşçi odası değiştirilirken hata oluştu.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-bold text-gray-900">{currentCamp ? `${currentCamp.name} Kampı Odaları` : 'Odalar'}</h1>
              <p className="mt-2 text-sm text-gray-600">{currentCamp ? `${currentCamp.name} kampındaki` : 'Kamp içerisindeki'} tüm odaların listesi ve detayları</p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-4">
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                Yeni Oda Ekle
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                Excel'den İçe Aktar
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

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr className="divide-x divide-gray-200">
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Oda No</th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Şantiyesi</th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Kapasite</th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Boş Yatak</th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Doluluk</th>
                      <th scope="col" className="relative px-4 py-3"><span className="sr-only">İşlemler</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredRooms.map((room) => (
                      <React.Fragment key={room._id}>
                        <tr className="divide-x divide-gray-200">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center space-x-2 cursor-pointer" onClick={() => toggleRoomDetails(room._id)}>
                            <span className={`inline-block w-3 h-3 rounded-full ${room.availableBeds > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span>{room.number}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer" onClick={() => toggleRoomDetails(room._id)}>{room.project}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer" onClick={() => toggleRoomDetails(room._id)}>{room.capacity}</td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${room.availableBeds > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`}>{room.availableBeds}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{room.capacity - room.availableBeds}</td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => {
                                setSelectedRoom(room);
                                setShowEditRoomModal(true);
                              }}
                              className="text-blue-600 hover:underline mr-4"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={(e) => handleDeleteRoom(e, room._id)}
                              className="text-red-600 hover:underline"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                        {expandedRoomId === room._id && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50">
                              <div className="border rounded-lg bg-white">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sicil No</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şantiye</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giriş Tarihi</th>
                                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">İşlemler</span></th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {(roomWorkers[room._id] || []).map((worker) => (
                                      <tr key={worker._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{worker.name} {worker.surname}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.registrationNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.project}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.entryDate ? new Date(worker.entryDate).toLocaleDateString('tr-TR') : '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button
                                            onClick={() => {
                                              setSelectedWorker(worker);
                                              setShowEditWorkerModal(true);
                                            }}
                                            className="text-blue-600 hover:underline mr-4"
                                          >Düzenle</button>
                                          <button
                                            onClick={() => {
                                              setSelectedWorker(worker);
                                              setShowChangeRoomModal(true);
                                            }}
                                            className="text-green-600 hover:underline mr-4"
                                          >Oda Değiştir</button>
                                          <button
                                            onClick={async () => {
                                              await deleteWorker(worker._id);
                                              setShowEditWorkerModal(false);
                                              setSelectedWorker(null);
                                              getWorkers(currentCamp!._id, room._id).then((data) => {
                                                setRoomWorkers((prev) => ({ ...prev, [room._id]: data }));
                                              });
                                              loadRooms(currentCamp!._id);
                                            }}
                                            className="text-red-600 hover:underline"
                                          >Sil</button>
                                        </td>
                                      </tr>
                                    ))}
                                    {/* Boş yataklar için işçi ekle butonu */}
                                    {Array.from({ length: room.availableBeds }).map((_, index) => (
                                      <tr key={`empty-${index}`}>
                                        <td colSpan={5} className="px-6 py-4">
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
      </div>

      {/* Yeni Oda Ekleme Modalı */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Yeni Oda Ekle</h2>
            <form onSubmit={handleAddRoom}>
              <div className="mb-4">
                <label htmlFor="room-number" className="block text-sm font-medium text-gray-700">Oda Numarası</label>
                <input
                  type="text"
                  id="room-number"
                  name="number"
                  value={newRoom.number}
                  onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="room-project" className="block text-sm font-medium text-gray-700">Şantiye</label>
                <select
                  id="room-project"
                  name="project"
                  value={newRoom.project}
                  onChange={(e) => setNewRoom({ ...newRoom, project: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="" disabled>Proje Seçin</option>
                  {projectOptions.map(option => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="room-capacity" className="block text-sm font-medium text-gray-700">Kapasite</label>
                <input
                  type="number"
                  id="room-capacity"
                  min="1"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Oda Düzenleme Modalı */}
      {showEditRoomModal && selectedRoom && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Odayı Düzenle</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const updatedData = {
                  number: (e.currentTarget.elements.namedItem('number') as HTMLInputElement).value,
                  project: (e.currentTarget.elements.namedItem('project') as HTMLSelectElement).value,
                };
                handleUpdateRoom(selectedRoom._id, updatedData);
              }}
            >
              <div className="mb-4">
                <label htmlFor="edit-room-number" className="block text-sm font-medium text-gray-700">Oda Numarası</label>
                <input
                  type="text"
                  id="edit-room-number"
                  name="number"
                  defaultValue={selectedRoom.number}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-room-project" className="block text-sm font-medium text-gray-700">Proje</label>
                <select
                  id="edit-room-project"
                  name="project"
                  defaultValue={selectedRoom.project}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="" disabled>Proje Seçin</option>
                  {projectOptions.map(option => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowEditRoomModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İşçi Ekleme Modalı */}
      {showAddWorkerModal && selectedRoom && (
        <div 
          className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => {
            setShowAddWorkerModal(false);
            setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', entryDate: new Date().toISOString().split('T')[0] });
          }}
        >
          <div 
            className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{selectedRoom.number} Odasına İşçi Ekle</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddWorker(selectedRoom._id);
              }}
            >
              <div className="mb-4">
                <label htmlFor="worker-name" className="block text-sm font-medium text-gray-700">İsim</label>
                <input
                  type="text"
                  id="worker-name"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="worker-surname" className="block text-sm font-medium text-gray-700">Soyisim</label>
                <input
                  type="text"
                  id="worker-surname"
                  value={newWorker.surname}
                  onChange={(e) => setNewWorker({ ...newWorker, surname: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="worker-registration" className="block text-sm font-medium text-gray-700">Sicil No</label>
                <input
                  type="text"
                  id="worker-registration"
                  value={newWorker.registrationNumber}
                  onChange={(e) => setNewWorker({ ...newWorker, registrationNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="worker-project" className="block text-sm font-medium text-gray-700">Şantiye</label>
                <select
                  id="worker-project"
                  name="project"
                  value={newWorker.project}
                  onChange={(e) => setNewWorker({ ...newWorker, project: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="" disabled>Proje Seçin</option>
                  {projectOptions.map(option => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="worker-entry" className="block text-sm font-medium text-gray-700">Giriş Tarihi</label>
                <input
                  type="date"
                  id="worker-entry"
                  value={newWorker.entryDate}
                  onChange={(e) => setNewWorker({ ...newWorker, entryDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowAddWorkerModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İşçi Düzenleme Modalı */}
      {showEditWorkerModal && selectedWorker && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">İşçi Düzenle</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateWorker();
              }}
            >
              <div className="mb-4">
                <label htmlFor="edit-worker-name" className="block text-sm font-medium text-gray-700">İsim</label>
                <input
                  type="text"
                  id="edit-worker-name"
                  name="name"
                  value={editWorkerData.name}
                  onChange={(e) => setEditWorkerData({ ...editWorkerData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-worker-surname" className="block text-sm font-medium text-gray-700">Soyisim</label>
                <input
                  type="text"
                  id="edit-worker-surname"
                  name="surname"
                  value={editWorkerData.surname}
                  onChange={(e) => setEditWorkerData({ ...editWorkerData, surname: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-worker-registration" className="block text-sm font-medium text-gray-700">Sicil No</label>
                <input
                  type="text"
                  id="edit-worker-registration"
                  name="registrationNumber"
                  value={editWorkerData.registrationNumber}
                  onChange={(e) => setEditWorkerData({ ...editWorkerData, registrationNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-worker-project" className="block text-sm font-medium text-gray-700">Şantiye</label>
                <select
                  id="edit-worker-project"
                  name="project"
                  value={editWorkerData.project}
                  onChange={(e) => setEditWorkerData({ ...editWorkerData, project: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="" disabled>Şantiye Seçin</option>
                  {projectOptions.map(option => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowEditWorkerModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Oda Değiştirme Modalı */}
      {showChangeRoomModal && selectedWorker && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">İşçinin Odasını Değiştir</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newRoomId = (e.currentTarget.elements.namedItem('new-room-id') as HTMLSelectElement).value;
                handleChangeWorkerRoom(selectedWorker._id, newRoomId);
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İşçi: {selectedWorker.name} {selectedWorker.surname}
                </label>
                <label htmlFor="new-room-select" className="block text-sm font-medium text-gray-700">Yeni Oda</label>
                <select
                  id="new-room-select"
                  name="new-room-id"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="" disabled>Oda Seçin</option>
                  {rooms
                    .filter(room => {
                      const workerRoomId = typeof selectedWorker.roomId === 'object' 
                        ? selectedWorker.roomId._id 
                        : selectedWorker.roomId;
                      return room._id !== workerRoomId && room.availableBeds > 0;
                    })
                    .map(room => (
                      <option key={room._id} value={room._id}>
                        {room.number} (Boş Yatak: {room.availableBeds})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowChangeRoomModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Değiştir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              {importData.length > 0 ? (
                <PreviewModal
                  data={importData}
                  onConfirm={handleImportConfirm}
                  onCancel={() => {
                    setImportData([]);
                    setError('');
                  }}
                  onClose={() => {
                    setShowImportModal(false);
                    setImportData([]);
                    setError('');
                  }}
                  isLoading={isImporting}
                  type="rooms"
                />
              ) : (
                <ImportExcel
                  onImport={handleImportPreview}
                  onPreview={handleImportPreview}
                  isLoading={isImporting}
                  progress={importProgress}
                  type="rooms"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 