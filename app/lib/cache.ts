interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache = new Map<string, CacheItem<any>>();
  private isPageRefreshed = false;

  constructor() {
    // Sayfa yenilendiğinde cache'i temizle
    if (typeof window !== 'undefined') {
      // Sayfa yüklendiğinde cache'i temizle
      window.addEventListener('load', () => {
        // Performance Navigation API ile sayfa yenilenip yenilenmediğini kontrol et
        if (performance.navigation.type === 1) {
          this.isPageRefreshed = true;
          this.clear();
          console.log('Sayfa yenilendi, cache temizlendi');
        }
      });

      // Sayfa kapatılmadan önce cache'i temizle
      window.addEventListener('beforeunload', () => {
        this.clear();
      });

      // Sayfa yenilendiğinde cache'i temizle
      window.addEventListener('unload', () => {
        this.clear();
      });

      // Sayfa yenilenip yenilenmediğini kontrol et
      if (performance.navigation.type === 1) {
        this.isPageRefreshed = true;
        this.clear();
      }

      // Sayfa yenileme tespiti için ek kontrol
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry && navigationEntry.type === 'reload') {
        this.isPageRefreshed = true;
        this.clear();
        console.log('Navigation API ile sayfa yenileme tespit edildi');
      }
    }
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // Default 5 minutes
    // Sayfa yenilendiyse cache'i temizle ve flag'i sıfırla
    if (this.isPageRefreshed) {
      this.clear();
      this.isPageRefreshed = false;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    // Sayfa yenilendiyse cache'i temizle
    if (this.isPageRefreshed) {
      this.clear();
      this.isPageRefreshed = false;
      return null;
    }

    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Belirli bir pattern'e uyan tüm cache'leri temizle
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Manuel cache temizleme (sayfa yenileme simülasyonu için)
  forceClear(): void {
    this.clear();
    this.isPageRefreshed = false;
    console.log('Cache manuel olarak temizlendi');
  }

  // Sayfa yenilenip yenilenmediğini kontrol et
  isRefreshed(): boolean {
    return this.isPageRefreshed;
  }

  // Global cache temizleme (tüm sayfalar için)
  static clearGlobalCache(): void {
    if (typeof window !== 'undefined') {
      // Session storage'dan cache ile ilgili verileri temizle
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('cache') || key.includes('temp'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Local storage'dan cache ile ilgili verileri temizle
      const localKeysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('temp'))) {
          localKeysToRemove.push(key);
        }
      }
      localKeysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Global cache temizlendi');
    }
  }

  // Debug için cache durumunu göster
  debug(): void {
    console.log('Cache durumu:');
    for (const [key, item] of this.cache.entries()) {
      const age = Date.now() - item.timestamp;
      const remaining = item.ttl - age;
      console.log(`${key}: ${remaining > 0 ? `${Math.round(remaining/1000)}s kaldı` : 'Süresi dolmuş'}`);
    }
    console.log(`Sayfa yenilendi mi: ${this.isPageRefreshed}`);
  }
}

export const cache = new Cache(); 