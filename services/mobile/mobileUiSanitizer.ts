/**
 * Central Mobile UI Sanitizer & Debounce Helper
 * Prevents raw backend reason codes, internal commands, or stack traces from leaking to end users.
 */

const FRIENDLY_REASON_MAP: Record<string, string> = {
  // Waitlist & Booking
  RESOURCE_UNAVAILABLE_CONFLICT:
    'Seçtiğiniz saat dilimi dolu görünüyor. Farklı bir saat veya tarih seçebilirsiniz.',
  CLAIMED: 'Yedek sıra kaydınız başarıyla alındı. Koltuk boşaldığında bildirim alacaksınız.',
  NO_PAST_APPOINTMENTS: 'Tekrarlanabilecek geçmiş randevunuz henüz bulunmuyor.',
  INVALID_INPUT: 'Lütfen girdiğiniz bilgileri kontrol edip tekrar deneyin.',
  SAME_CATEGORY_DAILY_CONFLICT:
    'Aynı gün içinde bu kategori/hizmetten aktif bir randevunuz zaten bulunuyor. Farklı bir sektör veya gün seçebilirsiniz.',

  // Reviews
  DUPLICATE_REVIEW_FOR_APPOINTMENT:
    'Bu randevu için zaten bir değerlendirme paylaştınız.',
  APPOINTMENT_NOT_COMPLETED:
    'Yalnızca tamamlanmış randevular için değerlendirme yazabilirsiniz.',
  INVALID_REVIEW_TOKEN:
    'Değerlendirme doğrulama bağlantısı geçersiz veya süresi dolmuş.',
  INVALID_RATING: 'Lütfen 1 ile 5 arasında geçerli bir yıldız puanı seçin.',

  // Account Deletion & Biometric
  BIOMETRIC_REAUTH_REQUIRED:
    'Güvenliğiniz için önce 1. adımdaki Biyometrik / PIN doğrulamasını tamamlamalısınız.',
  OWNER_REQUIRES_TENANT_TRANSFER:
    'Aktif bir işletme sahibi hesabınız olduğu için silme öncesi işletme sahipliğini devretmeniz veya aboneliği sonlandırmanız gerekir.',
  CONFIRMATION_PHRASE_MISMATCH:
    'Onay metni eşleşmiyor. Lütfen kutuya büyük harflerle "HESABIMI SIL" yazın.',
  MEDICAL_RECORD_RETENTION_ANONYMIZED:
    'Yasal tıbbi kayıt saklama süresi gereği kişisel bilgileriniz kalıcı olarak anonimleştirildi.',
  DELETED_FULL: 'Hesabınız ve oturum verileriniz kalıcı olarak silindi.',

  // QR & Admission & POS
  MALFORMED_QR: 'Okutulan QR kod geçerli bir LARİ kodu değil.',
  MALFORMED_QR_PAYLOAD: 'QR kod içeriği doğrulanamadı. Lütfen yeni bir QR kod kullanın.',
  TENANT_MISMATCH: 'Bu QR kod veya işlem başka bir işletmeye ait.',
  SIGNATURE_INVALID: 'QR güvenlik imzası doğrulanamadı.',
  SIGNATURE_MISMATCH: 'QR güvenlik imzası uyuşmuyor.',
  EXPIRED: 'QR kodun geçerlilik süresi dolmuş. Lütfen kodu yenileyin.',
  QR_PASS_EXPIRED: 'Check-in QR kodunun süresi dolmuş. Yeni kod oluşturun.',
  ALREADY_CHECKED_IN: 'Bu randevu için giriş (check-in) işlemi zaten yapılmış.',
  INSUFFICIENT_PACKAGE_CREDITS: 'Bu pakette kalan seans hakkınız kalmadı.',
  CHECKED_IN_AND_COMPLETED: 'Müşteri QR kabulü ve işlem tamamlama başarıyla işlendi.',
  ADMITTED_OK: 'Müşteri QR ile başarıyla kabul edildi.',

  // Access & Roles
  FORBIDDEN: 'Bu işlem için yetkiniz bulunmuyor.',
  FORBIDDEN_PARTNER_ROLE: 'Bu ekran yalnızca yetkili işletme (Partner) hesaplarına açıktır.',
  ORDER_COMPLETED: 'Ödeme ve satış işlemi başarıyla tamamlandı.',
  IDEMPOTENT_REPLAY: 'Bu işlem az önce zaten kaydedildi.',
  IDEMPOTENCY_CONFLICT: 'Aynı işlem kimliği ile çakışan bir istek tespit edildi.',
  CURRENCY_MISMATCH: 'İşlem para birimi işletme ayarlarıyla uyuşmuyor.',
  EXTERNAL_HOLD_PAYMENT_METHOD_BLOCKED:
    'Hesap durumu kısıtlı olduğu için bu ödeme yöntemi şu anda kullanılamıyor.',
  PO_RECEIVED: 'Stok satın alma kaydı başarıyla alındı.',

  // Feature Gates & Modules
  CLINIC_REQUIRED: 'Bu özellik yalnızca Klinik ve Sağlık Turizmi paketlerinde aktiftir.',
  HEALTH_TOURISM_NOT_ENABLED:
    'Sağlık Turizmi konsiyerji yalnızca ilgili pakete sahip işletmelerde kullanılabilir.',
  COMMERCIAL_ELIGIBILITY_REQUIRED:
    'Bu modülü kullanmak için uygun abonelik paketi gereklidir.',
  PAID_EXTERNAL_AI_DISABLED:
    'AI önizleme özelliği yalnızca tanımlı işletme paketlerinde aktiftir.',
  PHOTO_REQUIRED: 'Devam etmek için lütfen bir fotoğraf seçin.',
  CONTEXTUAL_TRIGGER_REQUIRED: 'Lütfen bir işletme veya hizmet seçerek başlatın.',
  INVALID_TENANT: 'İşletme bilgisi doğrulanamadı.',
  UNSUPPORTED_CURRENCY: 'Seçilen para birimi şu anda desteklenmiyor.',
  MISSING_REQUIRED_FIELDS: 'Lütfen zorunlu tüm alanları eksiksiz doldurun.',
};

