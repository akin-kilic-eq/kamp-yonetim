'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';

export default function Navbar() {
  const router = useRouter();
  const params = useParams();
  const [campName, setCampName] = useState('');
  const [currentUser, setCurrentUser] = useState<{ email: string; role?: string; site?: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const userSession = sessionStorage.getItem('currentUser');
    if (userSession) {
      setCurrentUser(JSON.parse(userSession));
    }

    if (params.camp) {
      const camps = JSON.parse(localStorage.getItem('camps') || '[]');
      const currentCamp = camps.find((camp: any) => 
        camp.name.toLowerCase().replace(/\s+/g, '') === params.camp
      );
      if (currentCamp) {
        setCampName(currentCamp.name);
      }
    }
  }, [params.camp]);

  // Dropdown menüyü dışarı tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    // Tüm kamp cache'lerini temizle
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('campsCache_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    sessionStorage.removeItem('currentUser');
    router.push('/login');
  };

  const handleNavigate = (path: string) => {
    if (params.camp) {
      router.push(`/${params.camp}/${path}`);
    }
  };

  // Personel yönetimi kullanıcıları için özel menü
  if (currentUser && (currentUser.role === 'personel_admin' || currentUser.role === 'personel_user')) {
    return (
      <nav className="bg-green-800 text-white px-6 py-3 flex justify-between items-center">
        <div className="font-bold text-xl">Personel Yönetimi Paneli</div>
        <div className="flex gap-6 items-center">
          <a href="/personnel" className="hover:underline">Personel Listesi</a>
          <a href="/personnel/reports" className="hover:underline">Personel Raporu</a>
          {currentUser.role === 'personel_admin' && (
            <a href="/personnel/settings" className="hover:underline">Ayarlar</a>
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem('currentUser');
              router.push('/login');
            }}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white ml-4"
          >
            Çıkış
          </button>
        </div>
      </nav>
    );
  }

  // Şantiye admini için personel sayfalarında beyaz navbar'a dropdown menü ekle
  if (
    currentUser &&
    currentUser.role === 'santiye_admin' &&
    typeof window !== 'undefined' &&
    (window.location.pathname === '/personnel' || window.location.pathname === '/personnel/reports')
  ) {
    return (
      <nav className="bg-white/90 backdrop-blur-sm shadow-lg relative z-[99999]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-800">Kamp Yönetimi</span>
              </div>
            </div>
            <div className="flex items-center">
              {currentUser && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{currentUser.email}</span>
                  
                  {/* Dropdown Menü */}
                  <div className="relative z-[9999999]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
                    >
                      Menü
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isMenuOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[999999]"
                        style={{ 
                          position: 'absolute', 
                          zIndex: 9999999
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href="/santiye-admin-paneli"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Şantiye Admin Paneli
                        </a>
                        <a
                          href="/camps"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Kamplar
                        </a>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            // Tüm kamp cache'lerini temizle
                            const keys = Object.keys(sessionStorage);
                            keys.forEach(key => {
                              if (key.startsWith('campsCache_')) {
                                sessionStorage.removeItem(key);
                              }
                            });
                            
                            sessionStorage.removeItem('currentUser');
                            router.push('/login');
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Çıkış Yap
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Admin kullanıcıları için özel menü
  if (currentUser && (currentUser.role === 'kurucu_admin' || currentUser.role === 'merkez_admin')) {
    const isKurucu = currentUser.role === 'kurucu_admin';
    return (
      <nav className="bg-blue-900 text-white px-6 py-3 flex justify-between items-center">
        <div className="font-bold text-xl">{isKurucu ? 'Kurucu Admin Paneli' : 'Merkez Admin Paneli'}</div>
        <div className="flex gap-6 items-center">
          <a href={isKurucu ? "/admin-dashboard" : "/merkez-admin-dashboard"} className="hover:underline">{isKurucu ? 'Admin Dashboard' : 'Merkez Admin Dashboard'}</a>
          <a href={isKurucu ? '/admin' : '/merkez-admin'} className="hover:underline">
            {isKurucu ? 'Admin Paneli' : 'Merkez Admin Paneli'}
          </a>
          <a href="/admin/settings" className="hover:underline">Panel Ayarları</a>
          <a href="/camps" className="hover:underline">Tüm Kamplar</a>
          <a href="/admin/personnel" className="hover:underline">Personel Yönetimi</a>
          <button
            onClick={() => {
              // Tüm kamp cache'lerini temizle
              const keys = Object.keys(sessionStorage);
              keys.forEach(key => {
                if (key.startsWith('campsCache_')) {
                  sessionStorage.removeItem(key);
                }
              });
              
              sessionStorage.removeItem('currentUser');
              router.push('/login');
            }}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white ml-4"
          >
            Çıkış
          </button>
        </div>
      </nav>
    );
  }

  // Şantiye admini için özel menü SADECE /santiye-admin-paneli adresinde
  if (
    currentUser &&
    currentUser.role === 'santiye_admin' &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/santiye-admin-paneli'
  ) {
    return (
      <nav className="bg-blue-900 text-white px-6 py-3 flex justify-between items-center shadow-lg">
        <div className="font-bold text-xl">Şantiye Admini Paneli</div>
        <div className="flex gap-6 items-center">
          <a href="/santiye-admin-paneli" className="hover:underline">Panel</a>
          <a href="/camps" className="hover:underline">Kamplar</a>
          <a href={`/personnel/reports?site=${currentUser.site}`} className="hover:underline">Personel Raporu</a>
          <button
            onClick={() => {
              // Tüm kamp cache'lerini temizle
              const keys = Object.keys(sessionStorage);
              keys.forEach(key => {
                if (key.startsWith('campsCache_')) {
                  sessionStorage.removeItem(key);
                }
              });
              
              sessionStorage.removeItem('currentUser');
              router.push('/login');
            }}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white ml-4"
          >
            Çıkış
          </button>
        </div>
      </nav>
    );
  }

  // Şantiye admini için /camps sayfasında dropdown menülü navbar
  if (
    currentUser &&
    currentUser.role === 'santiye_admin' &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/camps'
  ) {
    return (
      <nav className="bg-white/90 backdrop-blur-sm shadow-lg relative z-[99999]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-800">Kamp Yönetimi</span>
              </div>
            </div>
            <div className="flex items-center">
              {currentUser && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{currentUser.email}</span>
                  
                  {/* Dropdown Menü */}
                  <div className="relative z-[9999999]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
                    >
                      Menü
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isMenuOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[999999]"
                        style={{ 
                          position: 'absolute', 
                          zIndex: 9999999
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href="/santiye-admin-paneli"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Şantiye Admin Paneli
                        </a>
                        <a
                          href={`/personnel/reports?site=${currentUser.site}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Personel Raporu
                        </a>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            // Tüm kamp cache'lerini temizle
                            const keys = Object.keys(sessionStorage);
                            keys.forEach(key => {
                              if (key.startsWith('campsCache_')) {
                                sessionStorage.removeItem(key);
                              }
                            });
                            
                            sessionStorage.removeItem('currentUser');
                            router.push('/login');
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Çıkış Yap
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Diğer kullanıcılar için mevcut navbar
  return (
    <nav className="bg-white/90 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">{campName || 'Kamp Yönetimi'}</span>
            </div>
            {params.camp && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleNavigate('rooms')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Odalar
                </button>
                <button
                  onClick={() => handleNavigate('workers')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  İşçiler
                </button>
                <button
                  onClick={() => handleNavigate('report')}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Rapor
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {currentUser && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{currentUser.email}</span>
                <button
                  onClick={() => router.push('/camps')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Kamplar
                </button>
                {currentUser.role === 'santiye_admin' && currentUser.site && (
                  <button
                    onClick={() => router.push(`/personnel/reports?site=${currentUser.site}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Personel Raporu
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 