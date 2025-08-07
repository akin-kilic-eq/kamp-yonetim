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
  const [importStats, setImportStats] = useState({
    currentItem: 0,
    totalItems: 0,
    successCount: 0,
    failureCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);

  // Dinamik proje seçenekleri
  const [projectOptions, setProjectOptions] = useState([
    { company: 'Slava', project: '4', label: 'Slava 4' },
    { company: 'Slava', project: '2-3', label: 'Slava 2-3' }
  ]);

  // Personel verileri için state
  const [personnelData, setPersonnelData] = useState<any[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [showPersonnelDropdown, setShowPersonnelDropdown] = useState(false);

  // Personel verilerini getir
  const fetchPersonnelData = async (camp: Camp) => {
    try {
      setPersonnelLoading(true);
      
      if (camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) {
        // Ortak kullanım açıksa, paylaşılan şantiyeler + kampın kendi şantiyesi
        const sitesResponse = await fetch('/api/sites');
        const sites = await sitesResponse.json();
        
        const availableSites = sites.filter((site: any) => 
          site.name === camp.site || camp.sharedWithSites!.includes(site._id)
        );
        
        // Her şantiye için personel verilerini getir
        const allPersonnel: any[] = [];
        for (const site of availableSites) {
          const response = await fetch(`/api/personnel?site=${encodeURIComponent(site.name)}`);
          if (response.ok) {
            const sitePersonnel = await response.json();
            allPersonnel.push(...sitePersonnel);
          }
        }
        setPersonnelData(allPersonnel);
      } else {
        // Ortak kullanım kapalıysa, sadece kampın kendi şantiyesi
        if (camp.site) {
          const response = await fetch(`/api/personnel?site=${encodeURIComponent(camp.site)}`);
          if (response.ok) {
            const sitePersonnel = await response.json();
            setPersonnelData(sitePersonnel);
          }
        }
      }
    } catch (error) {
      console.error('Personel verileri getirilirken hata:', error);
    } finally {
      setPersonnelLoading(false);
    }
  };

  // Kamp ortak kullanım ayarlarına göre şantiye seçeneklerini güncelle
  const updateProjectOptions = async (camp: Camp) => {
    try {
      // Tüm şantiyeleri getir
      const sitesResponse = await fetch('/api/sites');
      const sites = await sitesResponse.json();
      
      if (camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) {
        // Ortak kullanım açıksa, paylaşılan şantiyeler + kampın kendi şantiyesi
        const availableSites = sites.filter((site: any) => 
          site.name === camp.site || camp.sharedWithSites!.includes(site._id)
        );
        
        const options = availableSites.map((site: any) => ({
          company: site.name,
          project: site.name,
          label: site.name
        }));
        
        setProjectOptions(options);
      } else {
        // Ortak kullanım kapalıysa, sadece kampın kendi şantiyesi
        const campSite = sites.find((site: any) => site.name === camp.site);
        if (campSite) {
          const options = [{
            company: campSite.name,
            project: campSite.name,
            label: campSite.name
          }];
          setProjectOptions(options);
        }
      }
    } catch (error) {
      console.error('Şantiye seçenekleri güncellenirken hata:', error);
    }
  };

  // Kullanıcı ve kamp bilgisini al ve odaları yükle
  useEffect(() => {
    const campData = localStorage.getItem('currentCamp');
    const userData = sessionStorage.getItem('currentUser');

    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserEmail(user.email);
    }

    if (campData && userData) {
      const camp = JSON.parse(campData) as Camp;
      const user = JSON.parse(userData);
      
      setCurrentCamp(camp);

      // Kamp ortak kullanım ayarlarına göre şantiye seçeneklerini güncelle
      updateProjectOptions(camp);

      // Personel verilerini getir
      fetchPersonnelData(camp);

      // Yetki kontrolü
      const isOwner = camp.userEmail === user.email;
      const canWrite = camp.sharedWith?.some(
        (share) => share.email === user.email && share.permission === 'write'
      ) || false;
      const isKurucuAdmin = user.role === 'kurucu_admin';
      const isSiteAdmin = user.role === 'santiye_admin' && user.site && camp.site === user.site;
      
      // User rolü için şantiye erişim yetkisi ve izin kontrolü
      let userWriteAccess = false;
      if (user.role === 'user') {
        if (isOwner) {
          // Kendi kampında tam yetki
          userWriteAccess = true;
        } else if (user.siteAccessApproved && user.sitePermissions?.canEditCamps && user.site && camp.site === user.site) {
          // Şantiye erişim yetkisi ve düzenleme izni varsa, aynı şantiyedeki diğer kamplarda düzenleme yapabilir
          userWriteAccess = true;
        }
      }
      
      const hasWriteAccess = isKurucuAdmin || isSiteAdmin || isOwner || canWrite || userWriteAccess;
      
      setHasWriteAccess(hasWriteAccess);

      if (camp?._id) {
        loadRooms(camp._id);
      }
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (currentCamp?._id) loadRooms(currentCamp._id, true);
    };
    window.addEventListener('refreshRooms', handler);
    return () => window.removeEventListener('refreshRooms', handler);
  }, [currentCamp]);

  // Personel seçildiğinde bilgileri otomatik doldur
  const handlePersonnelSelect = (employeeId: string) => {
    const selectedPersonnel = personnelData.find(p => p.employeeId === employeeId);
    if (selectedPersonnel) {
      setNewWorker({
        ...newWorker,
        name: selectedPersonnel.firstName,
        surname: selectedPersonnel.lastName,
        registrationNumber: selectedPersonnel.employeeId,
        project: selectedPersonnel.site
      });
    }
  };

  const loadRooms = async (campId: string, forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError('');

      // Odaları ve işçileri paralel olarak çek
      const [roomsResponse, workersResponse] = await Promise.all([
        getRooms(campId, forceRefresh),
        getWorkers(campId) // Tüm işçileri tek seferde çek
      ]);

      if ('error' in roomsResponse && typeof roomsResponse.error === 'string') {
        setError(roomsResponse.error);
        return;
      }

      // Gelen odaları numaralarına göre sırala
      const sortedRooms = roomsResponse.sort((a, b) => {
        return a.number.localeCompare(b.number, undefined, { numeric: true });
      });
      setRooms(sortedRooms);

      // İşçileri oda bazında grupla
      if (Array.isArray(workersResponse)) {
        const workersByRoom: { [roomId: string]: any[] } = {};
        
        workersResponse.forEach(worker => {
          const roomId = typeof worker.roomId === 'object' && worker.roomId !== null 
            ? worker.roomId._id 
            : worker.roomId as string;
          
          if (!workersByRoom[roomId]) {
            workersByRoom[roomId] = [];
          }
          workersByRoom[roomId].push(worker);
        });
        
        setRoomWorkers(workersByRoom);
      }
    } catch (error) {
      setError('Odalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Oda ekle
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.number || !newRoom.capacity || !currentCamp || !currentUserEmail) return;
    
    // Ortak kullanım kapalıysa otomatik olarak kampın şantiyesini kullan
    const projectValue = currentCamp.isPublic ? newRoom.project : (currentCamp.site || '');
    if (!projectValue) return;
    
    try {
      const response = await createRoom({
        ...newRoom,
        project: projectValue,
        campId: currentCamp._id,
        company: currentCamp.name,
        availableBeds: newRoom.capacity
      }, currentUserEmail);
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
    
    if (!currentCamp || !currentUserEmail) return;

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
      const response = await deleteRoom(roomId, currentCamp._id, currentUserEmail);
      if ('error' in response && typeof response.error === 'string') {
        setError(response.error);
        return;
      }

      // Silme başarılı olduğunda
      loadRooms(currentCamp._id, true); // forceRefresh ile rooms'u güncelle
      setRoomWorkers((prev) => {
        const updated = { ...prev };
        delete updated[roomId];
        return updated;
      });
      window.dispatchEvent(new Event('refreshWorkers'));
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

  // Oda detayını açınca işçileri çek - Artık gerekli değil, tüm işçiler zaten yüklendi

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
    if (!currentCamp || !importData.length || !currentUserEmail) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportStats({
      currentItem: 0,
      totalItems: importData.length,
      successCount: 0,
      failureCount: 0
    });
    
    const batchSize = 5;
    const totalItems = importData.length;
    let successCount = 0;
    let failureCount = 0;
    let allErrors: string[] = [];

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = importData.slice(i, i + batchSize);
      
      try {
        const response = await importRooms(currentCamp._id, batch, currentUserEmail);
        
        if ('error' in response) {
          throw new Error(response.error);
        }

        if (response.results) {
          successCount += response.results.success;
          failureCount += response.results.failed;
          if (response.results.errors) {
            allErrors = [...allErrors, ...response.results.errors];
          }
        }
      } catch (error: any) {
        console.error("Batch import failed:", error);
        failureCount += batch.length;
        allErrors.push(`Bir grup oda işlenirken hata oluştu: ${error.message}`);
      }

      const processedItems = Math.min(i + batchSize, totalItems);
      const progress = Math.round((processedItems / totalItems) * 100);
      setImportProgress(progress);
      setImportStats({
        currentItem: processedItems,
        totalItems,
        successCount,
        failureCount
      });
    }

    let resultMessage = `${successCount} oda başarıyla işlendi.`;
    if (failureCount > 0) {
      resultMessage += ` ${failureCount} oda hatalı.`;
      console.error('Import hataları:', allErrors);
    }
    setError(resultMessage);
    
    // Kısa bir süre sonra modalı kapat ve listeyi yenile
    setTimeout(async () => {
      if (currentCamp) {
        setLoading(true);
        await loadRooms(currentCamp._id, true); // Önce rooms'u güncelle
        setLoading(false);
      }
      setShowImportModal(false);
      setImportData([]);
      setIsImporting(false);
    }, 2000);
  };

  // Oda güncelleme
  const handleUpdateRoom = async (roomId: string, updatedData: any) => {
    if (!currentCamp || !currentUserEmail) return;
    try {
      const res = await updateRoom({ _id: roomId, ...updatedData }, currentUserEmail);
      if (!res.error) {
        setShowEditRoomModal(false);
        setSelectedRoom(null);
        if (currentCamp) loadRooms(currentCamp._id, true); // forceRefresh ile çağır
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
    // İşçiler zaten yüklendi, ekstra API çağrısına gerek yok
  };

  const handleAddWorker = async (roomId: string) => {
    if (!currentCamp || !currentUserEmail) return;
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
      }, currentUserEmail);
      if (!res.error) {
        setShowAddWorkerModal(false);
        setNewWorker({ 
          name: '', 
          surname: '', 
          registrationNumber: '', 
          project: '', 
          entryDate: new Date().toISOString().split('T')[0] 
        });
        // Tüm odaları ve işçileri yeniden yükle
        if (currentCamp) loadRooms(currentCamp._id, true);
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

// İşçi ekleme modalı açılırken
const openAddWorkerModal = (room: Room) => {
  setSelectedRoom(room);
  setShowAddWorkerModal(true);
}

  const handleUpdateWorker = async () => {
    if (!currentCamp || !editWorkerData._id || !currentUserEmail) {
      return;
    }
    try {
      const res = await updateWorker(editWorkerData, currentUserEmail);
      if (!res.error) {
        setShowEditWorkerModal(false);
        setSelectedWorker(null);
        // Tüm odaları ve işçileri yeniden yükle
        loadRooms(currentCamp._id, true);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('İşçi güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteWorker = async (workerId: string, roomId: string) => {
    if (!currentCamp || !currentUserEmail) return;
    if (!window.confirm('Bu işçiyi silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await deleteWorker(workerId, currentUserEmail, currentCamp._id);
  
      if (!res.error) {
        // Tüm odaları ve işçileri yeniden yükle
        loadRooms(currentCamp._id, true);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('İşçi silinirken bir hata oluştu.');
    }
  };

  const handleChangeWorkerRoom = async (workerId: string, newRoomId: string) => {
    if (!currentCamp || !selectedWorker || !currentUserEmail) {
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
      }, currentUserEmail);

      if (!res.error) {
        setShowChangeRoomModal(false);
        setSelectedWorker(null);

        // Tüm odaları ve işçileri yeniden yükle
        loadRooms(currentCamp._id, true);
        
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('İşçi odası değiştirilirken hata oluştu.');
    }
  };

  // Bu useEffect artık gerekli değil, tüm işçiler loadRooms içinde yükleniyor

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-bold text-gray-900">{currentCamp ? `${currentCamp.name} Kampı Odaları` : 'Odalar'}</h1>
              <p className="mt-2 text-sm text-gray-600">{currentCamp ? `${currentCamp.name} kampındaki` : 'Kamp içerisindeki'} tüm odaların listesi ve detayları</p>
            </div>
            {hasWriteAccess && (
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-4">
                <button
                  onClick={() => {
                    // Her durumda kampın kendi şantiyesini öncelikli olarak seç
                    if (currentCamp) {
                      const campSiteOption = projectOptions.find(option => option.label === currentCamp.site);
                      if (campSiteOption) {
                        setNewRoom(prev => ({ ...prev, project: campSiteOption.label }));
                      } else if (projectOptions.length > 0) {
                        // Kampın şantiyesi bulunamazsa ilk seçeneği seç
                        setNewRoom(prev => ({ ...prev, project: projectOptions[0].label }));
                      }
                    }
                    setShowAddRoomModal(true);
                  }}
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
            )}
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
                      {hasWriteAccess && <th scope="col" className="relative px-4 py-3"><span className="sr-only">İşlemler</span></th>}
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
                          {/* Oda detayında: */}
                          <td className={`px-4 py-4 whitespace-nowrap text-sm ${((room.capacity - (roomWorkers[room._id]?.length || 0)) > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium')}`}>{room.capacity - (roomWorkers[room._id]?.length || 0)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{roomWorkers[room._id]?.length || 0}</td>
                          {hasWriteAccess && (
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
                          )}
                        </tr>
                        {expandedRoomId === room._id && (
                          <tr>
                            <td colSpan={hasWriteAccess ? 6 : 5} className="px-4 py-4 bg-gray-50">
                              <div className="border rounded-lg bg-white">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sicil No</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şantiye</th>
                                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giriş Tarihi</th>
                                      {hasWriteAccess && <th scope="col" className="relative px-6 py-3"><span className="sr-only">İşlemler</span></th>}
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {(roomWorkers[room._id] || []).map((worker) => (
                                      <tr key={worker._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{worker.name} {worker.surname}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.registrationNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.project}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.entryDate ? new Date(worker.entryDate).toLocaleDateString('tr-TR') : '-'}</td>
                                        {hasWriteAccess && (
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
                                              onClick={() => {
                                                console.log('Sil butonuna basıldı:', worker._id, room._id);
                                                handleDeleteWorker(worker._id, room._id);
                                              }}
                                              className="text-red-600 hover:underline"
                                            >Sil</button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                    {/* Boş yataklar için işçi ekle butonu */}
                                    {(() => {
                                      const currentWorkerCount = roomWorkers[room._id]?.length || 0;
                                      const localAvailableBeds = room.capacity - currentWorkerCount;
                                      return hasWriteAccess && Array.from({ length: localAvailableBeds > 0 ? localAvailableBeds : 0 }).map((_, index) => (
                                        <tr key={`empty-${index}`}>
                                          <td colSpan={hasWriteAccess ? 5 : 4} className="px-6 py-4">
                                            <button
                                              onClick={() => openAddWorkerModal(room)}
                                              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                              + Yeni İşçi Ekle
                                            </button>
                                          </td>
                                        </tr>
                                      ));
                                    })()}
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
                {currentCamp?.isPublic ? (
                  <select
                    id="room-project"
                    name="project"
                    value={newRoom.project}
                    onChange={(e) => setNewRoom({ ...newRoom, project: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    required
                  >
                    <option value="" disabled>Şantiye Seçin</option>
                    {projectOptions.map(option => (
                      <option key={option.label} value={option.label}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="room-project"
                    name="project"
                    value={newRoom.project}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700"
                  />
                )}
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
                  capacity: parseInt((e.currentTarget.elements.namedItem('capacity') as HTMLInputElement).value) || 0,
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
                <label htmlFor="edit-room-capacity" className="block text-sm font-medium text-gray-700">Kapasite</label>
                <input
                  type="number"
                  id="edit-room-capacity"
                  name="capacity"
                  min="1"
                  defaultValue={selectedRoom.capacity}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
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
                {personnelLoading ? (
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
                    Personel listesi yükleniyor...
                  </div>
                ) : personnelData.length > 0 ? (
                  <div className="relative">
                    <input
                      type="text"
                      id="worker-registration"
                      value={newWorker.registrationNumber}
                      onChange={(e) => {
                        setNewWorker({ ...newWorker, registrationNumber: e.target.value });
                        // Eğer yazılan değer personel listesinde varsa, bilgileri otomatik doldur
                        const matchingPersonnel = personnelData.find(p => p.employeeId === e.target.value);
                        if (matchingPersonnel) {
                          handlePersonnelSelect(e.target.value);
                        }
                      }}
                      onFocus={() => setShowPersonnelDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPersonnelDropdown(false), 200)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Sicil no yazın veya listeden seçin"
                      required
                    />
                    {showPersonnelDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {personnelData
                          .filter(personnel => 
                            personnel.employeeId.toLowerCase().includes(newWorker.registrationNumber.toLowerCase()) ||
                            personnel.firstName.toLowerCase().includes(newWorker.registrationNumber.toLowerCase()) ||
                            personnel.lastName.toLowerCase().includes(newWorker.registrationNumber.toLowerCase())
                          )
                          .map((personnel) => (
                            <div
                              key={personnel.employeeId}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                setNewWorker({ ...newWorker, registrationNumber: personnel.employeeId });
                                handlePersonnelSelect(personnel.employeeId);
                                setShowPersonnelDropdown(false);
                              }}
                            >
                              {personnel.employeeId} - {personnel.firstName} {personnel.lastName} ({personnel.site})
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    id="worker-registration"
                    value={newWorker.registrationNumber}
                    onChange={(e) => setNewWorker({ ...newWorker, registrationNumber: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Personel listesi bulunamadı, manuel girin"
                    required
                  />
                )}
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
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="w-4/5 max-w-4xl p-5 border shadow-lg rounded-md bg-white"
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
                  progress={importProgress}
                  currentItem={importStats.currentItem}
                  totalItems={importStats.totalItems}
                  successCount={importStats.successCount}
                  failureCount={importStats.failureCount}
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