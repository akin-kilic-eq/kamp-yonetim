'use client';

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { cache } from '@/app/lib/cache';
import { useSearchParams } from 'next/navigation';

interface User {
  email: string;
  role: string;
  site: string;
  isApproved: boolean;
  createdAt: string;
  siteAccessApproved?: boolean; // Added for the new column
  sitePermissions?: { // Added for permissions
    canViewCamps: boolean;
    canEditCamps: boolean;
    canCreateCamps: boolean;
  };
}

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  site?: string;
  createdAt: string;
  sharedWithSites?: string[]; // Şantiye paylaşımı için
  isPublic?: boolean; // Ortak kullanıma açık mı
}

interface Site {
  _id: string;
  name: string;
  description?: string;
}

interface SitePermissions {
  canViewCamps: boolean;
  canEditCamps: boolean;
  canCreateCamps: boolean;
}

export default function SantiyeAdminPaneli() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<{ email: string; site?: string; activeSite?: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCampModal, setShowCampModal] = useState(false);
  const [campModalTab, setCampModalTab] = useState<'details' | 'settings'>('details');
  const [editPermissions, setEditPermissions] = useState<SitePermissions | null>(null);
  const [editAccessApproved, setEditAccessApproved] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [campSettings, setCampSettings] = useState({
    isPublic: false,
    sharedWithSites: [] as string[]
  });
  const [campUsageData, setCampUsageData] = useState<{
    rooms: any[];
    workers: any[];
  }>({ rooms: [], workers: [] });

  useEffect(() => {
    // Sayfa yüklendiğinde cache'i kontrol et ve gerekirse temizle
    if (typeof window !== 'undefined') {
      // Performance Navigation API ile sayfa yenilenip yenilenmediğini kontrol et
      if (performance.navigation.type === 1) {
        cache.forceClear();
        console.log('Şantiye Admin Paneli: Sayfa yenilendi, cache temizlendi');
      }
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const userStr = sessionStorage.getItem("currentUser");
        if (!userStr) {
          setError("Oturum bulunamadı");
          setLoading(false);
          return;
        }
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        
        // Session storage'dan currentUser'ı al ve activeSite bilgisini çıkar
        const currentUserStr = sessionStorage.getItem("currentUser");
        let activeSite = '';
        if (currentUserStr) {
          const currentUserData = JSON.parse(currentUserStr);
          activeSite = currentUserData.activeSite || currentUserData.site || '';
        }
        console.log('Session storage activeSite:', activeSite);
        
        // Şantiye admini için activeSite parametresi ile kullanıcıları getir
        const res = await fetch(`/api/users?email=${user.email}&activeSite=${encodeURIComponent(activeSite)}`);
        const data = await res.json();
        if (data.error) setError(data.error);
        else setUsers(data);
      } catch (err) {
        setError("Kullanıcılar yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    const fetchCamps = async () => {
      setLoadingCamps(true);
      try {
        const userStr = sessionStorage.getItem("currentUser");
        if (!userStr) return;
        
        const user = JSON.parse(userStr);
        // URL'den site parametresini al, yoksa user.site kullan
        const siteParam = searchParams.get('site') || user.site;
        
        if (user.role === 'santiye_admin' && siteParam) {
          const res = await fetch(`/api/camps?userEmail=${user.email}&role=${user.role}&activeSite=${encodeURIComponent(siteParam)}`);
          const data = await res.json();
          if (!data.error) {
            setCamps(data);
          }
        }
      } catch (err) {
        console.error("Kamplar yüklenemedi:", err);
      } finally {
        setLoadingCamps(false);
      }
    };

    const fetchSites = async () => {
      setLoadingSites(true);
      try {
        const res = await fetch('/api/sites');
        const data = await res.json();
        if (!data.error) {
          setSites(data);
        }
      } catch (err) {
        console.error("Şantiyeler yüklenemedi:", err);
      } finally {
        setLoadingSites(false);
      }
    };

    fetchUsers();
    fetchCamps();
    fetchSites();
  }, []);

  // Modal açıldığında izinleri state'e al
  useEffect(() => {
    if (showModal && selectedUser && selectedUser.role === "user") {
      setEditPermissions({
        canViewCamps: selectedUser.sitePermissions?.canViewCamps || false,
        canEditCamps: selectedUser.sitePermissions?.canEditCamps || false,
        canCreateCamps: selectedUser.sitePermissions?.canCreateCamps || false,
      });
      setEditAccessApproved(!!selectedUser.siteAccessApproved);
      setSaveError("");
    }
  }, [showModal, selectedUser]);

  // Şantiye erişim onayı değiştiğinde izinleri sıfırla
  const handleAccessApprovedChange = (checked: boolean) => {
    setEditAccessApproved(checked);
    if (!checked) {
      // Erişim onayı kaldırılırsa tüm izinleri sıfırla
      setEditPermissions({
        canViewCamps: false,
        canEditCamps: false,
        canCreateCamps: false,
      });
    }
  };

  // Kamp düzenleme izni değiştiğinde görüntüleme iznini de otomatik seç
  const handleEditCampsChange = (checked: boolean) => {
    if (checked) {
      // Düzenleme izni veriliyorsa görüntüleme izni de otomatik ver
      setEditPermissions(p => p ? { 
        ...p, 
        canEditCamps: true, 
        canViewCamps: true 
      } : p);
    } else {
      // Düzenleme izni kaldırılıyorsa sadece onu kaldır
      setEditPermissions(p => p ? { 
        ...p, 
        canEditCamps: false 
      } : p);
    }
  };

  // Kamp oluşturma izni değiştiğinde görüntüleme iznini de otomatik seç
  const handleCreateCampsChange = (checked: boolean) => {
    if (checked) {
      // Oluşturma izni veriliyorsa görüntüleme izni de otomatik ver
      setEditPermissions(p => p ? { 
        ...p, 
        canCreateCamps: true, 
        canViewCamps: true 
      } : p);
    } else {
      // Oluşturma izni kaldırılıyorsa sadece onu kaldır
      setEditPermissions(p => p ? { 
        ...p, 
        canCreateCamps: false 
      } : p);
    }
  };

  // Kamp kullanım verilerini kontrol et
  const checkCampUsage = async (campId: string) => {
    try {
      // Odaları getir
      const roomsResponse = await fetch(`/api/rooms?campId=${campId}`);
      const rooms = await roomsResponse.json();
      
      // İşçileri getir (tüm odalardaki)
      const workersResponse = await fetch(`/api/workers?campId=${campId}`);
      const workers = await workersResponse.json();
      
      setCampUsageData({ rooms, workers });
      return { rooms, workers };
    } catch (error) {
      console.error('Kamp kullanım verileri alınırken hata:', error);
      return { rooms: [], workers: [] };
    }
  };

  // Ortak kullanım değişikliği kontrolü
  const validateSharedUsageChange = (currentSettings: any, newSettings: any) => {
    const { rooms, workers } = campUsageData;
    
    // Ortak kullanımı kapatmaya çalışıyor mu?
    if (currentSettings.isPublic && !newSettings.isPublic) {
      // Başka şantiyelerden eklenmiş oda/işçi var mı kontrol et
      const hasExternalRooms = rooms.some((room: any) => room.project !== selectedCamp?.site);
      const hasExternalWorkers = workers.some((worker: any) => worker.project !== selectedCamp?.site);
      
      if (hasExternalRooms || hasExternalWorkers) {
        return {
          valid: false,
          message: 'Bu kampta başka şantiyelerden eklenmiş oda/işçi bulunuyor. Ortak kullanımı kapatamazsınız.'
        };
      }
    }
    
    // Şantiye çıkarmaya çalışıyor mu?
    if (currentSettings.isPublic && newSettings.isPublic) {
      const removedSites = currentSettings.sharedWithSites.filter((siteId: string) => 
        !newSettings.sharedWithSites.includes(siteId)
      );
      
      if (removedSites.length > 0) {
        // Çıkarılan şantiyelerden eklenmiş oda/işçi var mı kontrol et
        const removedSiteNames = sites.filter(site => removedSites.includes(site._id)).map(site => site.name);
        
        const hasRemovedSiteRooms = rooms.some((room: any) => removedSiteNames.includes(room.project));
        const hasRemovedSiteWorkers = workers.some((worker: any) => removedSiteNames.includes(worker.project));
        
        if (hasRemovedSiteRooms || hasRemovedSiteWorkers) {
          return {
            valid: false,
            message: `Çıkarılmaya çalışılan şantiyelerden eklenmiş oda/işçi bulunuyor. Bu şantiyeleri çıkaramazsınız.`
          };
        }
      }
    }
    
    return { valid: true };
  };

  // Kamp ayarlarını kaydet
  const handleSaveCampSettings = async () => {
    if (!selectedCamp) return;
    
    try {
      // Önce kamp kullanım verilerini kontrol et
      await checkCampUsage(selectedCamp._id);
      
      // Mevcut ayarlarla yeni ayarları karşılaştır
      const currentSettings = {
        isPublic: selectedCamp.isPublic || false,
        sharedWithSites: selectedCamp.sharedWithSites || []
      };
      
      const validation = validateSharedUsageChange(currentSettings, campSettings);
      if (!validation.valid) {
        alert(validation.message);
        return;
      }
      
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const res = await fetch('/api/camps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: selectedCamp._id,
          userEmail: currentUser.email,
          isPublic: campSettings.isPublic,
          sharedWithSites: campSettings.sharedWithSites
        })
      });
      
      const result = await res.json();
      if (result.error) {
        alert('Hata: ' + result.error);
      } else {
        alert('Kamp ayarları başarıyla kaydedildi!');
        // Kamp listesini güncelle
        const updatedCamps = camps.map(camp => 
          camp._id === selectedCamp._id 
            ? { ...camp, isPublic: campSettings.isPublic, sharedWithSites: campSettings.sharedWithSites }
            : camp
        );
        setCamps(updatedCamps);
        // Modal'ı kapat
        setShowCampModal(false);
        setSelectedCamp(null);
      }
    } catch (error) {
      alert('Kaydetme sırasında hata oluştu: ' + error);
    }
  };

  // İzinleri kaydet
  const handleSavePermissions = async () => {
    if (!selectedUser || !editPermissions) return;
    setSaving(true);
    setSaveError("");
    try {
      const userStr = sessionStorage.getItem("currentUser");
      const current = userStr ? JSON.parse(userStr) : null;
      const activeSite = current?.activeSite || current?.site || '';
      
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedUser.email,
          siteAccessApproved: editAccessApproved,
          sitePermissions: editPermissions,
          requesterEmail: current?.email,
          activeSite: activeSite // Active site bilgisini de gönder
        })
      });
      const data = await res.json();
      if (data.error) setSaveError(data.error);
      else {
        setShowModal(false);
        // Tabloyu güncellemek için tekrar fetch et
        setUsers(users => users.map(u => u.email === selectedUser.email ? { ...u, siteAccessApproved: editAccessApproved, sitePermissions: editPermissions } : u));
        
        // Eğer güncellenen kullanıcı şu anda giriş yapmışsa, session'ını güncelle
        const currentUserSession = sessionStorage.getItem("currentUser");
        if (currentUserSession) {
          const currentUser = JSON.parse(currentUserSession);
          if (currentUser.email === selectedUser.email) {
            // Session'ı güncelle
            const updatedUser = {
              ...currentUser,
              siteAccessApproved: editAccessApproved,
              sitePermissions: editPermissions
            };
            sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));
            
            // Kullanıcıya bilgi ver
            alert("Yetkileriniz güncellendi. Sayfa yenileniyor...");
            window.location.reload();
          }
        }
      }
    } catch (err) {
      setSaveError("Kayıt başarısız oldu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}>
      <div className="w-full">
        <Navbar />
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8 mt-10">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center w-full">
              <h1 className="text-3xl font-bold text-black">Şantiye Admini Paneli</h1>
              {currentUser && (
                <p className="text-lg text-gray-600 mt-2">
                  Aktif Şantiye: {currentUser.activeSite || currentUser.site || "Belirtilmemiş"}
                </p>
              )}
            </div>
            <button
              onClick={() => window.history.back()}
              className="ml-4 px-8 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow transition-all duration-200 whitespace-nowrap flex items-center justify-center text-base"
            >
              Geri Dön
            </button>
          </div>
          <div className="space-y-10">
            {/* Kullanıcılar Bölümü */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Şantiyedeki Kullanıcılar</h2>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span className="text-blue-700 font-semibold text-lg">Yükleniyor...</span>
                </div>
              ) : error ? (
                <div className="text-red-600 font-semibold text-center py-4">{error}</div>
              ) : users.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-gray-700 text-center">Şantiyede kayıtlı kullanıcı bulunamadı.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full bg-white border text-base">
                    <thead>
                      <tr>
                        <th className="border px-6 py-3 text-center">Email</th>
                        <th className="border px-6 py-3 text-center">Rol</th>
                        <th className="border px-6 py-3 text-center">Şantiye</th>
                        <th className="border px-6 py-3 text-center">Şantiye Erişim Onayı</th>
                        <th className="border px-6 py-3 text-center">Kayıt Tarihi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => u.role === "user" && u.isApproved === true && (!currentUser || u.email !== currentUser.email))
                        .map((u) => (
                          <tr
                            key={u.email}
                            className="border-b hover:bg-blue-50 transition-all cursor-pointer"
                            onClick={() => { setSelectedUser(u); setShowModal(true); }}
                          >
                            <td className="border px-6 py-3 whitespace-nowrap text-center">{u.email}</td>
                            <td className="border px-6 py-3 whitespace-nowrap text-center">{u.role}</td>
                            <td className="border px-6 py-3 whitespace-nowrap text-center">
                              {u.role === 'kurucu_admin' || u.role === 'merkez_admin' ? (
                                <span className="text-blue-600 font-medium">admin</span>
                              ) : (
                                u.site || '-'
                              )}
                            </td>
                            <td className="border px-6 py-3 whitespace-nowrap text-center">
                              {u.siteAccessApproved ? (
                                <span className="text-green-600 font-semibold">Verildi</span>
                              ) : (
                                <span className="text-yellow-600 font-semibold">Bekliyor</span>
                              )}
                            </td>
                            <td className="border px-6 py-3 whitespace-nowrap text-center">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Kamplar Bölümü */}
            <section className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-6 text-blue-900 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Şantiyedeki Kamplar
              </h2>
              
              {loadingCamps ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span className="text-blue-700 font-semibold text-lg">Kamplar yükleniyor...</span>
                </div>
              ) : camps.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-gray-700 text-center">
                  Şantiyede henüz kamp bulunamadı.
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {camps.map((camp) => (
                      <li 
                        key={camp._id} 
                        className="bg-white px-4 py-3 rounded border hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={async () => {
                          setSelectedCamp(camp);
                          setCampSettings({
                            isPublic: camp.isPublic || false,
                            sharedWithSites: camp.sharedWithSites || []
                          });
                          setCampModalTab('details'); // Her zaman kamp bilgileri ile başla
                          setShowCampModal(true);
                          
                          // Kamp kullanım verilerini yükle
                          await checkCampUsage(camp._id);
                        }}
                      >
                        <span className="font-medium text-gray-900">{camp.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {/* Kullanıcı izin/şantiye onay modalı */}
      {showModal && selectedUser && selectedUser.role === "user" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-blue-900">Kullanıcı Erişim ve İzin Ayarları</h2>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-2"><b>Email:</b> {selectedUser.email}</div>
                <div className="mb-2"><b>Rol:</b> {selectedUser.role}</div>
                <div className="mb-2"><b>Kayıt Tarihi:</b> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'}</div>
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    className="accent-blue-600" 
                    checked={editAccessApproved} 
                    onChange={e => handleAccessApprovedChange(e.target.checked)} 
                  />
                  <span className="font-semibold">Şantiye Erişim Onayı</span>
                </label>
                <div className="text-xs text-gray-500 mb-2">Bu kullanıcıya şantiye erişimi vermek için işaretleyin. Onay verilmezse kullanıcı kamp ekleyemez veya göremez.</div>
              </div>
            </div>
            <div className="mb-6">
              <div className="font-semibold mb-2">Kamp İzinleri</div>
              <div className={`${!editAccessApproved ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    className="accent-blue-600" 
                    checked={!!editPermissions?.canViewCamps} 
                    onChange={e => setEditPermissions(p => p ? { ...p, canViewCamps: e.target.checked } : p)}
                    disabled={!editAccessApproved}
                  />
                  Kampları Görüntüleyebilir
                </label>
                <label className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    className="accent-blue-600" 
                    checked={!!editPermissions?.canEditCamps} 
                    onChange={e => handleEditCampsChange(e.target.checked)}
                    disabled={!editAccessApproved}
                  />
                  Kampları Düzenleyebilir
                </label>
                <label className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    className="accent-blue-600" 
                    checked={!!editPermissions?.canCreateCamps} 
                    onChange={e => handleCreateCampsChange(e.target.checked)}
                    disabled={!editAccessApproved}
                  />
                  Yeni Kamp Oluşturabilir
                </label>
              </div>
              <div className="text-xs text-gray-500">İzinler sadece bu şantiyeye ait kamplar için geçerlidir.</div>
            </div>
            {saveError && <div className="text-red-600 font-semibold mb-4">{saveError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-gray-300">Kapat</button>
              <button type="button" onClick={handleSavePermissions} disabled={saving} className="px-6 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60">
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kamp Detayları Modal */}
      {showCampModal && selectedCamp && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setShowCampModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-900">{selectedCamp.name} Kampı Detayları</h2>
              <button 
                onClick={() => setShowCampModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Tab Butonları */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setCampModalTab('details')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  campModalTab === 'details'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Kamp Bilgileri
              </button>
              <button
                onClick={() => setCampModalTab('settings')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  campModalTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ayarlar
              </button>
            </div>

            {/* Modal İçeriği */}
            {campModalTab === 'details' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Kamp Adı</div>
                  <div className="font-semibold text-gray-900">{selectedCamp.name}</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Açıklama</div>
                  <div className="text-gray-900">{selectedCamp.description || 'Açıklama bulunmuyor'}</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Oluşturan Kullanıcı</div>
                  <div className="font-semibold text-gray-900">{selectedCamp.userEmail}</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Oluşturulma Tarihi</div>
                  <div className="text-gray-900">{new Date(selectedCamp.createdAt).toLocaleString('tr-TR')}</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Şantiye</div>
                  <div className="text-gray-900">{selectedCamp.site || 'Şantiye belirtilmemiş'}</div>
                </div>
              </div>
            )}

            {campModalTab === 'settings' && (
              <div className="space-y-6">
                {/* Ortak Kullanıma Aç Seçeneği */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Ortak Kullanıma Aç</h4>
                      <p className="text-sm text-gray-600">Bu kampı diğer şantiyelerle paylaş</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campSettings.isPublic}
                        onChange={(e) => setCampSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Şantiye Paylaşım Seçenekleri */}
                {campSettings.isPublic && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Paylaşılacak Şantiyeler</h4>
                    {loadingSites ? (
                      <div className="flex items-center justify-center py-4">
                        <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        Şantiyeler yükleniyor...
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {sites
                          .filter(site => site.name !== selectedCamp?.site) // Kendi şantiyesini hariç tut
                          .map((site) => (
                            <label key={site._id} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={campSettings.sharedWithSites.includes(site._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCampSettings(prev => ({
                                      ...prev,
                                      sharedWithSites: [...prev.sharedWithSites, site._id]
                                    }));
                                  } else {
                                    setCampSettings(prev => ({
                                      ...prev,
                                      sharedWithSites: prev.sharedWithSites.filter(id => id !== site._id)
                                    }));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-gray-900">{site.name}</span>
                              {site.description && (
                                <span className="text-sm text-gray-500">({site.description})</span>
                              )}
                            </label>
                          ))}
                      </div>
                    )}
                    {sites.filter(site => site.name !== selectedCamp?.site).length === 0 && (
                      <p className="text-gray-500 text-sm">Paylaşılacak başka şantiye bulunmuyor.</p>
                    )}
                  </div>
                )}

                {/* Kaydet Butonu */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveCampSettings}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ayarları Kaydet
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-6 border-t">
              <button 
                onClick={() => setShowCampModal(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 