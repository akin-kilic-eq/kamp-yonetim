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
}

interface User {
  email: string;
}

export default function CampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const [campName, setCampName] = useState<string>('Kamp Yönetimi');

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

      setCampName(currentCamp.name);

      const isOwner = currentCamp.userEmail === currentUser.email;
      const isSharedWith = currentCamp.sharedWith?.some(member => member.email === currentUser.email);

      if (!isOwner && !isSharedWith) {
        // Eğer kullanıcı ne sahip ne de paylaşılan kişi ise, kamplar sayfasına yönlendir
        router.push('/camps');
      }
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