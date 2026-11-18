# LARİ Mobile Super-App — Küresel Standartlarda QA, UX & Ekosistem Uyum Sınavı (Global Audit Protocol)

> **Amaç:** `C:\Projects\LARI-Mobile-SuperApp` (`com.randevulari.app`) mobil uygulamasını ve Android/Capacitor paketini **küresel ölçekte ürün geliştiren şirketlerin (Apple / Google / Stripe / Uber / Fresha seviyesi) QA, UX, Güvenlik ve Mimari standartlarına** göre uçtan uca denetlemek, eksikleri, fazlalıkları ve web/veritabanı ekosistemiyle uyumsuzlukları kanıtlarıyla raporlamak.

---

## 1. Değerlendirme Standartları & Referans Çerçeveler
Bu sınavda her bulgu aşağıdaki küresel standartlara göre puanlanır ve sınıflandırılır:
1. **Apple App Store Review Guidelines & Google Play Policy:**
   - **5.1.1 (Data Collection & Guest Browsing):** Kayıt olmadan keşfetme hakkı, gereksiz veri zorlamama.
   - **5.1.1(v) (Account Deletion):** Uygulama içi hesap silme, biyometrik/yeniden doğrulama ve tıbbi saklama kilidi (KVKK).
   - **Honest Capability & Anti-Misrepresentation:** Gerçek entegrasyonu olmayan (mock/local) özelliklerin canlı ödeme/SMS/AI gibi yanıltıcı sunulmaması.
2. **OWASP MASVS (Mobile Application Security Verification Standard):**
   - İstemci tarafı sır (secret) taraması, yerel depolama (`localStorage`) güvenliği, parola/token saklama, Deep Link & URL şeması doğrulaması (path traversal / `javascript:` engeli), rol yükseltme (privilege escalation) koruması.
3. **WCAG 2.2 AA & Mobil Ergonomi (iOS HIG / Material 3):**
   - Minimum dokunma alanı (`>= 44px`), sıfır yatay taşma (`scrollWidth <= innerWidth`), Güneş (Açık) / Ay (Koyu) tema kontrastı, alt dock (`pb-28`) çakışmasızlığı, `tr-TR` binlik/para birimi format tutarlılığı.
4. **LARİ Web & Veritabanı Ekosistemi Uyumu:**
   - `AuthContext`, `repositoryFactory` / `dataProvider`, `planService`, `tenantRegistrationService`, `subscriptionService`, `accountDeletionService` ve Supabase PostgreSQL + RLS sözleşmeleriyle mobil katmanın uyumu.

---

## 2. Sınav Kapsamı (6 Zorunlu Denetim Bölümü)

### Bölüm A — Statik Kalite, Derleme & Güvenlik Kapıları
Denetçi (Codex) aşağıdaki komutları bizzat çalıştırıp çıktılarını doğrulamalıdır:
- `npm run lint` (`tsc --noEmit`)
- `$env:VITE_DATA_MODE='local'; npm run build`
- `npm run check:secrets`
- `scripts/verify-mobile-m1` … `m10` tüm doğrulama scriptleri
- `npx tsx scripts/test-mobile-superapp-e2e.mjs` (Playwright iPhone 15 Pro + Pixel 7)
- Android / Capacitor senkronizasyon durumu (`capacitor.config.ts`, `android/`, `.github/workflows/build-mobile-android-apk.yml`)

### Bölüm B — Kimlik Doğrulama, Oturum & Rol İzolasyonu
- **Giriş / Üye Ol / Çıkış Yap:** E-posta + Şifre, Google (Gmail), Apple akışları; zorunlu profil alanlarının (`Ad Soyad`, `E-posta`, `Ülke`, `Telefon`, `Yaş`, `Cinsiyet`, `İl`, `İlçe`, `KVKK`) eksiksiz doğrulanması.
- **Misafir / Müşteri / Partner İzolasyonu:** Misafir veya `customer` kullanıcısının `b2b_partner` ekranlarına sızamaması; partner butonunun kilitli/soluk kalması.
- **Oturum Kalıcılığı & Çıkış Temizliği:** Çıkışta aktif oturum, partner abonelik durumu ve hassas durumların temizlenmesi.

