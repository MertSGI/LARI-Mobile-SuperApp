# LARİ Mobile Super-App — Sohbet Geçmişi, Mimari Hafıza & Proje Devam Kılavuzu

> **Bu Dosyanın Amacı:** Önceki çalışma dizini (`C:\Projects\Randapp-LARI-PILOT3` / `gemini-code-*`) üzerindeki tüm mobil uygulama geliştirme sohbetinin bağlamını, tasarım vizyonunu, kod mimarisini, sürüm geçmişini ve bekleyen sonraki fazları **sıfır bağlam kaybıyla** bu izole projeye (`C:\Projects\LARI-Mobile-SuperApp`) aktarmaktır.
> Yeni bir sohbette bu projeyi açan ajan önce bu dosyayı okumalı ve tüm kararlara uyarak kaldığı yerden devam etmelidir.

---

## 1. Proje Kimliği & GitHub Yapısı
* **Ana Çalışma Dizini:** `C:\Projects\LARI-Mobile-SuperApp`
* **Aktif Branch:** `feat/lari-mobile-superapp` (Son baz commit: `93543c7` — v1.1.0)
* **Birincil Remote (`origin`):** `https://github.com/MertSGI/LARI-Mobile-SuperApp.git`
* **Ana Web Repo Remote (`randapp-main`):** `https://github.com/MertSGI/Randapp-main.git` *(Not: Bu proje web/AutoDev süreçlerinden izole tutulmalıdır; push ve APK release süreçleri öncelikle `LARI-Mobile-SuperApp` üzerinden yürütülür).*
* **Paket / Uygulama Kimliği:** `com.randevulari.app` (React + Vite + Tailwind + Capacitor Android)

---

## 2. Vizyon & Temel Tasarım İlkeleri (Kullanıcı Kararları)
1. **Çok Sektörlü Süper-Uygulama ("Her Kesime Hitap Eden Sosyal + Randevu Ekosistemi"):**
   - Yalnızca güzellik/kuaför değil; oto bakım & servis (*"araba tamircisi bile kullanmayı tercih etmeli"*), diş & klinik, berber, medikal estetik, spa/longevity, sağlık turizmi, fizyoterapi, diyetisyen, veteriner, tırnak, pilates vb. tüm sektörleri kapsar.
2. **Instagram + Kurumsal Güçlü Çerçeve Estetiği:**
   - **Alt Navigasyon Barı:** Instagram esintili yüzen buzlu cam pill dock (`MobileAppShell.tsx`), ikon-only + 5. slotta kullanıcı avatarı (`MÖ`), aşağı kaydırınca gizlenen / yukarı veya durunca açılan yapı. Tüm ekranlarda alt dock çakışmasını önlemek için `pb-28` (`112px`) alt pay bırakılır.
   - **Kart Sistemi & Bütünlük:** `rounded-3xl`, `border-2`, belirgin kurumsal çerçeveler (`#4F46E5`, `#1D1352 → #3B23C4` mor degrade, `#16CFD1 → #15B89B` teal vurgu). Bütün sayfalarda kart ve tipografi dili tutarlı tutulur.
   - **Tema:** Güneş (Açık Mod — varsayılan) & Ay (Koyu Mod) — Profil panelinde tek akıllı toggle butonuyla yönetilir (üst bardan tema butonu kaldırılmıştır).
   - **Ücret Formatı:** Binlik ayırıcılar daima `tr-TR` noktalı gösterilir (`4.200 TRY`, `3.900 TRY`, `1.490 TRY` — asla `4200` değil).
3. **Rol İzolasyonu & Yetki Kuralları:**
   - Varsayılan açılış: Müşteri hesabı müşteri modunda açılır; Partner ile giriş yapıldıysa Partner modunda açılır.
   - Partner olmayan müşterilerde **Partner / İşletme Modu** butonu görünür ama **soluk ve kilitlidir** (`opacity-45` + kilit ikonu); tıklandığında Partner Satış/Önizleme/Kurulum hunisi açılır.
   - Yetkili Partner hesabı **hem Müşteri hem Partner** modunu kullanabilir ama iki deneyim asla birbirine karışmaz.
4. **3 Saniyede Hızlı Randevu & İptal Kuralları:**
   - İkram & sessiz seans tercihi randevuda **isteğe bağlı** (varsayılan kapalı) açılır/kapanır alandır.
   - Tarih şeridiyle bugün, yarın ve sağ/sol oklarla ileriki günler + **"Takvimden Seç"** seçilebilir.
   - İptal işleminde *4 saat öncesi ücretsiz iptal / no-show kuralları* gösterilir ve **"İptal Etmek İstediğinize Emin misiniz?"** onay penceresi açılır.
5. **Marka Logosu:**
   - APK başlatıcı ikonu ve Splash ekranları `public/brand/` altındaki **opak mor degrade + beyaz L&yay + turkuaz noktalı** logoyu kullanır (`scripts/generate-lari-brand-icons.mjs`).
   - Üst bar ortasında metinsiz sembol, gündüz modunda da belirgin olması için mor degrade kapsül içindedir.

