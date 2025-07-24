'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  sharedWith: { email: string; permission: 'read' | 'write' }[];
  site?: string;
}

interface User {
  email: string;
  role?: string;
  site?: string;
  siteAccessApproved?: boolean;
  sitePermissions?: {
    canViewCamps?: boolean;
    canEditCamps?: boolean;
    canCreateCamps?: boolean;
  };
}

export default function CampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const [campName, setCampName] = useState<string>('Kamp Yönetimi');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const userSession = sessionStorage.getItem('currentUser');
    const campSession = localStorage.getItem('currentCamp');

    if (!userSession || !campSession) {
      router.push('/login');
      return;
    }

    try {
      const currentUser: User = JSON.parse(userSession);
      const currentCamp: Camp = JSON.parse(campSession);

      console.log('Session verileri:', {
        currentUser: currentUser,
        currentCamp: currentCamp,
        currentUserString: JSON.stringify(currentUser, null, 2)
      });

      setCurrentUser(currentUser);
      setCampName(currentCamp.name);

      // Kurucu admin veya merkez admin ise her kampı görebilsin
      if (currentUser.role === 'kurucu_admin' || currentUser.role === 'merkez_admin') {
        return;
      }

      // Şantiye admini kendi şantiyesindeki user'ların kamplarına erişebilir
      if (currentUser.role === 'santiye_admin' && currentUser.site) {
        console.log('Şantiye admini kontrolü:', {
          userSite: currentUser.site,
          campSite: currentCamp.site,
          userRole: currentUser.role
        });
        // Kamp sahibinin şantiye bilgisini kontrol et
        if (currentCamp.site === currentUser.site) {
          console.log('Şantiye admini erişim verildi');
          return; // Aynı şantiyedeki kamp, erişim ver
        }
      }

      // User rolündeki kullanıcılar için şantiye erişim yetkisi kontrolü
      if (currentUser.role === 'user') {
        const isOwner = currentCamp.userEmail === currentUser.email;
        const isSharedWith = currentCamp.sharedWith?.some(member => member.email === currentUser.email);
        
        console.log('User kontrolü:', {
          isOwner,
          isSharedWith,
          siteAccessApproved: currentUser.siteAccessApproved,
          canViewCamps: currentUser.sitePermissions?.canViewCamps,
          userSite: currentUser.site,
          campSite: currentCamp.site,
          userEmail: currentUser.email,
          campOwner: currentCamp.userEmail
        });
        
        // Kendi kampı veya paylaşılan kamp ise erişim ver
        if (isOwner || isSharedWith) {
          console.log('User erişim verildi (kendi kampı veya paylaşılan)');
          return;
        }
        
        // Şantiye erişim yetkisi ve kamp görüntüleme izni varsa, aynı şantiyedeki kamplara erişebilir
        const siteAccessApproved = currentUser.siteAccessApproved ?? false;
        const canViewCamps = currentUser.sitePermissions?.canViewCamps ?? false;
        
        if (siteAccessApproved && 
            canViewCamps && 
            currentUser.site && 
            currentCamp.site === currentUser.site) {
          console.log('User erişim verildi (şantiye yetkisi)');
          return;
        }
      }

      // Eğer yukarıdaki koşullardan hiçbiri sağlanmıyorsa, kamplar sayfasına yönlendir
      console.log('Erişim reddedildi, kamplar sayfasına yönlendiriliyor');
      router.push('/camps');
    } catch (error) {
      console.error("Oturum verileri okunurken hata oluştu:", error);
      router.push('/login');
    }

  }, [router, params.camp]);

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentCamp');
    router.push('/login');
  };

  // Kurucu admin VEYA merkez admin VEYA şantiye admini için özel navbar
  if (currentUser && (currentUser.role === 'kurucu_admin' || currentUser.role === 'merkez_admin' || currentUser.role === 'santiye_admin')) {
    return (
      <div className="min-h-screen">
        <nav className="bg-blue-900 text-white px-6 py-3">
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-xl">
              {currentUser.role === 'kurucu_admin' ? 'Kurucu Admin Paneli' : 
               currentUser.role === 'merkez_admin' ? 'Merkez Admin Paneli' : 
               'Şantiye Admini Paneli'} - {campName}
            </div>
            <div className="flex gap-6 items-center">
              <a href={
                currentUser.role === 'kurucu_admin' ? "/admin-dashboard" : 
                currentUser.role === 'merkez_admin' ? "/merkez-admin-dashboard" : 
                "/camps"
              } className="hover:underline">
                {currentUser.role === 'kurucu_admin' ? 'Admin Dashboard' : 
                 currentUser.role === 'merkez_admin' ? 'Merkez Admin Dashboard' : 
                 'Kamplar'}
              </a>
              <a href={
                currentUser.role === 'kurucu_admin' ? '/admin' : 
                currentUser.role === 'merkez_admin' ? '/merkez-admin' : 
                '/santiye-admin-paneli'
              } className="hover:underline">
                {currentUser.role === 'kurucu_admin' ? 'Admin Paneli' : 
                 currentUser.role === 'merkez_admin' ? 'Merkez Admin Paneli' : 
                 'Şantiye Admini Paneli'}
              </a>
              <a href="/camps" className="hover:underline">Tüm Kamplar</a>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white ml-4"
              >
                Çıkış
              </button>
            </div>
          </div>
          {/* Kamp içi navigasyon */}
          <div className="flex items-center space-x-6 border-t border-blue-800 pt-3">
            <Link
              href={`/${params.camp}/dashboard`}
              className="text-blue-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href={`/${params.camp}/rooms`}
              className="text-blue-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Odalar
            </Link>
            <Link
              href={`/${params.camp}/workers`}
              className="text-blue-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              İşçiler
            </Link>
            <Link
              href={`/${params.camp}/report`}
              className="text-blue-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Rapor
            </Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href={`/${params.camp}/dashboard`} className="flex-shrink-0">
                <img
                  src="/antteq-logo.png"
                  alt="ANTTEQ Logo"
                  className="h-8 w-auto"
                />
              </Link>
              <div className="ml-10 flex items-center space-x-6">
                <Link
                  href={`/${params.camp}/rooms`}
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-bold"
                >
                  Odalar
                </Link>
                <Link
                  href={`/${params.camp}/workers`}
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-bold"
                >
                  İşçiler
                </Link>
                <Link
                  href={`/${params.camp}/report`}
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-bold"
                >
                  Rapor
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/camps"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Kamplarım
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 