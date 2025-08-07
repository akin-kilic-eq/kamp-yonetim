'use client';

import { X, AlertTriangle } from 'lucide-react';

interface DeleteAllPersonnelModalProps {
  onClose: () => void;
  onConfirm: () => void;
  personnelCount: number;
}

export default function DeleteAllPersonnelModal({ onClose, onConfirm, personnelCount }: DeleteAllPersonnelModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-600">Tüm Personeli Sil</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Bu işlem geri alınamaz!
            </h3>
            <p className="text-sm text-gray-600">
              <strong>{personnelCount}</strong> personeli kalıcı olarak sileceksiniz.
              Bu işlem geri alınamaz ve tüm personel kayıtları kaybolacaktır.
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-red-800 mb-2">Dikkat:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Tüm personel kayıtları kalıcı olarak silinecek</li>
            <li>• Bu işlem geri alınamaz</li>
            <li>• Silinen veriler kurtarılamaz</li>
            <li>• Sadece mevcut şantiyenin personeli silinecek</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Tümünü Sil
          </button>
        </div>
      </div>
    </div>
  );
}
