# LARİ Mobile Super-App Workspace Talimatları

Bu proje (`C:\Projects\LARI-Mobile-SuperApp`), web/AutoDev süreçlerinden tamamen izole edilmiş **LARİ Mobil Super-App** geliştirme alanıdır (`feat/lari-mobile-superapp`).

## Zorunlu İlk Adım
Yeni bir konuşma veya görev başladığında, bağlamı kaybetmemek için ilk iş olarak şu dosyayı oku:
- `LARI_MOBILE_SOHBET_GECMISI.md`

## Temel Kurallar
1. **AutoDev / NeoAos İzolasyonu:** Bu projede hiçbir AutoDev veya NeoAos koordinasyon döngüsü çalıştırma.
2. **Build Komutu:** Production derlemesi mutlaka `VITE_DATA_MODE=local` ile alınmalıdır (`$env:VITE_DATA_MODE='local'; npm run build`).
3. **Doğrulama Kapıları:** Kod değişikliğinden sonra `npm run lint`, `$env:VITE_DATA_MODE='local'; npm run build`, `scripts/verify-mobile-m*.mjs` ve `npx tsx scripts/test-mobile-superapp-e2e.mjs` testlerini çalıştır.
4. **Görsel & Kurumsal Bütünlük:** `rounded-3xl border-2` kart sistemini, `pb-28` alt dock payını, `tr-TR` binlik ve para birimi simgeli fiyat formatını (`4.200 ₺`), Güneş/Ay tema uyumunu ve müşteri-partner deneyim izolasyonunu her zaman koru.
5. **Codex CLI İş Birliği:** Büyük kodlama görevlerinde plan/tasarım burada hazırlanıp, kullanıcı isterse kodlama Codex CLI (`codex.exe exec --dangerously-bypass-approvals-and-sandbox -C C:\Projects\LARI-Mobile-SuperApp`) ile yürütülebilir (kota biterse bu ajan devralır).