---

## 3. Sürüm Geçmişi (v0.4 → v1.1.0)
* **v0.4 – v0.5:** Instagram hikayeler şeridi, kaydırmaya duyarlı buzlu cam bottom dock, Google Maps + Place ID entegrasyonu, oto servis desteği, 3sn hızlı randevu.
* **v0.6.0 (`v0.6.0-qr-voice-catalog`):** Domain ikonları, Güneş/Ay tema, kriptografik QR Müşteri Kabul & Paket Check-in & İsteğe bağlı Bahşişli Ödeme QR ekosistemi (`lariQrEcosystemService.ts`), Sesli Katalog Eşleştirme (`voiceCatalogMatcherService.ts`), Fiyat Dökümü, Sağlık Turizmi Konsiyerji, Sosyal Showcase Akışı.
* **v0.7.0 (`v0.7.0-ui-revision`):** Opak marka APK & splash ikonu, üst barda `CalendarPlus` + metinsiz sembol, `NotificationDrawer` (*Son Randevularım / Tekrarla*), arama mikrofon hizalama + X temizleme, 12 gerçek fotoğraflı sektör kategorisi, sabit GPS, Storefront Hero Carousel, sosyal akış satır içi hızlı randevu, Profil paneli tek tema/ikili mod/rol dropdown, alt bar taşma düzeltmesi.
* **v0.7.1 (`v0.7.1-polish`):** Gündüz/gece uyumlu yüksek kontrastlı üst orta logo kapsülü, randevu çoklu gün + takvim tarih seçici, müşteri `bookingHistory` (*Tümü/Aktif/Geçmiş*), Bento Profil tasarımı & akordiyon ayarlar.
* **v0.8.0 (`v0.8.0-partner-hub`):** Arama flex-row + kompakt kare Filtre/Harita ikonları, seçili ilçe başa alınarak GPS ayırıcı çizgisi, müşteri hesabında soluk/kilitli Partner butonu, `tr-TR` binlik ücret formatı, 4 sekmeli Partner Yönetim Merkezi.
* **v0.9.0 (`v0.9.0-partner-crud`):** Partner tam CRUD (Ajanda walk-in ekleme/silme, talep temizleme, katalog düzenleme/silme, personel ekleme/silme, POS stok `+/-/silme`).
* **v1.0.0 (`v1.0.0-story-analytics-gallery`):** Soft hikayeler gradyan zemini, hikaye içi sağa/sola dokunma geçişi, Günlük/Haftalık/Aylık/Son 3 Aylık ciro analizi, düzenlenebilir çalışma saatleri (`input[type="time"]`), işletme fotoğrafı yükleme/silme + Vitrin & Topluluk Akışı senkronu, hızlı kampanya/kupon yönetimi.
* **v1.1.0 (`v1.1.0-partner-ecosystem`):** Rezervasyon iptal kuralları & *"Emin misiniz?"* onay modalı; 4 adımlı Partner Satış, Canlı İşletme Önizleme, `planService` senkronlu Aylık/Yıllık Abonelik Paketi Seçimi & Hızlı Kurulum Sihirbazı (`MobilePartnerOnboardingFunnel.tsx`); Ana Sayfa Partner Davet Kartı.

---

## 4. Temel Dosya Haritası
* `pages/mobile/MobileSuperAppPage.tsx` — Ana kabuk yönlendirici, rol/mod politikası, modal orkestrasyonu
* `components/layouts/MobileAppShell.tsx` — Üst bar (logo + hızlı randevu + bildirimler) & buzlu cam alt dock
* `components/mobile/MobileStoryOnboarding.tsx` — Hikayeler şeridi & tam ekran hikaye okuyucu (sağ/sol dokunma geçişli)
* `components/mobile/NotificationDrawer.tsx` — Bildirim merkezi & Son Randevularım / Tekrarla
* `contexts/MobileAppSessionContext.tsx` — Ortak mobil oturum durumu (tema, `bookingHistory`, QR, katalog CRUD, galeri, sosyal akış, `partnerSubscription`)
* `pages/mobile/b2c/MobileExploreMarketplacePage.tsx` — Ana keşfet, arama, 12 kategori, Google Maps, işletmeler, Partner davet kartı, Sosyal Akış
* `components/mobile/b2c/MobileStorefrontDetailDrawer.tsx` — İşletme vitrini (Hero Carousel, hizmetler, uzmanlar, önizleme)
* `components/mobile/b2c/MobileBookingBottomSheet.tsx` — 3sn Hızlı Randevu, çoklu gün & takvim seçimi, isteğe bağlı ikram
* `pages/mobile/b2c/MobileCustomerWalletPage.tsx` — Canlı randevu QR, Paket QR, Fiyat Dökümü & Bahşişli QR Ödeme, Tüm Randevularım, İptal Kuralları & Onay Modalı, Pasaport, Sadakat
* `pages/mobile/b2c/MobileAIStyleVisualizerPage.tsx` — AI Önce/Sonra stil stüdyosu
* `pages/mobile/b2c/MobileHealthTourismConciergePage.tsx` — Sağlık turizmi VIP akışı
* `pages/mobile/partner/MobilePartnerAgendaAndInboxPage.tsx` — 4 sekmeli Partner Yönetim Merkezi (Ajanda CRUD, Katalog CRUD, Personel CRUD & 4 dönem ciro, Saat/Galeri/Kampanya/Vitrin)
* `pages/mobile/partner/MobilePartnerPosAndInventoryPage.tsx` — QR Kabul, Sesli Katalog Eşleştirme, Cep POS, Ödeme QR & Stok CRUD
* `components/mobile/partner/MobilePartnerOnboardingFunnel.tsx` — Partner Satış, Canlı Önizleme, Plan Seçimi & Hızlı Kurulum Akışı
* `pages/mobile/MobileProfileSettingsPage.tsx` — Bento Profil, akıllı tema toggle, Müşteri/Partner geçişi (kilit destekli), rol dropdown, akordiyon ayarlar

