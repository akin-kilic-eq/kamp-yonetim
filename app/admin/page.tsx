"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState<{_id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', site: '', role: 'user' });
  const [editFields, setEditFields] = useState({ password: '', site: '' });
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [fixingSites, setFixingSites] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "kurucu_admin") {
      // Merkez admin ise kendi paneline yönlendir
      if (user.role === "merkez_admin") {
        router.push("/merkez-admin");
        return;
      }
      router.push("/login");
      return;
    }
    fetchUsers(user.email);
    fetchSites();
  }, [router]);

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSites(data);
      }
    } catch (err) {
      setError('Şantiyeler yüklenemedi');
    }
  };

  const fetchUsers = async (email: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users?email=${email}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setUsers(data);
    } catch (err) {
      setError("Kullanıcılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userEmail: string, approve: boolean) => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, isApproved: approve, requesterEmail: currentUser.email })
    });
    fetchUsers(currentUser.email);
  };

  const handleRoleChange = async (userEmail: string, newRole: string) => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, role: newRole, requesterEmail: currentUser.email })
    });
    fetchUsers(currentUser.email);
  };

  const handleDelete = async (userEmail: string) => {
    if (!window.confirm('Kullanıcıyı silmek istediğine emin misin? Bu kullanıcının oluşturduğu kamplar şantiye adminine aktarılacaktır.')) return;
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, requesterEmail: currentUser.email })
      });
      
      const result = await res.json();
      
      if (result.error) {
        alert('Hata: ' + result.error);
      } else {
        let message = `Kullanıcı başarıyla silindi.`;
        if (result.transferredCamps > 0) {
          message += `\n${result.transferredCamps} kamp şantiye adminine aktarıldı.`;
        }
        if (result.errors && result.errors.length > 0) {
          message += `\n\nHatalar:\n${result.errors.join('\n')}`;
        }
        alert(message);
      }
    } catch (error) {
      alert('Kullanıcı silinirken hata oluştu: ' + error);
    }
    
    fetchUsers(currentUser.email);
  };

  // Kamp şantiye alanlarını düzelt
  const handleFixCampSites = async () => {
    if (!window.confirm('Geçmişten kalan kampların şantiye alanlarını düzeltmek istediğine emin misin? Bu işlem geri alınamaz.')) return;
    
    setFixingSites(true);
    setFixResult(null);
    
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const res = await fetch('/api/camps/fix-site-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: currentUser.email })
      });
      
      const result = await res.json();
      setFixResult(result);
      
      if (result.success) {
        alert(`Başarılı! ${result.updatedCount} kamp güncellendi.`);
      } else {
        alert('Hata: ' + result.error);
      }
    } catch (error) {
      alert('İşlem sırasında hata oluştu: ' + error);
    } finally {
      setFixingSites(false);
    }
  };

  // Yeni kullanıcı ekle
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newUser, requesterEmail: currentUser.email })
    });
    setShowAddModal(false);
    setNewUser({ email: '', password: '', site: '', role: 'user' });
    fetchUsers(currentUser.email);
  };

  // Kullanıcıyı düzenle (şantiye ve şifre)
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: editUser.email, site: editFields.site, password: editFields.password, requesterEmail: currentUser.email })
    });
    setShowEditModal(false);
    setEditUser(null);
    setEditFields({ password: '', site: '' });
    fetchUsers(currentUser.email);
  };

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users
    .filter((u: any) => u.email !== 'kurucu_admin@antteq.com')
    .filter((u: any) =>
      (activeTab === 'all' || !u.isApproved) &&
      (activeTab !== 'pending' || !u.isApproved)
    )
    .filter((u: any) => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="min-h-[80vh] flex justify-center bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}
    >
      {/* Kurucu Admin Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-blue-900 text-white px-6 py-3 z-50">
        <div className="flex justify-between items-center">
          <div className="font-bold text-xl">Kurucu Admin Paneli</div>
          <div className="flex gap-6 items-center">
            <a href="/admin-dashboard" className="hover:underline">Admin Dashboard</a>
            <a href="/admin" className="hover:underline">Admin Paneli</a>
            <a href="/admin/settings" className="hover:underline">Panel Ayarları</a>
            <a href="/camps" className="hover:underline">Tüm Kamplar</a>
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
        </div>
      </nav>

      <div className="max-w-7xl w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 mx-auto mt-20 mb-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Kullanıcı Yönetimi</h1>
        <div className="flex justify-between mb-6 flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin-dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Admin Dashboard'a Dön
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Yeni Kullanıcı Ekle
            </button>
          </div>
          <button
            onClick={handleFixCampSites}
            disabled={fixingSites}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded flex items-center"
          >
            {fixingSites ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Düzeltiliyor...
              </>
            ) : (
              'Kamp Şantiyelerini Düzelt'
            )}
          </button>
        </div>
        <div className="flex gap-4 mb-4">
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('all')}
          >
            Tüm Kullanıcılar
          </button>
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('pending')}
          >
            Onay Bekleyenler
          </button>
        </div>
        <div className="mb-0">
          <input
            type="text"
            placeholder="E-posta ile ara..."
            className="border rounded px-4 py-2 w-full block"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        {/* Düzeltme Sonucu */}
        {fixResult && (
          <div className={`mb-4 p-4 rounded-lg ${fixResult.success ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            <div className="font-semibold mb-2">
              {fixResult.success ? '✅ Düzeltme Tamamlandı' : '❌ Düzeltme Hatası'}
            </div>
            <div className="text-sm">
              {fixResult.message}
            </div>
            {fixResult.updatedCount !== undefined && (
              <div className="text-sm mt-1">
                Güncellenen kamp sayısı: {fixResult.updatedCount}
              </div>
            )}
            {fixResult.errors && fixResult.errors.length > 0 && (
              <div className="text-sm mt-2">
                <div className="font-semibold">Hatalar:</div>
                <ul className="list-disc list-inside mt-1">
                  {fixResult.errors.map((error: string, index: number) => (
                    <li key={index} className="text-xs">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white border text-base">
              <thead>
                <tr>
                  <th className="border px-6 py-3">Email</th>
                  <th className="border px-6 py-3">Rol</th>
                  <th className="border px-6 py-3">Şantiye</th>
                  <th className="border px-6 py-3">Onay</th>
                  <th className="border px-6 py-3">Şifre</th>
                  <th className="border px-6 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => (
                  <tr key={u._id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="border px-6 py-3 whitespace-nowrap">{u.email}</td>
                    <td className="border px-6 py-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.email, e.target.value)}
                        className="border rounded px-3 py-2"
                      >
                        <option value="user">User</option>
                        <option value="santiye_admin">Şantiye Admini</option>
                        <option value="merkez_admin">Merkez Admin</option>
                        <option value="personel_admin">Personel Admin</option>
                        <option value="personel_user">Personel User</option>
                        <option value="kurucu_admin">Kurucu Admin</option>
                      </select>
                    </td>
                    <td className="border px-6 py-3 whitespace-nowrap">{u.site}</td>
                    <td className="border px-6 py-3">
                      {u.isApproved ? (
                        <button onClick={() => handleApprove(u.email, false)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded">Onayı Kaldır</button>
                      ) : (
                        <button onClick={() => handleApprove(u.email, true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">Onayla</button>
                      )}
                    </td>
                    <td className="border px-6 py-3 whitespace-nowrap">{u.password}</td>
                    <td className="border px-6 py-3">
                      <button onClick={() => { setEditUser(u); setEditFields({ password: '', site: u.site }); setShowEditModal(true); }} className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-2 rounded mr-2">Düzenle</button>
                      <button onClick={() => handleDelete(u.email)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Yeni Kullanıcı Ekle Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input type="email" required placeholder="Email" className="w-full border rounded px-3 py-2" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
              <input type="password" required placeholder="Şifre" className="w-full border rounded px-3 py-2" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              <select required className="w-full border rounded px-3 py-2" value={newUser.site} onChange={e => setNewUser({ ...newUser, site: e.target.value })}>
                <option value="" disabled>Şantiye seçin</option>
                {sites.map((site) => (
                  <option key={site._id} value={site.name}>
                    {site.name}
                  </option>
                ))}
              </select>
              <select required className="w-full border rounded px-3 py-2" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="user">User</option>
                <option value="santiye_admin">Şantiye Admini</option>
                <option value="merkez_admin">Merkez Admin</option>
                <option value="personel_admin">Personel Admin</option>
                <option value="personel_user">Personel User</option>
                <option value="kurucu_admin">Kurucu Admin</option>
              </select>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Kullanıcı Düzenle Modalı */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Kullanıcıyı Düzenle</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <input type="text" disabled value={editUser.email} className="w-full border rounded px-3 py-2 bg-gray-100" />
              <input type="password" placeholder="Yeni Şifre (değiştirmek için yaz)" className="w-full border rounded px-3 py-2" value={editFields.password} onChange={e => setEditFields({ ...editFields, password: e.target.value })} />
              <select required className="w-full border rounded px-3 py-2" value={editFields.site} onChange={e => setEditFields({ ...editFields, site: e.target.value })}>
                <option value="" disabled>Şantiye seçin</option>
                {sites.map((site) => (
                  <option key={site._id} value={site.name}>
                    {site.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 