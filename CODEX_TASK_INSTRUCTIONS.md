# LARİ Mobil Super-App UI/UX Revizyon Talimatı (Codex CLI için)

Bu görevde, `uygulamarevizyon.md` dosyasında belirtilen 6 bölümün tamamını eksiksiz olarak kodlayacaksın. Proje `C:\Projects\Randapp-LARI-PILOT3` dizinindedir.

---

### Bölüm 1: Üst Bar (Header) ve Navigasyon Revizyonu (`components/layouts/MobileAppShell.tsx`)
1. **Sol Üst İkon Değişikliği:**
   - Sol üstteki `Plus` (`+`) ikonunu kaldır.
   - Yerine `CalendarPlus` ikonunu (`w-6 h-6 stroke-[2.3]`) yerleştir. `aria-label="Hızlı Randevu Oluştur"`, `data-testid="header-quick-plus-btn"` korunsun.
   - Tıklandığında `onQuickPlusAction` çağrılsın.
2. **Orta Logo Alanı:**
   - Mor kare içindeki `L` harfi, `LARİ` metni ve `ChevronDown` kaldır.
   - Yerine `/brand/lari-symbol-only.svg` görseli yerleştir:
     ```tsx
     <img
       src="/brand/lari-symbol-only.svg"
       alt="LARİ"
       className="h-7 w-auto object-contain mx-auto"
       data-testid="header-brand-symbol"
     />
     ```
   - Çevresindeki `button` `data-testid="header-brand-center-btn"` kalsın.
3. **Tema Butonunun Kaldırılması:**
   - Sağ üstteki `header-theme-toggle-btn` (Güneş/Ay) butonunu header'dan tamamen kaldır.
4. **Bildirim Merkezi ve Notification Drawer:**
   - Yeni bileşen oluştur: `components/mobile/NotificationDrawer.tsx`
   - `MobileAppShell.tsx` içinde `header-notifications-btn` butonuna tıklandığında bu drawer açılsın (`notificationDrawerOpen` state).
   - Rozet (badge) okunmamış sayısını (örn. `3`) göstersin.
   - Drawer içinde:
     - Üst Kısım: "Son Randevularım / Tekrarla" yatay kartlar (işletme adı, hizmet, tarih, "Tekrarla" butonu).
     - Alt Kısım: Yaklaşan randevu hatırlatmaları, randevu onayları, kampanya bildirimleri + "Tümünü Okundu İşaretle" butonu.

---

### Bölüm 2: Anasayfa Arama, Konum ve Kategori İyileştirmeleri (`pages/mobile/b2c/MobileExploreMarketplacePage.tsx`)
1. **Arama Çubuğu & Mikrofon:**
   - Input alanı `flex-1`, sağ iç boşluk `pr-10` veya `pr-16`.
   - Mikrofon ikonu sağ tarafta sabit (`right-2` veya `right-8`).
   - `queryText` doluysa mikrofonun solunda temizleme `X` butonu gösterilsin (tıklandığında `setQueryText('')`).
2. **Konum / GPS Buton Çakışması:**
   - İlçe filtre butonları (`Etiler`, `Kadıköy`, `Bebek` vb.) sol tarafta `flex-1 overflow-x-auto no-scrollbar whitespace-nowrap` içinde yer alsın.
   - `GPS` butonu bu kaydırma kapsayıcısının DIŞINDA, sağ kenarda sabit (`shrink-0 ml-2`) konumlandırılsın.
