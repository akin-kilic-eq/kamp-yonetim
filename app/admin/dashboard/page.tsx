"use client";
import React from "react";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Kurucu Admin Dashboard</h1>
        <div className="mb-8 text-center text-lg">Hoş geldin, kurucu admin! Buradan tüm kullanıcıları ve kampları yönetebilirsin.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-100 rounded-lg p-6 text-center">
            <div className="text-xl font-semibold mb-2">Kullanıcı Yönetimi</div>
            <div className="mb-4">Tüm kullanıcıları görüntüle, onayla, rol ata veya sil.</div>
            <a href="/admin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Admin Paneline Git</a>
          </div>
          <div className="bg-green-100 rounded-lg p-6 text-center">
            <div className="text-xl font-semibold mb-2">Kamp Yönetimi</div>
            <div className="mb-4">Sistemdeki tüm kampları görüntüle ve düzenle.</div>
            <a href="/admin?tab=camps" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Tüm Kampları Gör</a>
          </div>
        </div>
        <div className="mt-10 text-center text-gray-500">İleride burada istatistikler ve hızlı raporlar da olacak.</div>
      </div>
    </div>
  );
} 