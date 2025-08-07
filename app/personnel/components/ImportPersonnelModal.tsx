'use client';

import { useState, useRef } from 'react';
import { X, Upload, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import ErrorRecoveryModal from './ErrorRecoveryModal';

interface ImportPersonnelModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultSite?: string;
}

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

interface DuplicateInfo {
  type: 'employeeId' | 'passportNumber';
  value: string;
  existingPersonnel: string;
}

interface ImportError {
  personnel: ExcelPersonnel;
  error: string;
  index: number;
}

export default function ImportPersonnelModal({ onClose, onSuccess, defaultSite }: ImportPersonnelModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewData, setPreviewData] = useState<ExcelPersonnel[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
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

    const requiredColumns = ['İsim', 'Soyisim', 'Sicil No', 'Pasaport No', 'Ülke', 'İşe Giriş Tarihi', 'Görev Tanımı', 'Şirket'];
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
      setDuplicates([]);
      
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

          const excelData = XLSX.utils.sheet_to_json(sheet) as ExcelPersonnel[];
          validateExcelStructure(excelData);
          
          // Boş satırları filtrele ve tarih formatını düzelt
          const filteredData = excelData.filter(row => 
            row['İsim'] && row['Soyisim'] && row['Sicil No'] && row['Pasaport No'] &&
            row['İsim'].toString().trim() !== '' && 
            row['Soyisim'].toString().trim() !== '' &&
            row['Sicil No'].toString().trim() !== '' &&
            row['Pasaport No'].toString().trim() !== ''
          ).map(row => ({
            ...row,
            'İşe Giriş Tarihi': formatExcelDate(row['İşe Giriş Tarihi'])
          }));

          if (filteredData.length === 0) {
            throw new Error('Geçerli personel kaydı bulunamadı');
          }

          // Mevcut personel verilerini kontrol et
          await checkDuplicates(filteredData);
          
          setPreviewData(filteredData);
        } catch (error: any) {
          setError(error.message || 'Excel dosyası işlenirken bir hata oluştu');
        }
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      setError(error.message || 'Dosya okuma hatası');
    }
  };

  // Excel tarih formatını düzelt
  const formatExcelDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    const dateStr = dateValue.toString().trim();
    
    // Eğer zaten tarih formatındaysa (dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd)
    if (typeof dateValue === 'string' && (dateStr.includes('.') || dateStr.includes('/') || dateStr.includes('-'))) {
      // Tarih formatını doğrula ve düzelt
      if (dateStr.includes('.')) {
        const [day, month, year] = dateStr.split('.');
        const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Geçerli tarih kontrolü
        if (!isNaN(parsedDate.getTime())) {
          return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
        }
      }
      return dateStr;
    }
    
    // Excel sayı formatındaysa (örn: 45383)
    const excelNumber = parseFloat(dateStr);
    if (!isNaN(excelNumber) && excelNumber > 1000) {
      // Excel'in 1900-01-01'den itibaren gün sayısı
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (excelNumber - 2) * 24 * 60 * 60 * 1000);
      
      // Türkçe tarih formatına çevir (dd.mm.yyyy)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}.${month}.${year}`;
    }
    
    // Diğer durumlar için orijinal değeri döndür
    return dateStr;
  };

  const checkDuplicates = async (data: ExcelPersonnel[]) => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const site = defaultSite || user.site;

      const response = await fetch(`/api/personnel?site=${site}`);
      if (response.ok) {
        const existingPersonnel = await response.json();
        const duplicateInfo: DuplicateInfo[] = [];

        data.forEach(row => {
          const employeeId = row['Sicil No'].toString().trim();
          const passportNumber = row['Pasaport No'].toString().trim();

          // Sicil no kontrolü
          const existingByEmployeeId = existingPersonnel.find((p: any) => 
            p.employeeId === employeeId
          );
          if (existingByEmployeeId) {
            duplicateInfo.push({
              type: 'employeeId',
              value: employeeId,
              existingPersonnel: `${existingByEmployeeId.firstName} ${existingByEmployeeId.lastName}`
            });
          }

          // Pasaport no kontrolü
          const existingByPassport = existingPersonnel.find((p: any) => 
            p.passportNumber === passportNumber
          );
          if (existingByPassport) {
            duplicateInfo.push({
              type: 'passportNumber',
              value: passportNumber,
              existingPersonnel: `${existingByPassport.firstName} ${existingByPassport.lastName}`
            });
          }
        });

        setDuplicates(duplicateInfo);
      }
    } catch (error) {
      console.error('Duplicate kontrolü hatası:', error);
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

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setLoading(true);
    setProgress(0);
    setImportErrors([]);
    setSuccessCount(0);

    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      const user = JSON.parse(userStr);
      const errors: ImportError[] = [];

      // Her personeli tek tek ekle
      for (let i = 0; i < previewData.length; i++) {
        const personnel = previewData[i];
        
        try {
          const response = await fetch('/api/personnel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstName: personnel['İsim'].toString().trim(),
              lastName: personnel['Soyisim'].toString().trim(),
              employeeId: personnel['Sicil No'].toString().trim(),
              passportNumber: personnel['Pasaport No'].toString().trim(),
              country: personnel['Ülke'].toString().trim(),
              hireDate: personnel['İşe Giriş Tarihi'].toString().trim(),
              jobTitle: personnel['Görev Tanımı'].toString().trim(),
              company: personnel['Şirket'].toString().trim(),
              userEmail: user.email,
              site: defaultSite || user.site
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            errors.push({
              personnel,
              error: errorData.error || 'Bilinmeyen hata',
              index: i
            });
          } else {
            setSuccessCount(prev => prev + 1);
          }
        } catch (error: any) {
          errors.push({
            personnel,
            error: error.message || 'Bilinmeyen hata',
            index: i
          });
        }

        // Progress güncelle
        setProgress(((i + 1) / previewData.length) * 100);
      }

      // Hata varsa kurtarma ekranını göster
      if (errors.length > 0) {
        setImportErrors(errors);
        setShowErrorRecovery(true);
      } else {
        // Tüm personeller başarıyla eklendiyse
        onSuccess();
      }
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
        'İsim': 'Ahmet',
        'Soyisim': 'Yılmaz',
        'Sicil No': '12345',
        'Pasaport No': 'A12345678',
        'Ülke': 'Türkiye',
        'İşe Giriş Tarihi': '01.01.2024',
        'Görev Tanımı': 'Mühendis',
        'Şirket': 'ANTTEQ'
      },
      {
        'İsim': 'Ayşe',
        'Soyisim': 'Demir',
        'Sicil No': '12346',
        'Pasaport No': 'B87654321',
        'Ülke': 'Türkiye',
        'İşe Giriş Tarihi': '15.01.2024',
        'Görev Tanımı': 'Teknisyen',
        'Şirket': 'ANTTEQ'
      },
      {
        'İsim': 'Mehmet',
        'Soyisim': 'Kaya',
        'Sicil No': '12347',
        'Pasaport No': 'C98765432',
        'Ülke': 'Türkiye',
        'İşe Giriş Tarihi': '45383',
        'Görev Tanımı': 'Usta',
        'Şirket': 'ANTTEQ'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personel Listesi');
    
    XLSX.writeFile(wb, 'personel_sablonu.xlsx');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getDuplicateWarning = (employeeId: string, passportNumber: string) => {
    const employeeIdDuplicate = duplicates.find(d => d.type === 'employeeId' && d.value === employeeId);
    const passportDuplicate = duplicates.find(d => d.type === 'passportNumber' && d.value === passportNumber);
    
    if (employeeIdDuplicate && passportDuplicate) {
      return `Sicil No (${employeeId}) ve Pasaport No (${passportNumber}) zaten mevcut`;
    } else if (employeeIdDuplicate) {
      return `Sicil No (${employeeId}) zaten mevcut`;
    } else if (passportDuplicate) {
      return `Pasaport No (${passportNumber}) zaten mevcut`;
    }
    return null;
  };

  const handleRetryPersonnel = async (errorIndex: number, correctedData: ExcelPersonnel) => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      const user = JSON.parse(userStr);
      
      const response = await fetch('/api/personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: correctedData['İsim'].toString().trim(),
          lastName: correctedData['Soyisim'].toString().trim(),
          employeeId: correctedData['Sicil No'].toString().trim(),
          passportNumber: correctedData['Pasaport No'].toString().trim(),
          country: correctedData['Ülke'].toString().trim(),
          hireDate: correctedData['İşe Giriş Tarihi'].toString().trim(),
          jobTitle: correctedData['Görev Tanımı'].toString().trim(),
          company: correctedData['Şirket'].toString().trim(),
          userEmail: user.email
        }),
      });

      if (response.ok) {
        // Başarılı olan hatayı listeden kaldır
        setImportErrors(prev => prev.filter((_, index) => index !== errorIndex));
        setSuccessCount(prev => prev + 1);
        
        // Tüm hatalar düzeltildiyse modal'ı kapat
        if (importErrors.length === 1) {
          setShowErrorRecovery(false);
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      // Hata mesajını güncelle
      setImportErrors(prev => prev.map((err, index) => 
        index === errorIndex 
          ? { ...err, error: error.message || 'Bilinmeyen hata' }
          : err
      ));
    }
  };

  const handleSkipPersonnel = (errorIndex: number) => {
    // Hatayı listeden kaldır
    setImportErrors(prev => prev.filter((_, index) => index !== errorIndex));
    
    // Tüm hatalar atlandıysa modal'ı kapat
    if (importErrors.length === 1) {
      setShowErrorRecovery(false);
      onSuccess();
    }
  };

  const handleCloseErrorRecovery = () => {
    setShowErrorRecovery(false);
    onSuccess();
  };

  return (
    <div 
      className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Personel Excel'den İçe Aktar</h2>
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

        {duplicates.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h4 className="text-sm font-medium text-yellow-800">Uyarı: Çakışan Kayıtlar Bulundu</h4>
            </div>
            <p className="text-sm text-yellow-700">
              Bazı sicil no veya pasaport no değerleri mevcut kayıtlarla çakışıyor. 
              Bu kayıtlar yine de eklenebilir, ancak listede uyarı gösterilecek.
            </p>
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
               Gerekli sütunlar: İsim, Soyisim, Sicil No, Pasaport No, Ülke, İşe Giriş Tarihi, Görev Tanımı, Şirket
             </p>
             <p className="mt-1 text-xs text-blue-600">
               💡 Tarih formatı: dd.mm.yyyy veya Excel sayı formatı (örn: 45383 = 01.04.2024)
             </p>
          </div>
        </div>

        {previewData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">
              Önizleme ({previewData.length} personel)
            </h3>
            
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

            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Personel</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Sicil No</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Pasaport No</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Ülke</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">İşe Giriş</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Görev</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Şirket</th>
                    <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, index) => {
                    const warning = getDuplicateWarning(
                      item['Sicil No'].toString().trim(),
                      item['Pasaport No'].toString().trim()
                    );
                    
                    return (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['İsim']} {item['Soyisim']}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['Sicil No']}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['Pasaport No']}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['Ülke']}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['İşe Giriş Tarihi']}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['Görev Tanımı']}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900">
                          {item['Şirket']}
                        </td>
                        <td className="py-2 px-2 text-sm">
                          {warning ? (
                            <div className="relative group">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full cursor-help">
                                ⚠️ Uyarı
                              </span>
                              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                {warning}
                                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ✅ Hazır
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
                         {loading ? 'İçe Aktarılıyor...' : `İçe Aktar (${previewData.length} personel)`}
          </button>
        </div>
      </div>

      {/* Hata Kurtarma Modal'ı */}
      {showErrorRecovery && (
        <ErrorRecoveryModal
          errors={importErrors}
          onRetry={handleRetryPersonnel}
          onSkip={handleSkipPersonnel}
          onClose={handleCloseErrorRecovery}
          successCount={successCount}
        />
      )}
    </div>
  );
}
