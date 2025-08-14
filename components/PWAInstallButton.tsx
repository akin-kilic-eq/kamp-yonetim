'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(true); // Her zaman görünür
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // PWA zaten yüklü mü kontrol et
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      setShowInstallButton(false); // Yüklüyse gizle
      return;
    }

    // PWA desteğini kontrol et
    const checkPWASupport = () => {
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      setIsSupported(isChrome && (isAndroid || isIOS) && !isStandalone);
    };

    checkPWASupport();

    // Install prompt event'ini yakala
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('PWA install prompt yakalandı');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
      setIsSupported(true);
    };

    // PWA yüklendiğinde
    const handleAppInstalled = () => {
      console.log('PWA yüklendi');
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('PWA install butonuna tıklandı');
    console.log('deferredPrompt:', deferredPrompt);
    console.log('isSupported:', isSupported);
    
    if (!deferredPrompt) {
      if (isSupported) {
        // PWA destekleniyor ama prompt henüz gelmedi
        alert('PWA yükleme hazırlanıyor... Lütfen birkaç saniye bekleyin ve tekrar deneyin.');
      } else {
        // PWA desteklenmiyor
        alert('PWA yükleme özelliği bu cihazda desteklenmiyor. Android tablet ve Chrome browser kullanmayı deneyin.');
      }
      return;
    }

    try {
      console.log('PWA prompt tetikleniyor...');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Kullanıcı PWA yüklemeyi kabul etti');
        alert('PWA başarıyla yüklendi! Ana ekranınızda uygulamayı bulabilirsiniz.');
      } else {
        console.log('Kullanıcı PWA yüklemeyi reddetti');
        alert('PWA yükleme iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.');
      }
    } catch (error) {
      console.error('PWA yükleme hatası:', error);
      alert('PWA yükleme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm">
        ✅ Uygulama yüklendi
      </div>
    );
  }

  // Artık her zaman görünür, sadece PWA yüklüyse gizlenir
  if (!showInstallButton) {
    return (
      <button
        onClick={() => alert('PWA yükleme özelliği bu cihazda desteklenmiyor. Chrome browser kullanmayı deneyin.')}
        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
        title="PWA yükleme özelliği bu cihazda desteklenmiyor"
      >
        📱 PWA Desteklenmiyor
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
      title={`Android tablet için uygulama olarak yükleyin${isSupported ? ' (Destekleniyor)' : ' (Kontrol ediliyor...)'}`}
    >
      📱 Uygulamayı İndir
      {isSupported && <span className="text-xs">✓</span>}
    </button>
  );
}
