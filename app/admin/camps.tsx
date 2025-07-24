"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  site?: string;
  createdAt?: string;
  sharedWith?: { email: string; permission: 'read' | 'write' }[];
}

export default function AdminCampsPage() {
  const router = useRouter();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCamp, setEditCamp] = useState<Camp | null>(null);
  const [editFields, setEditFields] = useState({ name: '', description: '', site: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCampId, setDeleteCampId] = useState<string | null>(null);

  useEffect(() => {
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
    fetchCamps();
  }, []);

  const fetchCamps = async () => {
    setLoading(true);
    setError("");
    try {
      const userStr = sessionStorage.getItem("currentUser");
      const user = JSON.parse(userStr || '{}');
      console.log('Session user:', user);
      console.log('User role:', user.role);
      console.log('User email:', user.email);
      
      const apiUrl = `/api/camps?userEmail=${user.email}&role=${user.role}`;
      console.log('Full API URL:', apiUrl);
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      console.log('API Response:', data);
      if (data.error) setError(data.error);
      else setCamps(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError("Kamplar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (camp: Camp) => {
    setEditCamp(camp);
    setEditFields({ name: camp.name, description: camp.description, site: camp.site || '' });
    setShowEditModal(true);
  };

  const handleEditCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCamp) return;
    try {
      const res = await fetch('/api/camps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: editCamp._id,
          name: editFields.name,
          description: editFields.description,
          site: editFields.site,
          sharedWith: editCamp.sharedWith || []
        })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      setShowEditModal(false);
      setEditCamp(null);
      fetchCamps();
    } catch (err) {
      setError('Kamp güncellenemedi');
    }
  };

  const handleDeleteClick = (campId: string) => {
    setDeleteCampId(campId);
    setShowDeleteModal(true);
  };

  const handleDeleteCamp = async () => {
    if (!deleteCampId) return;
    try {
      const res = await fetch('/api/camps', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteCampId })
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      setShowDeleteModal(false);
      setDeleteCampId(null);
      fetchCamps();
    } catch (err) {
      setError('Kamp silinemedi');
    }
  };

  const filteredCamps = camps.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      (c.site || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[80vh] flex justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}>
      <div className="max-w-7xl w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 mx-auto mt-12 mb-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Tüm Kamplar</h1>
        <div className="flex justify-between mb-6 flex-wrap gap-2">
          <button
            onClick={() => router.push('/camps')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Kamplar'a Dön
          </button>
        </div>
        <div className="mb-0">
          <input
            type="text"
            placeholder="Kamp adı, oluşturan veya şantiye ile ara..."
            className="border rounded px-4 py-2 w-full block"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white border text-base">
              <thead>
                <tr>
                  <th className="border px-6 py-3">Kamp Adı</th>
                  <th className="border px-6 py-3">Açıklama</th>
                  <th className="border px-6 py-3">Oluşturan</th>
                  <th className="border px-6 py-3">Şantiye</th>
                  <th className="border px-6 py-3">Oluşturulma</th>
                  <th className="border px-6 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredCamps.map((c) => (
                  <tr key={c._id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="border px-6 py-3 whitespace-nowrap">{c.name}</td>
                    <td className="border px-6 py-3 whitespace-nowrap">{c.description}</td>
                    <td className="border px-6 py-3 whitespace-nowrap">{c.userEmail}</td>
                    <td className="border px-6 py-3 whitespace-nowrap">{c.site || '-'}</td>
                    <td className="border px-6 py-3 whitespace-nowrap">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</td>
                    <td className="border px-6 py-3 flex gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-2 rounded"
                        onClick={() => router.push(`/${c._id}/dashboard`)}
                      >
                        Yönetim Paneline Git
                      </button>
                      <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded"
                        onClick={() => handleEditClick(c)}
                      >
                        Düzenle
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                        onClick={() => handleDeleteClick(c._id)}
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
      {/* Düzenle Modalı */}
      {showEditModal && editCamp && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Kampı Düzenle</h2>
            <form onSubmit={handleEditCamp} className="space-y-4">
              <input type="text" required placeholder="Kamp Adı" className="w-full border rounded px-3 py-2" value={editFields.name} onChange={e => setEditFields({ ...editFields, name: e.target.value })} />
              <input type="text" required placeholder="Şantiye" className="w-full border rounded px-3 py-2" value={editFields.site} onChange={e => setEditFields({ ...editFields, site: e.target.value })} />
              <textarea required placeholder="Açıklama" className="w-full border rounded px-3 py-2" value={editFields.description} onChange={e => setEditFields({ ...editFields, description: e.target.value })} />
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Silme Onay Modalı */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Kampı Sil</h2>
            <p>Bu kampı silmek istediğine emin misin? Bu işlem geri alınamaz.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded bg-gray-300">İptal</button>
              <button type="button" onClick={handleDeleteCamp} className="px-4 py-2 rounded bg-red-600 text-white">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 