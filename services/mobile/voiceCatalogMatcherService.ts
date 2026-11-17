export type CatalogVerticalCategory = 'beauty' | 'clinical_ht' | 'auto' | 'product';

export interface PartnerCatalogItem {
  id: string;
  tenantId: string;
  name: string;
  category: CatalogVerticalCategory;
  unitPriceMajor: number;
  durationMinutes?: number;
  currency: 'TRY' | 'EUR' | 'USD' | 'GBP';
  taxRateBps: number; // e.g., 2000 = %20, 1000 = %10
  commissionRateBps: number;
  packageEligible: boolean;
  keywords: string[];
}

export interface VoiceMatchedLine {
  catalogItem: PartnerCatalogItem;
  quantity: number;
  matchedClause: string;
  confidence: number;
  coveredByPackage: boolean;
}

export interface VoiceCatalogMatchResult {
  transcriptNormalized: string;
  matchedLines: VoiceMatchedLine[];
  unmatchedClauses: string[];
}

export interface FolioBreakdownLine {
  catalogItemId: string;
  name: string;
  category: CatalogVerticalCategory;
  quantity: number;
  unitPriceMajor: number;
  coveredByPackage: boolean;
  subtotalMajor: number;
  taxRateBps: number;
  taxMajor: number;
  lineTotalMajor: number;
}

export interface CompletedAppointmentBreakdown {
  breakdownId: string;
  appointmentId: string;
  customerName: string;
  admissionType: 'standard_qr' | 'package_qr' | 'health_tourism_qr';
  currency: 'TRY' | 'EUR' | 'USD' | 'GBP';
  lines: FolioBreakdownLine[];
  grossSubtotalMajor: number;
  packageDiscountMajor: number;
  taxTotalMajor: number;
  netPayableBeforeTipMajor: number;
  optionalTipMajor: number;
  grandTotalMajor: number;
  generatedAtIso: string;
  paidViaQr: boolean;
}

export const INITIAL_PARTNER_CATALOG: PartnerCatalogItem[] = [
  {
    id: 'cat-balayage',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Soft Balayage & Tonlama',
    category: 'beauty',
    unitPriceMajor: 3500,
    durationMinutes: 150,
    currency: 'TRY',
    taxRateBps: 2000,
    commissionRateBps: 3000,
    packageEligible: false,
    keywords: ['balayage', 'balyaj', 'tonlama', 'boya', 'renklendirme'],
  },
  {
    id: 'cat-keratin-bakim',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Koltuk Başı Keratin Onarım Bakımı',
    category: 'beauty',
    unitPriceMajor: 1200,
    durationMinutes: 45,
    currency: 'TRY',
    taxRateBps: 2000,
    commissionRateBps: 2500,
    packageEligible: true,
    keywords: ['keratin', 'bakim', 'onarim', 'olaplex', 'maske'],
  },
  {
    id: 'cat-fon-kesim',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Tasarım Kesim & Fön',
    category: 'beauty',
    unitPriceMajor: 950,
    durationMinutes: 60,
    currency: 'TRY',
    taxRateBps: 2000,
    commissionRateBps: 3000,
    packageEligible: true,
    keywords: ['fon', 'kesim', 'sac kesimi', 'sekillendirme'],
  },
  {
    id: 'cat-serum-urun',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Keratin Serum 100ml (Ev Bakım Ürünü)',
    category: 'product',
    unitPriceMajor: 850,
    durationMinutes: 0,
    currency: 'TRY',
    taxRateBps: 2000,
    commissionRateBps: 1000,
    packageEligible: false,
    keywords: ['serum', 'urun', 'ev bakim', 'sampuan', 'sprey'],
  },
  {
    id: 'cat-zirkonyum-kron',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Zirkonyum Estetik Kron (Diş Başı)',
    category: 'clinical_ht',
    unitPriceMajor: 4800,
    durationMinutes: 90,
    currency: 'TRY',
    taxRateBps: 1000,
    commissionRateBps: 2500,
    packageEligible: true,
    keywords: ['zirkonyum', 'kron', 'kaplama', 'lamina', 'dis'],
  },
  {
    id: 'cat-panoramik-rontgen',
    tenantId: 'ten-atelier-nisantasi',
    name: '3D Panoramik Röntgen & Dijital Tarama',
    category: 'clinical_ht',
    unitPriceMajor: 1100,
    durationMinutes: 30,
    currency: 'TRY',
    taxRateBps: 1000,
    commissionRateBps: 1500,
    packageEligible: true,
    keywords: ['rontgen', 'panoramik', 'tarama', '3d', 'muayene'],
  },
  {
    id: 'cat-oto-bakim',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Periyodik Yağ & Filtre Bakımı',
    category: 'auto',
    unitPriceMajor: 2900,
    durationMinutes: 120,
    currency: 'TRY',
    taxRateBps: 2000,
    commissionRateBps: 2000,
    packageEligible: false,
    keywords: ['periyodik', 'yag', 'filtre', 'oto bakim', 'servis'],
  },
  {
    id: 'cat-fren-balata',
    tenantId: 'ten-atelier-nisantasi',
    name: 'Ön Fren Balata Değişimi & Kalibrasyon',
    category: 'auto',
    unitPriceMajor: 2400,
    durationMinutes: 90,
    currency: 'TRY',
    taxRateBps: 2000,
    commissionRateBps: 2000,
    packageEligible: false,
    keywords: ['fren', 'balata', 'disk', 'kalibrasyon'],
  },
];

