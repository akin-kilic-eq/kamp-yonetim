'use client';

import { useState, useEffect } from 'react';
import PWAInstallButton from '../../components/PWAInstallButton';

export default function PWATestPage() {
  const [pwaInfo, setPwaInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      isChrome: /Chrome/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port
    };
    
    setPwaInfo(info);
    console.log('PWA Debug Info:', info);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PWA Test Sayfası</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">PWA Durumu</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Chrome:</strong> {pwaInfo.isChrome ? '✅' : '❌'}
            </div>
            <div>
              <strong>Android:</strong> {pwaInfo.isAndroid ? '✅' : '❌'}
            </div>
            <div>
              <strong>iOS:</strong> {pwaInfo.isIOS ? '✅' : '❌'}
            </div>
            <div>
              <strong>Standalone:</strong> {pwaInfo.isStandalone ? '✅' : '❌'}
            </div>
            <div>
              <strong>Service Worker:</strong> {pwaInfo.hasServiceWorker ? '✅' : '❌'}
            </div>
            <div>
              <strong>Install Prompt:</strong> {pwaInfo.hasBeforeInstallPrompt ? '✅' : '❌'}
            </div>
            <div>
              <strong>Protocol:</strong> {pwaInfo.protocol}
            </div>
            <div>
              <strong>Hostname:</strong> {pwaInfo.hostname}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">PWA İndirme Butonu</h2>
          <div className="text-center">
            <PWAInstallButton />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Manuel PWA Test</h2>
          <div className="space-y-4">
            <button
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('SW registered:', registration);
                      alert('Service Worker başarıyla kaydedildi!');
                    })
                    .catch(error => {
                      console.log('SW registration failed:', error);
                      alert('Service Worker kaydı başarısız: ' + error.message);
                    });
                } else {
                  alert('Service Worker desteklenmiyor!');
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Service Worker Kaydet
            </button>
            
            <button
              onClick={() => {
                const manifest = document.querySelector('link[rel="manifest"]');
                if (manifest) {
                  console.log('Manifest link:', manifest);
                  alert('Manifest link bulundu: ' + manifest.getAttribute('href'));
                } else {
                  alert('Manifest link bulunamadı!');
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-2"
            >
              Manifest Kontrol Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
