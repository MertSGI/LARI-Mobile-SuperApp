# LARİ Mobil Super-App v1.0.0 Revizyon Talimatı (Codex CLI)

Proje: `C:\Projects\Randapp-LARI-PILOT3`
Amaç: Ana sayfa hikayeler şeridini yumuşatmak, hikaye içi sağ/sol tıklamayla geçiş eklemek, işletme paneline Aylık / Son 3 Aylık ciro raporları, saat düzenleme, işletme fotoğrafı yükleme/silme ve topluluk akışına gönderi paylaşma yeteneklerini eklemek.

---

### 1. Hikayeler Şeridi & Hikaye İçi Navigasyon (`components/mobile/MobileStoryOnboarding.tsx`)
1. **Soft Arka Plan Uyumu:**
   - `mobile-story-reels-strip` arka planını gündüz modunda sert beyaz yerine üstten alta yumuşak geçişli (`bg-gradient-to-b from-white via-[#F4F6FF] to-[#F5F7FA] border-b border-indigo-100/80`) ve gece modunda (`bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800`) yap. Altındaki keşfet bölümüyle bütünleşsin.
2. **Hikaye İçi Sağ/Sol Tıklamayla Geçiş:**
   - Açılan `mobile-story-fullscreen-modal` içinde:
     - Fotoğraf/kart alanının üzerine sol (`w-1/3 left-0`) ve sağ (`w-2/3 right-0`) görünmez veya ince ok göstergeli dokunma bölgeleri ekle (`data-testid="story-tap-prev"` ve `data-testid="story-tap-next"`).
     - Sol tarafa tıklanınca bir önceki hikayeye geçsin (`Math.max(0, activeStoryIndex - 1)`).
     - Sağ tarafa tıklanınca bir sonraki hikayeye geçsin; son hikayeden sonra sağa tıklanırsa modalı kapatsın (`setActiveStoryIndex(null)`).
     - Ayrıca alt CTA butonlarının ve kapatma `X` butonunun tıklanmasını engellemeyecek `z-index` / yerleşim düzeni kullan.

---

### 2. İşletme Fotoğraf Galerisi & Sosyal Akış Paylaşımı (`contexts/MobileAppSessionContext.tsx`, `components/mobile/b2c/MobileStorefrontDetailDrawer.tsx`, `pages/mobile/b2c/MobileExploreMarketplacePage.tsx`)
1. **Context (`MobileAppSessionContext.tsx`):**
   - `customVenuePhotos: Record<string, string[]>` + `addVenuePhoto: (tenantSlug: string, photoUrl: string) => void` + `removeVenuePhoto: (tenantSlug: string, photoUrl: string) => void` ekle.
   - `customSocialPosts` + `publishSocialPost: (post: { tenantSlug: string; businessName: string; specialist: string; caption: string; serviceTag: string; photoUrl: string }) => void` ekle.
2. **Müşteri Vitrini & Sosyal Akış Entegrasyonu:**
   - `MobileStorefrontDetailDrawer.tsx` içinde `heroImages` hesaplanırken `customVenuePhotos[listing.slug]` fotoğraflarını da dahil et (en başa veya sona ekle).
   - `MobileExploreMarketplacePage.tsx` içindeki `Yapılan İşler • Topluluk Akışı` bölümünde `customSocialPosts` gönderilerini de sabit gönderilerin en üstünde göster!

---

### 3. Partner Paneli Geliştirmeleri (`pages/mobile/partner/MobilePartnerAgendaAndInboxPage.tsx`)
1. **Günlük / Haftalık / Aylık / Son 3 Aylık Ciro & Gelir Raporları (`staff_reports` sekmesi):**
   - `Ciro & Tahsilat Raporu` kartında:
     - 4 dönem seçici buton (`Günlük`, `Haftalık`, `Aylık`, `Son 3 Ay`) ekle (`data-testid="partner-revenue-period-${period}"`).
     - 2x2 grid içinde her zaman **Günlük (`12.450 TRY`)**, **Haftalık (`68.400 TRY`)**, **Aylık (`274.800 TRY`)** ve **Son 3 Aylık (`798.500 TRY`)** ciro özetlerini göster.
     - Seçili döneme göre alt kısımda **Hizmet Geliri**, **Ürün Geliri**, **Tahmini Net Gelir** ve **Tamamlanan Randevu** sayılarını dinamik güncelle (tüm rakamlar `.toLocaleString('tr-TR')`).
2. **Çalışma Saatlerini Düzenleyebilme (`storefront` sekmesi):**
   - `İşletme Çalışma Saatleri` bölümünde `Hafta İçi`, `Cumartesi`, `Pazar` için hem Açık/Kapalı toggle'ı hem de açıkken **Açılış (`<input type="time">`)** ve **Kapanış (`<input type="time">`)** saatlerini değiştirebilme özelliği ekle (`data-testid="partner-hours-open-${key}"`, `data-testid="partner-hours-close-${key}"`). Saat değişince toast göster.
3. **İşletme Fotoğrafı Ekleme / Silme & Topluluk Akışında Yayınlama (`storefront` sekmesi):**
   - `İşletme Fotoğraf Galerisi` kartı ekle:
     - Cihazdan fotoğraf yükleme (`<input type="file" accept="image/*" />` FileReader ile data URL okuma) ve örnek/hızlı fotoğraf URL'si ekleme seçeneği (`data-testid="partner-gallery-file-input"`, `data-testid="partner-gallery-add-url-btn"`).
     - Eklenen fotoğraflar küçük önizleme gridinde listelensin ve her birinin köşesinde **Sil (`Trash2`)** butonu olsun.
     - Opsiyonel **"Topluluk Akışında Paylaş"** formu/butonu ile seçili fotoğraf + kısa açıklama girilerek `publishSocialPost(...)` çağrılabilsin (`data-testid="partner-publish-social-post-btn"`).
4. **Hızlı Kampanya / İndirim Kodu Yönetimi (`storefront` sekmesi):**
   - İşletme tek dokunuşla bir kampanya rozeti/kuponu (örn. `LARİ15 • %15 İndirim`) aktif/pasif yapabilsin veya yeni kampanya ekleyebilsin.

---

### 4. Doğrulama & E2E
1. `npm run lint` — PASS
2. `$env:VITE_DATA_MODE='local'; npm run build` — PASS
3. `scripts/test-mobile-superapp-e2e.mjs` içine yeni eklenen:
   - Hikaye açma ve sağa tıklayarak sonraki hikayeye geçme (`story-tap-next`),
   - Partner Ciro raporunda `Aylık` / `Son 3 Ay` seçimi (`partner-revenue-period-monthly`, `partner-revenue-period-quarterly`),
   - Çalışma saati düzenleme ve fotoğraf ekleme/silme
   kontrollerini ekle ve hem iPhone 15 Pro hem Pixel 7 üzerinde E2E testlerini çalıştırıp tümünün PASS olduğunu doğrula.
