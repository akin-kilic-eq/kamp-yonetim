'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCamps, createCamp, updateCamp, deleteCamp } from '../services/api';
import Navbar from '@/components/Navbar';

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  sharedWith: string[];
}

export default function CampsPage() {
  const router = useRouter();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [newCamp, setNewCamp] = useState({
    name: '',
    description: ''
  });
  const [joinCampCode, setJoinCampCode] = useState('');
  const [currentUser, setCurrentUser] = useState<{ email: string; camps: string[] } | null>(null);
  const [error, setError] = useState('');

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

  const handleJoinCamp = () => {
    if (!joinCampCode) {
      alert('Lütfen kamp kodunu girin');
      return;
    }

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const allCamps = JSON.parse(localStorage.getItem('camps') || '[]');
    const existingCamp = allCamps.find((camp: Camp) => camp.code === joinCampCode);
    
    if (!existingCamp) {
      alert('Geçersiz kamp kodu');
      return;
    }

    // Zaten eklenmiş mi kontrol et
    if (existingCamp.sharedWith?.includes(currentUser.email)) {
      alert('Bu kampa zaten eklendiniz');
      setShowJoinModal(false);
      setJoinCampCode('');
      return;
    }

    // Kampı paylaşılan kullanıcılara ekle
    const updatedCamps = allCamps.map((camp: Camp) => {
      if (camp.code === joinCampCode) {
        return {
          ...camp,
          sharedWith: [...(camp.sharedWith || []), currentUser.email]
        };
      }
      return camp;
    });

    localStorage.setItem('camps', JSON.stringify(updatedCamps));

    // Güncellenmiş kampı bul
    const joinedCamp = updatedCamps.find((camp: Camp) => camp.code === joinCampCode);
    if (joinedCamp) {
      // State'i güncelle
      setCamps(updatedCamps.filter((camp: Camp) => 
        camp.userEmail === currentUser.email || (camp.sharedWith || []).includes(currentUser.email)
      ));
      
      // URL'yi oluştur
      const formattedName = joinedCamp.name.toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '');

      // Kampı localStorage'a kaydet
      localStorage.setItem('currentCamp', JSON.stringify(joinedCamp));
      
      // Modalı kapat ve yönlendir
      setShowJoinModal(false);
      setJoinCampCode('');
      router.push(`/${formattedName}/dashboard`);
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{camp.name}</h3>
                  <div className="flex space-x-2">
                    {camp.userEmail === currentUser?.email && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCamp(camp);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCamp(camp);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCamp(camp);
                        setShowCodeModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {camp.description && (
                  <p className="text-gray-600 mb-4">{camp.description}</p>
                )}
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

        {showJoinModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Mevcut Kampa Katıl</h3>
              <div className="space-y-6">
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
      </div>
    </div>
  );
} 