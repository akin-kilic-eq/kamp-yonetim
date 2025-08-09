'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  isPublic?: boolean; // Ortak kullanım açık mı
  sharedWithSites?: string[]; // Paylaşılan şantiyeler
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
  santiyeAdminWorkers?: number;
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
  const [currentUser, setCurrentUser] = useState<{ email: string; camps: string[]; role: string; site?: string; sites?: string[]; activeSite?: string } | null>(null);
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
  
  // Modal state'leri
  const [showWorkersModal, setShowWorkersModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [showOccupancyModal, setShowOccupancyModal] = useState(false);
  
  // Kamp detayları için state'ler
  const [campDetails, setCampDetails] = useState<Record<string, any>>({});
  const [loadingCampDetails, setLoadingCampDetails] = useState(false);
  const [siteNames, setSiteNames] = useState<Record<string, string>>({});
  
  // loadStats'ın çağrılıp çağrılmadığını takip etmek için ref
  const statsLoadedRef = useRef(false);
  
  // Santiye admin için ayrı işçi sayısı state'i
  const [santiyeAdminWorkerCount, setSantiyeAdminWorkerCount] = useState<number>(0);
  const [santiyeAdminWorkersLoaded, setSantiyeAdminWorkersLoaded] = useState<boolean>(false);
  const [santiyeAdminStats, setSantiyeAdminStats] = useState<OverallStats | null>(null);
  
  // İşçi sayısını hesaplayan memoized değer - STABİL VERSİYON
  const workerCount = useMemo(() => {
    if (!overallStats) return 0;
    
    // Santiye admin için ayrı state'ten al
    if (currentUser?.role === 'santiye_admin' && (currentUser?.activeSite || currentUser?.site)) {
      return santiyeAdminWorkerCount;
    }
    
    // Diğer roller için genel toplam
    return overallStats.totalWorkers || 0;
  }, [santiyeAdminWorkerCount, overallStats?.totalWorkers, currentUser?.role, currentUser?.activeSite, currentUser?.site]);
  
  // Santiye admin için loading state kontrolü
  const isWorkerCountLoading = useMemo(() => {
    if (currentUser?.role === 'santiye_admin' && (currentUser?.activeSite || currentUser?.site)) {
      return loadingStats || !santiyeAdminWorkersLoaded;
    }
    return loadingStats || !overallStats;
  }, [loadingStats, santiyeAdminWorkersLoaded, overallStats, currentUser?.role, currentUser?.activeSite, currentUser?.site]);
  
  // İlk yükleme için cache kontrolü - tüm kullanıcılar için
  useEffect(() => {
    const userSession = sessionStorage.getItem('currentUser');
    if (userSession) {
      const user = JSON.parse(userSession);
      const cacheKey = `campsCache_${user.email}`;
      const cacheData = sessionStorage.getItem(cacheKey);
      
      // Şantiye admini için activeSite değişikliği kontrolü
      if (user.role === 'santiye_admin') {
        const currentActiveSite = user.activeSite || user.site;
        const cachedActiveSite = sessionStorage.getItem(`lastActiveSite_${user.email}`);
        
        // Eğer activeSite değişmişse cache'i kullanma
        if (cachedActiveSite && cachedActiveSite !== currentActiveSite) {
          console.log('ActiveSite değişmiş, cache kullanılmayacak');
          clearCampsCache(user.email);
          sessionStorage.removeItem(`lastActiveSite_${user.email}`);
        } else {
          // ActiveSite aynıysa cache'i kullan
          sessionStorage.setItem(`lastActiveSite_${user.email}`, currentActiveSite);
        }
      }
      
      if (cacheData) {
        try {
          const { data, timestamp, userRole, permissions } = JSON.parse(cacheData);
          const now = Date.now();
          const cacheAge = now - timestamp;
          
          // Cache süresi kontrolü
          const maxCacheAge = (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') 
            ? 30 * 60 * 1000  // 30 dakika
            : 5 * 60 * 1000;  // 5 dakika
          
          // ActiveSite kontrolü ekle
          const cachedActiveSite = data.activeSite;
          const currentActiveSite = user.activeSite || user.site;
          const activeSiteMatches = !cachedActiveSite || cachedActiveSite === currentActiveSite;
          
          if (cacheAge <= maxCacheAge && userRole === user.role && activeSiteMatches) {
            // Cache geçerli, verileri göster
            setCamps(data);
            
            // Session storage'dan güncel yetkileri al
            const userStrForCache = sessionStorage.getItem('currentUser');
            const userFromSession = JSON.parse(userStrForCache || '{}');
            
            let finalPermissions;
            if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
              finalPermissions = {
                siteAccessApproved: true,
                sitePermissions: {
                  canViewCamps: true,
                  canEditCamps: true,
                  canCreateCamps: true
                }
              };
            } else {
              // User rolü için session storage'dan gelen yetkileri kullan
              finalPermissions = {
                siteAccessApproved: userFromSession.siteAccessApproved || false,
                sitePermissions: {
                  canViewCamps: userFromSession.sitePermissions?.canViewCamps || false,
                  canEditCamps: userFromSession.sitePermissions?.canEditCamps || false,
                  canCreateCamps: userFromSession.sitePermissions?.canCreateCamps || false
                }
              };
            }
            setUserPermissions(finalPermissions);
            setLastCacheTime(timestamp);
            setIsLoading(false);
            
            // Admin kullanıcılar için istatistikleri hemen yükle
            if (user.role === 'kurucu_admin' || user.role === 'merkez_admin') {
              // Admin kullanıcılar için özel fonksiyon
              setLoadingStats(true);
              loadStatsAdmin(data);
            } else if (user.role === 'santiye_admin') {
              // Şantiye admini için normal fonksiyon
              setLoadingStats(true);
              loadStats(data);
            }
            return; // Ana useEffect'in çalışmasını engelle
          } else {
            // Cache eski ama verileri göster, arka planda yenile
            setCamps(data);
            
            // Session storage'dan güncel yetkileri al
            const userStrForCache = sessionStorage.getItem('currentUser');
            const userFromSession = JSON.parse(userStrForCache || '{}');
            
            let finalPermissions;
            if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
              finalPermissions = {
                siteAccessApproved: true,
                sitePermissions: {
                  canViewCamps: true,
                  canEditCamps: true,
                  canCreateCamps: true
                }
              };
            } else {
              // User rolü için session storage'dan gelen yetkileri kullan
              finalPermissions = {
                siteAccessApproved: userFromSession.siteAccessApproved || false,
                sitePermissions: {
                  canViewCamps: userFromSession.sitePermissions?.canViewCamps || false,
                  canEditCamps: userFromSession.sitePermissions?.canEditCamps || false,
                  canCreateCamps: userFromSession.sitePermissions?.canCreateCamps || false
                }
              };
            }
            setUserPermissions(finalPermissions);
            setLastCacheTime(timestamp);
            setIsLoading(false);
            
            // Admin kullanıcılar için istatistikleri hemen yükle
            if (user.role === 'kurucu_admin' || user.role === 'merkez_admin') {
              // Admin kullanıcılar için özel fonksiyon
              setLoadingStats(true);
              loadStatsAdmin(data);
            } else if (user.role === 'santiye_admin') {
              // Şantiye admini için normal fonksiyon
              setLoadingStats(true);
              loadStats(data);
            }
            
            // Arka planda yenile - loadStats'ı tekrar çağırmamak için flag kullan
            setTimeout(() => {
              loadCamps(user.email, true); // true = arka plan yenileme
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
      const lastActiveSiteKey = `lastActiveSite_${userEmail}`;
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(lastActiveSiteKey);
      console.log('Kamp cache temizlendi:', cacheKey);
      console.log('LastActiveSite cache temizlendi:', lastActiveSiteKey);
    }
    // Cache temizlendiğinde stats ref'ini sıfırla
    statsLoadedRef.current = false;
    // Santiye admin işçi sayısını da sıfırla
    setSantiyeAdminWorkerCount(0);
    setSantiyeAdminWorkersLoaded(false);
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
      loadCamps(currentUser.email, false);
    }
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      // Personel kullanıcıları için personel sayfasına yönlendir
      if (user.role === 'personel_admin' || user.role === 'personel_user') {
        router.push('/personnel');
        return;
      }
      
      // Session storage'dan gelen kullanıcı yetkilerini doğrudan kullan
      if (user.role === 'user') {
        const userPermissionsFromSession = {
          siteAccessApproved: user.siteAccessApproved || false,
          sitePermissions: {
            canViewCamps: user.sitePermissions?.canViewCamps || false,
            canEditCamps: user.sitePermissions?.canEditCamps || false,
            canCreateCamps: user.sitePermissions?.canCreateCamps || false
          }
        };
        setUserPermissions(userPermissionsFromSession);
      } else if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
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
      }
      
      // Kullanıcı yüklendikten sonra kampları yükle
      loadCamps(user.email, false);
    } else {
      router.push('/login');
    }
  }, [router]);

  // currentUser değiştiğinde istatistikleri yükle
  useEffect(() => {
    if (currentUser && camps.length > 0 && !statsLoadedRef.current) {
      if (currentUser.role === 'kurucu_admin' || currentUser.role === 'merkez_admin') {
        // Admin kullanıcılar için özel fonksiyon
        setLoadingStats(true);
        loadStatsAdmin(camps);
        loadSiteNames();
        statsLoadedRef.current = true;
      } else if (currentUser.role === 'santiye_admin') {
        // Şantiye admini için normal fonksiyon
        setLoadingStats(true);
        loadStats(camps);
        loadSiteNames();
        statsLoadedRef.current = true;
      }
    }
  }, [currentUser, currentUser?.activeSite, camps]);

  // Şantiye admini için activeSite değiştiğinde cache'i temizle ve verileri yeniden çek
  useEffect(() => {
    if (currentUser?.role === 'santiye_admin' && currentUser?.email) {
      console.log('ActiveSite değişti, cache temizleniyor...');
      // Cache'i temizle
      clearCampsCache(currentUser.email);
      // Stats ref'ini sıfırla
      statsLoadedRef.current = false;
      // Santiye admin işçi sayısını sıfırla
      setSantiyeAdminWorkerCount(0);
      setSantiyeAdminWorkersLoaded(false);
      // Kampları yeniden çek
      loadCamps(currentUser.email, false);
      // İstatistikleri yeniden hesapla
      setLoadingStats(true);
    }
  }, [currentUser?.activeSite]);

  // Session storage değişikliklerini dinle
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser' && currentUser?.role === 'santiye_admin') {
        try {
          const newUser = JSON.parse(e.newValue || '{}');
          const oldActiveSite = currentUser?.activeSite || currentUser?.site;
          const newActiveSite = newUser.activeSite || newUser.site;
          
          if (oldActiveSite !== newActiveSite) {
            console.log('Session storage\'da activeSite değişti:', oldActiveSite, '->', newActiveSite);
            // Cache'i zorla temizle
            clearCampsCache(currentUser.email);
            // Stats ref'ini sıfırla
            statsLoadedRef.current = false;
            // Santiye admin işçi sayısını sıfırla
            setSantiyeAdminWorkerCount(0);
            setSantiyeAdminWorkersLoaded(false);
            // Kullanıcıyı güncelle
            setCurrentUser(newUser);
            // Kampları yeniden çek
            loadCamps(newUser.email, false);
            // İstatistikleri yeniden hesapla
            setLoadingStats(true);
          }
        } catch (error) {
          console.error('Session storage parse hatası:', error);
        }
      }
    };

    const handleActiveSiteChange = (e: CustomEvent) => {
      if (currentUser?.role === 'santiye_admin') {
        console.log('Custom event: activeSite değişti:', e.detail);
        // Cache'i zorla temizle
        clearCampsCache(currentUser.email);
        // Stats ref'ini sıfırla
        statsLoadedRef.current = false;
        // Santiye admin işçi sayısını sıfırla
        setSantiyeAdminWorkerCount(0);
        setSantiyeAdminWorkersLoaded(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('activeSiteChanged', handleActiveSiteChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activeSiteChanged', handleActiveSiteChange as EventListener);
    };
  }, [currentUser]);

  const loadCamps = async (email: string, isBackgroundRefresh: boolean = false) => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      const user = JSON.parse(userStr || '{}');
      
      // Admin kullanıcılar için loading gösterme (arka plan yenilemelerde gösterme)
      const shouldShowLoading = user.role === 'user' && !isBackgroundRefresh;
      
      if (shouldShowLoading) {
        setIsLoading(true);
      }
      
      // Şantiye admini için activeSite parametresini gönder
      // currentUser state'ini öncelikle kullan, yoksa session storage'dan al
      let activeSiteParam;
      if (user.role === 'santiye_admin') {
        activeSiteParam = currentUser?.activeSite || user.activeSite || user.site;
      }
      const response = await getCamps(email, user.role, activeSiteParam);
      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }
      
      // Backend'de filtreleme yapıldığı için frontend'de filtreleme yapmıyoruz
      setCamps(response);
      
      // Cache'e kaydet - session storage'dan gelen yetkileri kullan
      const userStrForCache = sessionStorage.getItem('currentUser');
      const userFromSession = JSON.parse(userStrForCache || '{}');
      
      let permissionsToCache;
      if (user.role === 'santiye_admin' || user.role === 'merkez_admin' || user.role === 'kurucu_admin') {
        permissionsToCache = {
          siteAccessApproved: true,
          sitePermissions: {
            canViewCamps: true,
            canEditCamps: true,
            canCreateCamps: true
          }
        };
      } else {
        // User rolü için session storage'dan gelen yetkileri kullan
        permissionsToCache = {
          siteAccessApproved: userFromSession.siteAccessApproved || false,
          sitePermissions: {
            canViewCamps: userFromSession.sitePermissions?.canViewCamps || false,
            canEditCamps: userFromSession.sitePermissions?.canEditCamps || false,
            canCreateCamps: userFromSession.sitePermissions?.canCreateCamps || false
          }
        };
      }
      
      const cacheDataToSave = {
        data: response,
        timestamp: Date.now(),
        userRole: user.role,
        permissions: permissionsToCache,
        activeSite: user.activeSite || user.site // ActiveSite bilgisini de cache'e kaydet
      };
      sessionStorage.setItem(`campsCache_${email}`, JSON.stringify(cacheDataToSave));
      setLastCacheTime(Date.now());
      
      // Şantiye admini için activeSite'i ayrıca kaydet
      if (user.role === 'santiye_admin') {
        sessionStorage.setItem(`lastActiveSite_${email}`, user.activeSite || user.site);
      }
      
      // Admin kullanıcılar için istatistikleri hemen yükle (sadece ilk yüklemede)
      if (!isBackgroundRefresh) {
        if (user.role === 'kurucu_admin' || user.role === 'merkez_admin') {
          // Admin kullanıcılar için özel fonksiyon
          setLoadingStats(true);
          loadStatsAdmin(response);
          loadSiteNames();
        } else if (user.role === 'santiye_admin') {
          // Şantiye admini için normal fonksiyon
          setLoadingStats(true);
          loadStats(response);
          loadSiteNames();
        }
      }
      
      // Loading'i kapat
      setIsLoading(false);
    } catch (error) {
      console.error('Kamplar yüklenirken hata:', error);
      setError('Kamplar yüklenirken bir hata oluştu');
      // Hata durumunda tüm roller için loading'i kapat
      setIsLoading(false);
    }
  };

  // Admin kullanıcılar için özel istatistik yükleme fonksiyonu
  const loadStatsAdmin = async (campsData: Camp[]) => {
    console.log('=== LOADSTATSADMIN BAŞLADI ===');
    console.log('Admin için tüm kamplar:', campsData.map(c => ({ name: c.name, site: c.site, creatorSite: c.creatorSite })));
    
    setLoadingStats(true);
    try {
      // Şantiye isimlerini al
      const sitesResponse = await fetch('/api/sites');
      const sitesData = await sitesResponse.json();
      const siteIdToName: Record<string, string> = {};
      sitesData.forEach((site: any) => {
        siteIdToName[site._id] = site.name;
      });
      
      // GENEL ÖZET İÇİN - Tüm sistemin toplam istatistikleri (filtreleme yok)
      let generalTotalWorkers = 0;
      let generalTotalBeds = 0;
      let generalOccupiedBeds = 0;
      let generalTotalCamps = 0;

      // Tüm kampları işle - Genel özet için
      for (const camp of campsData) {
        try {
          console.log(`\n--- Kamp ${camp.name} genel özet için işleniyor ---`);
          const response = await fetch(`/api/reports/stats?campId=${camp._id}`);
          const campStats = await response.json();
          
          if (campStats && !campStats.error) {
            console.log('Kamp genel istatistikleri:', {
              name: camp.name,
              totalWorkers: campStats.totalWorkers,
              totalCapacity: campStats.totalCapacity
            });
            
            // Genel özet için tüm verileri topla (filtreleme yok)
            generalTotalWorkers += campStats.totalWorkers || 0;
            generalTotalBeds += campStats.totalCapacity || 0;
            generalOccupiedBeds += campStats.totalWorkers || 0;
            generalTotalCamps += 1;
          }
        } catch (error) {
          console.error(`Kamp ${camp._id} genel istatistikleri yüklenemedi:`, error);
        }
      }

      // ŞANTİYE BAZLI ÖZET İÇİN - TAMAMEN DÜZELTİLMİŞ MANTIK
      const siteBasedStats: Record<string, SiteStats> = {};
      
      // Tüm işçileri getir ve şantiyelerine göre gruplandır
      try {
        // Her kamp için işçileri ayrı ayrı getir ve topla
        const allWorkers: any[] = [];
        
        for (const camp of campsData) {
          try {
            const workersResponse = await fetch(`/api/workers?campId=${camp._id}`);
            const campWorkers = await workersResponse.json();
            
            if (Array.isArray(campWorkers)) {
              allWorkers.push(...campWorkers);
            }
          } catch (error) {
            console.error(`Kamp ${camp._id} işçileri yüklenemedi:`, error);
          }
        }
        
        console.log('\n--- İşçiler şantiyelerine göre gruplandırılıyor ---');
        console.log('Toplam işçi sayısı (tüm kamplardan):', allWorkers.length);
        
        // İşçileri şantiyelerine göre gruplandır (worker.project alanına göre)
        const workersBySite: Record<string, number> = {};
        allWorkers.forEach((worker: any) => {
          const workerSite = worker.project || 'Şantiye Belirtilmemiş';
          workersBySite[workerSite] = (workersBySite[workerSite] || 0) + 1;
        });
        
        console.log('İşçi dağılımı (worker.project alanına göre):', workersBySite);
        
        // Her şantiye için istatistikleri başlat - SADECE İŞÇİ SAYILARI
        Object.keys(workersBySite).forEach(site => {
          siteBasedStats[site] = {
            totalWorkers: workersBySite[site], // Sadece bu şantiyede çalışan işçiler
            totalBeds: 0, // Kamp kapasiteleri ayrı hesaplanacak
            occupiedBeds: 0, // İşçi sayısına eşit olacak
            availableBeds: 0, // Hesaplanacak
            occupancyRate: 0, // Hesaplanacak
            campCount: 0 // Kamp sayısı ayrı hesaplanacak
          };
        });
        
        // Kampları işle - Şantiye bazlı özet için KAMP KAPASİTELERİ
        for (const camp of campsData) {
          try {
            // Kampın odalarını getir
            const roomsResponse = await fetch(`/api/rooms?campId=${camp._id}`);
            const campRooms = await roomsResponse.json();
            
            if (Array.isArray(campRooms)) {
              console.log(`Kamp ${camp.name} odaları:`, campRooms.length);
              
              // Her odayı kendi şantiyesine ekle
              campRooms.forEach((room: any) => {
                const roomSite = room.project || 'Şantiye Belirtilmemiş';
                
                if (siteBasedStats[roomSite]) {
                  siteBasedStats[roomSite].totalBeds += room.capacity || 0;
                }
              });
              
              // Kamp sayısını ana şantiyeye ekle
              const campSite = camp.creatorSite || camp.site || 'Şantiye Belirtilmemiş';
              if (siteBasedStats[campSite]) {
                siteBasedStats[campSite].campCount += 1;
              }
            }
          } catch (error) {
            console.error(`Kamp ${camp._id} odaları yüklenemedi:`, error);
          }
        }
        
        // Şantiye bazında doluluk oranlarını hesapla
        Object.keys(siteBasedStats).forEach(site => {
          // İşçi sayısı zaten workersBySite'den geliyor (worker.project alanına göre)
          siteBasedStats[site].occupiedBeds = siteBasedStats[site].totalWorkers; // İşçi sayısı = dolu yatak sayısı
          siteBasedStats[site].availableBeds = siteBasedStats[site].totalBeds - siteBasedStats[site].occupiedBeds;
          siteBasedStats[site].occupancyRate = siteBasedStats[site].totalBeds > 0 
            ? Math.round((siteBasedStats[site].occupiedBeds / siteBasedStats[site].totalBeds) * 100) 
            : 0;
        });
        
      } catch (error) {
        console.error('İşçi verileri yüklenirken hata:', error);
      }

      // Genel özet hesaplamaları
      const generalAvailableBeds = generalTotalBeds - generalOccupiedBeds;
      const generalOccupancyRate = generalTotalBeds > 0 ? Math.round((generalOccupiedBeds / generalTotalBeds) * 100) : 0;

      const overall: OverallStats = {
        totalWorkers: generalTotalWorkers,
        totalBeds: generalTotalBeds,
        occupiedBeds: generalOccupiedBeds,
        availableBeds: generalAvailableBeds,
        occupancyRate: generalOccupancyRate,
        totalCamps: generalTotalCamps,
        totalSites: Object.keys(siteBasedStats).length,
        santiyeAdminWorkers: 0
      };

      console.log('\n=== ADMIN İSTATİSTİK SONUÇ ===');
      console.log('Genel özet (filtreleme yok):', overall);
      console.log('Şantiye bazlı özet (worker.project alanına göre):', siteBasedStats);

      setSiteStats(siteBasedStats);
      setOverallStats(overall);
    } catch (error) {
      console.error('Admin istatistikleri yüklenirken hata:', error);
    } finally {
      setLoadingStats(false);
      statsLoadedRef.current = true;
    }
  };

  // İstatistikleri yükle - YENİ SİSTEM
  const loadStats = async (campsData: Camp[]) => {
    console.log('=== LOADSTATS BAŞLADI ===');
    console.log('Gelen kamplar:', campsData.map(c => ({ name: c.name, site: c.site, creatorSite: c.creatorSite })));
    console.log('Mevcut kullanıcı:', {
      role: currentUser?.role,
      activeSite: currentUser?.activeSite,
      site: currentUser?.site
    });
    console.log('Mevcut overallStats:', overallStats);
    
    setLoadingStats(true);
    try {
      // Admin kullanıcılar için özel fonksiyon kullan
      if (currentUser?.role === 'kurucu_admin' || currentUser?.role === 'merkez_admin') {
        console.log('Admin kullanıcı tespit edildi, loadStatsAdmin çağrılıyor...');
        await loadStatsAdmin(campsData);
        return;
      }
      
      // Şantiye admini için sadece seçili şantiyenin istatistiklerini hesapla
      if (currentUser?.role === 'santiye_admin' && (currentUser?.activeSite || currentUser?.site)) {
        const userSite = currentUser.activeSite || currentUser.site;
        console.log('=== ŞANTİYE ADMIN İSTATİSTİK HESAPLAMA ===');
        console.log('Seçili şantiye:', userSite);
        console.log('Toplam kamp sayısı:', campsData.length);
        
        // Sadece seçili şantiyeye ait kampları filtrele
        const userSiteCamps = campsData.filter(camp => 
          camp.creatorSite === userSite || camp.site === userSite
        );
        
        console.log('Filtrelenmiş kamplar:', userSiteCamps.map(c => ({ 
          name: c.name, 
          site: c.site, 
          creatorSite: c.creatorSite,
          _id: c._id 
        })));
        
        let totalWorkers = 0;
        let totalBeds = 0;
        let occupiedBeds = 0;
        
        // Tüm kampları kontrol et (ortak kullanımlı kamplar için)
        for (const camp of campsData) {
          console.log(`\n--- Kamp ${camp.name} kontrol ediliyor ---`);
          console.log('Kamp bilgileri:', {
            name: camp.name,
            site: camp.site,
            creatorSite: camp.creatorSite,
            isPublic: camp.isPublic,
            sharedWithSites: camp.sharedWithSites
          });
          
          try {
            const response = await fetch(`/api/reports/stats?campId=${camp._id}`);
            const campStats = await response.json();
            
            console.log('API yanıtı:', campStats);
            
            if (campStats && !campStats.error) {
              // Seçili şantiyeye kayıtlı kamp mı kontrol et
              if (camp.creatorSite === userSite || camp.site === userSite) {
                console.log('Seçili şantiyeye kayıtlı kamp tespit edildi');
                
                // Bu kampın TÜM istatistiklerini al (içindeki işçi/oda kime ait olduğu farketmez)
                console.log('Kampın genel istatistikleri:', {
                  totalWorkers: campStats.totalWorkers,
                  totalCapacity: campStats.totalCapacity
                });
                totalWorkers += campStats.totalWorkers || 0;
                totalBeds += campStats.totalCapacity || 0;
                occupiedBeds += campStats.totalWorkers || 0;
              }
            }
          } catch (error) {
            console.error(`Kamp ${camp._id} istatistikleri yüklenemedi:`, error);
          }
        }
        
        const availableBeds = totalBeds - occupiedBeds;
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
        
        console.log('\n=== ŞANTİYE ADMIN SONUÇ ===');
        console.log('Hesaplanan değerler:', {
          userSite,
          totalCamps: userSiteCamps.length,
          totalWorkers,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate
        });
        
        // Şantiye admin için özel istatistikler
        setSantiyeAdminWorkerCount(totalWorkers);
        setSantiyeAdminWorkersLoaded(true);
        
        // Overall stats'i güncelle
        const overall: OverallStats = {
          totalWorkers: 0, // Genel toplam kullanılmıyor
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate,
          totalCamps: userSiteCamps.length,
          totalSites: 1, // Sadece seçili şantiye
          santiyeAdminWorkers: totalWorkers
        };
        
        console.log('Şantiye admin stats güncelleniyor:', overall);
        setSantiyeAdminStats(overall);
        
        // State güncellemesini kontrol et
        setTimeout(() => {
          console.log('State güncellemesi sonrası santiyeAdminStats:', santiyeAdminStats);
        }, 100);
        
      } else {
        // User rolü için eski sistem
        const stats: Record<string, SiteStats> = {};
        let totalWorkers = 0;
        let totalBeds = 0;
        let occupiedBeds = 0;

        // Tüm işçileri getir
        const workersResponse = await fetch('/api/workers');
        const allWorkers = await workersResponse.json();
        
        // Tüm kampları işle
        for (const camp of campsData) {
          try {
            const response = await fetch(`/api/reports/stats?campId=${camp._id}`);
            const campStats = await response.json();
            if (campStats && !campStats.error) {
              const campSite = camp.creatorSite || camp.site || 'Şantiye Belirtilmemiş';
              
              if (!stats[campSite]) {
                stats[campSite] = {
                  totalWorkers: 0,
                  totalBeds: 0,
                  occupiedBeds: 0,
                  availableBeds: 0,
                  occupancyRate: 0,
                  campCount: 0
                };
              }
              
              stats[campSite].totalBeds += campStats.totalCapacity || 0;
              stats[campSite].occupiedBeds += campStats.totalWorkers || 0;
              stats[campSite].campCount += 1;
              totalBeds += campStats.totalCapacity || 0;
              occupiedBeds += campStats.totalWorkers || 0;
              
              if (campStats.siteStats && campStats.siteStats[campSite]) {
                stats[campSite].totalWorkers += campStats.siteStats[campSite].workers || 0;
              }
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

        const overall: OverallStats = {
          totalWorkers,
          totalBeds,
          occupiedBeds,
          availableBeds: totalBeds - occupiedBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
          totalCamps: campsData.length,
          totalSites: Object.keys(stats).length,
          santiyeAdminWorkers: 0
        };

        setSiteStats(stats);
        setOverallStats(overall);
      }
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    } finally {
      setLoadingStats(false);
      statsLoadedRef.current = true;
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
      const campData: any = {
        ...newCamp,
        userEmail: currentUser?.email
      };
      
      // Şantiye admini için aktif şantiyeyi gönder
      if (currentUser?.role === 'santiye_admin' && (currentUser?.activeSite || currentUser?.site)) {
        campData.currentSite = currentUser.activeSite || currentUser.site;
        console.log('Frontend - Şantiye admini kamp oluşturuyor:', {
          campData,
          currentUser: {
            email: currentUser.email,
            role: currentUser.role,
            activeSite: currentUser.activeSite,
            site: currentUser.site,
            sites: currentUser.sites
          }
        });
      } else {
            }
    
    const response = await createCamp(campData);
    
    if (response.error) {
      setError(response.error);
      return;
    }
      // Yeni kampı listeye ekle
      setCamps(prev => [...prev, response]);
      // Cache'i temizle ve arkaplanda yenile
      clearCampsCache();
      loadCamps(currentUser?.email || '', true);
      
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
      
      // İstatistikleri yeniden yükle (useEffect otomatik olarak çağıracak)
      statsLoadedRef.current = false;
      
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
      
      // İstatistikleri yeniden yükle (useEffect otomatik olarak çağıracak)
      statsLoadedRef.current = false;
      
      setShowLeaveModal(false);
      setSelectedCamp(null);
      setError('');
    } catch (error) {
      setError('Kamp paylaşımından çıkarken bir hata oluştu');
    }
  };

  const handleCampClick = async (camp: Camp) => {
    console.log('=== KAMP TIKLAMA BAŞLADI ===');
    console.log('Tıklanan kamp:', {
      id: camp._id,
      name: camp.name,
      site: camp.site,
      creatorSite: camp.creatorSite,
      userEmail: camp.userEmail
    });
    console.log('Mevcut kullanıcı:', {
      email: currentUser?.email,
      role: currentUser?.role,
      site: currentUser?.site,
      activeSite: currentUser?.activeSite,
      sites: currentUser?.sites
    });

    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      console.log('API çağrısı yapılıyor:', `/api/camps/${camp._id}`);
      
      // Kampın tam bilgilerini API'den al
      const response = await fetch(`/api/camps/${camp._id}`);
      const campData = await response.json();
      
      console.log('API yanıtı:', campData);
      
      if (campData.error) {
        console.error('Kamp bilgileri alınamadı:', campData.error);
        // Hata durumunda mevcut kamp bilgilerini kullan
        localStorage.setItem('currentCamp', JSON.stringify(camp));
      } else {
        // Tam kamp bilgilerini localStorage'a kaydet
        localStorage.setItem('currentCamp', JSON.stringify(campData));
        console.log('Kamp bilgileri localStorage\'a kaydedildi');
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

      console.log('Oluşturulan URL:', `/${formattedName}/dashboard`);
      console.log('Yönlendirme yapılıyor...');

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
      // Cache'i temizle ve arkaplanda listeyi yenile
      clearCampsCache();
      loadCamps(currentUser?.email || '', true);
      
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
      // Cache'i temizle ve arkaplanda listeyi yenile
      clearCampsCache();
      loadCamps(currentUser?.email || '', true);
      
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
  const hasAccess = !!(
    currentUser?.role === 'kurucu_admin' ||
    currentUser?.role === 'merkez_admin' ||
    currentUser?.role === 'santiye_admin' ||
    (userPermissions?.siteAccessApproved && userPermissions?.sitePermissions?.canViewCamps)
  );

  // Cache'den yüklenen veriler varsa erişim kontrolünü geçici olarak true yap
  const hasCachedData = lastCacheTime > 0 && camps.length > 0;
  const canCreate = !!(
    currentUser?.role === 'kurucu_admin' ||
    currentUser?.role === 'merkez_admin' ||
    currentUser?.role === 'santiye_admin' ||
    userPermissions?.sitePermissions?.canCreateCamps
  );



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

  // Şantiye adlarını yükle
  const loadSiteNames = async () => {
    try {
      const response = await fetch('/api/sites');
      if (response.ok) {
        const sites = await response.json();
        const namesMap = sites.reduce((acc: Record<string, string>, site: any) => {
          acc[site._id] = site.name;
          return acc;
        }, {});
        setSiteNames(namesMap);
      }
    } catch (error) {
      console.error('Şantiye adları yüklenirken hata:', error);
    }
  };

  // Kamp detaylarını çek
  const loadCampDetails = async () => {
    setLoadingCampDetails(true);
    try {
      const details: Record<string, any> = {};
      
      for (const camp of camps) {
        try {
          const response = await fetch(`/api/reports/stats?campId=${camp._id}`);
          const campStats = await response.json();
          
          if (campStats && !campStats.error) {
            details[camp._id] = {
              ...campStats,
              campName: camp.name,
              campSite: camp.creatorSite || camp.site,
              isPublic: camp.isPublic,
              sharedWithSites: camp.sharedWithSites
            };
          }
        } catch (error) {
          console.error(`Kamp ${camp._id} detayları yüklenemedi:`, error);
        }
      }
      
      setCampDetails(details);
    } catch (error) {
      console.error('Kamp detayları yüklenirken hata:', error);
    } finally {
      setLoadingCampDetails(false);
    }
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
        {currentUser?.role === 'santiye_admin' && (currentUser?.activeSite || currentUser?.site) && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded flex items-center justify-between">
            <div>
              <div className="font-bold text-lg mb-1">Şantiye Admini Paneli</div>
              <div className="text-sm">
                {currentUser?.activeSite || currentUser?.site} - Şantiye yönetimi ve gelişmiş işlemler için admin paneline erişebilirsiniz.
              </div>
            </div>
            <button
              onClick={() => {
                const activeSite = currentUser?.activeSite || currentUser?.site;
                router.push(`/santiye-admin-paneli?site=${encodeURIComponent(activeSite || '')}`);
              }}
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

        {/* Şantiye admini için şantiye özeti - YENİ TASARIM */}
        {currentUser?.role === 'santiye_admin' && (currentUser?.activeSite || currentUser?.site) && (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-2xl shadow-xl p-8 mb-8 animate-slideUp opacity-0" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mr-5 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-1">Şantiye Özeti</h2>
                  <p className="text-slate-600 text-lg">
                    {currentUser?.activeSite || currentUser?.site} - Genel Durum
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500 font-medium">Son güncelleme</div>
                <div className="text-xl font-bold text-slate-700">{new Date().toLocaleTimeString('tr-TR')}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Toplam Kamp Sayısı */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Toplam Kamp</p>
                    <p className="text-4xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{camps.length}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Toplam İşçi Sayısı */}
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => {
                  setShowWorkersModal(true);
                  loadCampDetails();
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Toplam İşçi</p>
                    {isWorkerCountLoading ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                        <span className="text-lg text-slate-500 font-medium">Yükleniyor...</span>
                      </div>
                    ) : (
                      <p className="text-4xl font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">
                        {workerCount}
                      </p>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Toplam Kapasite */}
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => {
                  setShowCapacityModal(true);
                  loadCampDetails();
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Toplam Kapasite</p>
                    {loadingStats || !(currentUser?.role === 'santiye_admin' ? santiyeAdminStats : overallStats) ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                        <span className="text-lg text-slate-500 font-medium">Yükleniyor...</span>
                      </div>
                    ) : (
                      <p className="text-4xl font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
                        {currentUser?.role === 'santiye_admin' ? santiyeAdminStats?.totalBeds || 0 : overallStats?.totalBeds || 0}
                      </p>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Doluluk Oranı */}
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => {
                  setShowOccupancyModal(true);
                  loadCampDetails();
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Doluluk Oranı</p>
                    {loadingStats || !(currentUser?.role === 'santiye_admin' ? santiyeAdminStats : overallStats) ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                        <span className="text-lg text-slate-500 font-medium">Yükleniyor...</span>
                      </div>
                    ) : (
                      <p className="text-4xl font-bold text-violet-600 group-hover:text-violet-700 transition-colors">
                        %{currentUser?.role === 'santiye_admin' ? santiyeAdminStats?.occupancyRate || 0 : overallStats?.occupancyRate || 0}
                      </p>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 mb-8 animate-slideUp opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentUser?.role === 'santiye_admin' 
                  ? `${currentUser?.activeSite || currentUser?.site} - Kamplar` 
                  : isAdminUser ? 'Tüm Kamplar' : 'Kamplarım'
                }
              </h1>
              <p className="text-gray-600">
                {currentUser?.role === 'santiye_admin' 
                  ? `${currentUser?.activeSite || currentUser?.site} şantiyesindeki kampların listesi`
                  : isAdminUser ? 'Sistemdeki tüm kampların listesi' : 'Yönettiğiniz kampların listesi'
                }
              </p>
              {lastCacheTime > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Son güncelleme: {new Date(lastCacheTime).toLocaleTimeString('tr-TR')}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              {hasAccess && (
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
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{overallStats.totalWorkers.toLocaleString()}</div>
                      <div className="text-sm text-blue-700 font-medium">Toplam İşçi</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{overallStats.totalBeds.toLocaleString()}</div>
                      <div className="text-sm text-green-700 font-medium">Toplam Yatak</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200 shadow-sm">
                      <div className="text-2xl font-bold text-yellow-600">{overallStats.availableBeds.toLocaleString()}</div>
                      <div className="text-sm text-yellow-700 font-medium">Boş Yatak</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
                      <div className="text-2xl font-bold text-purple-600">%{overallStats.occupancyRate}</div>
                      <div className="text-sm text-purple-700 font-medium">Doluluk Oranı</div>
                    </div>
                  </div>
                </div>

                {/* Şantiye bazlı özet - açılır/kapanır */}
                <div>
                  <div 
                    onClick={() => setExpandedStats(!expandedStats)}
                    className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors duration-200 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Şantiye Bazlı Özet ({Object.keys(siteStats).length} şantiye)
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
                      {Object.keys(siteStats).sort().map((site) => {
                        const stats = siteStats[site];
                        const hasSharedCamps = camps.some(camp => 
                          (camp.creatorSite === site || camp.site === site) && camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0
                        );
                        
                        return (
                          <div key={site} className={`bg-white/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow ${
                            hasSharedCamps ? 'border-blue-200' : 'border-gray-200'
                          }`}>
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {site}
                              {hasSharedCamps && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Ortak Kullanım
                                </span>
                              )}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
                              <div className="text-center bg-green-50 rounded-lg p-2 border border-green-200">
                                <div className="text-lg font-bold text-green-600">{stats.totalWorkers.toLocaleString()}</div>
                                <div className="text-xs text-green-700 font-medium">İşçi</div>
                              </div>
                              <div className="text-center bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <div className="text-lg font-bold text-blue-600">{stats.totalBeds.toLocaleString()}</div>
                                <div className="text-xs text-blue-700 font-medium">Yatak</div>
                              </div>
                              <div className="text-center bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                                <div className="text-lg font-bold text-yellow-600">{stats.availableBeds.toLocaleString()}</div>
                                <div className="text-xs text-yellow-700 font-medium">Boş</div>
                              </div>
                              <div className="text-center bg-purple-50 rounded-lg p-2 border border-purple-200">
                                <div className="text-lg font-bold text-purple-600">%{stats.occupancyRate}</div>
                                <div className="text-xs text-purple-700 font-medium">Doluluk</div>
                              </div>
                              <div className="text-center bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                                <div className="text-lg font-bold text-indigo-600">{stats.campCount}</div>
                                <div className="text-xs text-indigo-700 font-medium">Kamp</div>
                              </div>
                            </div>
                            {/* Progress bar for occupancy */}
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Doluluk Oranı</span>
                                <span>%{stats.occupancyRate}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    stats.occupancyRate >= 80 ? 'bg-red-500' :
                                    stats.occupancyRate >= 60 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${stats.occupancyRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

        {/* Toplam İşçi Detay Modalı */}
        {showWorkersModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={() => setShowWorkersModal(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold">İşçi İstatistikleri</h2>
                  </div>
                  <button 
                    onClick={() => setShowWorkersModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {loadingStats || loadingCampDetails || (currentUser?.role === 'santiye_admin' && currentUser?.site && !santiyeAdminWorkersLoaded) ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mr-3"></div>
                    <span className="text-gray-600">Veriler yükleniyor...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Genel Özet */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Genel Özet
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center bg-white rounded-lg p-3 border border-green-200">
                          <div className="text-2xl font-bold text-green-600">
                            {currentUser?.role === 'santiye_admin' && currentUser?.site 
                              ? (santiyeAdminWorkerCount || 0)
                              : (overallStats?.totalWorkers || 0)
                            }
                          </div>
                          <div className="text-sm text-green-700">Toplam İşçi</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 border border-green-200">
                          <div className="text-2xl font-bold text-blue-600">{overallStats?.totalCamps || 0}</div>
                          <div className="text-sm text-blue-700">Toplam Kamp</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 border border-green-200">
                          <div className="text-2xl font-bold text-purple-600">{overallStats?.totalSites || 0}</div>
                          <div className="text-sm text-purple-700">Toplam Şantiye</div>
                        </div>
                      </div>
                    </div>

                    {/* Kamp Bazında İşçi Dağılımı */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Kamp Bazında İşçi Dağılımı
                      </h3>
                      <div className="space-y-4">
                        {camps.map((camp) => {
                          const campDetail = campDetails[camp._id];
                          if (!campDetail) return null;
                          
                          const hasSharedSites = camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0;
                          
                          return (
                            <div key={camp._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              {/* Ana Kamp Bilgileri */}
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-800 text-lg">{camp.name}</h4>
                                  <p className="text-sm text-gray-600">{camp.creatorSite || camp.site || 'Şantiye Belirtilmemiş'}</p>
                                  {hasSharedSites && (
                                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Ortak Kullanım Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {campDetail.totalWorkers || 0} işçi
                                  </span>
                                </div>
                              </div>
                              
                              {/* Genel Kamp İstatistikleri */}
                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-blue-600">{campDetail.totalCapacity || 0}</div>
                                  <div className="text-xs text-gray-600">Toplam Kapasite</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-purple-600">%{Math.round(campDetail.occupancyRate || 0)}</div>
                                  <div className="text-xs text-gray-600">Doluluk Oranı</div>
                                </div>
                              </div>

                              {/* Şantiye Bazında Detaylar - Ortak kullanım varsa göster */}
                              {hasSharedSites && campDetail.siteStats && Object.keys(campDetail.siteStats).length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <h5 className="text-sm font-medium text-blue-700 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                    Şantiye Bazında Dağılım
                                  </h5>
                                  <div className="space-y-2">
                                    {Object.entries(campDetail.siteStats).map(([siteName, stats]: [string, any]) => (
                                      <div key={siteName} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="mb-2">
                                          <span className="text-sm font-medium text-gray-800">{siteName}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                          <div className="text-center">
                                            <div className="font-semibold text-green-600">{stats.workers || stats.totalWorkers || 0}</div>
                                            <div className="text-gray-600">İşçi</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-semibold text-blue-600">{stats.capacity || stats.totalBeds || 0}</div>
                                            <div className="text-gray-600">Kapasite</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-semibold text-purple-600">
                                              %{(stats.capacity || stats.totalBeds) > 0 ? Math.round(((stats.workers || stats.totalWorkers) / (stats.capacity || stats.totalBeds)) * 100) : 0}
                                            </div>
                                            <div className="text-gray-600">Doluluk</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Şantiye Bazlı İstatistikler - Sadece ortak kullanım varsa göster */}
                    {camps.some(camp => camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          Şantiye Bazlı İstatistikler (Ortak Kullanım)
                        </h3>
                        <div className="space-y-3">
                          {(() => {
                            // Tüm kamplardaki tüm şantiyeleri gezip, her şantiye için işçi ve kapasiteyi topla
                            const siteTotals: Record<string, { workers: number; capacity: number }> = {};
                            camps.forEach(camp => {
                              const campDetail = campDetails[camp._id];
                              if (campDetail && campDetail.siteStats) {
                                Object.entries(campDetail.siteStats).forEach(([siteName, stats]: [string, any]) => {
                                  if (!siteTotals[siteName]) {
                                    siteTotals[siteName] = { workers: 0, capacity: 0 };
                                  }
                                  siteTotals[siteName].workers += stats.workers || 0;
                                  siteTotals[siteName].capacity += stats.capacity || 0;
                                });
                              }
                            });
                            return Object.entries(siteTotals).map(([siteName, stats]: [string, { workers: number; capacity: number }]) => (
                              <div key={siteName} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <h4 className="font-semibold text-indigo-800 mb-2">{siteName}</h4>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-green-600">{stats.workers}</div>
                                    <div className="text-xs text-gray-600">İşçi</div>
                                  </div>
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-blue-600">{stats.capacity}</div>
                                    <div className="text-xs text-gray-600">Yatak</div>
                                  </div>
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-purple-600">
                                      %{stats.capacity > 0 ? Math.round((stats.workers / stats.capacity) * 100) : 0}
                                    </div>
                                    <div className="text-xs text-gray-600">Doluluk</div>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowWorkersModal(false)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toplam Kapasite Detay Modalı */}
        {showCapacityModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={() => setShowCapacityModal(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                    <h2 className="text-2xl font-bold">Kapasite İstatistikleri</h2>
                  </div>
                  <button 
                    onClick={() => setShowCapacityModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {loadingStats || loadingCampDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mr-3"></div>
                    <span className="text-gray-600">Veriler yükleniyor...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Genel Özet */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Genel Özet
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center bg-white rounded-lg p-3 border border-yellow-200">
                          <div className="text-2xl font-bold text-yellow-600">{overallStats?.totalBeds || 0}</div>
                          <div className="text-sm text-yellow-700">Toplam Kapasite</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 border border-yellow-200">
                          <div className="text-2xl font-bold text-green-600">{overallStats?.occupiedBeds || 0}</div>
                          <div className="text-sm text-green-700">Dolu Yatak</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 border border-yellow-200">
                          <div className="text-2xl font-bold text-blue-600">{overallStats?.availableBeds || 0}</div>
                          <div className="text-sm text-blue-700">Boş Yatak</div>
                        </div>
                      </div>
                    </div>

                    {/* Kamp Bazında Kapasite Dağılımı */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Kamp Bazında Kapasite Dağılımı
                      </h3>
                      <div className="space-y-4">
                        {camps.map((camp) => {
                          const campDetail = campDetails[camp._id];
                          if (!campDetail) return null;
                          
                          const hasSharedSites = camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0;
                          
                          return (
                            <div key={camp._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              {/* Ana Kamp Bilgileri */}
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-800 text-lg">{camp.name}</h4>
                                  <p className="text-sm text-gray-600">{camp.creatorSite || camp.site || 'Şantiye Belirtilmemiş'}</p>
                                  {hasSharedSites && (
                                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Ortak Kullanım Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {campDetail.totalCapacity || 0} kapasite
                                  </span>
                                </div>
                              </div>
                              
                              {/* Genel Kamp İstatistikleri */}
                              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-green-600">{campDetail.totalWorkers || 0}</div>
                                  <div className="text-xs text-gray-600">Dolu Yatak</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-blue-600">{campDetail.availableBeds || 0}</div>
                                  <div className="text-xs text-gray-600">Boş Yatak</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-purple-600">%{Math.round(campDetail.occupancyRate || 0)}</div>
                                  <div className="text-xs text-gray-600">Doluluk</div>
                                </div>
                              </div>

                              {/* Şantiye Bazında Detaylar - Ortak kullanım varsa göster */}
                              {hasSharedSites && campDetail.siteStats && Object.keys(campDetail.siteStats).length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <h5 className="text-sm font-medium text-blue-700 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                    Şantiye Bazında Kapasite Dağılımı
                                  </h5>
                                  <div className="space-y-2">
                                    {Object.entries(campDetail.siteStats).map(([siteName, stats]: [string, any]) => {
                                      const isMainSite = siteName === (camp.creatorSite || camp.site);
                                      return (
                                        <div key={siteName} className={`rounded-lg p-3 border ${
                                          isMainSite ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                                        }`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className={`text-sm font-medium ${
                                              isMainSite ? 'text-blue-800' : 'text-green-800'
                                            }`}>
                                              {siteName}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                              isMainSite ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                                            }`}>
                                              {isMainSite ? 'Ana Şantiye' : 'Ortak Kullanım'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="text-center">
                                              <div className="font-semibold text-blue-600">{stats.capacity || 0}</div>
                                              <div className="text-gray-600">Toplam Kapasite</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-semibold text-green-600">{stats.workers || 0}</div>
                                              <div className="text-gray-600">Dolu Yatak</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-semibold text-purple-600">
                                                %{stats.capacity > 0 ? Math.round((stats.workers / stats.capacity) * 100) : 0}
                                              </div>
                                              <div className="text-gray-600">Doluluk</div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Şantiye Bazlı İstatistikler - Sadece ortak kullanım varsa göster */}
                    {camps.some(camp => camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          Şantiye Bazlı İstatistikler (Ortak Kullanım)
                        </h3>
                        <div className="space-y-3">
                          {(() => {
                            // Tüm kamplardaki tüm şantiyeleri gezip, her şantiye için kapasite ve işçi sayısını topla
                            const siteTotals: Record<string, { workers: number; capacity: number }> = {};
                            camps.forEach(camp => {
                              const campDetail = campDetails[camp._id];
                              if (campDetail && campDetail.siteStats) {
                                Object.entries(campDetail.siteStats).forEach(([siteName, stats]: [string, any]) => {
                                  if (!siteTotals[siteName]) {
                                    siteTotals[siteName] = { workers: 0, capacity: 0 };
                                  }
                                  siteTotals[siteName].workers += stats.workers || 0;
                                  siteTotals[siteName].capacity += stats.capacity || 0;
                                });
                              }
                            });
                            return Object.entries(siteTotals).map(([siteName, stats]: [string, { workers: number; capacity: number }]) => (
                              <div key={siteName} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <h4 className="font-semibold text-indigo-800 mb-2">{siteName}</h4>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-green-600">{stats.workers}</div>
                                    <div className="text-xs text-gray-600">İşçi</div>
                                  </div>
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-blue-600">{stats.capacity}</div>
                                    <div className="text-xs text-gray-600">Yatak</div>
                                  </div>
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-purple-600">
                                      %{stats.capacity > 0 ? Math.round((stats.workers / stats.capacity) * 100) : 0}
                                    </div>
                                    <div className="text-xs text-gray-600">Doluluk</div>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowCapacityModal(false)}
                    className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doluluk Oranı Detay Modalı */}
        {showOccupancyModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={() => setShowOccupancyModal(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h2 className="text-2xl font-bold">Doluluk Oranı İstatistikleri</h2>
                  </div>
                  <button 
                    onClick={() => setShowOccupancyModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {loadingStats || loadingCampDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mr-3"></div>
                    <span className="text-gray-600">Veriler yükleniyor...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Genel Özet */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Genel Özet
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center bg-white rounded-lg p-3 border border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">%{overallStats?.occupancyRate || 0}</div>
                          <div className="text-sm text-purple-700">Genel Doluluk</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 border border-purple-200">
                          <div className="text-2xl font-bold text-green-600">{overallStats?.occupiedBeds || 0}</div>
                          <div className="text-sm text-green-700">Dolu Yatak</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 border border-purple-200">
                          <div className="text-2xl font-bold text-blue-600">{overallStats?.availableBeds || 0}</div>
                          <div className="text-sm text-blue-700">Boş Yatak</div>
                        </div>
                      </div>
                    </div>

                    {/* Kamp Bazında Doluluk Oranları */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Kamp Bazında Doluluk Oranları
                      </h3>
                      <div className="space-y-4">
                        {camps.map((camp) => {
                          const campDetail = campDetails[camp._id];
                          if (!campDetail) return null;
                          
                          const occupancyRate = Math.round(campDetail.occupancyRate || 0);
                          const hasSharedSites = camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0;
                          
                          return (
                            <div key={camp._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              {/* Ana Kamp Bilgileri */}
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-800 text-lg">{camp.name}</h4>
                                  <p className="text-sm text-gray-600">{camp.creatorSite || camp.site || 'Şantiye Belirtilmemiş'}</p>
                                  {hasSharedSites && (
                                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Ortak Kullanım Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    occupancyRate >= 80 ? 'bg-red-100 text-red-800' :
                                    occupancyRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    %{occupancyRate} doluluk
                                  </span>
                                </div>
                              </div>
                              
                              {/* Genel Kamp İstatistikleri */}
                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-blue-600">{campDetail.totalCapacity || 0}</div>
                                  <div className="text-xs text-gray-600">Toplam Kapasite</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-green-600">{campDetail.totalWorkers || 0}</div>
                                  <div className="text-xs text-gray-600">Dolu Yatak</div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-3 mb-3">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Doluluk Oranı</span>
                                  <span>%{occupancyRate}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      occupancyRate >= 80 ? 'bg-red-500' :
                                      occupancyRate >= 60 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${occupancyRate}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Şantiye Bazında Detaylar - Ortak kullanım varsa göster */}
                              {hasSharedSites && campDetail.siteStats && Object.keys(campDetail.siteStats).length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <h5 className="text-sm font-medium text-blue-700 mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                    Şantiye Bazında Doluluk Oranları
                                  </h5>
                                  <div className="space-y-2">
                                    {Object.entries(campDetail.siteStats).map(([siteName, stats]: [string, any]) => {
                                      const isMainSite = siteName === (camp.creatorSite || camp.site);
                                      const siteOccupancy = Math.round((stats.workers / stats.capacity) * 100) || 0;
                                      return (
                                        <div key={siteName} className={`rounded-lg p-3 border ${
                                          isMainSite ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                                        }`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className={`text-sm font-medium ${
                                              isMainSite ? 'text-blue-800' : 'text-green-800'
                                            }`}>
                                              {siteName}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                              isMainSite ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                                            }`}>
                                              {isMainSite ? 'Ana Şantiye' : 'Ortak Kullanım'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                            <div className="text-center">
                                              <div className="font-semibold text-blue-600">{stats.capacity || 0}</div>
                                              <div className="text-gray-600">Kapasite</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-semibold text-green-600">{stats.workers || 0}</div>
                                              <div className="text-gray-600">İşçi</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-semibold text-purple-600">%{siteOccupancy}</div>
                                              <div className="text-gray-600">Doluluk</div>
                                            </div>
                                          </div>
                                          {/* Şantiye Progress Bar */}
                                          <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                              <span>Doluluk</span>
                                              <span>%{siteOccupancy}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                              <div 
                                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                                  siteOccupancy >= 80 ? 'bg-red-500' :
                                                  siteOccupancy >= 60 ? 'bg-yellow-500' :
                                                  'bg-green-500'
                                                }`}
                                                style={{ width: `${siteOccupancy}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Şantiye Bazlı İstatistikler - Sadece ortak kullanım varsa göster */}
                    {camps.some(camp => camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          Şantiye Bazlı İstatistikler (Ortak Kullanım)
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(siteStats).sort().map(([siteName, stats]) => {
                            const hasSharedCamps = camps.some(camp => 
                              camp.creatorSite === siteName && camp.isPublic && camp.sharedWithSites && camp.sharedWithSites.length > 0
                            );
                            
                            if (!hasSharedCamps) return null;
                            
                            return (
                              <div key={siteName} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <h4 className="font-semibold text-indigo-800 mb-2">{siteName}</h4>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-green-600">{stats.totalWorkers}</div>
                                    <div className="text-xs text-gray-600">İşçi</div>
                                  </div>
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-blue-600">{stats.totalBeds}</div>
                                    <div className="text-xs text-gray-600">Yatak</div>
                                  </div>
                                  <div className="text-center bg-white rounded-lg p-2 border border-indigo-200">
                                    <div className="text-lg font-bold text-purple-600">%{stats.occupancyRate}</div>
                                    <div className="text-xs text-gray-600">Doluluk</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowOccupancyModal(false)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
} 