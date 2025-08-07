'use client';

import { useState, useRef } from 'react';
import { X, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

interface ImportJobTitlesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ExcelJobTitle {
  'Görev Tanımı': string;
  'Açıklama'?: string;
}

export default function ImportJobTitlesModal({ onClose, onSuccess }: ImportJobTitlesModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewData, setPreviewData] = useState<ExcelJobTitle[]>([]);
  const [existingJobTitles, setExistingJobTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateExcelStructure = (data: any) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Excel dosyası boş veya geçersiz formatta');
    }

    const requiredColumns = ['Görev Tanımı'];
    const headers = Object.keys(data[0]);

    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Eksik sütunlar: ${missingColumns.join(', ')}`);
    }

    return true;
  };

  const processExcel = async (file: File) => {
    try {
      setError('');
      
      // Önce mevcut görev tanımlarını getir
      await fetchExistingJobTitles();
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // İlk sayfayı al
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          if (!sheet) {
            throw new Error('Excel dosyasında sayfa bulunamadı');
          }

          const excelData = XLSX.utils.sheet_to_json(sheet) as ExcelJobTitle[];
          validateExcelStructure(excelData);
          
          // Boş satırları filtrele
          const filteredData = excelData.filter(row => 
            row['Görev Tanımı'] && 
            row['Görev Tanımı'].toString().trim() !== ''
          );

          if (filteredData.length === 0) {
            throw new Error('Geçerli görev tanımı bulunamadı');
          }

          // Duplicate kontrolü yap
          const duplicates: string[] = [];
          const uniqueData: ExcelJobTitle[] = [];
          const seenTitles = new Set<string>();

          filteredData.forEach(row => {
            const title = row['Görev Tanımı'].toString().trim();
            const titleLower = title.toLowerCase();
            
            // Excel içinde duplicate kontrolü
            if (seenTitles.has(titleLower)) {
              duplicates.push(title);
              return;
            }
            seenTitles.add(titleLower);
            
            // Mevcut görev tanımları ile duplicate kontrolü
            if (existingJobTitles.includes(titleLower)) {
              duplicates.push(title);
              return;
            }
            
            uniqueData.push(row);
          });

          if (duplicates.length > 0) {
            setError(`Aşağıdaki görev tanımları zaten mevcut veya Excel içinde tekrarlanıyor: ${duplicates.join(', ')}`);
            return;
          }

          setPreviewData(uniqueData);
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
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                 file.type === "application/vnd.ms-excel")) {
      await processExcel(file);
    } else {
      setError('Lütfen geçerli bir Excel dosyası yükleyin (.xlsx veya .xls)');
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processExcel(e.target.files[0]);
    }
  };

  const fetchExistingJobTitles = async () => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const site = user.site;

      const response = await fetch(`/api/job-titles?site=${site}`);
      if (response.ok) {
        const jobTitles = await response.json();
        const titles = jobTitles.map((jt: any) => jt.title.toLowerCase().trim());
        setExistingJobTitles(titles);
      }
    } catch (error) {
      console.error('Mevcut görev tanımları getirme hatası:', error);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setLoading(true);
    setProgress(0);

    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      const user = JSON.parse(userStr);
      const site = user.site;

      // Son bir kez daha mevcut görev tanımlarını kontrol et
      await fetchExistingJobTitles();

      // Her görev tanımını tek tek ekle
      for (let i = 0; i < previewData.length; i++) {
        const jobTitle = previewData[i];
        const title = jobTitle['Görev Tanımı'].toString().trim();
        const titleLower = title.toLowerCase();
        
        // Son kontrol: görev tanımı hala mevcut mu?
        if (existingJobTitles.includes(titleLower)) {
          throw new Error(`"${title}" görev tanımı zaten mevcut`);
        }
        
        const response = await fetch('/api/job-titles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title,
            description: jobTitle['Açıklama']?.toString().trim() || '',
            site,
            userEmail: user.email
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`"${title}" eklenirken hata: ${errorData.error || 'Bilinmeyen hata'}`);
        }

        // Başarılı ekleme sonrası mevcut listeye ekle
        setExistingJobTitles(prev => [...prev, titleLower]);

        // Progress güncelle
        setProgress(((i + 1) / previewData.length) * 100);
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'İçe aktarma sırasında hata oluştu');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Görev Tanımı': 'Örnek Görev 1',
        'Açıklama': 'Bu görev tanımının açıklaması'
      },
      {
        'Görev Tanımı': 'Örnek Görev 2',
        'Açıklama': 'İkinci görev tanımının açıklaması'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Görev Tanımları');
    
    XLSX.writeFile(wb, 'gorev_tanimlari_sablonu.xlsx');
  };

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
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Görev Tanımlarını Excel'den İçe Aktar</h2>
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

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Excel Dosyası Yükle</h3>
            <button
              onClick={downloadTemplate}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Şablon İndir
            </button>
          </div>

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
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-600">
              Excel dosyasını buraya sürükleyin veya
            </p>
            <button
              type="button"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              onClick={handleButtonClick}
            >
              Dosya Seçin
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Gerekli sütunlar: Görev Tanımı (zorunlu), Açıklama (opsiyonel)
            </p>
          </div>
        </div>

                 {previewData.length > 0 && (
           <div className="mb-6">
             <h3 className="text-lg font-medium mb-4">
               Önizleme ({previewData.length} görev tanımı)
             </h3>
             <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
               <p className="text-sm text-green-700">
                 ✅ Tüm görev tanımları benzersiz ve mevcut kayıtlarla çakışmıyor.
               </p>
             </div>
            
            {loading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">İçe Aktarılıyor... {Math.round(progress)}%</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Görev Tanımı</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-sm text-gray-900">
                        {item['Görev Tanımı']}
                      </td>
                      <td className="py-2 px-2 text-sm text-gray-600">
                        {item['Açıklama'] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
            onClick={handleImport}
            disabled={loading || previewData.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
          </button>
        </div>
      </div>
    </div>
  );
}
