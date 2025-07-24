"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MerkezAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Merkez admin kontrolü
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "merkez_admin") {
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
      <div className="max-w-3xl w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 relative">
        {/* Çıkış Yap Butonu */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          Çıkış Yap
        </button>
        
        <h1 className="text-3xl font-bold mb-6 text-center">Merkez Admin Dashboard</h1>
        <div className="mb-8 text-center text-lg">Hoş geldin, merkez admin! Buradan kullanıcıları yönetebilir ve kampları görüntüleyebilirsin.</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-100 rounded-lg p-6 text-center flex flex-col h-full">
            <div className="text-xl font-semibold mb-2">Kullanıcı Yönetimi</div>
            <div className="mb-4 flex-grow">Kullanıcıları görüntüle, onayla ve rol ata.</div>
            <button 
              onClick={() => router.push('/merkez-admin')} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-auto"
            >
              Merkez Admin Paneline Git
            </button>
          </div>
          <div className="bg-green-100 rounded-lg p-6 text-center flex flex-col h-full">
            <div className="text-xl font-semibold mb-2">Kamp Yönetimi</div>
            <div className="mb-4 flex-grow">Sistemdeki tüm kampları görüntüle.</div>
            <button 
              onClick={() => router.push('/camps')} 
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mt-auto"
            >
              Tüm Kampları Gör
            </button>
          </div>
          <div className="bg-purple-100 rounded-lg p-6 text-center flex flex-col h-full">
            <div className="text-xl font-semibold mb-2">Panel Ayarları</div>
            <div className="mb-4 flex-grow">Şantiye listesi ve sistem ayarlarını görüntüle.</div>
            <button 
              onClick={() => router.push('/admin/settings')} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded mt-auto"
            >
              Ayarlara Git
            </button>
          </div>
        </div>
        <div className="mt-10 text-center text-gray-500">Merkez admin olarak kullanıcı düzenleme ve silme yetkiniz bulunmamaktadır.</div>
      </div>
    </div>
  );
} 