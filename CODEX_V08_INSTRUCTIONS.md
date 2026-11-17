# LARİ Mobil Super-App v0.8.0 Revizyon Talimatı (Codex CLI)

Proje: `C:\Projects\Randapp-LARI-PILOT3`
Not: `MobileProfileSettingsPage.tsx` ve `test-mobile-superapp-e2e.mjs` içindeki kilitli Partner butonu tarafımızca güncellendi, bunları bozma.

---

### 1. Ana Sayfa (`pages/mobile/b2c/MobileExploreMarketplacePage.tsx`) Çizilen 2 Alanın Kalıcı Çözümü
1. **Arama Çubuğu, Mikrofon & Sağ Butonların Sıkışması:**
   - Arama çubuğunun sağındaki `Filtre` ve `Harita` butonları şu an metinleriyle çok yer kaplayıp arama kutusunu daraltıyor ve sağ kenardan taşma/kesilme yapıyor.
   - `explore-filter-drawer-btn` ve `explore-radar-map-toggle` butonlarını **kompakt kare ikon butonlarına** (`h-[46px] w-[46px] shrink-0 justify-center p-0`, filtre aktifken üst köşede küçük sayı rozeti) çevir. `aria-label` ve `data-testid` aynen korunsun.
   - Arama kutusunun içindeki `Mic` ve `X` butonlarını `absolute` yerine **flex-row düzenine** al:
     - Kapsayıcı: `flex-1 min-w-0 flex items-center gap-2 rounded-2xl border-2 px-3 min-h-[46px]`
     - İçerik sırası: `<Search className="w-4 h-4 text-slate-500 shrink-0" />`, `<input className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none" ... />`, temizle `X` butonu (`shrink-0`, `queryText` doluysa görünür, `data-testid="explore-search-clear-btn"`), `<Mic>` butonu (`w-8 h-8 rounded-xl shrink-0`).
     - Bu sayede metin asla mikrofonun üzerine binmeyecek ve arama kutusu çok daha geniş görünecektir.
2. **Harita İlçe Filtreleri & Sabit GPS Çakışması:**
   - Harita üstündeki ilçe butonları satırında seçili ilçe (`pinnedItem.slug`) sıralamada **ilk sırada** olsun ki mor seçili buton sağ kenarda yarım kesilip `GPS` butonunun altında kalmış gibi görünmesin.
   - İlçe scroll kapsayıcısı: `flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-2`.
   - Sağdaki `GPS` butonu ayrı bir `shrink-0 pl-2.5 ml-1 border-l-2 border-slate-200 dark:border-slate-700` kapsayıcısı içinde yer alsın; böylece yatay scroll ile sabit GPS arasında net bir görsel ayrım oluşsun.

---

### 2. Tüm Uygulamada 1.000'lik Ücret Formatı (`tr-TR`)
- `MobileExploreMarketplacePage.tsx`, `MobileBookingBottomSheet.tsx`, `MobileStorefrontDetailDrawer.tsx`, `MobilePartnerPosAndInventoryPage.tsx`, `MobilePartnerAgendaAndInboxPage.tsx` ve diğer mobil sayfalardaki tüm para/fiyat/tutar gösterimlerini `.toLocaleString('tr-TR')` formatına çevir:
  - Örnek: `{priceMajor.toLocaleString('tr-TR')} TRY` -> `4.200 TRY`, `3.900 TRY`, `2.900 TRY`, `1.800 TRY`.

---

### 3. Partner Sayfasının LARİ Web İmkanlarıyla Efektif Hale Getirilmesi (`pages/mobile/partner/MobilePartnerAgendaAndInboxPage.tsx`)
- `MobilePartnerAgendaAndInboxPage.tsx` içindeki mevcut `Ajanda & Gelen Kutusu` yapısını koruyarak, en üstte `partner-daily-commission-card` kartının hemen altında **4 sekmeli İşletme Yönetim Merkezi** oluştur:
  1. **`Ajanda & Talepler`**: Mevcut randevu listesi, VIP/sessiz seans tercihleri, pasaport formülü ekleme + bekleyen erteleme/waitlist onay-red aksiyonları.
  2. **`Katalog & Hizmetler`**: `useMobileAppSession()` üzerinden `partnerCatalog` listesini göster, yeni hizmet/ürün ekleme (`addCatalogItem`) formu ve fiyat/süre özeti sun (tüm fiyatlar `.toLocaleString('tr-TR')`).
  3. **`Personel & Raporlar`**: İşletme uzman kadrosu (aktif/müsait toggle, prim oranı), günlük & haftalık ciro özeti, hizmet/ürün gelir dağılımı ve tahsilat yöntemleri özeti.
  4. **`Mağaza & %0 Komisyon`**: İşletme çalışma saatleri toggle'ı, doğrudan `%0 komisyon` mağaza vitrin linki kopyalama butonu ve müşteri vitrinine önizleme kartı.
- Mevcut `data-testid="mobile-partner-agenda-page"` ve `data-testid="partner-daily-commission-card"` test kimliklerini mutlaka koru.

---

### 4. Doğrulama
- Değişiklikleri yaptıktan sonra:
  1. `$env:VITE_DATA_MODE='local'; npm run build` çalıştır ve hatasız bittiğini doğrula.
  2. `npx tsx scripts\test-mobile-superapp-e2e.mjs` çalıştırıp tüm E2E testlerinin PASS olduğunu doğrula.
