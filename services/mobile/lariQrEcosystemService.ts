export type MobileQrKind =
  | 'appointment_checkin'
  | 'ht_package_checkin'
  | 'payment_checkout'
  | 'storefront_poster';

export interface MobileQrArtifact {
  qrId: string;
  kind: MobileQrKind;
  titleTr: string;
  subtitleTr: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  appointmentId?: string;
  packageName?: string;
  remainingCredits?: number;
  htJourneyCode?: string;
  payableAmountMajor?: number;
  currency?: 'TRY' | 'EUR' | 'USD' | 'GBP';
  optionalTipAllowed?: boolean;
  deepLinkUrl: string;
  rawPayload: string;
  signature: string;
  issuedAtIso: string;
  expiresAtIso: string;
  usageScenariosTr: string[];
}

export interface DecodedQrAdmissionResult {
  valid: boolean;
  reasonCode:
    | 'ADMITTED_OK'
    | 'MALFORMED_QR'
    | 'SIGNATURE_INVALID'
    | 'TENANT_MISMATCH'
    | 'EXPIRED';
  artifact?: MobileQrArtifact;
}

const SALT = 'lari-qr-ecosystem-v2';

function signCanonical(body: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const src = `${SALT}|${body}`;
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2, 33) + c + (i % 13)) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export const QR_USAGE_SCENARIOS_BY_KIND: Record<MobileQrKind, string[]> = {
  appointment_checkin: [
    'Resepsiyonda temassız hızlı Check-in ve koltuk ataması',
    'İnternetsiz ortamda dahi doğrulanabilen offline dijital bilet',
    'Tamamlandığında otomatik damga (+1) ve doğrulanmış yorum kilidi açma',
  ],
  ht_package_checkin: [
    'Havalimanı VIP transfer karşılama, 5* otel ve klinik kabul doğrulama',
    'Çoklu seans / sağlık turizmi paket hakkından atomik düşüm ve doktor odası kilitleme',
    'Pasaport numarası gizli kalarak (KVKK redaksiyon) medikal dosya açılışı',
  ],
  payment_checkout: [
    'Randevu sonunda şeffaf kalem kalem fiyat dökümü ile tek dokunuşta ödeme',
    'İsteğe bağlı bahşiş seçimi (varsayılan 0 TRY, %5 / %10 / %15 opsiyonel)',
    'Kasa, uzman primi ve dijital makbuzun aynı anda güncellenmesi',
  ],
  storefront_poster: [
    'Salon vitrin camı, ayna kenarı, klinik bankosu veya oto servis masasına QR afiş',
    'Okutan müşterinin doğrudan %0 komisyonlu işletme mağazasına yönlenmesi',
    'Sosyal medya ve WhatsApp profilinde anında randevu davet kodu',
  ],
};

export function createMobileQrArtifact(input: {
  kind: MobileQrKind;
  titleTr: string;
  subtitleTr: string;
  tenantId: string;
  tenantSlug?: string;
  customerId?: string;
  customerName?: string;
  appointmentId?: string;
  packageName?: string;
  remainingCredits?: number;
  htJourneyCode?: string;
  payableAmountMajor?: number;
  currency?: 'TRY' | 'EUR' | 'USD' | 'GBP';
  ttlHours?: number;
}): MobileQrArtifact {
  const now = Date.now();
  const issuedAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + (input.ttlHours ?? 48) * 3600 * 1000).toISOString();
  const qrId = `qr_${input.kind}_${now.toString(36)}`;
  const slug = input.tenantSlug || 'atelier-nisantasi';
  const deepLinkUrl =
    input.kind === 'storefront_poster'
      ? `https://app.randevulari.com/#/m?slug=${encodeURIComponent(slug)}`
      : `https://app.randevulari.com/#/m?qr=${encodeURIComponent(qrId)}&kind=${input.kind}`;

  const unsignedBody = [
    qrId,
    input.kind,
    input.tenantId,
    input.customerId || '',
    input.customerName || '',
    input.appointmentId || '',
    input.packageName || '',
    String(input.remainingCredits ?? ''),
    input.htJourneyCode || '',
    String(input.payableAmountMajor ?? ''),
    input.currency || 'TRY',
    issuedAtIso,
    expiresAtIso,
  ].join('|');

  const signature = signCanonical(unsignedBody);
  const payloadObj = {
    v: 2,
    qrId,
    kind: input.kind,
    tenantId: input.tenantId,
    customerId: input.customerId,
    customerName: input.customerName,
    appointmentId: input.appointmentId,
    packageName: input.packageName,
    remainingCredits: input.remainingCredits,
    htJourneyCode: input.htJourneyCode,
    payableAmountMajor: input.payableAmountMajor,
    currency: input.currency || 'TRY',
    issuedAtIso,
    expiresAtIso,
    sig: signature,
  };

  return {
    qrId,
    kind: input.kind,
    titleTr: input.titleTr,
    subtitleTr: input.subtitleTr,
    tenantId: input.tenantId,
    customerId: input.customerId,
    customerName: input.customerName,
    appointmentId: input.appointmentId,
    packageName: input.packageName,
    remainingCredits: input.remainingCredits,
    htJourneyCode: input.htJourneyCode,
    payableAmountMajor: input.payableAmountMajor,
    currency: input.currency || 'TRY',
    optionalTipAllowed: input.kind === 'payment_checkout',
    deepLinkUrl,
    rawPayload: JSON.stringify(payloadObj),
    signature,
    issuedAtIso,
    expiresAtIso,
    usageScenariosTr: QR_USAGE_SCENARIOS_BY_KIND[input.kind],
  };
}

