# LARİ (`com.randevulari.app`) — App Store & Google Play Submission & Compliance Runbook

## 1. Canonical App Identity
* **Bundle ID / Application ID:** `com.randevulari.app`
* **App Name (TR / EN):** `LARİ` / `LARİ: Smart Booking & Salon`
* **Capacitor Internal Hostname:** `app.randevulari.com` (`androidScheme: https`, `iosScheme: capacitor`)
* **Deep Link Schemes:** `randevulari://`, `lari://`
* **Universal Links / App Links Domains:** `randevulari.com`, `app.randevulari.com`, `*.randevulari.com`, `lari.app`

---

## 2. Apple App Store Compliance Checklist
1. **Guideline 4.2 (Minimum Functionality):**
   * Native launch opens `MobileAppShell` (`/m`) directly rather than marketing pages.
   * Includes native Bottom Tab Bar, Safe-Area insets, Haptic feedback, Biometric FaceID/TouchID gate, Camera AI/QR, Geolocation distance sorting, and Offline QR Wallet.
2. **Guideline 5.1.1 (Guest Browsing):**
   * Users can browse salons, clinics, services, pricing, and available slots without logging in (`canBrowseWithoutAuth() === true`).
   * Login/OTP is requested only at booking confirmation or wallet access.
3. **Guideline 5.1.1(v) (In-App Account Deletion):**
   * Implemented in `pages/mobile/MobileProfileSettingsPage.tsx` via `services/accountDeletionService.ts`.
   * Requires biometric verification and explicit `HESABIMI SIL` confirmation; anonymizes personal contact fields if statutory medical PHI retention lock is active.
4. **Guideline 1.4.1 (Medical Disclaimer):**
   * AI Style & Health Tourism screens display explicit non-diagnostic preview notices.

### iOS `Info.plist` Required Permission Strings (TR / EN)
```xml
<key>NSCameraUsageDescription</key>
<string>Müşteri QR check-in, ürün barkodu okutma, AI stil önizleme ve sağlık turizmi ön değerlendirme fotoğrafı için kameranız kullanılır.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Size en yakın kuaför, güzellik salonu ve klinikleri mesafeye göre sıralamak için konumunuz kullanılır.</string>
<key>NSFaceIDUsageDescription</key>
<string>Klinik hasta kayıtlarına, müşteri finansal geçmişine ve hesap silme işlemine güvenli erişim için Face ID kullanılır.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>AI stil veya tıbbi ön değerlendirme için galerinizden fotoğraf seçmenizi sağlar.</string>
```

---

## 3. Google Play Store Compliance Checklist
* **Target SDK:** Android 14 / 15 (API Level 34/35)
* **Permissions (`AndroidManifest.xml`):** `INTERNET`, `ACCESS_FINE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`
* **Data Safety Form:**
  * Location (Approximate/Precise — optional, user-triggered for nearby discovery)
  * Personal Info (Name, Phone, Email — encrypted in transit via TLS)
  * Health Info (Clinic/HT vertical only — branch-isolated RLS + biometric gate; `EXTERNAL_HOLD` until regulatory approval)
  * In-App Account Deletion URL & In-App Flow: Supported (`https://app.randevulari.com/#/m/profile`).

---

## 4. Build & Release Commands (Post-M10)
```bash
# 1. Build mobile web bundle
npm run build

# 2. Sync Capacitor native projects (requires @capacitor/cli installed)
npx cap sync android
npx cap sync ios

# 3. Android Release Bundle (.aab)
cd android && ./gradlew bundleRelease

# 4. iOS Archive (.ipa — run on macOS / GitHub Actions macos-latest)
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release archive
```