3. **Sektör & Kategoriler Genişletme:**
   - Mevcut 6 kategoriye ek olarak: `Sağlık Turizmi`, `Tırnak & İpek Kirpik`, `Fizyoterapi & Rehabilitasyon`, `Diyetisyen & Beslenme`, `Veteriner & Pet Bakım`, `Pilates & Fitness` ekle.
   - Basit vektör çizgisel resimler yerine yüksek kaliteli gerçek fotoğraflar (Unsplash temalı URL'ler veya uygun CDN görselleri) kullan.
   - Her kartın alt kısmında metin okunurluğu için koyu gradient overlay (`bg-gradient-to-t from-black/80 via-black/40 to-transparent`) ve beyaz metin kullan.
   - "Tümünü Gör" / "Daha Az Gör" toggle'ı ekle.

---

### Bölüm 3: İşletme Detay Sayfası Hero Carousel (`components/mobile/b2c/MobileStorefrontDetailDrawer.tsx`)
1. **Hero Fotoğraf Galerisi (Carousel):**
   - Sayfanın en üstüne işletmenin fotoğraflarından oluşan tam genişlikli, yatay kaydırılabilir (`overflow-x-auto snap-x`) ve sayfa dot indicator içeren bir Kapak Fotoğraf Galerisi ekle (`VENUE_VISUAL_CATALOG` gallery fotoğraflarından).
2. **Aksiyon ve Avatar Yerleşimi:**
   - Geri (`<`), `Doğrulanmış Mağaza` rozeti ve Paylaş butonları fotoğrafın üst kısmında, SafeArea boşluğu ile yarı saydam yuvarlak arka planla (`bg-black/40 text-white backdrop-blur-md rounded-full w-9 h-9`) yerleştirilsin.
   - İşletme avatarı/logosu kapak fotoğrafının sol alt kenarına taşacak (`-bottom-6` veya overlap) şekilde yerleştirilsin.
   - Altında işletme adı, adres, puan ve çalışma durumu gelsin.
3. **Uzman Unvan Senkronizasyonu:**
   - Başlık ve alttaki uzman bilgisi tutarlı olsun (örn. `Dt. Selin Kaya`).

---

### Bölüm 4: Sosyal Akış Gönderi Aksiyonları (`pages/mobile/b2c/MobileExploreMarketplacePage.tsx`)
1. **Uzun Butonun Kaldırılması:**
   - Gönderi altındaki `"Bu İşlem İçin Hemen Randevu Al (...)"` tam genişlikli butonu kaldır.
2. **Satır İçi Hızlı Randevu İkonu:**
   - Etkileşim satırında: Kalp, Paylaş ikonlarının hemen yanına küçük (`w-5 h-5`) `CalendarPlus` ikonu ekle.
   - Tıklandığında `onOpenBookingSheet` çağrılarak ilgili işletme ve gönderideki `serviceTag` önseçili olarak açılsın.

---

### Bölüm 5: Profil Paneli Düzenlemeleri (`pages/mobile/MobileProfileSettingsPage.tsx`)
1. **Tek Butonlu Görünüm Modu (Tema):**
   - Yan yana `Güneş • Açık Mod` ve `Ay • Koyu Mod` butonlarını kaldır.
   - Tek bir akıllı toggle butonu yap (`data-testid="theme-mode-toggle-btn"` ve mevcut testlerin kırılmaması için `theme-light-btn` / `theme-dark-btn` data-testid desteğini de koru ya da testleri güncelle):
     - Koyu moddaysa Ay ikonu + "Koyu Mod (Ay) — Açık Moda Geç"
     - Açık moddaysa Güneş ikonu + "Açık Mod (Güneş) — Koyu Moda Geç"
2. **Çalışma Modu İkili Buton:**
   - Yan yana 2 buton: `Müşteri Modu` ve `Partner / İşletme Modu`.
   - Aktif mod primary (`bg-[#4F46E5] text-white`), pasif mod ikincil stil.
3. **Rol Seçimi Dropdown / Açılır Kutu:**
   - Başlık: "Kullanım Rolü".
   - Alt alta sıralanan butonlar yerine seçili rolü gösteren tek kutu + tıklandığında açılan açılır liste (dropdown / modal).

---

### Bölüm 6: Genel UI/UX ve Taşma Hataları
1. **Alt Navigasyon Barı Taşması:**
   - Tüm kaydırılabilir sayfalara (`MobileAppShell`, `MobileExploreMarketplacePage`, `MobileProfileSettingsPage` vb.) `pb-28` (`padding-bottom: 112px`) ekleyerek en alttaki kart ve butonların floating dock altında kalmamasını sağla.
2. **Sosyal Akış Kalp İkonu:**
   - Kalp butonuna `pl-1` ve `overflow-visible` ekle, sol kenar kesilmesini engelle.
3. **Testler ve Derleme:**
   - `scripts/test-mobile-superapp-e2e.mjs` ve `scripts/verify-mobile-m*.mjs` testlerini kontrol et ve gerekirse selektörleri güncelle.
   - Çalıştır: `npm run build` (ortamda `VITE_DATA_MODE=local` ayarlı olmalı).
