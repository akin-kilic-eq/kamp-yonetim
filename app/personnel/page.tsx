'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Upload, Trash } from 'lucide-react';
import AddPersonnelModal from './components/AddPersonnelModal';
import EditPersonnelModal from './components/EditPersonnelModal';
import ViewPersonnelModal from './components/ViewPersonnelModal';
import ImportPersonnelModal from './components/ImportPersonnelModal';
import DeleteAllPersonnelModal from './components/DeleteAllPersonnelModal';
import PWAInstallButton from '../../components/PWAInstallButton';

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
  site: string;
  status: 'active' | 'inactive' | 'terminated';
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [userSite, setUserSite] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [cache, setCache] = useState<Map<string, Personnel[]>>(new Map());
  const [isSearching, setIsSearching] = useState(false);

  // Debounce mekanizması - süreyi artırdık
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 800); // 800ms bekle - daha az API çağrısı

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPersonnel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      // Şantiye seçimini öncelik sırasıyla al: URL ?site= -> activeSite -> site
      const urlParams = new URLSearchParams(window.location.search);
      let siteFromUrl = urlParams.get('site');
      if (!siteFromUrl) {
        // Rapor sayfasından gelirken active site'ı lastActiveSite_<email> altında saklıyoruz
        const userStrTemp = sessionStorage.getItem('currentUser');
        if (userStrTemp) {
          try {
            const u = JSON.parse(userStrTemp);
            const lastActive = sessionStorage.getItem(`lastActiveSite_${u.email}`);
            if (lastActive) siteFromUrl = lastActive;
          } catch {}
        }
      }
      if (siteFromUrl) {
        params.append('site', siteFromUrl);
      } else {
        const userStr = sessionStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          const effectiveSite = user.activeSite || user.site;
          if (effectiveSite) {
            params.append('site', effectiveSite);
          }
        }
      }
      
      // Cache'i önlemek için timestamp ekle
      params.append('_t', Date.now().toString());
      
  
      
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
      }
    } catch (error) {
      console.error('Personel listesi getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Kullanıcının şantiye ve rol bilgisini al
    const urlParams = new URLSearchParams(window.location.search);
    let siteFromUrl = urlParams.get('site');
    if (!siteFromUrl) {
      const userStrTemp = sessionStorage.getItem('currentUser');
      if (userStrTemp) {
        try {
          const u = JSON.parse(userStrTemp);
          const lastActive = sessionStorage.getItem(`lastActiveSite_${u.email}`);
          if (lastActive) siteFromUrl = lastActive;
        } catch {}
      }
    }
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      const effectiveSite = siteFromUrl || user.activeSite || user.site || '';
      setUserSite(effectiveSite);
      setUserRole(user.role || '');
    }
    
    fetchPersonnel();
  }, [debouncedSearchTerm, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/personnel/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchPersonnel();
      } else {
        alert('Personel silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Personel silinirken hata oluştu');
    }
  };

  const handleDeleteAllPersonnel = async () => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) {
        alert('Kullanıcı oturumu bulunamadı');
        return;
      }
      
      const user = JSON.parse(userStr);
      const site = user.site;

      const response = await fetch(`/api/personnel?site=${site}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.deletedCount} personel başarıyla silindi`);
        fetchPersonnel();
        setShowDeleteAllModal(false);
      } else {
        alert('Personel silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Personel silinirken bir hata oluştu');
    }
  };

  // Düzenleme başarılı olduktan sonra listeyi güncelle
  const handleEditSuccess = async () => {

    setShowEditModal(false);
    setSelectedPersonnel(null);
    
    // Doğrudan API'yi çağır ve listeyi güncelle
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      // Kullanıcının şantiye bilgisini al
      const userStr = sessionStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.site) {
          params.append('site', user.site);
        }
      }
      
      // Cache'i önlemek için timestamp ekle
      params.append('_t', Date.now().toString());
      
  
      
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
      }
    } catch (error) {
      console.error('Liste yenileme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ekleme başarılı olduktan sonra listeyi güncelle
  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchPersonnel(); // Listeyi yeniden yükle
  };

  // İçe aktarma başarılı olduktan sonra listeyi güncelle
  const handleImportSuccess = () => {
    setShowImportModal(false);
    fetchPersonnel(); // Listeyi yeniden yükle
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'terminated': return 'İşten Ayrıldı';
      default: return status;
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arkaplan.jpg')" }}
    >
            <div className="container mx-auto px-1 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {userSite ? `${userSite} Personel Yönetimi` : 'Personel Yönetimi'}
            </h1>
            <div className="flex gap-2">
              <PWAInstallButton />
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
              >
                <Upload size={16} />
                Excel'den İçe Aktar
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
              >
                <Plus size={16} />
                Yeni Personel Ekle
              </button>
              {personnel.length > 0 && userRole === 'admin' && (
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
                >
                  <Trash size={16} />
                  Tümünü Sil
                </button>
              )}
            </div>
          </div>

      {/* Filtreler */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Personel ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="terminated">İşten Ayrıldı</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personel Listesi */}
      <div className="bg-white rounded-lg shadow">
        {/* Arama sonuç bilgisi */}
        {debouncedSearchTerm && !loading && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
            <p className="text-sm text-blue-700">
              "{debouncedSearchTerm}" araması için {personnel.length} sonuç bulundu
            </p>
          </div>
        )}
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Personel listesi yükleniyor...</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Personel
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Sicil No
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                    Pasaport No
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Ülke
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    İşe Giriş
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Görev
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Şirket
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Durum
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {personnel.map((person) => (
                  <tr key={person._id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {person.firstName} {person.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {person.employeeId}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {person.passportNumber}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {person.country}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(person.hireDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {person.jobTitle}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {person.company}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(person.status)}`}>
                        {getStatusText(person.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedPersonnel(person);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Görüntüle"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPersonnel(person);
                            setShowEditModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Düzenle"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(person._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {personnel.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {debouncedSearchTerm 
                    ? `"${debouncedSearchTerm}" araması için sonuç bulunamadı.` 
                    : 'Henüz personel kaydı bulunmuyor.'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

        </div>
      </div>

      {/* Modaller */}
      {showAddModal && (
        <AddPersonnelModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {showImportModal && (
        <ImportPersonnelModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {showDeleteAllModal && (
        <DeleteAllPersonnelModal
          onClose={() => setShowDeleteAllModal(false)}
          onConfirm={handleDeleteAllPersonnel}
          personnelCount={personnel.length}
        />
      )}

      {showEditModal && selectedPersonnel && (
        <EditPersonnelModal
          personnel={selectedPersonnel}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPersonnel(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {showViewModal && selectedPersonnel && (
        <ViewPersonnelModal
          personnel={selectedPersonnel}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPersonnel(null);
          }}
        />
      )}
    </div>
  );
}
