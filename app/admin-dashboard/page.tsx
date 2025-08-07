"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Sadece kurucu admin kontrolü
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "kurucu_admin") {
      router.push("/login");
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}
    >
      <div className="max-w-6xl w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 relative">
        {/* Çıkış Yap Butonu */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          Çıkış Yap
        </button>
        
        <h1 className="text-3xl font-bold mb-6 text-center">Kurucu Admin Dashboard</h1>
        <div className="mb-8 text-center text-lg">Hoş geldin, kurucu admin! Buradan tüm kullanıcıları ve kampları yönetebilirsin.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <div className="bg-blue-100 rounded-lg p-8 text-center flex flex-col h-full min-h-[200px]">
            <div className="text-xl font-semibold mb-4">Kullanıcı Yönetimi</div>
            <div className="mb-6 flex-grow text-sm">Tüm kullanıcıları görüntüle, onayla, rol ata, düzenle veya sil.</div>
            <button 
              onClick={() => router.push('/admin')} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mt-auto font-medium"
            >
              Admin Paneline Git
            </button>
          </div>
          <div className="bg-green-100 rounded-lg p-8 text-center flex flex-col h-full min-h-[200px]">
            <div className="text-xl font-semibold mb-4">Kamp Yönetimi</div>
            <div className="mb-6 flex-grow text-sm">Sistemdeki tüm kampları görüntüle ve düzenle.</div>
            <button 
              onClick={() => router.push('/camps')} 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg mt-auto font-medium"
            >
              Tüm Kampları Gör
            </button>
          </div>
          <div className="bg-orange-100 rounded-lg p-8 text-center flex flex-col h-full min-h-[200px]">
            <div className="text-xl font-semibold mb-4">Personel Yönetimi</div>
            <div className="mb-6 flex-grow text-sm">Personel listesini görüntüle, ekle, düzenle veya sil.</div>
            <button 
              onClick={() => router.push('/admin/personnel')} 
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg mt-auto font-medium"
            >
              Personel Paneline Git
            </button>
          </div>
          <div className="bg-purple-100 rounded-lg p-8 text-center flex flex-col h-full min-h-[200px]">
            <div className="text-xl font-semibold mb-4">Panel Ayarları</div>
            <div className="mb-6 flex-grow text-sm">Şantiye listesi ve sistem ayarlarını yönet.</div>
            <button 
              onClick={() => router.push('/admin/settings')} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg mt-auto font-medium"
            >
              Ayarlara Git
            </button>
          </div>
        </div>
        <div className="mt-10 text-center text-gray-500">İleride burada istatistikler ve hızlı raporlar da olacak.</div>
      </div>
    </div>
  );
} 