'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCamps, createCamp, updateCamp, deleteCamp, generateShareCodes, joinCamp, leaveCamp } from '../services/api';
import Navbar from '@/components/Navbar';

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  sharedWith: { email: string; permission: 'read' | 'write' }[];
  shareCodes?: {
    read?: string;
    write?: string;
  };
}

export default function CampsPage() {
  const router = useRouter();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [newCamp, setNewCamp] = useState({
    name: '',
    description: ''
  });
  const [joinCampCode, setJoinCampCode] = useState('');
  const [currentUser, setCurrentUser] = useState<{ email: string; camps: string[] } | null>(null);
  const [error, setError] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<{ read: string; write: string } | null>(null);
  const [copiedCodeType, setCopiedCodeType] = useState<'read' | 'write' | null>(null);

  useEffect(() => {
    // Oturum kontrolü
    const userSession = sessionStorage.getItem('currentUser');
    if (!userSession) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userSession);
    setCurrentUser(user);
    loadCamps(user.email);
  }, [router]);

  const loadCamps = async (email: string) => {
    try {
      const response = await getCamps(email);
      if (response.error) {
        setError(response.error);
        return;
      }
      setCamps(response);
    } catch (error) {
      setError('Kamplar yüklenirken bir hata oluştu');
    }
  };

  const generateCampCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleAddCamp = async () => {
    if (!newCamp.name) {
      setError('Lütfen kamp adını giriniz');
      return;
    }
    try {
      const response = await createCamp({
        ...newCamp,
        userEmail: currentUser?.email
      });
      if (response.error) {
        setError(response.error);
        return;
      }
      setCamps([...camps, response]);
      setShowAddModal(false);
      setNewCamp({ name: '', description: '' });
      setError('');
    } catch (error) {
      setError('Kamp oluşturulurken bir hata oluştu');
    }
  };

  const handleJoinCamp = async () => {
    if (!joinCampCode) {
      setError('Lütfen bir kamp kodu girin.');
      return;
    }
    if (!currentUser?.email) {
      setError('Giriş yapmış bir kullanıcı bulunamadı.');
      return;
    }
    setError('');

    try {
      const response = await joinCamp(joinCampCode, currentUser.email);
      
      if (response.error) {
        setError(response.error);
        setShowJoinModal(false);
        return;
      }
      
      // Kamplar listesini güncelle, yeni katılan kampı ekle
      // Zaten listede olmaması lazım ama her ihtimale karşı kontrol edelim
      if (!camps.find(c => c._id === response._id)) {
        setCamps([...camps, response]);
      }
      
      setShowJoinModal(false);
      setJoinCampCode('');
    } catch (error) {
      setError('Kampa katılırken bir hata oluştu.');
      setShowJoinModal(false);
    }
  };

  const handleLeaveCamp = async () => {
    if (!selectedCamp || !currentUser?.email) return;
    
    try {
      const response = await leaveCamp(selectedCamp._id, currentUser.email);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      // Kampı listeden kaldır
      setCamps(camps.filter(camp => camp._id !== selectedCamp._id));
      setShowLeaveModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp paylaşımından çıkarken bir hata oluştu');
    }
  };

  const handleCampClick = (camp: Camp) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // URL'yi oluştur
    const formattedName = camp.name.toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, '');

    // Kampı localStorage'a kaydet
    localStorage.setItem('currentCamp', JSON.stringify(camp));
    
    // Yönlendirme yap
    router.push(`/${formattedName}/dashboard`);
  };

  const handleEditCamp = async () => {
    if (!selectedCamp || !selectedCamp.name) {
      setError('Lütfen kamp adını girin');
      return;
    }
    try {
      const response = await updateCamp(selectedCamp);
      if (response.error) {
        setError(response.error);
        return;
      }
      setCamps(camps.map(camp => camp._id === selectedCamp._id ? response : camp));
      setShowEditModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteCamp = async () => {
    if (!selectedCamp) return;
    try {
      const response = await deleteCamp(selectedCamp._id);
      if (response.error) {
        setError(response.error);
        return;
      }
      setCamps(camps.filter(camp => camp._id !== selectedCamp._id));
      setShowDeleteModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp silinirken bir hata oluştu');
    }
  };

  const handleCopy = (text: string, type: 'read' | 'write') => {
    navigator.clipboard.writeText(text);
    setCopiedCodeType(type);
    setTimeout(() => {
      setCopiedCodeType(null);
    }, 2000); // 2 saniye sonra mesajı kaldır
  };

  const handleGenerateShareCodes = async () => {
    if (!selectedCamp) return;
    try {
      // Mevcut kodlar varsa tekrar üretme, onları göster
      if (selectedCamp.shareCodes?.read && selectedCamp.shareCodes?.write) {
        setGeneratedCodes({
          read: selectedCamp.shareCodes.read,
          write: selectedCamp.shareCodes.write,
        });
        return;
      }
      
      // api.ts'e eklenecek yeni fonksiyon
      const codes = await generateShareCodes(selectedCamp._id);
      if (codes) {
        setGeneratedCodes(codes);
        // Kamp listesini yeni kodlarla güncelle
        setCamps(camps.map(c => c._id === selectedCamp._id ? { ...c, shareCodes: codes } : c));
      }
    } catch (error) {
      setError('Kod üretilirken bir hata oluştu.');
    }
  };

  const openShareModal = (camp: Camp) => {
    setSelectedCamp(camp);
    setGeneratedCodes(null); // Modalı her açtığında önceki kodları temizle
    setShowCodeModal(true);
  };

  // Kullanıcının bir kampın sahibi mi yoksa paylaşılan kullanıcısı mı olduğunu kontrol et
  const isCampOwner = (camp: Camp) => currentUser?.email === camp.userEmail;
  const isSharedUser = (camp: Camp) => camp.sharedWith?.some(shared => shared.email === currentUser?.email);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}
    >
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Kamplarım</h1>
              <p className="text-gray-600">Yönettiğiniz kampların listesi</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Mevcut Kamp Ekle
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Yeni Kamp Ekle
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {camps.map((camp) => (
            <div
              key={camp._id}
              className="bg-white/90 backdrop-blur-sm overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{camp.name}</h2>
                  <div className="flex items-center space-x-3">
                    {/* Kamp sahibi için butonlar */}
                    {isCampOwner(camp) && (
                      <>
                        <button onClick={() => { setSelectedCamp(camp); setShowEditModal(true); }} className="text-blue-500 hover:text-blue-700 transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => { setSelectedCamp(camp); setShowDeleteModal(true); }} className="text-red-500 hover:text-red-700 transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <button onClick={() => openShareModal(camp)} className="text-gray-500 hover:text-gray-700 transition-colors">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      </>
                    )}
                    {/* Paylaşılan kullanıcı için Paylaşımdan Çıkar butonu */}
                    {isSharedUser(camp) && (
                      <button 
                        onClick={() => { setSelectedCamp(camp); setShowLeaveModal(true); }} 
                        className="text-orange-500 hover:text-orange-700 transition-colors"
                        title="Paylaşımdan Çıkar"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 mb-4 h-12 overflow-hidden">{camp.description}</p>
                <div 
                  onClick={() => handleCampClick(camp)}
                  className="mt-4 flex justify-end cursor-pointer"
                >
                  <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
                    Yönetim Paneline Git
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Paylaşımdan Çıkma Onay Modalı */}
        {showLeaveModal && selectedCamp && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Paylaşımdan Çık</h3>
              <p className="text-gray-600 mb-6">
                "{selectedCamp.name}" kampının paylaşımından çıkmak istediğinizden emin misiniz? Bu işlemden sonra bu kampa erişiminiz olmayacak.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setSelectedCamp(null);
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleLeaveCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
                >
                  Çık
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Yeni Kamp Ekle</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="campName" className="block text-sm font-medium text-gray-700 mb-2">
                    Kamp Adı
                  </label>
                  <input
                    type="text"
                    id="campName"
                    value={newCamp.name}
                    onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kampın adını girin"
                  />
                </div>
                <div>
                  <label htmlFor="campDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama (İsteğe bağlı)
                  </label>
                  <textarea
                    id="campDescription"
                    value={newCamp.description}
                    onChange={(e) => setNewCamp({ ...newCamp, description: e.target.value })}
                    rows={4}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kamp hakkında kısa bir açıklama yazın"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCamp({ name: '', description: '' });
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Düzenleme Modalı */}
        {showEditModal && selectedCamp && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Kampı Düzenle</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="editCampName" className="block text-sm font-medium text-gray-700 mb-2">
                    Kamp Adı
                  </label>
                  <input
                    type="text"
                    id="editCampName"
                    value={selectedCamp.name}
                    onChange={(e) => setSelectedCamp({ ...selectedCamp, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kampın adını girin"
                  />
                </div>
                <div>
                  <label htmlFor="editCampDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama (İsteğe bağlı)
                  </label>
                  <textarea
                    id="editCampDescription"
                    value={selectedCamp.description}
                    onChange={(e) => setSelectedCamp({ ...selectedCamp, description: e.target.value })}
                    rows={4}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kamp hakkında kısa bir açıklama yazın"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCamp(null);
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Silme Onay Modalı */}
        {showDeleteModal && selectedCamp && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Kampı Sil</h3>
              <p className="text-gray-600 mb-6">
                "{selectedCamp.name}" kampını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCamp(null);
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mevcut Kampa Katılma Modalı */}
        {showJoinModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={() => setShowJoinModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Mevcut Kampa Katıl</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="joinCampCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Kamp Kodu
                  </label>
                  <input
                    type="text"
                    id="joinCampCode"
                    value={joinCampCode}
                    onChange={(e) => setJoinCampCode(e.target.value.toUpperCase())}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kamp kodunu girin"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCampCode('');
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleJoinCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                >
                  Katıl
                </button>
              </div>
            </div>
          </div>
        )}

        {showCodeModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={() => setShowCodeModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Kampı Paylaş</h2>
              <p className="text-center text-gray-600 mb-6">Aşağıdaki kodları paylaşarak diğer kullanıcıları bu kampa davet edebilirsiniz.</p>

              {generatedCodes ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Okuma İzni Kodu</label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-lg font-mono text-gray-700">{generatedCodes.read}</span>
                      <button 
                        onClick={() => handleCopy(generatedCodes.read, 'read')}
                        className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200`}
                      >
                        {copiedCodeType === 'read' ? 'Kopyalandı!' : 'Kopyala'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yazma İzni Kodu</label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-lg font-mono text-gray-700">{generatedCodes.write}</span>
                      <button 
                        onClick={() => handleCopy(generatedCodes.write, 'write')}
                        className={`px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200`}
                      >
                        {copiedCodeType === 'write' ? 'Kopyalandı!' : 'Kopyala'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={handleGenerateShareCodes} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                  Paylaşım Kodlarını Üret
                </button>
              )}

              <div className="mt-8 flex justify-center">
                <button onClick={() => setShowCodeModal(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 