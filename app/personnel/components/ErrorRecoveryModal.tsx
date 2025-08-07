'use client';

import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, SkipForward, Edit3 } from 'lucide-react';

interface ExcelPersonnel {
  'İsim': string;
  'Soyisim': string;
  'Sicil No': string;
  'Pasaport No': string;
  'Ülke': string;
  'İşe Giriş Tarihi': string;
  'Görev Tanımı': string;
  'Şirket': string;
}

interface ImportError {
  personnel: ExcelPersonnel;
  error: string;
  index: number;
}

interface ErrorRecoveryModalProps {
  errors: ImportError[];
  onRetry: (errorIndex: number, correctedData: ExcelPersonnel) => Promise<void>;
  onSkip: (errorIndex: number) => void;
  onClose: () => void;
  successCount: number;
}

export default function ErrorRecoveryModal({ 
  errors, 
  onRetry, 
  onSkip, 
  onClose, 
  successCount 
}: ErrorRecoveryModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<ExcelPersonnel | null>(null);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);

  const handleEdit = (errorIndex: number) => {
    setEditingIndex(errorIndex);
    setEditedData({ ...errors[errorIndex].personnel });
  };

  const handleSave = async (errorIndex: number) => {
    if (!editedData) return;
    
    setRetryingIndex(errorIndex);
    try {
      await onRetry(errorIndex, editedData);
      setEditingIndex(null);
      setEditedData(null);
    } finally {
      setRetryingIndex(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedData(null);
  };

  const handleInputChange = (field: keyof ExcelPersonnel, value: string) => {
    if (editedData) {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">Import Hatalarını Düzelt</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {successCount} personel başarıyla eklendi
            </span>
          </div>
        </div>

        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              {errors.length} personel eklenirken hata oluştu
            </span>
          </div>
          <p className="text-sm text-orange-700">
            Hatalı personelleri düzeltebilir veya atlayabilirsiniz.
          </p>
        </div>

        <div className="space-y-4">
          {errors.map((error, index) => (
            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {error.personnel['İsim']} {error.personnel['Soyisim']}
                  </h3>
                  <p className="text-sm text-red-600 mt-1">
                    <strong>Hata:</strong> {error.error}
                  </p>
                </div>
                <div className="flex gap-2">
                  {editingIndex === index ? (
                    <>
                      <button
                        onClick={() => handleSave(index)}
                        disabled={retryingIndex === index}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {retryingIndex === index ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(index)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Edit3 size={14} />
                        Düzelt
                      </button>
                      <button
                        onClick={() => onSkip(index)}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-1"
                      >
                        <SkipForward size={14} />
                        Atla
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingIndex === index && editedData && (
                <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-white rounded border">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İsim
                    </label>
                    <input
                      type="text"
                      value={editedData['İsim']}
                      onChange={(e) => handleInputChange('İsim', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Soyisim
                    </label>
                    <input
                      type="text"
                      value={editedData['Soyisim']}
                      onChange={(e) => handleInputChange('Soyisim', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sicil No
                    </label>
                    <input
                      type="text"
                      value={editedData['Sicil No']}
                      onChange={(e) => handleInputChange('Sicil No', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pasaport No
                    </label>
                    <input
                      type="text"
                      value={editedData['Pasaport No']}
                      onChange={(e) => handleInputChange('Pasaport No', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ülke
                    </label>
                    <input
                      type="text"
                      value={editedData['Ülke']}
                      onChange={(e) => handleInputChange('Ülke', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İşe Giriş Tarihi
                    </label>
                    <input
                      type="text"
                      value={editedData['İşe Giriş Tarihi']}
                      onChange={(e) => handleInputChange('İşe Giriş Tarihi', e.target.value)}
                      placeholder="dd.mm.yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Görev Tanımı
                    </label>
                    <input
                      type="text"
                      value={editedData['Görev Tanımı']}
                      onChange={(e) => handleInputChange('Görev Tanımı', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şirket
                    </label>
                    <input
                      type="text"
                      value={editedData['Şirket']}
                      onChange={(e) => handleInputChange('Şirket', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {editingIndex !== index && (
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Sicil No:</span>
                    <span className="ml-2">{error.personnel['Sicil No']}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Pasaport No:</span>
                    <span className="ml-2">{error.personnel['Pasaport No']}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Ülke:</span>
                    <span className="ml-2">{error.personnel['Ülke']}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tarih:</span>
                    <span className="ml-2">{error.personnel['İşe Giriş Tarihi']}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
