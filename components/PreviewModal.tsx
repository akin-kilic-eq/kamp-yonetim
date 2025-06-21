import React from 'react';

interface PreviewModalProps {
  data: any[];
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  isLoading: boolean;
  type: 'rooms' | 'workers';
  progress?: number;
  currentItem?: number;
  totalItems?: number;
  successCount?: number;
  failureCount?: number;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  data,
  onConfirm,
  onCancel,
  onClose,
  isLoading,
  type,
  progress = 0,
  currentItem = 0,
  totalItems = 0,
  successCount = 0,
  failureCount = 0
}) => {
  const headers = type === 'workers' 
    ? ['Sicil No', 'Adı Soyadı', 'Kaldığı Oda', 'Çalıştığı Şantiye']
    : ['Oda No', 'Şantiyesi', 'Kapasite'];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">İçe Aktarma İşlemi Devam Ediyor</h3>
            <p className="text-sm text-gray-600">{type === 'workers' ? 'İşçiler' : 'Odalar'} içe aktarılıyor...</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            {currentItem} / {totalItems} tamamlandı ({progress}%)
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-auto max-h-[50vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={index}>
                    {type === 'workers' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Sicil No']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Adı Soyadı']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Kaldığı Oda']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Çalıştığı Şantiye']}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Oda No']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Şantiyesi']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item['Kapasite']}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              İçe Aktar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PreviewModal; 