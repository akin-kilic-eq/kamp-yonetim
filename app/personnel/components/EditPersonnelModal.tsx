'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
}

interface JobTitle {
  _id: string;
  title: string;
  description: string;
  site: string;
}

interface Company {
  _id: string;
  name: string;
  description: string;
  site: string;
}

interface EditPersonnelModalProps {
  personnel: Personnel;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPersonnelModal({ personnel, onClose, onSuccess }: EditPersonnelModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    passportNumber: '',
    country: '',
    hireDate: '',
    jobTitle: '',
    company: '',
    status: 'active' as 'active' | 'inactive' | 'terminated'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    setFormData({
      firstName: personnel.firstName,
      lastName: personnel.lastName,
      employeeId: personnel.employeeId,
      passportNumber: personnel.passportNumber,
      country: personnel.country,
      hireDate: personnel.hireDate.split('T')[0], // Date input için format
      jobTitle: personnel.jobTitle,
      company: personnel.company,
      status: personnel.status
    });
    
    // Görev tanımları ve şirketleri yükle
    fetchJobTitlesAndCompanies();
  }, [personnel]);

  const fetchJobTitlesAndCompanies = async () => {
    try {
      setLoadingData(true);
      
      // Kullanıcının şantiye bilgisini al
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
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('EditPersonnelModal Debug - Sending Data:', formData);
      
      const response = await fetch(`/api/personnel/${personnel._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('EditPersonnelModal Debug - Response:', data);

      if (response.ok) {
        setSuccess(data.message || 'Personel başarıyla güncellendi');
        // Başarılı güncelleme sonrası form verilerini sıfırla
        setFormData({
          firstName: '',
          lastName: '',
          employeeId: '',
          passportNumber: '',
          country: '',
          hireDate: '',
          jobTitle: '',
          company: '',
          status: 'active'
        });
        setLoadingData(true);
        
        // 1 saniye sonra modal'ı kapat
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setError(data.error || 'Personel güncellenirken hata oluştu');
      }
    } catch (error) {
      setError('Personel güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Personel Düzenle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İsim *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyisim *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sicil Numarası *
            </label>
            <input
              type="text"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pasaport Numarası *
            </label>
            <input
              type="text"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ülke *
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İşe Giriş Tarihi *
            </label>
            <input
              type="date"
              name="hireDate"
              value={formData.hireDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Görev Tanımı *
            </label>
            {loadingData ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Yükleniyor...
              </div>
            ) : (
              <select
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Görev tanımı seçin</option>
                {jobTitles.map((jobTitle) => (
                  <option key={jobTitle._id} value={jobTitle.title}>
                    {jobTitle.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şirket *
            </label>
            {loadingData ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Yükleniyor...
              </div>
            ) : (
              <select
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Şirket seçin</option>
                {companies.map((company) => (
                  <option key={company._id} value={company.name}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durum
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="terminated">İşten Ayrıldı</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
