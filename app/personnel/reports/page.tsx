'use client';

import { useState, useEffect, Suspense } from 'react';
import { BarChart3, Users, Building, Globe, TrendingUp, FileText, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

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

interface CountrySummary {
  country: string;
  count: number;
  active: number;
  inactive: number;
  terminated: number;
}

interface CompanySummary {
  company: string;
  count: number;
  active: number;
  inactive: number;
  terminated: number;
}

interface GeneralStats {
  totalPersonnel: number;
  activePersonnel: number;
  inactivePersonnel: number;
  terminatedPersonnel: number;
  countriesCount: number;
  companiesCount: number;
}

// Durum rengi fonksiyonu
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-yellow-100 text-yellow-800';
    case 'terminated': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Ülke Detay Modal Bileşeni
function CountryDetailModal({ 
  isOpen, 
  onClose, 
  country, 
  personnel 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  country: string; 
  personnel: Personnel[] 
}) {
  if (!isOpen) return null;

  const countryPersonnel = personnel.filter(p => p.country === country);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Globe className="mr-2" size={24} />
            {country} - Personel Listesi
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-600">Toplam {countryPersonnel.length} personel bulundu</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ad Soyad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çalışan ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şirket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozisyon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşe Başlama
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {countryPersonnel.map((person) => (
                    <tr key={person._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {person.firstName} {person.lastName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {person.employeeId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {person.company}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {person.jobTitle}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(person.status)}`}>
                          {person.status === 'active' ? 'Aktif' : person.status === 'inactive' ? 'Pasif' : 'İşten Ayrılan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(person.hireDate).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Şirket Detay Modal Bileşeni
function CompanyDetailModal({ 
  isOpen, 
  onClose, 
  company, 
  personnel 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  company: string; 
  personnel: Personnel[] 
}) {
  if (!isOpen) return null;

  const companyPersonnel = personnel.filter(p => p.company === company);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Building className="mr-2" size={24} />
            {company} - Personel Listesi
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-600">Toplam {companyPersonnel.length} personel bulundu</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ad Soyad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çalışan ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ülke
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozisyon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşe Başlama
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companyPersonnel.map((person) => (
                    <tr key={person._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {person.firstName} {person.lastName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {person.employeeId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {person.country}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {person.jobTitle}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(person.status)}`}>
                          {person.status === 'active' ? 'Aktif' : person.status === 'inactive' ? 'Pasif' : 'İşten Ayrılan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(person.hireDate).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonnelReportsContent() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSite, setUserSite] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats>({
    totalPersonnel: 0,
    activePersonnel: 0,
    inactivePersonnel: 0,
    terminatedPersonnel: 0,
    countriesCount: 0,
    companiesCount: 0
  });
  const [countrySummary, setCountrySummary] = useState<CountrySummary[]>([]);
  const [companySummary, setCompanySummary] = useState<CompanySummary[]>([]);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const searchParamsHook = useSearchParams();
  
  // Modal state'leri
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const fetchPersonnel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // URL'den site parametresini al
      const siteParam = searchParams?.get('site');
      
      if (siteParam) {
        // Admin'den gelen site parametresi
        params.append('site', siteParam);
        setUserSite(siteParam);
      } else {
        // Normal kullanıcının şantiye bilgisini al (sadece client-side'da)
        if (typeof window !== 'undefined') {
          const userStr = sessionStorage.getItem('currentUser');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.site) {
              params.append('site', user.site);
              setUserSite(user.site);
            }
          }
        }
      }
      
      const response = await fetch(`/api/personnel?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPersonnel(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Personel raporu getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Personnel[]) => {
    // Genel istatistikler
    const total = data.length;
    const active = data.filter(p => p.status === 'active').length;
    const inactive = data.filter(p => p.status === 'inactive').length;
    const terminated = data.filter(p => p.status === 'terminated').length;
    
    // Ülke sayısı
    const countries = new Set(data.map(p => p.country));
    const companies = new Set(data.map(p => p.company));
    
    setGeneralStats({
      totalPersonnel: total,
      activePersonnel: active,
      inactivePersonnel: inactive,
      terminatedPersonnel: terminated,
      countriesCount: countries.size,
      companiesCount: companies.size
    });

    // Ülke bazlı özet
    const countryMap = new Map<string, CountrySummary>();
    data.forEach(p => {
      if (!countryMap.has(p.country)) {
        countryMap.set(p.country, {
          country: p.country,
          count: 0,
          active: 0,
          inactive: 0,
          terminated: 0
        });
      }
      const summary = countryMap.get(p.country)!;
      summary.count++;
      if (p.status === 'active') summary.active++;
      else if (p.status === 'inactive') summary.inactive++;
      else if (p.status === 'terminated') summary.terminated++;
    });
    setCountrySummary(Array.from(countryMap.values()).sort((a, b) => b.count - a.count));

    // Şirket bazlı özet
    const companyMap = new Map<string, CompanySummary>();
    data.forEach(p => {
      if (!companyMap.has(p.company)) {
        companyMap.set(p.company, {
          company: p.company,
          count: 0,
          active: 0,
          inactive: 0,
          terminated: 0
        });
      }
      const summary = companyMap.get(p.company)!;
      summary.count++;
      if (p.status === 'active') summary.active++;
      else if (p.status === 'inactive') summary.inactive++;
      else if (p.status === 'terminated') summary.terminated++;
    });
    setCompanySummary(Array.from(companyMap.values()).sort((a, b) => b.count - a.count));
  };

  useEffect(() => {
    // searchParams'ı client-side'da set et
    if (typeof window !== 'undefined') {
      setSearchParams(searchParamsHook);
    }
    
    // Kullanıcının şantiye bilgisini al (sadece client-side'da)
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setUserSite(user.site || '');
      }
    }
  }, [searchParamsHook]);

  useEffect(() => {
    if (searchParams) {
      fetchPersonnel();
    }
  }, [searchParams]);

  // Ülke modal'ını aç
  const openCountryModal = (country: string) => {
    setSelectedCountry(country);
    setIsCountryModalOpen(true);
  };

  // Şirket modal'ını aç
  const openCompanyModal = (company: string) => {
    setSelectedCompany(company);
    setIsCompanyModalOpen(true);
  };

  // Server-side rendering sırasında loading göster
  if (typeof window === 'undefined' || loading) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center"
        style={{ backgroundImage: "url('/arkaplan.jpg')" }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Rapor yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arkaplan.jpg')" }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6">
          {/* Başlık */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {userSite ? `${userSite} Personel Raporu` : 'Personel Raporu'}
              </h1>
              <p className="text-gray-600">Personel yönetimi istatistikleri ve özet bilgiler</p>
            </div>
            {currentUser && currentUser.role === 'santiye_admin' && (
              <button
                onClick={() => window.location.href = '/personnel'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Personel Listesi
              </button>
            )}
          </div>

          {/* Genel İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Toplam Personel</p>
                  <p className="text-3xl font-bold">{generalStats.totalPersonnel}</p>
                </div>
                <Users size={32} className="text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Aktif Personel</p>
                  <p className="text-3xl font-bold">{generalStats.activePersonnel}</p>
                </div>
                <TrendingUp size={32} className="text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Pasif Personel</p>
                  <p className="text-3xl font-bold">{generalStats.inactivePersonnel}</p>
                </div>
                <FileText size={32} className="text-yellow-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">İşten Ayrılan</p>
                  <p className="text-3xl font-bold">{generalStats.terminatedPersonnel}</p>
                </div>
                <BarChart3 size={32} className="text-red-200" />
              </div>
            </div>
          </div>

          {/* Detay İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Globe className="text-blue-600 mr-2" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Ülke Çeşitliliği</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600">{generalStats.countriesCount}</p>
              <p className="text-gray-600">Farklı ülke</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Building className="text-green-600 mr-2" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Şirket Sayısı</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">{generalStats.companiesCount}</p>
              <p className="text-gray-600">Farklı şirket</p>
            </div>
          </div>

          {/* Ülke Bazlı Özet */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Globe className="mr-2" size={24} />
                Ülke Bazlı Personel Dağılımı
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ülke
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {countrySummary.map((country) => (
                    <tr 
                      key={country.country} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openCountryModal(country.country)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {country.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {country.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {country.active}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {country.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {country.terminated}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Şirket Bazlı Özet */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Building className="mr-2" size={24} />
                Şirket Bazlı Personel Dağılımı
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şirket
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companySummary.map((company) => (
                    <tr 
                      key={company.company} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openCompanyModal(company.company)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {company.active}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {company.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {company.terminated}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modaller */}
      <CountryDetailModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        country={selectedCountry}
        personnel={personnel}
      />
      
      <CompanyDetailModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        company={selectedCompany}
        personnel={personnel}
      />
    </div>
  );
}

export default function PersonnelReportsPage() {
  return (
    <Suspense fallback={
      <div 
        className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center"
        style={{ backgroundImage: "url('/arkaplan.jpg')" }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Rapor yükleniyor...</p>
        </div>
      </div>
    }>
      <PersonnelReportsContent />
    </Suspense>
  );
}
