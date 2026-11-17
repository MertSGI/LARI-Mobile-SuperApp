# LARİ Mobil Super-App v1.1.0 — Partner Satış, Önizleme, Abonelik & Hızlı Kurulum Ekosistemi (Codex CLI)

Proje: `C:\Projects\Randapp-LARI-PILOT3`
Amaç: Partner olmayan müşterilerin web sitesine gitmesine gerek kalmadan uygulama üzerinden LARİ Partner ekosistemini keşfetmesini, kendi işletmesini/örnek demo ekranlarını canlı önizlemesini, aşamalı abonelik paketi seçip satın almasını ve hızlı kurulumla kendi Partner hesabını aktifleştirmesini sağlamak. Tüm tasarım uygulamanın mevcut `rounded-3xl border-2` kurumsal kart diliyle birebir uyumlu olmalıdır.

---

### 1. Yeni Bileşen: `components/mobile/partner/MobilePartnerOnboardingFunnel.tsx`
Mevcut `MobileStorefrontDetailDrawer` / `MobileBookingBottomSheet` tasarım diline uyumlu, tam ekran / tam kapsamlı (`fixed inset-0 z-[92] overflow-y-auto`) bir **LARİ Partner Ekosistem & İşletme Açılış Akışı** oluştur. Üst barda Geri/Kapat butonu, LARİ mor gradient başlık ve 4 adımlı net ilerleme çubuğu (progress bar) olsun:

#### Adım 1: **LARİ Partner Nedir? & İki Ayrı Dünya (Müşteri vs Partner)** (`data-testid="partner-funnel-step-showcase"`)
- **Kurumsal Değer Önerisi & İmkanlar:** LARİ Web (`FeaturesPage.tsx`) içeriğine uygun olarak:
  1. *WhatsApp / Telefon Karmaşasına Son:* 7/24 online randevu, fiyat listesi & uzman seçimi.
  2. *%0 Komisyon Doğrudan Mağaza & Google Haritalar:* Kendi müşterinizden komisyon kesilmez, QR linkinizle doğrudan vitrininiz açılır.
  3. *QR Müşteri Kabul + Sesli Katalog & Cep POS:* Müşteriyi QR ile kabul edip sesli işlem ekleyerek tek dokunuşla fiyat dökümü ve bahşişli Ödeme QR'ı üretme.
  4. *Ciro Raporları (Günlük/Haftalık/Aylık/3 Aylık), Personel & Galeri:* PC olmadan tüm işletmeyi cepten yönetme.
  5. *Bireysel Müşteri & Partner Ayrımı:* Partner olduğunuzda müşteri keşfet deneyiminiz bozulmaz; Profilinizden iki izole deneyim arasında tek dokunuşla geçiş yaparsınız.
- Alt CTA: `"Kendi İşletmeni Önizle & Demo Gör"` (Adım 2'ye geçer) ve doğrudan `"Abonelik Paketlerini Gör"` (Adım 3'e atlar).

#### Adım 2: **Kendi İşletmeni Önizle & Örnek Hesap Demo Ekranları** (`data-testid="partner-funnel-step-preview"`)
- LARİ Web (`DemoLandingPage.tsx`) mantığının mobil birebir karşılığı:
  - Kullanıcının işletme adını (`Örn. Lüks Stüdyo Kadıköy`), sektörünü (`Güzellik & Saç`, `Oto Servis`, `Diş Kliniği`, `Berber`, `Spa & Masaj`, `Medikal Estetik`), il/ilçe (`İstanbul / Kadıköy`) ve imza rengini girdiği kompakt form.
  - Altında **2'li Canlı Önizleme Sekmesi** (`Müşteri Vitrininiz` | `Partner Yönetim Ekranı`):
    - **Müşteri Vitrininiz:** İşletmenin kendi adını, sektörünü, yıldızını ve örnek hizmetlerini müşteri gözünden nasıl görüneceğini canlı render eder.
    - **Partner Yönetim Ekranı:** Ajanda, QR Kabul, Katalog ve Ciro raporunun kendi işletme adıyla nasıl görüneceğini önizletir.
