"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MerkezAdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState<{_id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', site: '', role: 'user' });
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
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

  // Filtrelenmiş kullanıcılar
  const currentUserStr = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const filteredUsers = users
    .filter((u: any) => u.email !== 'kurucu_admin@antteq.com')
    .filter((u: any) => u.role !== 'kurucu_admin' && u.role !== 'merkez_admin')
    .filter((u: any) => !currentUser || u.email !== currentUser.email)
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
      {/* Merkez Admin Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-blue-900 text-white px-6 py-3 z-50">
        <div className="flex justify-between items-center">
          <div className="font-bold text-xl">Merkez Admin Paneli</div>
          <div className="flex gap-6 items-center">
            <a href="/merkez-admin-dashboard" className="hover:underline">Merkez Admin Dashboard</a>
            <a href="/merkez-admin" className="hover:underline">Merkez Admin Paneli</a>
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
          <button
            onClick={() => router.push('/merkez-admin-dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Merkez Admin Dashboard'a Dön
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Yeni Kullanıcı Ekle
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
        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="w-full px-0">
            <table className="w-full bg-white border text-xs whitespace-normal">
              <thead>
                <tr>
                  <th className="border px-6 py-3 text-center">Email</th>
                  <th className="border px-6 py-3 text-center">Rol</th>
                  <th className="border px-6 py-3 text-center">Şantiye</th>
                  <th className="border px-6 py-3 text-center">Kullanıcı Onayı</th>
                  <th className="border px-6 py-3 text-center">Şantiye Erişim</th>
                  <th className="border px-6 py-3 text-center">Kamp İzinleri</th>
                  <th className="border px-6 py-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => (
                  <tr key={u._id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="border px-6 py-3 whitespace-nowrap text-center text-base font-medium">{u.email}</td>
                    <td className="border px-6 py-3 text-center">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.email, e.target.value)}
                        className="border rounded px-3 py-2"
                      >
                        <option value="user">User</option>
                        <option value="santiye_admin">Şantiye Admini</option>
                      </select>
                    </td>
                    <td className="border px-6 py-3 whitespace-nowrap text-center">{u.site}</td>
                    <td className="border px-6 py-3 whitespace-nowrap text-center">
                      {u.isApproved ? (
                        <button onClick={() => handleApprove(u.email, false)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded">Onayı Kaldır</button>
                      ) : (
                        <button onClick={() => handleApprove(u.email, true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">Onayla</button>
                      )}
                    </td>
                    <td className="border px-6 py-3 whitespace-nowrap text-center">
                      {u.role === 'user' || u.role === 'santiye_admin' ? (
                        u.siteAccessApproved ? (
                          <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">Verildi</span>
                        ) : (
                          <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-medium">Bekliyor</span>
                        )
                      ) : '-'}
                    </td>
                    <td className="border px-6 py-3 whitespace-nowrap text-center">
                      {u.role === 'user' && u.sitePermissions ? (
                        <span className="text-xs text-gray-600">
                          {u.sitePermissions.canViewCamps ? 'Görüntüleme' : ''}
                          {u.sitePermissions.canViewCamps && (u.sitePermissions.canEditCamps || u.sitePermissions.canCreateCamps) ? ', ' : ''}
                          {u.sitePermissions.canEditCamps ? 'Düzenleme' : ''}
                          {u.sitePermissions.canEditCamps && u.sitePermissions.canCreateCamps ? ', ' : ''}
                          {u.sitePermissions.canCreateCamps ? 'Oluşturma' : ''}
                          {!(u.sitePermissions.canViewCamps || u.sitePermissions.canEditCamps || u.sitePermissions.canCreateCamps) && 'Yok'}
                        </span>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="border px-6 py-3 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        u.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {u.isApproved ? 'Onaylı' : 'Onay Bekliyor'}
                      </span>
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
    </div>
  );
} 