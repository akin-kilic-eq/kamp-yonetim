"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";

interface Site {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (!['kurucu_admin', 'merkez_admin'].includes(user.role)) {
      router.push("/login");
      return;
    }
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setSites(data);
    } catch (err) {
      setError("Şantiyeler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userStr = sessionStorage.getItem("currentUser");
      const user = JSON.parse(userStr || '{}');
      
      console.log('Form verisi:', formData);
      
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user': JSON.stringify(user)
        },
        body: JSON.stringify(formData)
      });
      
      console.log('API yanıtı:', res.status);
      const data = await res.json();
      console.log('API verisi:', data);
      
      if (data.error) setError(data.error);
      else {
        setShowAddModal(false);
        setFormData({ name: '', description: '' });
        fetchSites();
      }
    } catch (err) {
      console.error('Hata:', err);
      setError('Şantiye eklenemedi');
    }
  };

  const handleEditClick = (site: Site) => {
    setEditSite(site);
    setFormData({ name: site.name, description: site.description });
    setShowEditModal(true);
  };

  const handleEditSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSite) return;
    try {
      const userStr = sessionStorage.getItem("currentUser");
      const user = JSON.parse(userStr || '{}');
      
      const res = await fetch('/api/sites', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'user': JSON.stringify(user)
        },
        body: JSON.stringify({
          _id: editSite._id,
          name: formData.name,
          description: formData.description
        })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setShowEditModal(false);
        setEditSite(null);
        setFormData({ name: '', description: '' });
        fetchSites();
      }
    } catch (err) {
      setError('Şantiye güncellenemedi');
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Bu şantiyeyi silmek istediğinize emin misiniz?')) return;
    
    try {
      const userStr = sessionStorage.getItem("currentUser");
      const user = JSON.parse(userStr || '{}');
      
      const res = await fetch('/api/sites', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'user': JSON.stringify(user)
        },
        body: JSON.stringify({ id: siteId })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else fetchSites();
    } catch (err) {
      setError('Şantiye silinemedi');
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}>
      <Navbar />
      <div className="max-w-6xl w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 mx-auto mt-12 mb-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Panel Ayarları</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin-dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Geri Dön
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Yeni Şantiye Ekle
            </button>
          </div>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white border text-base">
              <thead>
                <tr>
                  <th className="border px-6 py-3 text-center">Şantiye Adı</th>
                  <th className="border px-6 py-3 text-center">Açıklama</th>
                  <th className="border px-6 py-3 text-center">Oluşturulma</th>
                  <th className="border px-6 py-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site._id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="border px-6 py-3 whitespace-nowrap text-center">{site.name}</td>
                    <td className="border px-6 py-3 text-center">{site.description || '-'}</td>
                    <td className="border px-6 py-3 whitespace-nowrap text-center">
                      {new Date(site.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border px-6 py-3 flex gap-2 justify-center">
                      <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded"
                        onClick={() => handleEditClick(site)}
                      >
                        Düzenle
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                        onClick={() => handleDeleteSite(site._id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yeni Şantiye Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Yeni Şantiye Ekle</h2>
            <form onSubmit={handleAddSite} className="space-y-4">
              <input 
                type="text" 
                required 
                placeholder="Şantiye Adı" 
                className="w-full border rounded px-3 py-2" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
              />
              <textarea 
                placeholder="Açıklama (opsiyonel)" 
                className="w-full border rounded px-3 py-2" 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
              />
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded bg-gray-300">
                  İptal
                </button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Düzenleme Modalı */}
      {showEditModal && editSite && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Şantiye Düzenle</h2>
            <form onSubmit={handleEditSite} className="space-y-4">
              <input 
                type="text" 
                required 
                placeholder="Şantiye Adı" 
                className="w-full border rounded px-3 py-2" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
              />
              <textarea 
                placeholder="Açıklama (opsiyonel)" 
                className="w-full border rounded px-3 py-2" 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
              />
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded bg-gray-300">
                  İptal
                </button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 