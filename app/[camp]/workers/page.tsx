'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getRooms, getWorkers, createWorker, updateWorker, deleteWorker, importWorkers } from '@/app/services/api';
import { Room, Worker, Camp } from '../types';
import ImportExcel from '@/components/ImportExcel';
import PreviewModal from '@/components/PreviewModal';

interface WorkerWithRoom extends Worker {
  roomNumber?: string;
}

export default function WorkersPage() {
  const router = useRouter();
  
  // State tanımlamaları
  const [workers, setWorkers] = useState<WorkerWithRoom[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentCamp, setCurrentCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Form states
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithRoom | null>(null);
  const [newRoomId, setNewRoomId] = useState<string>('');
  const [newWorker, setNewWorker] = useState({
    name: '',
    surname: '',
    registrationNumber: '',
    project: '',
    roomId: '',
    entryDate: new Date().toISOString().split('T')[0]
  });

  // Arama ve sıralama
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof WorkerWithRoom;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Import states
  const [importData, setImportData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({
    currentItem: 0,
    totalItems: 0,
    successCount: 0,
    failureCount: 0
  });

  // Dinamik proje seçenekleri
  const [projectOptions, setProjectOptions] = useState([
    { label: 'Slava 4', value: 'Slava 4' },
    { label: 'Slava 2-3', value: 'Slava 2-3' }
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
          label: site.name,
          value: site.name
        }));
        
        setProjectOptions(options);
      } else {
        // Ortak kullanım kapalıysa, sadece kampın kendi şantiyesi
        const campSite = sites.find((site: any) => site.name === camp.site);
        if (campSite) {
          const options = [{
            label: campSite.name,
            value: campSite.name
          }];
          setProjectOptions(options);
        }
      }
    } catch (error) {
      console.error('Şantiye seçenekleri güncellenirken hata:', error);
    }
  };

  // Oturum ve kamp kontrolü ve veri yükleme
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
      
      if(camp?._id) {
        loadData(camp._id);
      }
    }
  }, []);

  useEffect(() => {
    if (currentCamp?._id) loadData(currentCamp._id, true);
  }, [currentCamp]);

  // Verileri yükle - Paralel olarak çek
  const loadData = async (campId: string, forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError('');

      // Odaları ve işçileri paralel olarak çek
      const [roomsData, workersData] = await Promise.all([
        getRooms(campId),
        getWorkers(campId, undefined, forceRefresh)
      ]);

      if (Array.isArray(roomsData)) {
        setRooms(roomsData);
      } else {
        setRooms([]);
      }

      if (Array.isArray(workersData)) {
        const workersWithRoomInfo = workersData.map(worker => {
          let roomNumber = '-';
          if (typeof worker.roomId === 'object' && worker.roomId !== null) {
            roomNumber = worker.roomId.number;
          } else if (typeof worker.roomId === 'string') {
            const allRooms = Array.isArray(roomsData) ? roomsData : [];
            const room = allRooms.find((r: Room) => r._id === worker.roomId);
            roomNumber = room?.number || '-';
          }
          return { ...worker, roomNumber };
        });
        setWorkers(workersWithRoomInfo);
      } else {
        setWorkers([]);
      }
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

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

  // Sıralama fonksiyonu
  const handleSort = (key: keyof WorkerWithRoom) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    const sorted = [...workers].sort((a, b) => {
      if (key === 'entryDate') {
        const dateA = new Date(a[key] || '').getTime();
        const dateB = new Date(b[key] || '').getTime();
        return direction === 'ascending' ? dateA - dateB : dateB - dateA;
      }

      const aValue = (a[key] || '').toString().toLowerCase();
      const bValue = (b[key] || '').toString().toLowerCase();
      
      if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
      return 0;
    });

    setWorkers(sorted);
    setSortConfig({ key, direction });
  };

  // İşçi ekleme
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.surname || !newWorker.registrationNumber || !newWorker.roomId || !currentCamp || !currentUserEmail) {
      setError('Lütfen tüm alanları doldurun');
      setShowAddModal(false);
      setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', roomId: '', entryDate: new Date().toISOString().split('T')[0] });
      return;
    }
    
    // Ortak kullanım kapalıysa otomatik olarak kampın şantiyesini kullan
    const projectValue = currentCamp.isPublic ? newWorker.project : (currentCamp.site || '');
    if (!projectValue) {
      setError('Şantiye bilgisi bulunamadı');
      return;
    }

    try {
      setError('');
      const campId = currentCamp._id;
      if (!campId) {
        setError('Kamp bilgisi bulunamadı');
        setShowAddModal(false);
        setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', roomId: '', entryDate: new Date().toISOString().split('T')[0] });
        return;
      }

      const response = await createWorker({
        name: newWorker.name,
        surname: newWorker.surname,
        registrationNumber: newWorker.registrationNumber,
        project: projectValue,
        roomId: newWorker.roomId,
        campId: campId,
        entryDate: new Date(newWorker.entryDate).toISOString()
      }, currentUserEmail);

      if (response.error) {
        setError(response.error);
        setShowAddModal(false);
        setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', roomId: '', entryDate: new Date().toISOString().split('T')[0] });
        return;
      }

      await loadData(campId);
      setShowAddModal(false);
      setNewWorker({
        name: '',
        surname: '',
        registrationNumber: '',
        project: '',
        roomId: '',
        entryDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      setError('İşçi eklenirken bir hata oluştu');
      setShowAddModal(false);
      setNewWorker({ name: '', surname: '', registrationNumber: '', project: '', roomId: '', entryDate: new Date().toISOString().split('T')[0] });
    }
  };

  // İşçi güncelleme
  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !currentCamp || !currentUserEmail) return;

    try {
      setError('');
      const campId = currentCamp._id;
      if (!campId) {
        setError('Kamp bilgisi bulunamadı');
        return;
      }

      const response = await updateWorker({
        _id: selectedWorker._id,
        name: selectedWorker.name,
        surname: selectedWorker.surname,
        registrationNumber: selectedWorker.registrationNumber,
        project: selectedWorker.project,
        campId: campId,
        entryDate: selectedWorker.entryDate
      }, currentUserEmail);
      
      if (response.error) {
        setError(response.error);
        return;
      }

      await loadData(campId);
      setShowEditModal(false);
      setSelectedWorker(null);
    } catch (error) {
      setError('İşçi güncellenirken bir hata oluştu');
    }
  };

  // İşçi silme
  const handleDeleteWorker = async () => {
    if (!selectedWorker?._id || !currentUserEmail || !currentCamp?._id) return;

    try {
      setError('');
      const response = await deleteWorker(selectedWorker._id, currentUserEmail, currentCamp._id);
      
      if (response.error) {
        setError(response.error);
        return;
      }

      await loadData(currentCamp._id);
      setShowDeleteModal(false);
      setSelectedWorker(null);
    } catch (error) {
      setError('İşçi silinirken bir hata oluştu');
    }
  };

  // Oda değiştirme
  const handleChangeRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !newRoomId || !currentCamp || !currentUserEmail) {
      setError('Lütfen yeni bir oda seçin.');
      return;
    }

    try {
      setError('');
      const campId = currentCamp._id;
      if (!campId) {
        setError('Kamp bilgisi bulunamadı');
        return;
      }

      const response = await updateWorker({
        _id: selectedWorker._id,
        roomId: newRoomId,
        campId: campId
      }, currentUserEmail);

      if (response.error) {
        setError(response.error);
        return;
      }
      
      await loadData(campId);
      setShowChangeRoomModal(false);
      setSelectedWorker(null);
      setNewRoomId('');

    } catch (error) {
      setError('Oda değiştirilirken bir hata oluştu');
    }
  };

  // Import işlemi
  const handleImportPreview = (data: any[]) => {
    const formattedData = data.map(row => ({
      'Sicil No': row['Sicil No'],
      'Adı Soyadı': row['Adı Soyadı'],
      'Kaldığı Oda': row['Kaldığı Oda'],
      'Çalıştığı Şantiye': row['Çalıştığı Şantiye'],
      'Odaya Giriş Tarihi': row['Odaya Giriş Tarihi'],
    }));
    setImportData(formattedData);
    setShowImportModal(true);
  };

  const handleImport = async () => {
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
        const response = await importWorkers(currentCamp._id, batch, currentUserEmail);

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
        allErrors.push(`Bir grup işçi işlenirken hata oluştu: ${error.message}`);
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

    let resultMessage = `${successCount} işçi başarıyla işlendi.`;
    if (failureCount > 0) {
      resultMessage += ` ${failureCount} işçi hatalı.`;
      console.error('Import hataları:', allErrors);
    }
    setError(resultMessage);

    setTimeout(async () => {
      setShowImportModal(false);
      setImportData([]);
      window.dispatchEvent(new Event('refreshRooms'));
      if (currentCamp) {
        // Rooms sayfası için de forceRefresh ile güncelle
        await fetch(`/api/rooms?campId=${currentCamp._id}`);
      }
      if (currentCamp) loadData(currentCamp._id, true); // forceRefresh ile
      setIsImporting(false);
    }, 2000);
  };

  const filteredWorkers = useMemo(() => {
    let sortedWorkers = [...workers];
    if (sortConfig) {
      sortedWorkers.sort((a, b) => {
        if (sortConfig.key === 'name') {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          if (nameA < nameB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (nameA > nameB) return sortConfig.direction === 'ascending' ? 1 : -1;
        } else if (sortConfig.key === 'registrationNumber') {
          const regA = a.registrationNumber.toLowerCase();
          const regB = b.registrationNumber.toLowerCase();
          if (regA < regB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (regA > regB) return sortConfig.direction === 'ascending' ? 1 : -1;
        } else if (sortConfig.key === 'entryDate') {
          const dateA = new Date(a.entryDate).getTime();
          const dateB = new Date(b.entryDate).getTime();
          return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }

    if (searchTerm.trim() === '') {
      return sortedWorkers;
    }

    return sortedWorkers.filter(worker =>
      `${worker.name} ${worker.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm, sortConfig]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/arkaplan.jpg')] bg-cover bg-center bg-fixed">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6">
          {/* Başlık ve Butonlar */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentCamp ? `${currentCamp.name} Kampı İşçi Listesi` : 'İşçi Listesi'}
              </h1>
              <p className="text-gray-600">
                {currentCamp ? `${currentCamp.name} kampında toplam` : 'Toplam'} {filteredWorkers.length} işçi
              </p>
            </div>
            {hasWriteAccess && (
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Excel'den İçe Aktar
                </button>
                <button
                  onClick={() => {
                    // Her durumda kampın kendi şantiyesini öncelikli olarak seç
                    if (currentCamp) {
                      const campSiteOption = projectOptions.find(option => option.value === currentCamp.site);
                      if (campSiteOption) {
                        setNewWorker(prev => ({ ...prev, project: campSiteOption.value }));
                      } else if (projectOptions.length > 0) {
                        // Kampın şantiyesi bulunamazsa ilk seçeneği seç
                        setNewWorker(prev => ({ ...prev, project: projectOptions[0].value }));
                      }
                    }
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Yeni İşçi Ekle
                </button>
              </div>
            )}
          </div>

          {/* Arama */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="İsim, soyisim veya sicil no ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Hata mesajı */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* İşçiler tablosu */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 cursor-pointer text-left w-1/3" onClick={() => handleSort('name')}>
                    Ad Soyad {sortConfig?.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 cursor-pointer text-left w-1/6" onClick={() => handleSort('registrationNumber')}>
                    Sicil No {sortConfig?.key === 'registrationNumber' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-left w-1/6">Proje</th>
                  <th className="px-4 py-2 text-left w-[10%]">Oda No</th>
                  <th className="px-4 py-2 cursor-pointer text-left w-1/6" onClick={() => handleSort('entryDate')}>
                    Giriş Tarihi {sortConfig?.key === 'entryDate' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  {hasWriteAccess && <th className="px-4 py-2 text-right">İşlemler</th>}
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={hasWriteAccess ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz işçi eklenmemiş'}
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker) => (
                    <tr key={worker._id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-left truncate">{worker.name} {worker.surname}</td>
                      <td className="px-4 py-2 text-left">{worker.registrationNumber}</td>
                      <td className="px-4 py-2 text-left">{worker.project}</td>
                      <td className="px-4 py-2 text-left">{worker.roomNumber}</td>
                      <td className="px-4 py-2 text-left">
                        {new Date(worker.entryDate).toLocaleDateString('tr-TR')}
                      </td>
                      {hasWriteAccess && (
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedWorker(worker);
                              setShowEditModal(true);
                            }}
                            className="text-blue-500 hover:text-blue-700 mr-2"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWorker(worker);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Sil
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWorker(worker);
                              setShowChangeRoomModal(true);
                              setNewRoomId('');
                            }}
                            className="text-green-600 hover:text-green-900 ml-4"
                            title="Odayı Değiştir"
                          >
                            Oda Değiştir
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modalları ana container'ın dışına taşıyorum */}
      {/* Yeni İşçi Ekleme Modalı */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Yeni İşçi Ekle</h2>
            <form onSubmit={handleAddWorker}>
              <div className="mb-4">
                <label className="block mb-1 font-medium">İsim *</label>
                <input
                  type="text"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Soyisim *</label>
                <input
                  type="text"
                  value={newWorker.surname}
                  onChange={(e) => setNewWorker({ ...newWorker, surname: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Sicil No *</label>
                {personnelLoading ? (
                  <div className="w-full p-2 border rounded bg-gray-50 text-gray-500">
                    Personel listesi yükleniyor...
                  </div>
                ) : personnelData.length > 0 ? (
                  <div className="relative">
                    <input
                      type="text"
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
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value={newWorker.registrationNumber}
                    onChange={(e) => setNewWorker({ ...newWorker, registrationNumber: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Personel listesi bulunamadı, manuel girin"
                    required
                  />
                )}
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Şantiye *</label>
                {currentCamp?.isPublic ? (
                  <select
                    value={newWorker.project}
                    onChange={(e) => setNewWorker({ ...newWorker, project: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Şantiye Seçin</option>
                    {projectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newWorker.project}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-700"
                  />
                )}
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Oda *</label>
                <select
                  value={newWorker.roomId}
                  onChange={(e) => setNewWorker({ ...newWorker, roomId: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Oda Seçin</option>
                  {rooms
                    .filter(room => room.availableBeds > 0)
                    .map((room) => (
                      <option key={room._id} value={room._id}>
                        Oda {room.number} ({room.availableBeds} boş yatak)
                      </option>
                    ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Giriş Tarihi *</label>
                <input
                  type="date"
                  value={newWorker.entryDate}
                  onChange={(e) => setNewWorker({ ...newWorker, entryDate: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İşçi Düzenleme Modalı */}
      {showEditModal && selectedWorker && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">İşçi Düzenle</h2>
            <form onSubmit={handleUpdateWorker}>
              <div className="mb-4">
                <label className="block mb-1 font-medium">İsim *</label>
                <input
                  type="text"
                  value={selectedWorker.name}
                  onChange={(e) => setSelectedWorker({ ...selectedWorker, name: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Soyisim *</label>
                <input
                  type="text"
                  value={selectedWorker.surname}
                  onChange={(e) => setSelectedWorker({ ...selectedWorker, surname: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Sicil No *</label>
                <input
                  type="text"
                  value={selectedWorker.registrationNumber}
                  onChange={(e) => setSelectedWorker({ ...selectedWorker, registrationNumber: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Proje *</label>
                <select
                  value={selectedWorker.project}
                  onChange={(e) => setSelectedWorker({ ...selectedWorker, project: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Proje Seçin</option>
                  {projectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İşçi Silme Modalı */}
      {showDeleteModal && selectedWorker && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">İşçi Sil</h2>
            <p className="mb-4">
              <strong>{selectedWorker.name} {selectedWorker.surname}</strong> isimli işçiyi silmek istediğinizden emin misiniz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteWorker}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Oda Değiştirme Modalı */}
      {showChangeRoomModal && selectedWorker && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
          onClick={() => setShowChangeRoomModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Oda Değiştir</h2>
            {selectedWorker && (
              <form onSubmit={handleChangeRoom}>
                <p className="mb-4 text-gray-600">
                  <span className="font-semibold text-gray-700">{selectedWorker.name} {selectedWorker.surname}</span> isimli işçinin odasını değiştiriyorsunuz.
                </p>
                <div className="mb-4">
                  <label htmlFor="currentRoom" className="block text-sm font-medium text-gray-700 mb-1">Mevcut Oda</label>
                  <input
                    type="text"
                    id="currentRoom"
                    disabled
                    value={
                      rooms.find(room => {
                        const workerRoomId = typeof selectedWorker.roomId === 'object' ? selectedWorker.roomId?._id : selectedWorker.roomId;
                        return room._id === workerRoomId;
                      })?.number || 'Oda Atanmamış'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="newRoom" className="block text-sm font-medium text-gray-700 mb-1">Yeni Oda Seç</label>
                  <select
                    id="newRoom"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Oda Seçin</option>
                    {rooms
                      .filter(room => {
                        const workerRoomId = typeof selectedWorker.roomId === 'object' ? selectedWorker.roomId?._id : selectedWorker.roomId;
                        // Mevcut odayı ve dolu odaları filtrele
                        return room._id !== workerRoomId && room.capacity > room.workers.length;
                      })
                      .map(room => (
                        <option key={room._id} value={room._id}>
                          Oda {room.number} (Boş Yatak: {room.capacity - room.workers.length})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowChangeRoomModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Değiştir
                  </button>
                </div>
              </form>
            )}
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
            className="w-4/5 max-w-4xl p-6 bg-white rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Excel'den İçe Aktar</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {importData.length > 0 ? (
              <PreviewModal
                data={importData}
                onConfirm={handleImport}
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
                type="workers"
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
                type="workers"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
} 