export function normalizeTurkishText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/[^a-z0-9\s,+.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TURKISH_NUM_WORDS: Record<string, number> = {
  bir: 1,
  tek: 1,
  iki: 2,
  uc: 3,
  dort: 4,
  bes: 5,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
};

function extractQuantityFromClause(clauseNormalized: string): number {
  const digitMatch = clauseNormalized.match(/\b(\d{1,2})\s*(x|adet|dis|tane|seans)?\b/);
  if (digitMatch) {
    const val = parseInt(digitMatch[1], 10);
    if (val >= 1 && val <= 32) return val;
  }
  const tokens = clauseNormalized.split(' ');
  for (const tk of tokens) {
    if (TURKISH_NUM_WORDS[tk]) {
      return TURKISH_NUM_WORDS[tk];
    }
  }
  return 1;
}

/**
 * Matches spoken Turkish clinical / salon / auto utterances against the tenant's created service catalog.
 */
export function matchSpokenUtteranceToCatalog(
  transcript: string,
  catalog: PartnerCatalogItem[],
  options?: { packageActive?: boolean }
): VoiceCatalogMatchResult {
  const transcriptNormalized = normalizeTurkishText(transcript);
  if (!transcriptNormalized) {
    return { transcriptNormalized: '', matchedLines: [], unmatchedClauses: [] };
  }

  const rawClauses = transcriptNormalized
    .split(/[,+]|\bve\b|\bile\b|\bayrica\b/)
    .map((c) => c.trim())
    .filter(Boolean);

  const matchedLines: VoiceMatchedLine[] = [];
  const unmatchedClauses: string[] = [];

  for (const clause of rawClauses) {
    const clauseTokens = clause.split(' ').filter((w) => w.length >= 2);
    let bestItem: PartnerCatalogItem | null = null;
    let bestScore = 0;

    for (const item of catalog) {
      const normalizedName = normalizeTurkishText(item.name);
      const searchPool = [
        ...normalizedName.split(' '),
        ...item.keywords.map((k) => normalizeTurkishText(k)),
      ];

      let score = 0;
      for (const kw of item.keywords) {
        const nkw = normalizeTurkishText(kw);
        if (clause.includes(nkw)) {
          score += nkw.includes(' ') ? 3 : 2;
        }
      }
      for (const tk of clauseTokens) {
        if (searchPool.some((p) => p === tk || (p.length >= 4 && tk.startsWith(p.slice(0, 4))))) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    if (bestItem && bestScore >= 2) {
      const qty = extractQuantityFromClause(clause);
      const already = matchedLines.find((m) => m.catalogItem.id === bestItem!.id);
      if (already) {
        already.quantity += qty;
      } else {
        matchedLines.push({
          catalogItem: bestItem,
          quantity: qty,
          matchedClause: clause,
          confidence: Math.min(0.99, 0.72 + bestScore * 0.06),
          coveredByPackage: Boolean(options?.packageActive && bestItem.packageEligible),
        });
      }
    } else if (clause.length > 2) {
      unmatchedClauses.push(clause);
    }
  }

  return {
    transcriptNormalized,
    matchedLines,
    unmatchedClauses,
  };
}

export function buildItemizedCheckoutBreakdown(input: {
  appointmentId: string;
  customerName: string;
  admissionType: CompletedAppointmentBreakdown['admissionType'];
  currency?: 'TRY' | 'EUR' | 'USD' | 'GBP';
  matchedLines: VoiceMatchedLine[];
  optionalTipMajor?: number;
}): CompletedAppointmentBreakdown {
  const currency = input.currency || 'TRY';
  let grossSubtotalMajor = 0;
  let packageDiscountMajor = 0;
  let taxTotalMajor = 0;

  const lines: FolioBreakdownLine[] = input.matchedLines.map((ml) => {
    const subtotal = ml.catalogItem.unitPriceMajor * ml.quantity;
    grossSubtotalMajor += subtotal;
    const taxRateBps = ml.catalogItem.taxRateBps;

    if (ml.coveredByPackage) {
      packageDiscountMajor += subtotal;
      return {
        catalogItemId: ml.catalogItem.id,
        name: ml.catalogItem.name,
        category: ml.catalogItem.category,
        quantity: ml.quantity,
        unitPriceMajor: ml.catalogItem.unitPriceMajor,
        coveredByPackage: true,
        subtotalMajor: subtotal,
        taxRateBps,
        taxMajor: 0,
        lineTotalMajor: 0,
      };
    }

    const tax = Math.round((subtotal * taxRateBps) / 10000);
    taxTotalMajor += tax;
    return {
      catalogItemId: ml.catalogItem.id,
      name: ml.catalogItem.name,
      category: ml.catalogItem.category,
      quantity: ml.quantity,
      unitPriceMajor: ml.catalogItem.unitPriceMajor,
      coveredByPackage: false,
      subtotalMajor: subtotal,
      taxRateBps,
      taxMajor: tax,
      lineTotalMajor: subtotal + tax,
    };
  });

  const netPayableBeforeTipMajor = Math.max(
    0,
    grossSubtotalMajor - packageDiscountMajor + taxTotalMajor
  );
  const optionalTipMajor = Math.max(0, Math.round(input.optionalTipMajor ?? 0));

  return {
    breakdownId: `brk_${Date.now().toString(36)}`,
    appointmentId: input.appointmentId,
    customerName: input.customerName,
    admissionType: input.admissionType,
    currency,
    lines,
    grossSubtotalMajor,
    packageDiscountMajor,
    taxTotalMajor,
    netPayableBeforeTipMajor,
    optionalTipMajor,
    grandTotalMajor: netPayableBeforeTipMajor + optionalTipMajor,
    generatedAtIso: new Date().toISOString(),
    paidViaQr: false,
  };
}
