'use client';

import { cache } from '@/app/lib/cache';

export default function TestCachePage() {
  const clearAllCache = () => {
    cache.clear();
    alert('Tüm cache temizlendi!');
  };

  const debugCache = () => {
    cache.debug();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cache Test Sayfası</h1>
      
      <div className="space-y-4">
        <button 
          onClick={clearAllCache}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Tüm Cache'i Temizle
        </button>
        
        <button 
          onClick={debugCache}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Cache Durumunu Göster (Console)
        </button>
      </div>
      
      <div className="mt-8">
        <p className="text-gray-600">
          Bu sayfa cache yönetimi için test amaçlıdır. 
          Report sayfasındaki doluluk oranları düzeltildi.
        </p>
      </div>
    </div>
  );
} 