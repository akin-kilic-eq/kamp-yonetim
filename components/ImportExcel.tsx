import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';

interface ImportExcelProps {
  onImport: (data: any) => void;
  onPreview: (data: any) => void;
  isLoading: boolean;
  progress: number;
  type: 'rooms' | 'workers';
}

interface ExcelRoom {
  'Oda No': string | number;
  'Şantiyesi': string;
  'Kapasite': string | number;
}

interface ExcelWorker {
  'Sicil No': string | number;
  'Adı Soyadı': string;
  'Kaldığı Oda': string | number;
  'Çalıştığı Şantiye': string;
  'Odaya Giriş Tarihi'?: string;
}

const ImportExcel: React.FC<ImportExcelProps> = ({
  onImport,
  onPreview,
  isLoading,
  progress,
  type
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateExcelStructure = (data: any, sheetName: string) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`"${sheetName}" sayfası boş veya geçersiz formatta`);
    }

    const requiredColumnsRooms = ['Oda No', 'Şantiyesi', 'Kapasite'];
    const requiredColumnsWorkers = ['Sicil No', 'Adı Soyadı', 'Kaldığı Oda', 'Çalıştığı Şantiye'];

    const headers = Object.keys(data[0]);
    const requiredColumns = sheetName === 'Oda Detayları' ? requiredColumnsRooms : requiredColumnsWorkers;

    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`"${sheetName}" sayfasında eksik sütunlar: ${missingColumns.join(', ')}`);
    }

    return true;
  };

  const processExcel = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Her iki sayfayı da kontrol et
          const roomsSheet = workbook.Sheets['Oda Detayları'];
          const workersSheet = workbook.Sheets['İşçi Listesi'];
          
          if (!roomsSheet && !workersSheet) {
            throw new Error('"Oda Detayları" veya "İşçi Listesi" sayfası bulunamadı');
          }

          let roomsData: ExcelRoom[] = [];
          let workersData: ExcelWorker[] = [];

          // Odalar sayfasını işle
          if (roomsSheet) {
            roomsData = XLSX.utils.sheet_to_json(roomsSheet) as ExcelRoom[];
            validateExcelStructure(roomsData, 'Oda Detayları');
          }

          // İşçiler sayfasını işle
          if (workersSheet) {
            workersData = XLSX.utils.sheet_to_json(workersSheet) as ExcelWorker[];
            validateExcelStructure(workersData, 'İşçi Listesi');
          }

          // Hangi tipe göre veri gönderileceğini belirle
          if (type === 'rooms' && roomsData.length > 0) {
            onPreview(roomsData);
          } else if (type === 'workers' && workersData.length > 0) {
            onPreview(workersData);
          } else {
            throw new Error(`Seçilen türde (${type}) veri bulunamadı`);
          }
        } catch (error: any) {
          setError(error.message || 'Excel dosyası işlenirken bir hata oluştu');
        }
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      setError(error.message || 'Dosya okuma hatası');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(''); // Hata mesajını temizle
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                 file.type === "application/vnd.ms-excel")) {
      await processExcel(file);
    } else {
      setError('Lütfen geçerli bir Excel dosyası yükleyin (.xlsx veya .xls)');
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(''); // Hata mesajını temizle
    if (e.target.files && e.target.files[0]) {
      await processExcel(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleChange}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
      />

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-600">İçe Aktarılıyor... {progress}%</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-600">
              Excel dosyasını buraya sürükleyin veya
            </p>
            <button
              type="button"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleButtonClick}
            >
              Dosya Seçin
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportExcel; 