- Alt CTA: `"Abonelik Paketi Seç & Kuruluma Başla"` (Adım 3'e geçer).

#### Adım 3: **Aşamalı Abonelik Paketi Seçimi & Kayıt / Ödeme** (`data-testid="partner-funnel-step-pricing"`)
- Verileri doğrudan `services/planService.ts` içindeki `planService.getActivePlans()` fonksiyonundan çek!
- **Aylık / Yıllık (%20 İndirim)** geçiş hapları (`data-testid="partner-funnel-billing-monthly"`, `data-testid="partner-funnel-billing-annual"`).
- Tüm plan kartlarını (`Başlangıç`, `Standart`, `Profesyonel` vb.) mevcut `rounded-3xl border-2` stiliyle listele; fiyatları `.toLocaleString('tr-TR')` (`1.490 TRY/ay`, `2.490 TRY/ay`, `3.490 TRY/ay` gibi) göster, `isRecommended` planı öne çıkar ve personel/hizmet/AI/kampanya/WhatsApp kapsamlarını madde madde göster.
- Paket seçildiğinde alt kısımda kısa işletme & sahip bilgileri formu açılır (Ad Soyad, Telefon, E-posta, İşletme Adı, KVKK Onayı) + `"Satın Al & Hızlı Kuruluma Geç"` (`data-testid="partner-funnel-checkout-btn"`) butonuyla ödeme/abonelik onaylanıp Adım 4'e geçilir!

#### Adım 4: **Hızlı Kurulum Adımları (`OnboardingWizard` Mobil Akışı)** (`data-testid="partner-funnel-step-setup"`)
- LARİ Web `OnboardingWizard.tsx` akışına uygun olarak 3 mini kutuda hızlı kurulum:
  1. İlk Hizmet & Fiyat Ekleme (Örn. *İmza Bakım • 1.800 TRY • 60 dk*),
  2. İlk Uzman Adı & Çalışma Saatleri (Örn. *09:00 – 20:00*),
  3. Kurumsal Özet & Canlıya Alma.
- Ana Buton: `"Partner Hesabımı Aktif Et & Panele Geç"` (`data-testid="partner-funnel-activate-btn"`):
  - `useMobileAppSession().upgradeToPartnerAccount(...)` çağrılır,
  - `onCompleted({ switchToPartnerMode: true })` tetiklenerek kullanıcıyı anında kendi Partner Yönetim Merkezine alır (isteğe bağlı "Şimdilik Müşteri Modunda Kal" seçeneği de bulunur).

---

### 2. Ana Sayfa Partner Davet Bölümü (`pages/mobile/b2c/MobileExploreMarketplacePage.tsx`)
- `MobileExploreMarketplacePageProps` içine `onOpenPartnerOnboarding?: () => void` ekle.
- Arama/Keşfet ekranında (Önerilen İşletmeler listesi ile Topluluk Akışı arasında — mevcut `rounded-3xl border-2` kart ölçüleriyle tam uyumlu!) şık bir **LARİ Partner Davet Kartı** (`data-testid="explore-partner-invite-card"`) yerleştir:
  - LARİ mor-indigo vurgu başlığı (`"İŞLETME SAHİBİ MİSİNİZ?"`),
  - *"Kendi vitrinini ücretsiz önizle, %0 komisyon QR mağazanı ve Cep POS'unu 2 dakikada aç."*
  - 3 kompakt özellik rozeti (`%0 Komisyon`, `QR & Cep POS`, `Canlı İşletme Önizleme`)
  - Buton: `"İşletmeni Önizle & Partner Ol"` (`data-testid="explore-open-partner-onboarding-btn"`) -> `onOpenPartnerOnboarding?.()` çağırır.

---

### 3. `MobileSuperAppPage.tsx` Entegrasyonu
- `useMobileAppSession()` içinden `partnerSubscription` al.
- `effectiveRole` hesaplanırken `partnerSubscription` varsa `'tenant_owner'` olarak değerlendir (`explicitRoleParam === 'guest' && !partnerSubscription ? 'guest' : partnerSubscription ? 'tenant_owner' : ...`)! Böylece `?role=guest` ile başlayan bir müşteri kullanıcı **Partner Satın Alma & Kurulum Akışını** tamamladığında gerçekten yetkili Partner olur ve Profil'deki Partner kilidi açılır; Müşteri ile Partner deneyimleri ayrı sekmeler ve `effectiveMode` izolasyonu ile karışmadan çalışır.
- `partnerOnboardingOpen` state ekle; hem `MobileExploreMarketplacePage`'den (`onOpenPartnerOnboarding`), hem de `MobileProfileSettingsPage`'den (`onOpenPartnerOnboarding`) aynı `MobilePartnerOnboardingFunnel` modalı açılsın.
- `MobilePartnerOnboardingFunnel` tamamlandığında (`onCompleted`) `partnerOnboardingOpen` kapansın; `switchToPartnerMode === true` ise `setRequestedMode('b2b_partner')`, `setRequestedPersona('salon_partner')`, `setActiveTabId('partner_agenda')` yapılsın!

---

### 4. Doğrulama & E2E
1. `npm run lint` — PASS
2. `$env:VITE_DATA_MODE='local'; npm run build` — PASS
3. `scripts/test-mobile-superapp-e2e.mjs` içine yeni kontrolleri ekle:
   - Wallet sayfasında iptal kuralları kartı (`wallet-cancellation-policy-card`) ve "İptal Et" tıklandığında açılan **"Emin misiniz?"** onay modalı (`wallet-cancel-confirm-modal`, önce vazgeç, sonra iptal akışı veya doğrulama),
   - Ana sayfadaki Partner davet kartı (`explore-partner-invite-card`),
   - `?app=1&role=guest` modunda kilitli Partner butonuna basıldığında kilitli kalması (`b2c_customer`) VE `MobilePartnerOnboardingFunnel` açılıp 4 adımın (Önizleme -> Paket Seçimi -> Ödeme/Kurulum -> Partner Aktivasyonu) tamamlanarak müşterinin gerçek Partner hesabına dönüşüp panele geçmesi!
4. `npx tsx scripts\test-mobile-superapp-e2e.mjs` ve `scripts\verify-mobile-m*.mjs` koşulup hepsinin PASS olduğunu doğrula.
