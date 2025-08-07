'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, Upload } from 'lucide-react';
import JobTitleModal from './components/JobTitleModal';
import CompanyModal from './components/CompanyModal';
import ImportJobTitlesModal from './components/ImportJobTitlesModal';
import DeleteAllJobTitlesModal from './components/DeleteAllJobTitlesModal';

interface JobTitle {
  _id: string;
  title: string;
  description: string;
  site: string;
  createdAt: string;
  createdBy: {
    email: string;
  };
}

interface Company {
  _id: string;
  name: string;
  description: string;
  site: string;
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function PersonnelSettingsPage() {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobTitles' | 'companies'>('jobTitles');
  const [showJobTitleModal, setShowJobTitleModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showImportJobTitlesModal, setShowImportJobTitlesModal] = useState(false);
  const [showDeleteAllJobTitlesModal, setShowDeleteAllJobTitlesModal] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [userSite, setUserSite] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Kullanıcının şantiye ve rol bilgisini al
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserSite(user.site || '');
      setUserRole(user.role || '');
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const site = user.site;

      // Görev tanımlarını getir
      const jobTitlesResponse = await fetch(`/api/job-titles?site=${site}`);
      if (jobTitlesResponse.ok) {
        const jobTitlesData = await jobTitlesResponse.json();
        setJobTitles(jobTitlesData);
      }

      // Şirketleri getir
      const companiesResponse = await fetch(`/api/companies?site=${site}`);
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Veri getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJobTitle = async (id: string) => {
    if (!confirm('Bu görev tanımını silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/job-titles/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchData();
      } else {
        alert('Görev tanımı silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Görev tanımı silinirken hata oluştu');
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Bu şirketi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchData();
      } else {
        alert('Şirket silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Şirket silinirken hata oluştu');
    }
  };

  const handleDeleteAllJobTitles = async () => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) {
        alert('Kullanıcı oturumu bulunamadı');
        return;
      }

      const user = JSON.parse(userStr);
      const site = user.site;

      const response = await fetch(`/api/job-titles/delete-all?site=${site}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchData();
        setShowDeleteAllJobTitlesModal(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Görev tanımları silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      alert('Görev tanımları silinirken hata oluştu');
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/arkaplan.jpg')" }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings size={32} />
              {userSite ? `${userSite} Personel Ayarları` : 'Personel Ayarları'}
            </h1>
          </div>

          {/* Tab Menüsü */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('jobTitles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'jobTitles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Görev Tanımları
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'companies'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Çalışan Şirketler
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          ) : (
            <>
              {/* Görev Tanımları */}
              {activeTab === 'jobTitles' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Görev Tanımları</h2>
                    <div className="flex gap-2">
                      {jobTitles.length > 0 && userRole === 'admin' && (
                        <button
                          onClick={() => setShowDeleteAllJobTitlesModal(true)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          <Trash2 size={20} />
                          Tümünü Sil
                        </button>
                      )}
                      <button
                        onClick={() => setShowImportJobTitlesModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <Upload size={20} />
                        Excel'den İçe Aktar
                      </button>
                      <button
                        onClick={() => setShowJobTitleModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <Plus size={20} />
                        Yeni Görev Tanımı
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Görev Tanımı
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Açıklama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {jobTitles.map((jobTitle) => (
                          <tr key={jobTitle._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {jobTitle.title}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {jobTitle.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingJobTitle(jobTitle);
                                    setShowJobTitleModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteJobTitle(jobTitle._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {jobTitles.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Henüz görev tanımı bulunmuyor.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Şirketler */}
              {activeTab === 'companies' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Çalışan Şirketler</h2>
                    <button
                      onClick={() => setShowCompanyModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Plus size={20} />
                      Yeni Şirket
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Şirket Adı
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Açıklama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {companies.map((company) => (
                          <tr key={company._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {company.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {company.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCompany(company);
                                    setShowCompanyModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCompany(company._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {companies.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Henüz şirket bulunmuyor.</p>
                      </div>
                    )}
                  </div>
                </div>
                             )}
             </>
           )}
         </div>
       </div>

       {/* Modaller */}
       {showJobTitleModal && (
         <JobTitleModal
           jobTitle={editingJobTitle}
           onClose={() => {
             setShowJobTitleModal(false);
             setEditingJobTitle(null);
           }}
           onSuccess={() => {
             setShowJobTitleModal(false);
             setEditingJobTitle(null);
             fetchData();
           }}
         />
       )}

       {showImportJobTitlesModal && (
         <ImportJobTitlesModal
           onClose={() => {
             setShowImportJobTitlesModal(false);
           }}
           onSuccess={() => {
             setShowImportJobTitlesModal(false);
             fetchData();
           }}
         />
       )}

       {showDeleteAllJobTitlesModal && (
         <DeleteAllJobTitlesModal
           jobTitlesCount={jobTitles.length}
           onClose={() => {
             setShowDeleteAllJobTitlesModal(false);
           }}
           onConfirm={handleDeleteAllJobTitles}
         />
       )}

       {showCompanyModal && (
         <CompanyModal
           company={editingCompany}
           onClose={() => {
             setShowCompanyModal(false);
             setEditingCompany(null);
           }}
           onSuccess={() => {
             setShowCompanyModal(false);
             setEditingCompany(null);
             fetchData();
           }}
         />
       )}
     </div>
   );
 }
