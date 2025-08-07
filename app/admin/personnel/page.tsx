'use client';

import { useState, useEffect } from 'react';
import { Users, Building, Eye, Edit, Plus, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';

interface SitePersonnelSummary {
  site: string;
  totalPersonnel: number;
  activePersonnel: number;
  inactivePersonnel: number;
  terminatedPersonnel: number;
  countriesCount: number;
  companiesCount: number;
}

interface Personnel {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  passportNumber: string;
  country: string;
  hireDate: string;
  jobTitle: string;
  company: string;
  status: 'active' | 'inactive' | 'terminated';
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function AdminPersonnelPage() {
  const [sitesSummary, setSitesSummary] = useState<SitePersonnelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı kontrolü
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'kurucu_admin' && user.role !== 'merkez_admin') {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    
    fetchAllSitesPersonnel();
  }, [router]);

  const fetchAllSitesPersonnel = async () => {
    try {
      setLoading(true);
      
      // Tüm personel verilerini al
      const response = await fetch('/api/personnel', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const allPersonnel: Personnel[] = await response.json();
        calculateSitesSummary(allPersonnel);
      }
    } catch (error) {
      console.error('Personel verileri getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSitesSummary = (allPersonnel: Personnel[]) => {
    // Şantiye bazında grupla
    const siteMap = new Map<string, Personnel[]>();
    
    allPersonnel.forEach(personnel => {
      // Site alanı boş veya undefined ise, bu kaydı atla
      if (!personnel.site || personnel.site.trim() === '') {
        console.log('Site alanı boş olan personel:', personnel);
        return;
      }
      
      const site = personnel.site.trim();
      if (!siteMap.has(site)) {
        siteMap.set(site, []);
      }
      siteMap.get(site)!.push(personnel);
    });

    // Her şantiye için özet hesapla
    const summaries: SitePersonnelSummary[] = [];
    
    siteMap.forEach((personnelList, site) => {
      const total = personnelList.length;
      const active = personnelList.filter(p => p.status === 'active').length;
      const inactive = personnelList.filter(p => p.status === 'inactive').length;
      const terminated = personnelList.filter(p => p.status === 'terminated').length;
      
      const countries = new Set(personnelList.map(p => p.country));
      const companies = new Set(personnelList.map(p => p.company));
      
      summaries.push({
        site,
        totalPersonnel: total,
        activePersonnel: active,
        inactivePersonnel: inactive,
        terminatedPersonnel: terminated,
        countriesCount: countries.size,
        companiesCount: companies.size
      });
    });

    // Toplam personel sayısına göre sırala
    summaries.sort((a, b) => b.totalPersonnel - a.totalPersonnel);
    setSitesSummary(summaries);
  };

  const handleViewSitePersonnel = (site: string) => {
    // Şantiye personel listesine yönlendir
    router.push(`/admin/personnel/site/${encodeURIComponent(site)}`);
  };

  const handleManageSitePersonnel = (site: string) => {
    // Şantiye personel yönetimine yönlendir (sadece kurucu admin)
    if (currentUser?.role === 'kurucu_admin') {
      router.push(`/admin/personnel/manage/${encodeURIComponent(site)}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center"
        style={{ backgroundImage: "url('/arkaplan.jpg')" }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Şantiye personel verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arkaplan.jpg')" }}
    >
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6">
          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentUser?.role === 'kurucu_admin' ? 'Kurucu Admin' : 'Merkez Admin'} - Personel Yönetimi
            </h1>
            <p className="text-gray-600">Tüm şantiyelerin personel özetleri ve yönetimi</p>
          </div>

          {/* Genel İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Toplam Şantiye</p>
                  <p className="text-3xl font-bold">{sitesSummary.length}</p>
                </div>
                <Building size={32} className="text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Toplam Personel</p>
                  <p className="text-3xl font-bold">
                    {sitesSummary.reduce((sum, site) => sum + site.totalPersonnel, 0)}
                  </p>
                </div>
                <Users size={32} className="text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Aktif Personel</p>
                  <p className="text-3xl font-bold">
                    {sitesSummary.reduce((sum, site) => sum + site.activePersonnel, 0)}
                  </p>
                </div>
                <BarChart3 size={32} className="text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Şantiyeler</p>
                  <p className="text-3xl font-bold">{sitesSummary.length}</p>
                </div>
                <Building size={32} className="text-orange-200" />
              </div>
            </div>
          </div>

          {/* Şantiye Listesi */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Building className="mr-2" size={24} />
                Şantiye Personel Özetleri
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şantiye
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktif
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pasif
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşten Ayrılan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ülke/Şirket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sitesSummary.map((site) => (
                    <tr key={site.site} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {site.site}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {site.totalPersonnel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {site.activePersonnel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {site.inactivePersonnel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {site.terminatedPersonnel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          <div>🌍 {site.countriesCount} ülke</div>
                          <div>🏢 {site.companiesCount} şirket</div>
                        </div>
                      </td>
                                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => router.push(`/personnel/reports?site=${encodeURIComponent(site.site)}`)}
                             className="text-blue-600 hover:text-blue-900 p-1"
                             title="Raporu Görüntüle"
                           >
                             <BarChart3 size={16} />
                           </button>
                           {currentUser?.role === 'kurucu_admin' && (
                             <button
                               onClick={() => handleManageSitePersonnel(site.site)}
                               className="text-green-600 hover:text-green-900 p-1"
                               title="Düzenle"
                             >
                               <Edit size={16} />
                             </button>
                           )}
                         </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sitesSummary.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Henüz şantiye personel verisi bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bilgi Notu */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="text-blue-600 mr-2" size={20} />
              <div className="text-sm text-blue-800">
                <strong>Bilgi:</strong> 
                {currentUser?.role === 'kurucu_admin' 
                  ? ' Kurucu admin olarak tüm şantiyelerin personel verilerini görüntüleyebilir, düzenleyebilir ve yeni personel ekleyebilirsiniz.'
                  : ' Merkez admin olarak tüm şantiyelerin personel verilerini görüntüleyebilirsiniz.'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
