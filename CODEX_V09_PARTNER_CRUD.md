# LARİ Partner Modülü Tam CRUD (Ekleme, Düzenleme, Silme) Revizyon Talimatı (Codex CLI)

Proje: `C:\Projects\Randapp-LARI-PILOT3`
Amaç: Partner modülünde eksik olan tüm ekleme, düzenleme ve silme işlemlerini eksiksiz tamamlayarak işletmelerin PC'ye ihtiyaç duymadan tüm sistemlerini mobil uygulamadan yönetmesini sağlamak.

---

### 1. Context Katmanı (`contexts/MobileAppSessionContext.tsx`)
- `MobileAppSessionValue` içine şu iki metodu ekle (`SAFE_FALLBACK` ve `useMemo` dahil):
  - `updateCatalogItem: (id: string, patch: Partial<Omit<PartnerCatalogItem, 'id'>>) => void`
  - `removeCatalogItem: (id: string) => void`
- Her ikisi de `partnerCatalog` state'ini güncellesin ve uygun Türkçe `showToast(...)` mesajı göstersin.

---

### 2. Partner Yönetim Merkezi Tam Ekleme & Silme (`pages/mobile/partner/MobilePartnerAgendaAndInboxPage.tsx`)
1. **Ajanda & Talepler Sekmesi (`agenda`):**
   - **Yeni Randevu / Walk-in Müşteri Ekle:** "Koltuk Başı Ajanda" kartının üstünde açılır/kapanır `+ Yeni Randevu Ekle` formu olsun:
     - Müşteri Adı, Hizmet seçimi (katalogdan veya serbest metin), Uzman seçimi (`staffMembers` listesi), Saat (örn. `16:30`), Oda/Kaynak (opsiyonel).
     - `Ajandaya Ekle` butonuna basıldığında yeni randevu `agenda` listesinin en başına eklensin (`data-testid="partner-agenda-add-toggle-btn"`, `data-testid="partner-agenda-add-submit-btn"`).
   - **Randevu Silme / İptal:** Her randevu kartında `Tamamlandı İşaretle` butonunun yanında `İptal / Sil` butonu (`Trash2` ikonlu, `data-testid="partner-agenda-delete-${item.appointmentId}"`) olsun; basıldığında randevuyu listeden çıkarsın ve toast göstersin.
   - **Onay Kutusundan Silme/Temizleme:** Onaylanmış veya reddedilmiş bildirim taleplerini listeden kaldırma (`Temizle / Sil`) butonu olsun.

2. **Katalog & Hizmetler Sekmesi (`catalog`):**
   - `Aktif İşletme Kataloğu` listesindeki her kalemin (`partner-catalog-item-${item.id}`) sağında:
     - **Düzenle** butonu (kalem ikonu -> satır içi hızlı fiyat/ad düzenleme + Kaydet)
     - **Sil** butonu (`Trash2` ikonu, `data-testid="partner-catalog-delete-${item.id}"`) -> `removeCatalogItem(item.id)` çağırarak kalemi katalogdan silsin.

3. **Personel & Raporlar Sekmesi (`staff_reports`):**
   - **Yeni Personel / Uzman Ekle:** `İşletme Uzman Kadrosu` kartının üstünde açılır/kapanır `+ Personel Ekle` formu olsun:
     - Uzman Adı Soyadı, Uzmanlık Alanı, Prim Oranı (%) inputları + `Uzmanı Ekle` butonu (`data-testid="partner-staff-add-toggle-btn"`, `data-testid="partner-staff-add-submit-btn"`).
   - **Personel Sil / Çıkar:** Her personel kartının sağ üstünde `Trash2` silme butonu (`data-testid="partner-staff-delete-${member.id}"`) olsun ve personeli listeden kaldırsın.

---

### 3. Cep POS & Stok Yönetimi (`pages/mobile/partner/MobilePartnerPosAndInventoryPage.tsx`)
- Stok / Envanter bölümünde (veya POS kataloğunda) eksik olan hızlı ürün/stok ekleme, stok adedi `+` / `-` güncelleme ve stok/katalog kalemi silme kontrollerini ekle (mevcut tüm `data-testid`leri koruyarak).

---

### 4. Doğrulama
1. `npm run lint` — PASS
2. `$env:VITE_DATA_MODE='local'; npm run build` — PASS
3. `npx tsx scripts\test-mobile-superapp-e2e.mjs` içine yeni eklenen Partner ekleme/silme (ajanda ekle/sil, katalog ekle/sil, personel ekle/sil) kontrollerini ekle ve tüm testlerin PASS olduğunu doğrula.
4. `npx tsx scripts\verify-mobile-m7-partner-pos-inventory.mjs` ve `verify-mobile-m10-qr-voice-catalog.mjs` testlerinin geçtiğini doğrula.