---

## 5. Geliştirme, Build, Test & APK Yayınlama Kuralları
1. **Zorunlu Build Env:** Production build daima `VITE_DATA_MODE=local` ile alınmalıdır (`VITE_DATA_MODE=supabase` henüz mobil bridge bağlanana kadar kullanılmaz):
   ```powershell
   $env:VITE_DATA_MODE = 'local'; npm run build
   npx cap sync android
   ```
2. **Test Kapıları (Her değişiklik sonrası koşulur):**
   - `npm run lint`
   - `foreach ($s in (Get-ChildItem scripts\verify-mobile-m*.mjs | Sort-Object Name)) { npx tsx $s.FullName }` (M1–M10)
   - `npx tsx scripts\test-mobile-superapp-e2e.mjs` (Playwright iPhone 15 Pro + Pixel 7 tam E2E)
3. **APK Derleme & Release:**
   - GitHub Actions workflow `.github/workflows/build-mobile-android-apk.yml`, `feat/lari-mobile-superapp` push'larında Android Debug APK (`app-debug.apk`) üretir.
   - Release oluştururken `origin` (`MertSGI/LARI-Mobile-SuperApp`) üzerinden tag atılıp artifact GitHub Release asset olarak eklenir.
4. **Codex CLI Kullanımı:**
   - Kullanıcı büyük kodlama görevlerini planlayıp tasarım kararlarını Antigravity'nin vermesini, kodlama kısmını **Codex CLI** (`C:\Users\mozcelikbas\.antigravity-ide\extensions\openai.chatgpt-26.5730.61309-win32-x64\bin\windows-x86_64\codex.exe exec --dangerously-bypass-approvals-and-sandbox`) üzerinden çalıştırmayı tercih etmektedir. (Windows'ta stdin kilidini önlemek için `cmd.exe /c "<nul ..."` ile çalıştırılır.) Codex kota hatası verirse Antigravity kaldığı yerden devam eder.

---

## 6. Sıradaki Kritik Faz (Canlı LARİ Web & Veritabanı Senkronizasyon Köprüsü)
Şu an mobil uygulama `VITE_DATA_MODE=local` altında bellek içi / yerel state (`MobileAppSessionContext`) ile çalışmaktadır. LARİ web platformu canlıya geçtiğinde web ile birebir gerçek zamanlı senkronizasyon için yapılacaklar:
1. `MobileAppSessionContext` ve mobil keşfet/partner ekranlarının yerel sabit veriler yerine projedeki `repositoryFactory` / `dataProvider` (Supabase PostgreSQL + RLS + RPC) katmanına bağlanması.
2. Mobil kimlik doğrulama (`AuthContext` / Supabase Auth JWT) ile gerçek müşteri ve `tenant_owner` / `staff` rollerinin oturumdan yüklenmesi.
3. Randevu oluşturma, iptal/erteleme, QR kabul, POS satışı, katalog/personel/çalışma saati değişiklikleri ve galeri görsellerinin doğrudan Supabase tablolarına yazılması ve Supabase Realtime + Push Bildirim (FCM) ile senkronlanması.
4. `MobilePartnerOnboardingFunnel` içindeki abonelik ve kurulum adımının `tenantRegistrationService` + `subscriptionService` (iyzico checkout) + `OnboardingWizard` RPC'lerine doğrudan bağlanması.

---

## 7. Telegram Köprüsü Bilgisi (`@pici2bot`)
* Bu İş PC'si üzerinde arka planda bağımsız çalışan **Pici2 Antigravity Telegram Köprüsü** (`C:\Users\mozcelikbas\.pici2-bridge\bot.py`) kuruludur.
* AutoDev kesinlikle kapalıdır (`autodev_enabled: false`); `neoaosbot` ile çakışmaz.
* Varsayılan çalışma dizini `C:\Projects\LARI-Mobile-SuperApp` olarak güncellenmiştir.
