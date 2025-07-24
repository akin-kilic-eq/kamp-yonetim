interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
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

  // Debug için cache durumunu göster
  debug(): void {
    console.log('Cache durumu:');
    for (const [key, item] of this.cache.entries()) {
      const age = Date.now() - item.timestamp;
      const remaining = item.ttl - age;
      console.log(`${key}: ${remaining > 0 ? `${Math.round(remaining/1000)}s kaldı` : 'Süresi dolmuş'}`);
    }
  }
}

export const cache = new Cache(); 