# PWA (Progressive Web App) Kurulum Rehberi

## 📱 Android Tablet için Uygulama İndirme

Bu proje artık PWA (Progressive Web App) desteği ile geliyor! Android tabletlerinizde uygulama olarak kullanabilirsiniz.

### 🚀 Nasıl İndirilir?

1. **Chrome Browser'da Açın**
   - Android tabletinizde Chrome browser'ı açın
   - Kamp yönetim sisteminin web adresine gidin

2. **İndirme Butonunu Kullanın**
   - Sayfanın üst kısmında "📱 Uygulamayı İndir" butonunu göreceksiniz
   - Bu butona tıklayın

3. **Yükleme Onayı**
   - Chrome size uygulamayı yüklemek isteyip istemediğinizi soracak
   - "Yükle" seçeneğini seçin

4. **Ana Ekrana Eklendi**
   - Uygulama ana ekranınıza eklenecek
   - Artık normal bir uygulama gibi kullanabilirsiniz

### ✨ PWA Özellikleri

- **Offline Çalışma**: İnternet bağlantısı olmadığında bile temel işlevler çalışır
- **Hızlı Erişim**: Ana ekrandan tek tıkla açılır
- **Tam Ekran**: Browser çubuğu olmadan tam ekran deneyim
- **Otomatik Güncelleme**: Yeni özellikler otomatik olarak gelir

### 🔧 Teknik Detaylar

#### Eklenen Dosyalar:
- `public/manifest.json` - PWA manifest dosyası
- `public/sw.js` - Service Worker (offline çalışma için)
- `components/PWAInstallButton.tsx` - İndirme butonu component'i

#### Güncellenen Dosyalar:
- `app/layout.tsx` - PWA meta etiketleri eklendi
- `next.config.ts` - PWA için gerekli ayarlar
- `app/login/page.tsx` - İndirme butonu eklendi
- `app/dashboard/page.tsx` - İndirme butonu eklendi
- `app/personnel/page.tsx` - İndirme butonu eklendi

### 📋 Gereksinimler

- **Android 5.0+** (API level 21+)
- **Chrome Browser 67+**
- **HTTPS Bağlantısı** (production'da)

### 🛠️ Geliştirme Notları

#### Service Worker Özellikleri:
- Sayfa cache'leme
- Offline çalışma desteği
- Otomatik güncelleme

#### Manifest Özellikleri:
- Uygulama adı: "Kamp Yönetim Sistemi"
- Kısa ad: "Kamp Yönetimi"
- İkon: ANTTEQ logo
- Tema rengi: Siyah (#000000)
- Yönlendirme: Portrait (dikey)

### 🔄 Güncelleme

PWA'yı güncellemek için:
1. Uygulamayı kapatın
2. Chrome'da sayfayı yenileyin
3. Yeni sürüm otomatik olarak yüklenecek

### 🐛 Sorun Giderme

**İndirme butonu görünmüyor:**
- Chrome browser kullandığınızdan emin olun
- HTTPS bağlantısı olduğundan emin olun
- Sayfayı yenileyin

**Uygulama yüklenmiyor:**
- Tablet'inizde yeterli alan olduğundan emin olun
- Chrome'u güncelleyin
- Tekrar deneyin

### 📞 Destek

Herhangi bir sorun yaşarsanız, teknik ekiple iletişime geçin.