export function sanitizeUserMessage(
  rawCodeOrText?: string | null,
  fallback = 'İşlem şu anda tamamlanamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.'
): string {
  if (!rawCodeOrText) return fallback;
  const trimmed = String(rawCodeOrText).trim();
  if (!trimmed) return fallback;

  if (FRIENDLY_REASON_MAP[trimmed]) {
    return FRIENDLY_REASON_MAP[trimmed];
  }

  // Strip embedded enum codes if present inside a message like "Reason: SOME_ENUM_CODE"
  for (const [code, friendly] of Object.entries(FRIENDLY_REASON_MAP)) {
    if (trimmed === code || trimmed.endsWith(code)) {
      return friendly;
    }
  }

  // Block raw technical traces, shell commands, or ALL_CAPS_ENUM strings
  const looksTechnical =
    /^[A-Z0-9_]{5,}$/.test(trimmed) ||
    /(Exception|Error:|Traceback|TypeError|SyntaxError|SELECT\s+|INSERT\s+|npx\s|git\s|node:)/i.test(
      trimmed
    );

  if (looksTechnical) {
    return fallback;
  }

  return trimmed;
}

/**
 * Prevents accidental rapid double-taps or spam clicks on critical buttons.
 * Returns a synchronous gate function + remaining cooldown helper.
 */
export function createActionCooldown(defaultCooldownMs = 1500) {
  let lockedUntil = 0;
  return {
    tryAcquire(customCooldownMs = defaultCooldownMs): boolean {
      const now = Date.now();
      if (now < lockedUntil) return false;
      lockedUntil = now + customCooldownMs;
      return true;
    },
    reset(): void {
      lockedUntil = 0;
    },
  };
}
