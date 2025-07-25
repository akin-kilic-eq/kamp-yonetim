'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCamps, createCamp, updateCamp, deleteCamp, generateShareCodes, joinCamp, leaveCamp } from '../services/api';
import Navbar from '@/components/Navbar';

interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  sharedWith: { email: string; permission: 'read' | 'write' }[];
  shareCodes?: {
    read?: string;
    write?: string;
  };
  creatorSite?: string; // Yeni eklenen alan
  site?: string; // Kampın şantiye bilgisi
}

interface SiteStats {
  totalWorkers: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  campCount: number;
}

interface OverallStats {
  totalWorkers: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  totalCamps: number;
  totalSites: number;
}

export default function CampsPage() {
  const router = useRouter();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [newCamp, setNewCamp] = useState({
    name: '',
    description: ''
  });
  const [joinCampCode, setJoinCampCode] = useState('');
  const [currentUser, setCurrentUser] = useState<{ email: string; camps: string[]; role: string; site?: string } | null>(null);
  const [error, setError] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<{ read: string; write: string } | null>(null);
  const [copiedCodeType, setCopiedCodeType] = useState<'read' | 'write' | null>(null);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  
  // Yeni state'ler
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [siteStats, setSiteStats] = useState<Record<string, SiteStats>>({});
  const [expandedStats, setExpandedStats] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [userPermissions, setUserPermissions] = useState<{ siteAccessApproved?: boolean; sitePermissions?: { canViewCamps?: boolean; canEditCamps?: boolean; canCreateCamps?: boolean } } | null>(null);
  const [showPermissionUpdate, setShowPermissionUpdate] = useState(false);
  const [pendingAccessCount, setPendingAccessCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // İlk yükleme için cache kontrolü - tüm kullanıcılar için
  useEffect(() => {
    const userSession = sessionStorage.getItem('currentUser');
    if (userSession) {
      const user = JSON.parse(userSession);
      const cacheKey = `campsCache_${user.email}`;
      const cacheData = sessionStorage.getItem(cacheKey);
      
      if (cacheData) {
        try {
          const { data, timestamp, userRole, permissions } = JSON.parse(cacheData);
          const now = Date.now();
          const cacheAge = now - timestamp;
          
          // Cache süresi kontrolü
          const maxCacheAge = (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') 
            ? 30 * 60 * 1000  // 30 dakika
            : 5 * 60 * 1000;  // 5 dakika
          
          if (cacheAge <= maxCacheAge && userRole === user.role) {
            // Cache geçerli, verileri göster
            setCamps(data);
            setUserPermissions(permissions);
            setLastCacheTime(timestamp);
            setIsLoading(false);
            
            // Admin kullanıcılar için istatistikleri yükle (her zaman güncel veriler)
            if (user.role === 'kurucu_admin' || user.role === 'merkez_admin') {
              loadStats(data);
            }
            return; // Ana useEffect'in çalışmasını engelle
          } else {
            // Cache eski ama verileri göster, arka planda yenile
            setCamps(data);
            setUserPermissions(permissions);
            setLastCacheTime(timestamp);
            setIsLoading(false);
            
            // Admin kullanıcılar için istatistikleri yükle (her zaman güncel veriler)
            if (user.role === 'kurucu_admin' || user.role === 'merkez_admin') {
              loadStats(data);
            }
            
            // Arka planda yenile
            setTimeout(() => {
              loadCamps(user.email);
            }, 100);
            return; // Ana useEffect'in çalışmasını engelle
          }
        } catch (error) {
          console.error('Cache parse hatası:', error);
          // Hata durumunda normal akışa devam et
        }
      }
    }
  }, []);
  const [lastCacheTime, setLastCacheTime] = useState<number>(0);

  // Cache temizleme fonksiyonu
  const clearCampsCache = (email?: string) => {
    const userEmail = email || currentUser?.email;
    if (userEmail) {
      const cacheKey = `campsCache_${userEmail}`;
      sessionStorage.removeItem(cacheKey);
      console.log('Kamp cache temizlendi:', cacheKey);
    }
  };

  // Yetkiler değiştiğinde cache'i temizle
  const clearCacheOnPermissionChange = () => {
    if (currentUser?.email) {
      clearCampsCache();
      console.log('Yetki değişikliği nedeniyle cache temizlendi');
      // Sadece user rolü için loading göster
      if (currentUser.role === 'user') {
        setIsLoading(true);
      }
    }
  };

  // Cache yenileme fonksiyonu
  const refreshCampsCache = () => {
    if (currentUser?.email) {
      clearCampsCache();
      // Cache yenileme sırasında sadece user rolü için loading göster
      if (currentUser.role === 'user') {
        setIsLoading(true);
      }
      loadCamps(currentUser.email);
    }
  };

  useEffect(() => {
    // Oturum kontrolü
    const userSession = sessionStorage.getItem('currentUser');
    if (!userSession) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userSession);
    setCurrentUser(user);
    
      // Cache kontrolü ve yükleme
  const shouldRefreshCache = () => {
    const cacheKey = `campsCache_${user.email}`;
    const cacheData = sessionStorage.getItem(cacheKey);
    
    if (!cacheData) return true; // Cache yoksa yenile
    
    try {
      const { data, timestamp, userRole, permissions } = JSON.parse(cacheData);
      const now = Date.now();
      const cacheAge = now - timestamp;
      
      // Admin roller için daha uzun cache süresi (30 dakika)
      const maxCacheAge = (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') 
        ? 30 * 60 * 1000  // 30 dakika
        : 5 * 60 * 1000;  // 5 dakika
      
      // Cache süresi dolmuşsa veya kullanıcı rolü değiştiyse yenile
      if (cacheAge > maxCacheAge || userRole !== user.role) {
        return true;
      }
      
      // Cache geçerliyse kullan
      setCamps(data);
      setUserPermissions(permissions);
      setLastCacheTime(timestamp);
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Cache parse hatası:', error);
      return true; // Hata durumunda yenile
    }
  };
    
    // Kullanıcı yetkilerini çek
    const fetchUserPermissions = () => {
      fetch(`/api/users?email=${user.email}`)
        .then(res => res.json())
        .then(data => {
          // Eğer tek kullanıcı dönerse
          const me = Array.isArray(data) ? data.find((u:any) => u.email === user.email) : data;
          const newPermissions = {
            siteAccessApproved: me?.siteAccessApproved,
            sitePermissions: me?.sitePermissions
          };
          
          // Yetkiler değiştiyse session'ı güncelle
          const currentSession = sessionStorage.getItem('currentUser');
          if (currentSession) {
            const currentUser = JSON.parse(currentSession);
            if (currentUser.siteAccessApproved !== newPermissions.siteAccessApproved ||
                JSON.stringify(currentUser.sitePermissions) !== JSON.stringify(newPermissions.sitePermissions)) {
              
              const updatedUser = {
                ...currentUser,
                siteAccessApproved: newPermissions.siteAccessApproved,
                sitePermissions: newPermissions.sitePermissions
              };
              sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
              
              // Kullanıcıya bilgi ver
              console.log('Yetkileriniz güncellendi!');
              setShowPermissionUpdate(true);
              setTimeout(() => setShowPermissionUpdate(false), 5000); // 5 saniye sonra gizle
              
              // Yetkiler değiştiyse cache'i temizle
              clearCacheOnPermissionChange();
            }
          }
          
          setUserPermissions(newPermissions);
          
          // Cache'i güncelle (eğer varsa)
          const cacheKey = `campsCache_${user.email}`;
          const existingCache = sessionStorage.getItem(cacheKey);
          if (existingCache) {
            try {
              const cacheData = JSON.parse(existingCache);
              cacheData.permissions = newPermissions;
              sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (error) {
              console.error('Cache güncelleme hatası:', error);
            }
          }
        })
        .catch(() => {
          setUserPermissions(null);
        });
    };
    
    // Admin roller için özel kontrol - yetki kontrolü yapma
    if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
      // Admin roller için otomatik yetkiler
      const adminPermissions = {
        siteAccessApproved: true,
        sitePermissions: {
          canViewCamps: true,
          canEditCamps: true,
          canCreateCamps: true
        }
      };
      setUserPermissions(adminPermissions);
      
      // Admin roller için cache kontrolü - cache yoksa yükle
      const cacheKey = `campsCache_${user.email}`;
      const cacheData = sessionStorage.getItem(cacheKey);
      
      if (!cacheData) {
        loadCamps(user.email);
      }
    } else {
      // Diğer roller için normal yetki kontrolü
      fetchUserPermissions();
      
      // Cache kontrolü yap ve gerekirse yükle
      if (shouldRefreshCache()) {
        loadCamps(user.email);
      }
    }
    
    // Her 30 saniyede bir yetkileri kontrol et (sadece user rolündeki kullanıcılar için)
    if (user.role === 'user') {
      const interval = setInterval(fetchUserPermissions, 30000); // 30 saniye
      return () => {
        clearInterval(interval);
      };
    }

    // Admin roller için periyodik kontrol yok
    if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
      return () => {
        // Admin roller için cleanup gerekmez
      };
    }

    return () => {
      // Genel cleanup
    };

    // Şantiye admini ise bekleyen kullanıcı sayısını çek
    if (user.role === 'santiye_admin') {
      fetch(`/api/users?pendingCount=true&email=${user.email}`)
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number') setPendingAccessCount(data.count);
        })
        .catch(err => {
          console.error('Bekleyen kullanıcı sayısı çekilirken hata:', err);
        });
    }
  }, [router]);

  const loadCamps = async (email: string) => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      const user = JSON.parse(userStr || '{}');
      
      // Admin kullanıcılar için loading gösterme
      const shouldShowLoading = user.role === 'user';
      
      if (shouldShowLoading) {
        setIsLoading(true);
      }
      
      const response = await getCamps(email, user.role);
      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }
      setCamps(response);
      
      // Cache'e kaydet
      // Admin roller için otomatik yetkiler
      let permissionsToCache = userPermissions;
      if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
        permissionsToCache = {
          siteAccessApproved: true,
          sitePermissions: {
            canViewCamps: true,
            canEditCamps: true,
            canCreateCamps: true
          }
        };
      }
      
      const cacheDataToSave = {
        data: response,
        timestamp: Date.now(),
        userRole: user.role,
        permissions: permissionsToCache
      };
      sessionStorage.setItem(`campsCache_${email}`, JSON.stringify(cacheDataToSave));
      setLastCacheTime(Date.now());
      
      // Admin kullanıcılar için istatistikleri yükle
      if (user.role === 'kurucu_admin' || user.role === 'merkez_admin') {
        loadStats(response);
      }
      
      // Loading'i kapat
      setIsLoading(false);
    } catch (error) {
      setError('Kamplar yüklenirken bir hata oluştu');
      // Hata durumunda tüm roller için loading'i kapat
      setIsLoading(false);
    }
  };

  // İstatistikleri yükle
  const loadStats = async (campsData: Camp[]) => {
    setLoadingStats(true);
    try {
      const stats: Record<string, SiteStats> = {};
      let totalWorkers = 0;
      let totalBeds = 0;
      let occupiedBeds = 0;

      // Her kamp için istatistikleri çek
      for (const camp of campsData) {
        try {
          const response = await fetch(`/api/reports/stats?campId=${camp._id}`);
          const campStats = await response.json();
          
          if (campStats && !campStats.error) {
            const site = camp.creatorSite || 'Şantiye Belirtilmemiş';
            
            if (!stats[site]) {
              stats[site] = {
                totalWorkers: 0,
                totalBeds: 0, // totalBeds -> totalCapacity
                occupiedBeds: 0, // occupiedBeds -> totalWorkers
                availableBeds: 0,
                occupancyRate: 0,
                campCount: 0
              };
            }
            
            stats[site].totalWorkers += campStats.totalWorkers || 0;
            stats[site].totalBeds += campStats.totalCapacity || 0;
            stats[site].occupiedBeds += campStats.totalWorkers || 0;
            stats[site].campCount += 1;
            
            totalWorkers += campStats.totalWorkers || 0;
            totalBeds += campStats.totalCapacity || 0;
            occupiedBeds += campStats.totalWorkers || 0;
          }
        } catch (error) {
          console.error(`Kamp ${camp._id} istatistikleri yüklenemedi:`, error);
        }
      }

      // Şantiye bazında doluluk oranlarını hesapla
      Object.keys(stats).forEach(site => {
        stats[site].availableBeds = stats[site].totalBeds - stats[site].occupiedBeds;
        stats[site].occupancyRate = stats[site].totalBeds > 0 
          ? Math.round((stats[site].occupiedBeds / stats[site].totalBeds) * 100) 
          : 0;
      });

      // Genel istatistikleri hesapla
      const overall: OverallStats = {
        totalWorkers,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        totalCamps: campsData.length,
        totalSites: Object.keys(stats).length
      };

      setSiteStats(stats);
      setOverallStats(overall);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const generateCampCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleAddCamp = async () => {
    if (!newCamp.name) {
      setError('Lütfen kamp adını giriniz');
      return;
    }
    try {
      const response = await createCamp({
        ...newCamp,
        userEmail: currentUser?.email
      });
      if (response.error) {
        setError(response.error);
        return;
      }
      setCamps([...camps, response]);
      // Cache'i temizle - yeni kamp eklendi
      clearCampsCache();
      // Sadece user rolü için loading göster
      if (currentUser?.role === 'user') {
        setIsLoading(true);
      }
      
      // Admin kullanıcılar için istatistikleri yeniden yükle
      if (currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin') {
        loadStats([...camps, response]);
      }
      
      setShowAddModal(false);
      setNewCamp({ name: '', description: '' });
      setError('');
    } catch (error) {
      setError('Kamp oluşturulurken bir hata oluştu');
    }
  };

  const handleJoinCamp = async () => {
    if (!joinCampCode) {
      setError('Lütfen bir kamp kodu girin.');
      return;
    }
    if (!currentUser?.email) {
      setError('Giriş yapmış bir kullanıcı bulunamadı.');
      return;
    }
    setError('');

    try {
      const response = await joinCamp(joinCampCode, currentUser.email);
      
      if (response.error) {
        setError(response.error);
        setShowJoinModal(false);
        return;
      }
      
      // Kamplar listesini güncelle, yeni katılan kampı ekle
      // Zaten listede olmaması lazım ama her ihtimale karşı kontrol edelim
      if (!camps.find(c => c._id === response._id)) {
        setCamps([...camps, response]);
      }
      
      // Cache'i temizle - yeni kampa katıldı
      clearCampsCache();
      // Sadece user rolü için loading göster
      if (currentUser?.role === 'user') {
        setIsLoading(true);
      }
      
      // Admin kullanıcılar için istatistikleri yeniden yükle
      if (currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin') {
        loadStats([...camps, response]);
      }
      
      setShowJoinModal(false);
      setJoinCampCode('');
    } catch (error) {
      setError('Kampa katılırken bir hata oluştu.');
      setShowJoinModal(false);
    }
  };

  const handleLeaveCamp = async () => {
    if (!selectedCamp || !currentUser?.email) return;
    
    try {
      const response = await leaveCamp(selectedCamp._id, currentUser.email);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      // Kampı listeden kaldır
      const updatedCamps = camps.filter(camp => camp._id !== selectedCamp._id);
      setCamps(updatedCamps);
      // Cache'i temizle - kampa katılım iptal edildi
      clearCampsCache();
      // Sadece user rolü için loading göster
      if (currentUser?.role === 'user') {
        setIsLoading(true);
      }
      
      // Admin kullanıcılar için istatistikleri yeniden yükle
      if (currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin') {
        loadStats(updatedCamps);
      }
      
      setShowLeaveModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp paylaşımından çıkarken bir hata oluştu');
    }
  };

  const handleCampClick = async (camp: Camp) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      // Kampın tam bilgilerini API'den al
      const response = await fetch(`/api/camps/${camp._id}`);
      const campData = await response.json();
      
      console.log('Kamp seçildi:', {
        campId: camp._id,
        campName: camp.name,
        campData: campData,
        currentUser: currentUser
      });
      
      if (campData.error) {
        console.error('Kamp bilgileri alınamadı:', campData.error);
        // Hata durumunda mevcut kamp bilgilerini kullan
        localStorage.setItem('currentCamp', JSON.stringify(camp));
      } else {
        // Tam kamp bilgilerini localStorage'a kaydet
        localStorage.setItem('currentCamp', JSON.stringify(campData));
      }

      // URL'yi oluştur
      const formattedName = camp.name.toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '');

      // Yönlendirme yap
      router.push(`/${formattedName}/dashboard`);
    } catch (error) {
      console.error('Kamp bilgileri alınırken hata:', error);
      // Hata durumunda mevcut kamp bilgilerini kullan
      localStorage.setItem('currentCamp', JSON.stringify(camp));
      
      const formattedName = camp.name.toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '');
      
      router.push(`/${formattedName}/dashboard`);
    }
  };

  const handleEditCamp = async () => {
    if (!selectedCamp || !selectedCamp.name || !currentUser?.email) {
      setError('Lütfen kamp adını girin');
      return;
    }
    try {
      const response = await updateCamp(selectedCamp, currentUser.email);
      if (response.error) {
        setError(response.error);
        return;
      }
      const updatedCamps = camps.map(camp => camp._id === selectedCamp._id ? response : camp);
      setCamps(updatedCamps);
      // Cache'i temizle - kamp düzenlendi
      clearCampsCache();
      // Sadece user rolü için loading göster
      if (currentUser?.role === 'user') {
        setIsLoading(true);
      }
      
      // Admin kullanıcılar için istatistikleri yeniden yükle
      if (currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin') {
        loadStats(updatedCamps);
      }
      
      setShowEditModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteCamp = async () => {
    if (!selectedCamp || !currentUser?.email) return;
    try {
      const response = await deleteCamp(selectedCamp._id, currentUser.email);
      if (response.error) {
        setError(response.error);
        return;
      }
      const updatedCamps = camps.filter(camp => camp._id !== selectedCamp._id);
      setCamps(updatedCamps);
      // Cache'i temizle - kamp silindi
      clearCampsCache();
      // Sadece user rolü için loading göster
      if (currentUser?.role === 'user') {
        setIsLoading(true);
      }
      
      // Admin kullanıcılar için istatistikleri yeniden yükle
      if (currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin') {
        loadStats(updatedCamps);
      }
      
      setShowDeleteModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp silinirken bir hata oluştu');
    }
  };

  const handleCopy = (text: string, type: 'read' | 'write') => {
    navigator.clipboard.writeText(text);
    setCopiedCodeType(type);
    setTimeout(() => {
      setCopiedCodeType(null);
    }, 2000); // 2 saniye sonra mesajı kaldır
  };

  const handleGenerateShareCodes = async () => {
    if (!selectedCamp) return;
    try {
      // Mevcut kodlar varsa tekrar üretme, onları göster
      if (selectedCamp.shareCodes?.read && selectedCamp.shareCodes?.write) {
        setGeneratedCodes({
          read: selectedCamp.shareCodes.read,
          write: selectedCamp.shareCodes.write,
        });
        return;
      }
      
      // api.ts'e eklenecek yeni fonksiyon
      const codes = await generateShareCodes(selectedCamp._id);
      if (codes) {
        setGeneratedCodes(codes);
        // Kamp listesini yeni kodlarla güncelle
        setCamps(camps.map(c => c._id === selectedCamp._id ? { ...c, shareCodes: codes } : c));
      }
    } catch (error) {
      setError('Kod üretilirken bir hata oluştu.');
    }
  };

  const openShareModal = (camp: Camp) => {
    setSelectedCamp(camp);
    setGeneratedCodes(null); // Modalı her açtığında önceki kodları temizle
    setShowCodeModal(true);
  };

  // Kullanıcının bir kampın sahibi mi yoksa paylaşılan kullanıcısı mı olduğunu kontrol et
  const isCampOwner = (camp: Camp) => currentUser?.email === camp.userEmail;
  const isSharedUser = (camp: Camp) => camp.sharedWith?.some(shared => shared.email === currentUser?.email);
  const isAdminUser = currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin';
  
  // Şantiye admini için kendi şantiyesindeki kampları düzenleyebilme kontrolü
  const canEditCamp = (camp: Camp) => {
    if (isCampOwner(camp) || isAdminUser) {
      return true;
    }
    
    // Şantiye admini kendi şantiyesindeki user'ların kamplarını düzenleyebilir
    if (currentUser?.role === 'santiye_admin' && currentUser?.site) {
      // Kamp sahibinin şantiye bilgisini kontrol et (backend'de yapılan kontrolle aynı mantık)
      return true; // Backend'de zaten kontrol ediliyor, frontend'de de göster
    }
    
    // User rolündeki kullanıcılar için şantiye erişim yetkisi ve düzenleme izni kontrolü
    if (currentUser?.role === 'user') {
      // Kendi kampında tam yetki
      if (isCampOwner(camp)) {
        return true;
      }
      
      // Şantiye erişim yetkisi ve düzenleme izni varsa, aynı şantiyedeki diğer kamplarda düzenleme yapabilir
      if (userPermissions?.siteAccessApproved && 
          userPermissions?.sitePermissions?.canEditCamps && 
          currentUser?.site && 
          camp.site === currentUser?.site) {
        return true;
      }
    }
    
    return false;
  };

  // Kullanıcı erişim ve yetki kontrolü
  const hasAccess =
    currentUser?.role === 'kurucu_admin' ||
    currentUser?.role === 'merkez_admin' ||
    currentUser?.role === 'santiye_admin' ||
    (userPermissions?.siteAccessApproved && userPermissions?.sitePermissions?.canViewCamps);

  // Cache'den yüklenen veriler varsa erişim kontrolünü geçici olarak true yap
  const hasCachedData = lastCacheTime > 0 && camps.length > 0;
  const canCreate =
    currentUser?.role === 'kurucu_admin' ||
    currentUser?.role === 'merkez_admin' ||
    currentUser?.role === 'santiye_admin' ||
    userPermissions?.sitePermissions?.canCreateCamps;

  // Admin kullanıcılar için şantiye bazında gruplandırma
  const groupedCamps = isAdminUser ? camps.reduce((groups, camp) => {
    const site = camp.creatorSite || 'Şantiye Belirtilmemiş';
    if (!groups[site]) {
      groups[site] = [];
    }
    groups[site].push(camp);
    return groups;
  }, {} as Record<string, Camp[]>) : {};

  // Şantiyeleri alfabetik sırala
  const sortedSites = Object.keys(groupedCamps).sort();

  // Şantiye açma/kapama fonksiyonu
  const toggleSite = (site: string) => {
    const newExpandedSites = new Set(expandedSites);
    if (newExpandedSites.has(site)) {
      newExpandedSites.delete(site);
    } else {
      newExpandedSites.add(site);
    }
    setExpandedSites(newExpandedSites);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arka-plan-guncel-2.jpg')" }}
    >
      <Navbar />
      {isLoading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-12 text-center max-w-md w-full border border-white/20 animate-slideUp opacity-0" style={{ animationFillMode: 'forwards' }}>
              {/* Ana loading animasyonu */}
              <div className="relative mb-8">
                <div className="w-20 h-20 mx-auto relative">
                  {/* Dış çember */}
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-blue-100"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="226"
                      strokeDashoffset="226"
                      className="text-blue-600"
                      style={{
                        animation: 'spin 1.5s ease-in-out infinite'
                      }}
                    />
                  </svg>
                  
                  {/* İç ikon */}
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Başlık ve açıklama */}
              <h2 className="text-3xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-fadeIn opacity-0" style={{ animationFillMode: 'forwards' }}>
                Yükleniyor
              </h2>
              <p className="text-gray-600 text-lg mb-6 animate-fadeIn opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                Kamp bilgileri ve erişim yetkileri kontrol ediliyor
              </p>
              
              {/* Progress dots */}
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
              
              {/* Alt bilgi */}
              <div className="mt-8 pt-6 border-t border-gray-200 animate-fadeIn opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                <p className="text-sm text-gray-500">
                  Lütfen bekleyin, bu işlem sadece birkaç saniye sürecek...
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn opacity-0" style={{ animationFillMode: 'forwards' }}>
          {/* Yetki güncelleme bildirimi */}
        {showPermissionUpdate && (
          <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Yetkileriniz güncellendi! Sayfa otomatik olarak yenileniyor...</span>
            </div>
          </div>
        )}
        {/* Şantiye admini için özel panel erişim kutusu */}
        {currentUser?.role === 'santiye_admin' && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded flex items-center justify-between">
            <div>
              <div className="font-bold text-lg mb-1">Şantiye Admini Paneli</div>
              <div className="text-sm">Şantiye yönetimi ve gelişmiş işlemler için admin paneline erişebilirsiniz.</div>
            </div>
            <button
              onClick={() => router.push('/santiye-admin-paneli')}
              className="ml-6 px-5 py-2 rounded bg-yellow-500 hover:bg-yellow-600 hover:scale-105 text-white font-semibold shadow transition-all duration-300 ease-out relative flex items-center"
            >
              Şantiye Admini Paneline Git
              {pendingAccessCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold absolute -top-2 -right-2 border-2 border-white shadow">
                  {pendingAccessCount}
                </span>
              )}
            </button>
          </div>
        )}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 mb-8 animate-slideUp opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isAdminUser ? 'Tüm Kamplar' : 'Kamplarım'}
              </h1>
              <p className="text-gray-600">
                {isAdminUser ? 'Sistemdeki tüm kampların listesi' : 'Yönettiğiniz kampların listesi'}
              </p>
              {lastCacheTime > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Son güncelleme: {new Date(lastCacheTime).toLocaleTimeString('tr-TR')}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              {hasAccess && (!isAdminUser || currentUser?.role === 'kurucu_admin') && (
                <>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 ease-out"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Mevcut Kamp Ekle
                  </button>
                  {canCreate && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-out"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Yeni Kamp Ekle
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {!hasAccess && !hasCachedData && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 mb-8 rounded text-center text-lg font-semibold">
            Şantiye admini tarafından erişim onayınız veya kamp görüntüleme yetkiniz bulunmamaktadır. Lütfen şantiye admini ile iletişime geçin.
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Admin kullanıcılar için özet istatistikler */}
        {isAdminUser && (
          loadingStats ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 mb-8 flex flex-col items-center justify-center min-h-[180px] animate-fadeIn">
              <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <span className="text-blue-700 font-semibold text-lg">Yükleniyor...</span>
            </div>
          ) : (
            overallStats && (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-8 animate-slideUp opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                {/* Kümülatif özet */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Genel Özet
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{overallStats.totalWorkers}</div>
                      <div className="text-sm text-blue-700">Toplam İşçi</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{overallStats.totalBeds}</div>
                      <div className="text-sm text-green-700">Toplam Yatak</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">{overallStats.availableBeds}</div>
                      <div className="text-sm text-yellow-700">Boş Yatak</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">%{overallStats.occupancyRate}</div>
                      <div className="text-sm text-purple-700">Doluluk Oranı</div>
                    </div>
                  </div>
                </div>

                {/* Şantiye bazlı özet - açılır/kapanır */}
                <div>
                  <div 
                    onClick={() => setExpandedStats(!expandedStats)}
                    className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Şantiye Bazlı Özet ({overallStats.totalSites} şantiye)
                      </h3>
                      <svg 
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          expandedStats ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {expandedStats && (
                    <div className="mt-4 space-y-4">
                      {Object.keys(siteStats).sort().map((site) => (
                        <div key={site} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-bold text-gray-800 mb-2">{site}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">İşçi:</span>
                              <span className="font-semibold ml-1">{siteStats[site].totalWorkers}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Yatak:</span>
                              <span className="font-semibold ml-1">{siteStats[site].totalBeds}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Boş:</span>
                              <span className="font-semibold ml-1">{siteStats[site].availableBeds}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Doluluk:</span>
                              <span className="font-semibold ml-1">%{siteStats[site].occupancyRate}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Kamp:</span>
                              <span className="font-semibold ml-1">{siteStats[site].campCount}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )
        )}

        {/* Admin kullanıcılar için şantiye bazında gruplandırılmış görünüm */}
        {isAdminUser ? (
          <div className="space-y-4">
            {sortedSites.map((site, index) => (
              <div key={site} className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden animate-slideUp opacity-0" style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'forwards' }}>
                {/* Şantiye başlığı - tıklanabilir */}
                <div 
                  onClick={() => toggleSite(site)}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <h2 className="text-2xl font-bold text-gray-800">{site}</h2>
                      <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {groupedCamps[site].length} kamp
                      </span>
                    </div>
                    {/* Açma/kapama ikonu */}
                    <svg 
                      className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${
                        expandedSites.has(site) ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Kamplar - açılır/kapanır */}
                {expandedSites.has(site) && (
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {groupedCamps[site].map((camp) => (
                        <div
                          key={camp._id}
                          className="bg-white/80 backdrop-blur-sm overflow-hidden rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out border border-gray-200 animate-slideUp opacity-0"
                          style={{ animationDelay: `${0.4 + index * 0.1}s`, animationFillMode: 'forwards' }}
                        >
                          <div className="p-6">
                            <div className="flex justify-between items-start">
                              <h3 className="text-xl font-bold text-gray-800 mb-2">{camp.name}</h3>
                              <div className="flex items-center space-x-2">
                                                      {/* Kamp sahibi, admin veya şantiye admini için butonlar */}
                      {canEditCamp(camp) && (
                                  <>
                                    <button onClick={() => { setSelectedCamp(camp); setShowEditModal(true); }} className="text-blue-500 hover:text-blue-700 transition-colors">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => { setSelectedCamp(camp); setShowDeleteModal(true); }} className="text-red-500 hover:text-red-700 transition-colors">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <button onClick={() => openShareModal(camp)} className="text-gray-500 hover:text-gray-700 transition-colors">
                                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                  </>
                                )}
                                {/* Paylaşılan kullanıcı için Paylaşımdan Çıkar butonu */}
                                {isSharedUser(camp) && (
                                  <button 
                                    onClick={() => { setSelectedCamp(camp); setShowLeaveModal(true); }} 
                                    className="text-orange-500 hover:text-orange-700 transition-colors"
                                    title="Paylaşımdan Çıkar"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-600 mb-3 h-12 overflow-hidden">{camp.description}</p>
                            <div className="text-sm text-gray-500 mb-4">
                              <span className="font-medium">Oluşturan:</span> {camp.userEmail}
                            </div>
                            <div 
                              onClick={() => handleCampClick(camp)}
                              className="mt-4 flex justify-end cursor-pointer"
                            >
                              <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
                                Yönetim Paneline Git
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Normal kullanıcılar için mevcut görünüm */
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {camps.map((camp, index) => (
              <div
                key={camp._id}
                className="bg-white/90 backdrop-blur-sm overflow-hidden rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-out animate-slideUp opacity-0"
                style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{camp.name}</h2>
                    <div className="flex items-center space-x-3">
                                          {/* Kamp sahibi, admin veya şantiye admini için butonlar */}
                    {canEditCamp(camp) && (
                        <>
                          <button onClick={() => { setSelectedCamp(camp); setShowEditModal(true); }} className="text-blue-500 hover:text-blue-700 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => { setSelectedCamp(camp); setShowDeleteModal(true); }} className="text-red-500 hover:text-red-700 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          <button onClick={() => openShareModal(camp)} className="text-gray-500 hover:text-gray-700 transition-colors">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        </>
                      )}
                      {/* Paylaşılan kullanıcı için Paylaşımdan Çıkar butonu */}
                      {isSharedUser(camp) && (
                        <button 
                          onClick={() => { setSelectedCamp(camp); setShowLeaveModal(true); }} 
                          className="text-orange-500 hover:text-orange-700 transition-colors"
                          title="Paylaşımdan Çıkar"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 h-12 overflow-hidden">{camp.description}</p>
                  <div 
                    onClick={() => handleCampClick(camp)}
                    className="mt-4 flex justify-end cursor-pointer"
                  >
                    <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
                      Yönetim Paneline Git
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paylaşımdan Çıkma Onay Modalı */}
        {showLeaveModal && selectedCamp && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Paylaşımdan Çık</h3>
              <p className="text-gray-600 mb-6">
                "{selectedCamp.name}" kampının paylaşımından çıkmak istediğinizden emin misiniz? Bu işlemden sonra bu kampa erişiminiz olmayacak.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setSelectedCamp(null);
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleLeaveCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
                >
                  Çık
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Yeni Kamp Ekle</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="campName" className="block text-sm font-medium text-gray-700 mb-2">
                    Kamp Adı
                  </label>
                  <input
                    type="text"
                    id="campName"
                    value={newCamp.name}
                    onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kampın adını girin"
                  />
                </div>
                <div>
                  <label htmlFor="campDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama (İsteğe bağlı)
                  </label>
                  <textarea
                    id="campDescription"
                    value={newCamp.description}
                    onChange={(e) => setNewCamp({ ...newCamp, description: e.target.value })}
                    rows={4}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kamp hakkında kısa bir açıklama yazın"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCamp({ name: '', description: '' });
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Düzenleme Modalı */}
        {showEditModal && selectedCamp && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Kampı Düzenle</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="editCampName" className="block text-sm font-medium text-gray-700 mb-2">
                    Kamp Adı
                  </label>
                  <input
                    type="text"
                    id="editCampName"
                    value={selectedCamp.name}
                    onChange={(e) => setSelectedCamp({ ...selectedCamp, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kampın adını girin"
                  />
                </div>
                <div>
                  <label htmlFor="editCampDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama (İsteğe bağlı)
                  </label>
                  <textarea
                    id="editCampDescription"
                    value={selectedCamp.description}
                    onChange={(e) => setSelectedCamp({ ...selectedCamp, description: e.target.value })}
                    rows={4}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kamp hakkında kısa bir açıklama yazın"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCamp(null);
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Silme Onay Modalı */}
        {showDeleteModal && selectedCamp && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Kampı Sil</h3>
              <p className="text-gray-600 mb-6">
                "{selectedCamp.name}" kampını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCamp(null);
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mevcut Kampa Katılma Modalı */}
        {showJoinModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={() => setShowJoinModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Mevcut Kampa Katıl</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="joinCampCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Kamp Kodu
                  </label>
                  <input
                    type="text"
                    id="joinCampCode"
                    value={joinCampCode}
                    onChange={(e) => setJoinCampCode(e.target.value.toUpperCase())}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Kamp kodunu girin"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCampCode('');
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleJoinCamp}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                >
                  Katıl
                </button>
              </div>
            </div>
          </div>
        )}

        {showCodeModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={() => setShowCodeModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Kampı Paylaş</h2>
              <p className="text-center text-gray-600 mb-6">Aşağıdaki kodları paylaşarak diğer kullanıcıları bu kampa davet edebilirsiniz.</p>

              {generatedCodes ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Okuma İzni Kodu</label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-lg font-mono text-gray-700">{generatedCodes.read}</span>
                      <button 
                        onClick={() => handleCopy(generatedCodes.read, 'read')}
                        className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200`}
                      >
                        {copiedCodeType === 'read' ? 'Kopyalandı!' : 'Kopyala'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yazma İzni Kodu</label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-lg font-mono text-gray-700">{generatedCodes.write}</span>
                      <button 
                        onClick={() => handleCopy(generatedCodes.write, 'write')}
                        className={`px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200`}
                      >
                        {copiedCodeType === 'write' ? 'Kopyalandı!' : 'Kopyala'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={handleGenerateShareCodes} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                  Paylaşım Kodlarını Üret
                </button>
              )}

              <div className="mt-8 flex justify-center">
                <button onClick={() => setShowCodeModal(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
} 