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

  useEffect(() => {
    // PWA zaten yüklü mü kontrol et
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      setShowInstallButton(false); // Yüklüyse gizle
      return;
    }

    // Install prompt event'ini yakala
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    // PWA yüklendiğinde
    const handleAppInstalled = () => {
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
    if (!deferredPrompt) {
      // PWA desteklenmiyorsa bilgi ver
      alert('PWA yükleme özelliği bu cihazda desteklenmiyor. Android tablet ve Chrome browser kullanmayı deneyin.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Kullanıcı PWA yüklemeyi kabul etti');
    } else {
      console.log('Kullanıcı PWA yüklemeyi reddetti');
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
      title="Android tablet için uygulama olarak yükleyin"
    >
      📱 Uygulamayı İndir
    </button>
  );
}
