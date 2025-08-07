'use client';

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
  createdAt: string;
  createdBy: {
    email: string;
  };
}

interface ViewPersonnelModalProps {
  personnel: Personnel;
  onClose: () => void;
}

export default function ViewPersonnelModal({ personnel, onClose }: ViewPersonnelModalProps) {
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'terminated': return 'İşten Ayrıldı';
      default: return status;
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
          <h2 className="text-xl font-semibold">Personel Detayları</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl font-medium text-blue-600">
                {personnel.firstName.charAt(0)}{personnel.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {personnel.firstName} {personnel.lastName}
              </h3>
              <p className="text-sm text-gray-500">{personnel.jobTitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Sicil Numarası
              </label>
              <p className="text-sm text-gray-900">{personnel.employeeId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Pasaport Numarası
              </label>
              <p className="text-sm text-gray-900">{personnel.passportNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Ülke
              </label>
              <p className="text-sm text-gray-900">{personnel.country}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                İşe Giriş Tarihi
              </label>
              <p className="text-sm text-gray-900">
                {new Date(personnel.hireDate).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Şirket
              </label>
              <p className="text-sm text-gray-900">{personnel.company}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Durum
            </label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(personnel.status)}`}>
              {getStatusText(personnel.status)}
            </span>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Kayıt Tarihi
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(personnel.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Kaydeden
                </label>
                <p className="text-sm text-gray-900">{personnel.createdBy.email}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
