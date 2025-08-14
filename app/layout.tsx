import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kamp Yönetim Sistemi",
  description: "Kamp ve personel yönetim sistemi",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kamp Yönetimi",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/antteq-logo.png",
    apple: "/antteq-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <meta name="application-name" content="Kamp Yönetim Sistemi" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kamp Yönetimi" />
        <meta name="description" content="Kamp ve personel yönetim sistemi" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/antteq-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/antteq-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/antteq-logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/antteq-logo.png" color="#000000" />
        <link rel="shortcut icon" href="/antteq-logo.png" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker kaydı
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker başarıyla kaydedildi:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('Service Worker kaydı başarısız:', error);
                    });
                });
              }

              // Sayfa yenilendiğinde cache temizleme
              if (typeof window !== 'undefined') {
                // Performance Navigation API ile sayfa yenileme kontrolü
                if (performance.navigation.type === 1) {
                  console.log('Sayfa yenilendi, cache temizleniyor...');
                  // Session storage'dan cache verilerini temizle
                  const keysToRemove = [];
                  for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && (key.includes('cache') || key.includes('temp'))) {
                      keysToRemove.push(key);
                    }
                  }
                  keysToRemove.forEach(key => sessionStorage.removeItem(key));
                  
                  // Local storage'dan cache verilerini temizle
                  const localKeysToRemove = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('cache') || key.includes('temp'))) {
                      localKeysToRemove.push(key);
                    }
                  }
                  localKeysToRemove.forEach(key => localStorage.removeItem(key));
                }
                
                // Sayfa kapatılmadan önce cache temizleme
                window.addEventListener('beforeunload', function() {
                  console.log('Sayfa kapatılıyor, cache temizleniyor...');
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