export function verifyMobileQrTokenOrPayload(
  inputRaw: string,
  expectedTenantId?: string
): DecodedQrAdmissionResult {
  const trimmed = inputRaw.trim();
  if (!trimmed) {
    return { valid: false, reasonCode: 'MALFORMED_QR' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { valid: false, reasonCode: 'MALFORMED_QR' };
  }

  if (!parsed || !parsed.qrId || !parsed.kind || !parsed.tenantId || !parsed.sig) {
    return { valid: false, reasonCode: 'MALFORMED_QR' };
  }

  if (expectedTenantId && parsed.tenantId !== expectedTenantId) {
    return { valid: false, reasonCode: 'TENANT_MISMATCH' };
  }

  const unsignedBody = [
    parsed.qrId,
    parsed.kind,
    parsed.tenantId,
    parsed.customerId || '',
    parsed.customerName || '',
    parsed.appointmentId || '',
    parsed.packageName || '',
    String(parsed.remainingCredits ?? ''),
    parsed.htJourneyCode || '',
    String(parsed.payableAmountMajor ?? ''),
    parsed.currency || 'TRY',
    parsed.issuedAtIso || '',
    parsed.expiresAtIso || '',
  ].join('|');

  if (signCanonical(unsignedBody) !== parsed.sig) {
    return { valid: false, reasonCode: 'SIGNATURE_INVALID' };
  }

  if (parsed.expiresAtIso && Date.now() > new Date(parsed.expiresAtIso).getTime()) {
    return { valid: false, reasonCode: 'EXPIRED' };
  }

  return {
    valid: true,
    reasonCode: 'ADMITTED_OK',
    artifact: {
      qrId: parsed.qrId,
      kind: parsed.kind,
      titleTr:
        parsed.kind === 'ht_package_checkin'
          ? 'Sağlık Turizmi / Paketli Müşteri Kabulü'
          : parsed.kind === 'payment_checkout'
            ? 'Randevu Sonu QR Ödeme'
            : 'LARİ QR Doğrulama',
      subtitleTr: parsed.customerName || parsed.packageName || 'Doğrulanmış Geçiş',
      tenantId: parsed.tenantId,
      customerId: parsed.customerId,
      customerName: parsed.customerName,
      appointmentId: parsed.appointmentId,
      packageName: parsed.packageName,
      remainingCredits: parsed.remainingCredits,
      htJourneyCode: parsed.htJourneyCode,
      payableAmountMajor: parsed.payableAmountMajor,
      currency: parsed.currency || 'TRY',
      deepLinkUrl: `https://app.randevulari.com/#/m?qr=${encodeURIComponent(parsed.qrId)}`,
      rawPayload: trimmed,
      signature: parsed.sig,
      issuedAtIso: parsed.issuedAtIso,
      expiresAtIso: parsed.expiresAtIso,
      usageScenariosTr: QR_USAGE_SCENARIOS_BY_KIND[parsed.kind as MobileQrKind] || [],
    },
  };
}

/**
 * Generates an ISO-layout 25x25 high-contrast binary matrix with standard 7x7 finder patterns,
 * timing strips, alignment marker, and deterministic payload encoding.
 */
export function buildQrMatrix25(payload: string): boolean[][] {
  const N = 25;
  const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  const reserved: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  const placeFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= N || c < 0 || c >= N) continue;
        reserved[r][c] = true;
        if (dr === -1 || dr === 7 || dc === -1 || dc === 7) {
          grid[r][c] = false;
        } else {
          const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          grid[r][c] = isBorder || isCenter;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, N - 7);
  placeFinder(N - 7, 0);

  // Alignment marker (center 18,18 -> 5x5)
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = 18 + dr;
      const c = 18 + dc;
      reserved[r][c] = true;
      const border = Math.abs(dr) === 2 || Math.abs(dc) === 2;
      const dot = dr === 0 && dc === 0;
      grid[r][c] = border || dot;
    }
  }

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    reserved[6][i] = true;
    grid[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    grid[i][6] = i % 2 === 0;
  }

  // Deterministic bit stream derived from payload + FNV mixing
  let seed = 0x811c9dc5;
  const bytes: number[] = [];
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    seed ^= code;
    seed = Math.imul(seed, 0x01000193) >>> 0;
    bytes.push((code ^ (seed & 0xff)) & 0xff);
  }
  if (bytes.length === 0) bytes.push(0x4c, 0x41, 0x52, 0x49);

  let bitIdx = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (reserved[r][c]) continue;
      const byteVal = bytes[(bitIdx >> 3) % bytes.length];
      const bit = (byteVal >> (7 - (bitIdx & 7))) & 1;
      const mask = ((r + c) % 2 === 0) ? 1 : 0;
      grid[r][c] = Boolean(bit ^ mask);
      bitIdx++;
    }
  }

  return grid;
}