### Bölüm C — Uçtan Uca (E2E) B2C Müşteri Deneyimi
- Keşfet, arama, sesli arama, 12 sektör kategorisi, GPS/Harita, Vitrin Drawer, 3sn Hızlı Randevu, aynı gün/aynı kategori çakışma engeli.
- Cüzdan & QR Pass, İptal Kuralları & Onay Modalı, Bakım Pasaportu, Sadakat Puanı/Damga, Çoklu Para Birimi (`TRY/USD/EUR/GBP`), AI Stil Stüdyosu, Sağlık Turizmi Konsiyerji.

### Bölüm D — Uçtan Uca (E2E) B2B Partner Deneyimi
- Partner Satış & 4 Adımlı Kurulum Hunisi (`MobilePartnerOnboardingFunnel`), `planService` fiyat/kota tutarlılığı.
- Partner Yönetim Merkezi (Ajanda CRUD, Katalog CRUD, Personel CRUD + 4 dönem ciro, Çalışma Saatleri & 24 saatlik vitrin kilidi, Galeri & Sosyal Akış senkronu).
- QR Kabul, Sesli Katalog Eşleştirme, Cep POS & İsteğe Bağlı Bahşişli Ödeme QR, Stok CRUD, Klinik PHI (biyometrik kilit), Sağlık Turizmi Lead Ops, Customer 360.

### Bölüm E — LARİ Web & Canlı Ekosistemle Uyum (Gap Analysis)
- Hangi akışlar şu an **sadece local/bellek içi** çalışıyor, hangileri web servisleriyle (`planService`, `accountDeletionService`, `authService`, `repositoryFactory`) gerçekten bağlı?
- Canlı `VITE_DATA_MODE=supabase` geçişi için eksik köprüler, veri modeli uyuşmazlıkları ve riskler neler?

### Bölüm F — Eksikler, Fazlalıklar (Bloat / Dead Code / Tutarsızlıklar) & Öneriler
- **Eksikler:** Gerçek kullanıcıların veya App Store/Google Play inceleme ekibinin takılacağı boşluklar (ör. şifre değiştirme, telefon OTP/doğrulama, derin link/push token bağlama, offline hata kurtarma, gerçek dosya yükleme boyut/tür limiti, Capacitor Android manifest/izin/splash/keystore eksikleri vb.).
- **Fazlalıklar / Teknik Borç:** Kullanılmayan bileşenler, tekrarlayan sabit veriler, çakışan route/servisler, gereksiz büyük bundle uyarıları (`> 500 kB` chunk), tutarsız metinler veya sahte görünen statik öğeler.

---

## 3. Raporlama Formatı (Zorunlu Çıktı Şablonu)
Denetçi bulgularını şu net yapıda teslim etmelidir:
1. **Yönetici Özeti & Küresel Hazırlık Skoru (0–100):** Kategori bazlı puanlama (UX/UI, E2E Akış, Güvenlik, Ekosistem Uyumu, Mağaza/APK Hazırlığı).
2. **Test & Komut Kanıt Tablosu:** Çalıştırılan her komutun gerçek çıktısı (PASS/FAIL).
3. **Bulgu Listesi (`P0 Blocker`, `P1 Kritik`, `P2 Önemli`, `P3 İyileştirme`):**
   - Her madde için: `[Seviye] Başlık — Dosya & Satır — Sorunun Etkisi — Önerilen Çözüm`.
4. **Fazlalıklar & Temizlik Listesi:** Kaldırılması / birleştirilmesi gereken kod veya bağımlılıklar.
5. **Ekosistem Uyum Matrisi:** Web (`Randapp-main`) servisleri ile Mobil Super-App katmanının mevcut durumu ve sonraki faz için öncelik sırası.
