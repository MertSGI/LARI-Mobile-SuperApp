import React, { useMemo, useState } from 'react';
import {
  Barcode,
  BookPlus,
  Camera,
  CheckCircle2,
  Lock,
  Minus,
  Mic,
  MicOff,
  PackageCheck,
  Plus,
  QrCode,
  Receipt,
  ScanLine,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import { Role } from '../../../types';
import {
  calculatePosLineTotalsMinor,
  calculateStaffCommissionMinor,
  PosPaymentMethod,
} from '../../../services/posInventoryService';
import {
  QrCheckinAndReviewRegistry,
  QrVerificationResult,
} from '../../../services/mobile/qrCheckinService';
import { verifyPartnerMobileAccess } from './MobilePartnerAgendaAndInboxPage';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import {
  createMobileQrArtifact,
  MobileQrArtifact,
  QR_USAGE_SCENARIOS_BY_KIND,
} from '../../../services/mobile/lariQrEcosystemService';
import {
  buildItemizedCheckoutBreakdown,
  matchSpokenUtteranceToCatalog,
  PartnerCatalogItem,
  VoiceMatchedLine,
} from '../../../services/mobile/voiceCatalogMatcherService';
import LariQrCodeSvg from '../../../components/mobile/LariQrCodeSvg';
import PartnerQrCameraScannerModal from '../../../components/mobile/partner/PartnerQrCameraScannerModal';
import { sanitizeUserMessage } from '../../../services/mobile/mobileUiSanitizer';
import {
  convertFromTryMajor,
  convertToTryMajor,
  getCurrencySymbol,
} from '../../../services/mobile/mobileRegionCurrencyService';
import { resolvePartnerFeatureEntitlements } from '../../../services/mobile/mobilePackageEntitlementService';
import { MobilePersonaType } from '../../../services/mobile/mobileShellPolicyService';

export interface MobilePosCheckoutRequest {
  userRole: Role | 'guest';
  actorTenantId: string;
  orderTenantId: string;
  orderCurrency: 'TRY' | 'EUR' | 'USD' | 'GBP';
  paymentMethod: PosPaymentMethod;
  idempotencyKey: string;
  items: Array<{
    itemType: 'service' | 'product';
    name: string;
    productCurrency: 'TRY' | 'EUR' | 'USD' | 'GBP';
    unitPriceMinor: number;
    quantity: number;
    taxRateBps: number;
    commissionRateBps: number;
  }>;
  tipMinorUnits: number;
}

export interface MobilePosCheckoutResult {
  success: boolean;
  reasonCode:
    | 'ORDER_COMPLETED'
    | 'IDEMPOTENT_REPLAY'
    | 'FORBIDDEN_PARTNER_ROLE'
    | 'TENANT_MISMATCH'
    | 'CURRENCY_MISMATCH'
    | 'EXTERNAL_HOLD_PAYMENT_METHOD_BLOCKED'
    | 'IDEMPOTENCY_CONFLICT';
  totalMinorUnits: number;
  staffCommissionMinor: number;
  tipMinorUnits: number;
  executionAuthority: 'DB_AUTHORITATIVE' | 'LOCAL_SIMULATION' | 'EXTERNAL_HOLD';
}

export class PartnerMobilePosEngine {
  private readonly qrRegistry = new QrCheckinAndReviewRegistry();
  private readonly checkoutLedger = new Map<
    string,
    { fingerprint: string; result: MobilePosCheckoutResult }
  >();
  private readonly poLedger = new Map<string, string>();

  executeQrCheckin(params: {
    userRole: Role | 'guest';
    actorTenantId: string;
    targetTenantId: string;
    rawQrPayload: string;
    deductPackageCredit?: boolean;
    remainingPackageCredits?: number;
    nowIso?: string;
  }): {
    checkedIn: boolean;
    reasonCode: string;
    remainingCreditsAfter?: number;
    qrVerification?: QrVerificationResult;
  } {
    const access = verifyPartnerMobileAccess(
      params.userRole,
      params.actorTenantId,
      params.targetTenantId
    );
    if (!access.allowed) {
      return { checkedIn: false, reasonCode: access.reasonCode || 'FORBIDDEN' };
    }

    const qrRes = this.qrRegistry.verifyQrCheckinPass(
      params.rawQrPayload,
      params.targetTenantId,
      params.nowIso
    );
    if (!qrRes.valid) {
      return {
        checkedIn: false,
        reasonCode: qrRes.reasonCode,
        qrVerification: qrRes,
      };
    }

    let remainingCreditsAfter = params.remainingPackageCredits;
    if (params.deductPackageCredit && typeof remainingCreditsAfter === 'number') {
      if (remainingCreditsAfter <= 0) {
        return { checkedIn: false, reasonCode: 'INSUFFICIENT_PACKAGE_CREDITS' };
      }
      remainingCreditsAfter -= 1;
    }

    return {
      checkedIn: true,
      reasonCode: 'CHECKED_IN_AND_COMPLETED',
      remainingCreditsAfter,
      qrVerification: qrRes,
    };
  }

  checkoutMixedCart(req: MobilePosCheckoutRequest): MobilePosCheckoutResult {
    const access = verifyPartnerMobileAccess(
      req.userRole,
      req.actorTenantId,
      req.orderTenantId
    );
    if (!access.allowed) {
      return {
        success: false,
        reasonCode: access.reasonCode || 'FORBIDDEN_PARTNER_ROLE',
        totalMinorUnits: 0,
        staffCommissionMinor: 0,
        tipMinorUnits: 0,
        executionAuthority: 'LOCAL_SIMULATION',
      };
    }

    // ADIM034-POS-002: EXTERNAL_HOLD methods must fail closed
    if (
      req.paymentMethod === 'card_terminal_adapter' ||
      req.paymentMethod === 'customer_wallet'
    ) {
      return {
        success: false,
        reasonCode: 'EXTERNAL_HOLD_PAYMENT_METHOD_BLOCKED',
        totalMinorUnits: 0,
        staffCommissionMinor: 0,
        tipMinorUnits: 0,
        executionAuthority: 'EXTERNAL_HOLD',
      };
    }

    // ADIM034-POS-003: Strict currency parity
    for (const item of req.items) {
      if (item.productCurrency !== req.orderCurrency) {
        return {
          success: false,
          reasonCode: 'CURRENCY_MISMATCH',
          totalMinorUnits: 0,
          staffCommissionMinor: 0,
          tipMinorUnits: 0,
          executionAuthority: 'LOCAL_SIMULATION',
        };
      }
    }

    let totalMinorUnits = 0;
    let staffCommissionMinor = 0;
    for (const item of req.items) {
      const calc = calculatePosLineTotalsMinor({
        unitPriceMinorUnits: item.unitPriceMinor,
        quantity: item.quantity,
        taxRateBasisPoints: item.taxRateBps,
      });
      totalMinorUnits += calc.lineTotalMinorUnits;
      const comm = calculateStaffCommissionMinor({
        unitPriceMinorUnits: item.unitPriceMinor,
        quantity: item.quantity,
        commissionBasisPoints: item.commissionRateBps,
      });
      staffCommissionMinor += comm.commissionMinorUnits;
    }

    const fingerprint = JSON.stringify({
      tenant: req.orderTenantId,
      currency: req.orderCurrency,
      method: req.paymentMethod,
      totalMinorUnits,
      tipMinorUnits: req.tipMinorUnits,
    });

    const ledgerKey = `${req.orderTenantId}::${req.idempotencyKey}`;
    const existing = this.checkoutLedger.get(ledgerKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return {
          success: false,
          reasonCode: 'IDEMPOTENCY_CONFLICT',
          totalMinorUnits: 0,
          staffCommissionMinor: 0,
          tipMinorUnits: 0,
          executionAuthority: 'LOCAL_SIMULATION',
        };
      }
      return { ...existing.result, reasonCode: 'IDEMPOTENT_REPLAY' };
    }

    const res: MobilePosCheckoutResult = {
      success: true,
      reasonCode: 'ORDER_COMPLETED',
      totalMinorUnits,
      staffCommissionMinor,
      tipMinorUnits: req.tipMinorUnits,
      executionAuthority: 'LOCAL_SIMULATION',
    };
    this.checkoutLedger.set(ledgerKey, { fingerprint, result: res });
    return res;
  }

  receivePurchaseOrder(params: {
    userRole: Role | 'guest';
    actorTenantId: string;
    poTenantId: string;
    poId: string;
    idempotencyKey: string;
    items: Array<{ poItemId: string; quantity: number }>;
  }): { accepted: boolean; reasonCode: string } {
    const access = verifyPartnerMobileAccess(
      params.userRole,
      params.actorTenantId,
      params.poTenantId
    );
    if (!access.allowed) {
      return { accepted: false, reasonCode: access.reasonCode || 'FORBIDDEN' };
    }

    const canonical = params.items
      .slice()
      .sort((a, b) => a.poItemId.localeCompare(b.poItemId))
      .map((i) => `${i.poItemId}:${i.quantity}`)
      .join('|');
    const key = `${params.poTenantId}::${params.poId}::${params.idempotencyKey}`;
    const prev = this.poLedger.get(key);
    if (prev) {
      if (prev !== canonical) {
        return { accepted: false, reasonCode: 'IDEMPOTENCY_CONFLICT' };
      }
      return { accepted: true, reasonCode: 'IDEMPOTENT_REPLAY' };
    }
    this.poLedger.set(key, canonical);
    return { accepted: true, reasonCode: 'PO_RECEIVED' };
  }
}

export interface MobilePartnerPosAndInventoryPageProps {
  tenantId: string;
  userRole: Role | 'guest';
  language?: 'tr' | 'en';
  effectivePersona?: MobilePersonaType;
  onRequestPlanUpgrade?: () => void;
}

const uiPosEngine = new PartnerMobilePosEngine();

export const MobilePartnerPosAndInventoryPage: React.FC<
  MobilePartnerPosAndInventoryPageProps
> = ({ tenantId, userRole, effectivePersona, onRequestPlanUpgrade }) => {
  const {
    themeMode,
    partnerCatalog,
    partnerSubscription,
    admittedPatientSession,
    admitCustomerByQr,
    publishCheckoutBreakdown,
    addCatalogItem,
    removeCatalogItem,
    packageCreditsRemaining,
    selectedCurrency,
    showToast,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const entitlements = resolvePartnerFeatureEntitlements({
    partnerSubscription,
    effectivePersona,
  });

  const access = verifyPartnerMobileAccess(userRole, tenantId, tenantId);
  const currencySymbol = getCurrencySymbol(selectedCurrency);
  const [qrCameraOpen, setQrCameraOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(
    'Soft balayage, bir adet keratin bakım ve iki adet serum'
  );
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceUpgradePromptVisible, setVoiceUpgradePromptVisible] = useState(false);
  const [folioLines, setFolioLines] = useState<VoiceMatchedLine[]>([
    {
      catalogItem: partnerCatalog[0],
      quantity: 1,
      matchedClause: 'Başlangıç İşlemi',
      confidence: 1,
      coveredByPackage: false,
    },
  ]);
  const [tipPercent, setTipPercent] = useState<0 | 5 | 10 | 15>(0);
  const [generatedPaymentQr, setGeneratedPaymentQr] = useState<MobileQrArtifact | null>(null);
  const [storefrontPosterQr, setStorefrontPosterQr] = useState<MobileQrArtifact | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('1500');
  const [newItemKeywords, setNewItemKeywords] = useState('');
  const [newInventoryName, setNewInventoryName] = useState('');
  const [newInventoryPrice, setNewInventoryPrice] = useState('850');
  const [newInventoryStock, setNewInventoryStock] = useState('1');
  const [inventoryStockById, setInventoryStockById] = useState<Record<string, number>>({
    'cat-serum-urun': 12,
  });
  const [inventoryStockByName, setInventoryStockByName] = useState<
    Record<string, number>
  >({});
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [poStatus, setPoStatus] = useState<string | null>(null);
  const [checkoutLocked, setCheckoutLocked] = useState(false);
  const [poLocked, setPoLocked] = useState(false);

  const tenantCatalog = partnerCatalog.filter((item) => item.tenantId === tenantId);
  const inventoryItems = tenantCatalog.filter((item) => item.category === 'product');

  if (!access.allowed) {
    return (
      <div
        className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-xs text-rose-800 font-bold"
        data-testid="partner-pos-forbidden"
      >
        {sanitizeUserMessage(
          access.reasonCode,
          'Bu kasa ve stok ekranına erişim için yetkili Partner hesabı gereklidir.'
        )}
      </div>
    );
  }

  const cardSurface = isDark
    ? 'bg-slate-900 border-2 border-slate-700 text-white'
    : 'bg-white border-2 border-slate-300 text-slate-900';

  const innerSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-slate-100'
    : 'bg-[#F8FAFC] border-2 border-slate-200 text-slate-900';

  const packageActive =
    admittedPatientSession?.admissionType === 'package_qr' ||
    admittedPatientSession?.admissionType === 'health_tourism_qr';

  const liveBreakdown = useMemo(() => {
    const baseTipZero = buildItemizedCheckoutBreakdown({
      appointmentId: admittedPatientSession?.qrId || 'apt-partner-live',
      customerName: admittedPatientSession?.customerName || 'Selin Demir (Koltuk #2)',
      admissionType: admittedPatientSession?.admissionType || 'standard_qr',
      currency: 'TRY',
      matchedLines: folioLines,
      optionalTipMajor: 0,
    });
    const calculatedTip =
      tipPercent > 0 ? Math.round((baseTipZero.netPayableBeforeTipMajor * tipPercent) / 100) : 0;
    return buildItemizedCheckoutBreakdown({
      appointmentId: baseTipZero.appointmentId,
      customerName: baseTipZero.customerName,
      admissionType: baseTipZero.admissionType,
      currency: 'TRY',
      matchedLines: folioLines,
      optionalTipMajor: calculatedTip,
    });
  }, [folioLines, admittedPatientSession, tipPercent]);

  const handleSimulatePatientQrScan = (kind: 'ht' | 'package' | 'standard') => {
    const sampleQr = createMobileQrArtifact(
      kind === 'ht'
        ? {
            kind: 'ht_package_checkin',
            titleTr: 'Sağlık Turizmi VIP Klinik Kabul QR',
            subtitleTr: 'Elena Rostova (DE) • 20x Zirkonyum & Transfer Paketi',
            tenantId,
            customerId: 'cust-ht-elena',
            customerName: 'Elena Rostova (Sağlık Turizmi VIP)',
            htJourneyCode: 'HT-IST-2026-42',
            packageName: 'VIP Diş Estetiği + 5* Otel Paketi',
            remainingCredits: packageCreditsRemaining,
          }
        : kind === 'package'
          ? {
              kind: 'ht_package_checkin',
              titleTr: 'Çoklu Seans Paket Kabul QR',
              subtitleTr: 'Selin Demir • 8 Seans Bakım Paketi',
              tenantId,
              customerId: 'cust-pkg-selin',
              customerName: 'Selin Demir (Paketli Müşteri)',
              packageName: '8 Seans Medikal & Keratin Paketi',
              remainingCredits: packageCreditsRemaining,
            }
          : {
              kind: 'appointment_checkin',
              titleTr: 'Standart Randevu Check-in QR',
              subtitleTr: 'Burak Kaya • 14:30 Randevusu',
              tenantId,
              customerId: 'cust-std-burak',
              customerName: 'Burak Kaya',
              appointmentId: 'apt-burak-1430',
            }
    );
    admitCustomerByQr(sampleQr.rawPayload, tenantId);
  };

  const handleVoiceCatalogMatch = (textOverride?: string) => {
    if (!entitlements.voiceCatalogMatchEnabled) {
      setIsListeningVoice(false);
      setVoiceUpgradePromptVisible(true);
      return;
    }
    setVoiceUpgradePromptVisible(false);
    const inputStr = textOverride ?? voiceTranscript;
    const matchRes = matchSpokenUtteranceToCatalog(inputStr, partnerCatalog, {
      packageActive,
    });
    if (matchRes.matchedLines.length === 0) {
      showToast('Katalogda eşleşen işlem bulunamadı; lütfen işlem adını net söyleyin.');
      return;
    }
    setFolioLines((prev) => {
      const next = [...prev];
      for (const ml of matchRes.matchedLines) {
        const idx = next.findIndex((p) => p.catalogItem.id === ml.catalogItem.id);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + ml.quantity,
            coveredByPackage: ml.coveredByPackage,
          };
        } else {
          next.push(ml);
        }
      }
      return next;
    });
    showToast(
      `Sesli söylemden ${matchRes.matchedLines.length} katalog kalemi adisyona eklendi!`
    );
  };

  const handleStartMicrophone = () => {
    if (!entitlements.voiceCatalogMatchEnabled) {
      setIsListeningVoice(false);
      setVoiceUpgradePromptVisible(true);
      return;
    }
    setVoiceUpgradePromptVisible(false);
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsListeningVoice(false);
      handleVoiceCatalogMatch();
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'tr-TR';
      rec.interimResults = false;
      setIsListeningVoice(true);
      rec.onresult = (event: any) => {
        const spoken = event?.results?.[0]?.[0]?.transcript || '';
        if (spoken) {
          setVoiceTranscript(spoken);
          handleVoiceCatalogMatch(spoken);
        }
        setIsListeningVoice(false);
      };
      rec.onerror = () => {
        setIsListeningVoice(false);
        handleVoiceCatalogMatch();
      };
      rec.onend = () => setIsListeningVoice(false);
      rec.start();
    } catch {
      setIsListeningVoice(false);
      handleVoiceCatalogMatch();
    }
  };

  const handleAddManualCatalogItem = (item: PartnerCatalogItem) => {
    setFolioLines((prev) => {
      const idx = prev.findIndex((p) => p.catalogItem.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          catalogItem: item,
          quantity: 1,
          matchedClause: 'Katalogdan Seçildi',
          confidence: 1,
          coveredByPackage: Boolean(packageActive && item.packageEligible),
        },
      ];
    });
  };

  const handlePublishBreakdownAndPaymentQr = () => {
    const displayGrand = convertFromTryMajor(
      liveBreakdown.grandTotalMajor,
      selectedCurrency
    );
    const paymentQr = createMobileQrArtifact({
      kind: 'payment_checkout',
      titleTr: 'Randevu Sonu Fiyat Dökümü & Ödeme QR',
      subtitleTr: `${liveBreakdown.customerName} • ${displayGrand.toLocaleString('tr-TR')} ${currencySymbol}`,
      tenantId,
      customerName: liveBreakdown.customerName,
      appointmentId: liveBreakdown.appointmentId,
      payableAmountMajor: displayGrand,
      currency: selectedCurrency,
    });
    setGeneratedPaymentQr(paymentQr);
    publishCheckoutBreakdown(liveBreakdown, paymentQr);
  };

  const handleCreateCustomCatalogItem = () => {
    if (!newItemName.trim()) return;
    const parsedPrice = Math.max(10, parseInt(newItemPrice, 10) || 1000);
    const baseTryPrice = convertToTryMajor(parsedPrice, selectedCurrency);
    const kws = newItemKeywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    addCatalogItem({
      tenantId,
      name: newItemName.trim(),
      category: 'beauty',
      unitPriceMajor: baseTryPrice,
      currency: 'TRY',
      taxRateBps: 2000,
      commissionRateBps: 2500,
      packageEligible: true,
      keywords: kws.length > 0 ? kws : newItemName.trim().toLowerCase().split(' '),
    });
    setNewItemName('');
    setNewItemKeywords('');
  };

  const handleCreateInventoryProduct = () => {
    const name = newInventoryName.trim();
    const price = Number(newInventoryPrice);
    const stock = Number(newInventoryStock);
    if (
      !name ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      showToast('Ürün adı, geçerli fiyat ve sıfırdan küçük olmayan stok adedi girin.');
      return;
    }
    addCatalogItem({
      tenantId,
      name,
      category: 'product',
      unitPriceMajor: convertToTryMajor(price, selectedCurrency),
      durationMinutes: 0,
      currency: 'TRY',
      taxRateBps: 2000,
      commissionRateBps: 1000,
      packageEligible: false,
      keywords: name.toLocaleLowerCase('tr-TR').split(/\s+/),
    });
    setInventoryStockByName((current) => ({ ...current, [name]: stock }));
    setNewInventoryName('');
    setNewInventoryPrice('850');
    setNewInventoryStock('1');
  };

  const getInventoryStock = (item: PartnerCatalogItem) =>
    inventoryStockById[item.id] ?? inventoryStockByName[item.name] ?? 0;

  const handleAdjustInventoryStock = (item: PartnerCatalogItem, delta: number) => {
    setInventoryStockById((current) => ({
      ...current,
      [item.id]: Math.max(
        0,
        (current[item.id] ?? inventoryStockByName[item.name] ?? 0) + delta
      ),
    }));
  };

  const handleDeleteInventoryItem = (item: PartnerCatalogItem) => {
    setFolioLines((current) =>
      current.filter((line) => line.catalogItem.id !== item.id)
    );
    setInventoryStockById((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    removeCatalogItem(item.id);
  };

  const handleGenerateStorefrontQr = () => {
    const qr = createMobileQrArtifact({
      kind: 'storefront_poster',
      titleTr: 'İşletme Vitrin & Koltuk Randevu QR',
      subtitleTr: 'Atelier Nişantaşı • %0 Komisyon Doğrudan Mağaza',
      tenantId,
      tenantSlug: 'atelier-nisantasi',
    });
    setStorefrontPosterQr(qr);
    showToast('İşletme Vitrin QR kodu oluşturuldu!');
  };

  const handleCashCheckout = () => {
    if (checkoutLocked) return;
    setCheckoutLocked(true);
    setTimeout(() => setCheckoutLocked(false), 1800);
    const folioSig = folioLines
      .map((fl) => `${fl.catalogItem.id}:${fl.quantity}:${fl.coveredByPackage ? 1 : 0}`)
      .join('|');
    const convertedTipMajor =
      liveBreakdown.optionalTipMajor > 0
        ? convertFromTryMajor(liveBreakdown.optionalTipMajor, selectedCurrency)
        : 0;
    const res = uiPosEngine.checkoutMixedCart({
      userRole,
      actorTenantId: tenantId,
      orderTenantId: tenantId,
      orderCurrency: selectedCurrency,
      paymentMethod: 'cash',
      idempotencyKey: `ui-pos-${tenantId}-${selectedCurrency}-${folioSig}-${convertedTipMajor}`,
      items: folioLines.map((fl) => ({
        itemType: fl.catalogItem.category === 'product' ? 'product' : 'service',
        name: fl.catalogItem.name,
        productCurrency: selectedCurrency,
        unitPriceMinor: fl.coveredByPackage
          ? 0
          : convertFromTryMajor(fl.catalogItem.unitPriceMajor, selectedCurrency) * 100,
        quantity: fl.quantity,
        taxRateBps: fl.catalogItem.taxRateBps,
        commissionRateBps: fl.catalogItem.commissionRateBps,
      })),
      tipMinorUnits: convertedTipMajor * 100,
    });
    const totalDisp = Math.round(res.totalMinorUnits / 100);
    const tipDisp = Math.round(res.tipMinorUnits / 100);
    const commDisp = Math.round(res.staffCommissionMinor / 100);
    setCheckoutStatus(
      `${sanitizeUserMessage(res.reasonCode, 'Tahsilat durumu güncellendi.')} • Tahsilat: ${totalDisp.toLocaleString('tr-TR')} ${currencySymbol} • Bahşiş: ${tipDisp.toLocaleString('tr-TR')} ${currencySymbol} • Prim: ${commDisp.toLocaleString('tr-TR')} ${currencySymbol}`
    );
  };

  const handleBarcodePoReceive = () => {
    if (poLocked) return;
    setPoLocked(true);
    setTimeout(() => setPoLocked(false), 1800);
    const res = uiPosEngine.receivePurchaseOrder({
      userRole,
      actorTenantId: tenantId,
      poTenantId: tenantId,
      poId: 'po-2026-01',
      idempotencyKey: `po-ui-${tenantId}-po-2026-01`,
      items: [{ poItemId: 'serum-100ml', quantity: 12 }],
    });
    setPoStatus(sanitizeUserMessage(res.reasonCode, 'Stok alım kaydı işlendi.'));
  };

  return (
    <div className="space-y-4 pb-32" data-testid="mobile-partner-pos-page">
      {/* 1. QR İLE MÜŞTERİ KABULÜ (SAĞLIK TURİZMİ / PAKETLİ / STANDART) */}
      <div className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black flex items-center gap-1.5">
            <ScanLine className="w-5 h-5 text-[#4F46E5]" />
            QR ile Müşteri & Hasta Kabulü
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#EEF2FF] text-[#4338CA] border border-[#4F46E5]/30">
            {entitlements.healthTourismQrEnabled
              ? 'SAĞLIK TURİZMİ + PAKET'
              : 'STANDART + PAKET'}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Sağlık turizmi hastası veya çok seanslı paket müşterisinin QR kodunu okutarak kabul edin; paket hakkı otomatik düşülür.
        </p>

        <button
          type="button"
          onClick={() => setQrCameraOpen(true)}
          style={{ minHeight: '48px' }}
          className="w-full rounded-2xl bg-gradient-to-r from-[#1D1352] via-[#2C1A88] to-[#3B23C4] hover:opacity-95 text-white text-xs font-black px-4 py-3 flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
          data-testid="partner-open-qr-camera-btn"
        >
          <Camera className="w-4 h-4 text-[#16CFD1]" />
          <span>Kamerayla Müşteri QR Okut & Kabul Et</span>
        </button>

        <div
          className={`grid gap-2 ${
            entitlements.healthTourismQrEnabled ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {entitlements.healthTourismQrEnabled ? (
            <button
              type="button"
              onClick={() => handleSimulatePatientQrScan('ht')}
              style={{ minHeight: '44px' }}
              className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold px-2 py-2"
              data-testid="partner-admit-ht-qr-btn"
            >
              Sağlık Turizmi QR Kabul
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => handleSimulatePatientQrScan('package')}
            style={{ minHeight: '44px' }}
            className="rounded-xl bg-[#EEF2FF] border-2 border-[#4F46E5]/40 text-[#4338CA] text-xs font-bold px-2 py-2"
            data-testid="partner-admit-package-qr-btn"
          >
            Paketli Müşteri QR
          </button>
          <button
            type="button"
            onClick={() => handleSimulatePatientQrScan('standard')}
            style={{ minHeight: '44px' }}
            className={`rounded-xl border-2 text-xs font-bold px-2 py-2 ${innerSurface}`}
            data-testid="partner-admit-standard-qr-btn"
          >
            Standart Check-in
          </button>
        </div>

        <PartnerQrCameraScannerModal
          open={qrCameraOpen}
          isDark={isDark}
          healthTourismQrEnabled={entitlements.healthTourismQrEnabled}
          onClose={() => setQrCameraOpen(false)}
          onQrDetected={(rawPayload) => admitCustomerByQr(rawPayload, tenantId)}
          onQuickCameraScan={(kind) => handleSimulatePatientQrScan(kind)}
        />

        {admittedPatientSession && (
          <div
            className="rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-3 space-y-1 text-xs text-emerald-950"
            data-testid="partner-admitted-patient-banner"
          >
            <div className="flex items-center justify-between font-black">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Kabul Edildi: {admittedPatientSession.customerName}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px]">
                {admittedPatientSession.admissionType === 'health_tourism_qr'
                  ? 'VIP SAĞLIK TURİZMİ'
                  : admittedPatientSession.admissionType === 'package_qr'
                    ? 'PAKET HAKKI AKTİF'
                    : 'STANDART CHECK-IN'}
              </span>
            </div>
            {admittedPatientSession.packageName && (
              <p className="font-semibold">
                Paket: {admittedPatientSession.packageName} • Kalan Hak:{' '}
                <strong>{admittedPatientSession.remainingCreditsAfter ?? packageCreditsRemaining}</strong>
              </p>
            )}
            {admittedPatientSession.htJourneyCode && (
              <p className="text-[11px] font-mono">
                HT Dosya Kodu: {admittedPatientSession.htJourneyCode} • Pasaport PII Gizli (KVKK)
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. SESLİ SÖYLEMDE KATALOG EŞLEŞTİRME & CANLI İŞLEM ADİSYONU */}
      <div className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-black flex items-center gap-1.5">
            <Mic className="w-5 h-5 text-[#4F46E5]" />
            Sesli Söylemde Katalog Eşleştirme
          </span>
          <div className="flex max-w-[48%] flex-col items-end gap-1">
            <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-right text-[10px] font-bold text-[#4338CA]">
              Klinik &amp; Sağlık Turizmi
            </span>
            {!entitlements.voiceCatalogMatchEnabled ? (
              <span className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-right text-[10px] font-black text-amber-800">
                Paket Yükseltme Gerekli
              </span>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Kabul edilen müşteriye uygulanan işlemleri sesle söyleyin; sistem işletme kataloğunuzla otomatik eşleştirip fiyat dökümüne ekler.
        </p>

        {entitlements.voiceCatalogMatchEnabled ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Örn: Zirkonyum kron 2 diş ve panoramik röntgen yapıldı..."
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold ${innerSurface}`}
                data-testid="partner-voice-transcript-input"
              />
              <button
                type="button"
                onClick={handleStartMicrophone}
                style={{ minHeight: '44px' }}
                className={`px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 ${
                  isListeningVoice
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white'
                }`}
                data-testid="partner-voice-match-btn"
              >
                {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListeningVoice ? 'Dinleniyor...' : 'Sesle Eşle'}
              </button>
            </div>

            {/* Instant Spoken Command Examples across Industries */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                {
                  label: 'Kuaför: Balayage + 2 Serum',
                  text: 'Soft balayage, iki adet serum ve keratin bakım uygulandı',
                },
                {
                  label: 'Klinik/HT: 2 Zirkonyum + Röntgen',
                  text: '2 adet zirkonyum kron ve panoramik röntgen çekildi',
                },
                {
                  label: 'Oto Servis: Periyodik + Balata',
                  text: 'Periyodik yağ bakımı ve ön fren balata değişimi yapıldı',
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setVoiceTranscript(preset.text);
                    handleVoiceCatalogMatch(preset.text);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-bold whitespace-nowrap ${innerSurface}`}
                >
                  <Sparkles className="w-3 h-3 inline mr-1 text-[#4F46E5]" />
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setVoiceUpgradePromptVisible((prev) => !prev)}
              style={{ minHeight: '46px' }}
              className={`w-full rounded-2xl border-2 px-3.5 py-2.5 text-left transition flex items-center justify-between gap-2 ${
                isDark
                  ? 'border-indigo-500/40 bg-slate-800/90 text-indigo-100'
                  : 'border-indigo-200 bg-[#EEF2FF]/80 text-[#312E81]'
              }`}
              data-testid="partner-voice-match-btn"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white">
                  <Mic className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black truncate">
                    Sesli Söylem Özelliğini İncele
                  </span>
                  <span className="block text-[11px] opacity-80 truncate">
                    Konuşarak katalog kalemi ve fiyat dökümü oluşturma önizlemesi
                  </span>
                </span>
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-100 border border-amber-300 px-2 py-1 text-[10px] font-black text-amber-900">
                <Lock className="w-3 h-3" />
                Yükselt
              </span>
            </button>

            {voiceUpgradePromptVisible ? (
              <div
                className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3.5 space-y-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                data-testid="partner-voice-upgrade-gate"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900">
                      <Sparkles className="w-3 h-3" />
                      ÖZELLİK ÖNİZLEMESİ
                    </span>
                    <p className="mt-1 text-xs font-black">
                      Sesli Söylemde Katalog Eşleştirme Nasıl Çalışır?
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-300/80 bg-white/90 dark:bg-slate-900/90 p-2.5 space-y-2 text-[11px]">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    🎙️ Örnek Sesli Komut:{' '}
                    <span className="italic text-[#4F46E5]">
                      &ldquo;Soft balayage, 2 adet serum ve keratin bakım uygulandı&rdquo;
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-[#EEF2FF] px-2 py-0.5 font-black text-[#4338CA]">
                      ✓ 1x Soft Balayage
                    </span>
                    <span className="rounded-lg bg-[#EEF2FF] px-2 py-0.5 font-black text-[#4338CA]">
                      ✓ 2x Onarıcı Serum
                    </span>
                    <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-black text-emerald-700">
                      ✓ 1x Keratin (Paket Kapsamı)
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold leading-relaxed">
                  Sesli Söylemde Katalog Eşleştirme özelliği <strong>Klinik ve Sağlık Turizmi (PRO)</strong> paketlerinde aktiftir.
                </p>
                <button
                  type="button"
                  onClick={onRequestPlanUpgrade}
                  className="min-h-10 w-full rounded-xl bg-amber-700 hover:bg-amber-800 px-3 text-xs font-black text-white transition"
                >
                  Paketini Yükselt & Özelliği Aktif Et
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Matched Live Folio Items + Price Breakdown */}
        <div
          className={`rounded-2xl p-3 space-y-2 ${innerSurface}`}
          data-testid="partner-live-breakdown-card"
        >
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#4F46E5]" />
              Randevu Sonu İşlem & Fiyat Dökümü
            </span>
            <span>{liveBreakdown.lines.length} Kalem</span>
          </div>

          {folioLines.map((fl) => (
            <div
              key={fl.catalogItem.id}
              className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">
                  {fl.quantity}x {fl.catalogItem.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {fl.coveredByPackage
                    ? 'Paket Kapsamında Düşüldü (Ücretsiz)'
                    : `${convertFromTryMajor(fl.catalogItem.unitPriceMajor, selectedCurrency).toLocaleString('tr-TR')} ${currencySymbol}/br + KDV`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-black">
                  {fl.coveredByPackage
                    ? `0 ${currencySymbol}`
                    : `${convertFromTryMajor(fl.catalogItem.unitPriceMajor * fl.quantity, selectedCurrency).toLocaleString('tr-TR')} ${currencySymbol}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFolioLines((prev) =>
                      prev.filter((item) => item.catalogItem.id !== fl.catalogItem.id)
                    )
                  }
                  aria-label="Kalemi kaldır"
                  className="p-1 text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Optional Tip Controls (Strictly Default 0 TRY!) */}
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                Bahşiş Seçeneği (Tamamen İsteğe Bağlı):
              </span>
              <span className="font-black text-[#4F46E5]">
                {liveBreakdown.optionalTipMajor === 0
                  ? `Bahşiş Yok (0 ${currencySymbol})`
                  : `+${convertFromTryMajor(liveBreakdown.optionalTipMajor, selectedCurrency).toLocaleString('tr-TR')} ${currencySymbol}`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([0, 5, 10, 15] as const).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPercent(pct)}
                  className={`py-1.5 rounded-lg text-xs font-bold border-2 ${
                    tipPercent === pct
                      ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                      : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  {pct === 0 ? 'İstemiyorum' : `%${pct}`}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t-2 border-slate-300 dark:border-slate-700 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Ara Toplam (Paket Öncesi)</span>
              <span>
                {convertFromTryMajor(liveBreakdown.grossSubtotalMajor, selectedCurrency).toLocaleString('tr-TR')}{' '}
                {currencySymbol}
              </span>
            </div>
            {liveBreakdown.packageDiscountMajor > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paket / HT Hakkı Düşümü</span>
                <span>
                  -{convertFromTryMajor(liveBreakdown.packageDiscountMajor, selectedCurrency).toLocaleString('tr-TR')}{' '}
                  {currencySymbol}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>KDV Toplamı</span>
              <span>
                {convertFromTryMajor(liveBreakdown.taxTotalMajor, selectedCurrency).toLocaleString('tr-TR')}{' '}
                {currencySymbol}
              </span>
            </div>
            <div className="flex justify-between text-base font-black pt-1">
              <span>Ödenecek Genel Toplam</span>
              <span className="text-[#4F46E5]">
                {convertFromTryMajor(liveBreakdown.grandTotalMajor, selectedCurrency).toLocaleString('tr-TR')}{' '}
                {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={handlePublishBreakdownAndPaymentQr}
            style={{ minHeight: '46px' }}
            className="w-full rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm"
            data-testid="partner-publish-breakdown-qr-btn"
          >
            <QrCode className="w-4 h-4" />
            Randevuyu Bitir, Fiyat Dökümü Gönder & Ödeme QR Üret
          </button>

          <button
            type="button"
            disabled={checkoutLocked}
            onClick={handleCashCheckout}
            style={{ minHeight: '44px' }}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2"
            data-testid="partner-pos-cash-checkout-btn"
          >
            <ShoppingBag className="w-4 h-4" />
            Nakit Kasa Tahsilatı & Uzman Primi İşle
          </button>
        </div>

        {checkoutStatus && (
          <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {checkoutStatus}
          </p>
        )}

        {generatedPaymentQr && (
          <div
            className={`rounded-2xl p-4 space-y-2.5 text-center ${innerSurface}`}
            data-testid="partner-generated-payment-qr"
          >
            <span className="text-xs font-black text-[#4F46E5] block">
              MÜŞTERİ ÖDEME & FİYAT DÖKÜMÜ QR HAZIR
            </span>
            <div className="flex justify-center">
              <LariQrCodeSvg payload={generatedPaymentQr.rawPayload} sizePx={136} />
            </div>
            <div className="text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 space-y-1">
              <span className="text-[11px] font-black uppercase text-slate-500">
                Bu QR Nerelerde Kullanılır?
              </span>
              {generatedPaymentQr.usageScenariosTr.map((u) => (
                <p key={u} className="text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{u}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. İŞLETME KATALOĞU YÖNETİMİ & VİTRİN QR OLUŞTURUCU */}
      <div className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black flex items-center gap-1.5">
            <BookPlus className="w-5 h-5 text-[#4F46E5]" />
            İşletme Kataloğu & Vitrin QR Oluşturucu
          </span>
          <span className="text-xs font-bold text-slate-500">
            {tenantCatalog.length} Kayıt
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tenantCatalog.slice(0, 6).map((catItem) => (
            <button
              key={catItem.id}
              type="button"
              onClick={() => handleAddManualCatalogItem(catItem)}
              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold whitespace-nowrap flex items-center gap-1 ${innerSurface}`}
            >
              <Plus className="w-3.5 h-3.5 text-[#4F46E5]" />
              {catItem.name} (
              {convertFromTryMajor(catItem.unitPriceMajor, selectedCurrency).toLocaleString(
                'tr-TR'
              )}{' '}
              {currencySymbol})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Yeni işlem adı"
            className={`col-span-2 rounded-xl px-3 py-2 text-xs font-medium ${innerSurface}`}
          />
          <input
            type="number"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            placeholder={currencySymbol}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${innerSurface}`}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemKeywords}
            onChange={(e) => setNewItemKeywords(e.target.value)}
            placeholder="Sesli anahtar kelimeler (virgülle)"
            className={`flex-1 rounded-xl px-3 py-2 text-xs ${innerSurface}`}
          />
          <button
            type="button"
            onClick={handleCreateCustomCatalogItem}
            className="px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-black"
          >
            Kataloğa Ekle
          </button>
        </div>

        <div className="space-y-2.5 border-t-2 border-slate-200 pt-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black">
              <ShoppingBag className="h-4 w-4 text-[#4F46E5]" />
              Hızlı Stok / Envanter
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              {inventoryItems.length} ürün
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newInventoryName}
              onChange={(event) => setNewInventoryName(event.target.value)}
              placeholder="Yeni ürün adı"
              aria-label="Yeni stok ürünü adı"
              className={`col-span-2 min-h-10 rounded-xl px-3 text-xs font-medium ${innerSurface}`}
              data-testid="partner-inventory-name-input"
            />
            <input
              type="number"
              min="1"
              value={newInventoryPrice}
              onChange={(event) => setNewInventoryPrice(event.target.value)}
              placeholder={`Fiyat (${currencySymbol})`}
              aria-label="Yeni stok ürünü fiyatı"
              className={`min-h-10 rounded-xl px-3 text-xs font-medium ${innerSurface}`}
              data-testid="partner-inventory-price-input"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={newInventoryStock}
              onChange={(event) => setNewInventoryStock(event.target.value)}
              placeholder="Stok"
              aria-label="Yeni stok ürünü adedi"
              className={`min-h-10 rounded-xl px-3 text-xs font-medium ${innerSurface}`}
              data-testid="partner-inventory-stock-input"
            />
            <button
              type="button"
              onClick={handleCreateInventoryProduct}
              className="col-span-2 min-h-11 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white"
              data-testid="partner-inventory-add-btn"
            >
              Ürünü Stoğa Ekle
            </button>
          </div>

          <div className="space-y-2">
            {inventoryItems.map((item) => {
              const stock = getInventoryStock(item);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-xl p-2.5 ${innerSurface}`}
                  data-testid={`partner-inventory-item-${item.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black">{item.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {convertFromTryMajor(item.unitPriceMajor, selectedCurrency).toLocaleString(
                        'tr-TR'
                      )}{' '}
                      {currencySymbol} • Stok: {stock}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${item.name} stok azalt`}
                      onClick={() => handleAdjustInventoryStock(item, -1)}
                      disabled={stock === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                      data-testid={`partner-inventory-decrement-${item.id}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${item.name} stok artır`}
                      onClick={() => handleAdjustInventoryStock(item, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300 bg-white text-emerald-700"
                      data-testid={`partner-inventory-increment-${item.id}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${item.name} stok kalemini sil`}
                      onClick={() => handleDeleteInventoryItem(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                      data-testid={`partner-inventory-delete-${item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-700 space-y-2.5">
          <button
            type="button"
            onClick={handleGenerateStorefrontQr}
            style={{ minHeight: '44px' }}
            className="w-full rounded-xl bg-[#EEF2FF] border-2 border-[#4F46E5]/40 text-[#4338CA] text-xs font-black flex items-center justify-center gap-2"
            data-testid="partner-generate-storefront-qr-btn"
          >
            <Store className="w-4 h-4" />
            İşletme Vitrin / Koltuk Randevu QR Oluştur (%0 Komisyon)
          </button>

          {storefrontPosterQr && (
            <div className={`rounded-2xl p-3.5 space-y-2 ${innerSurface}`}>
              <div className="flex items-center gap-3">
                <LariQrCodeSvg payload={storefrontPosterQr.rawPayload} sizePx={96} />
                <div className="space-y-1 text-xs min-w-0">
                  <p className="font-black">Vitrin & Masa QR Hazır</p>
                  {QR_USAGE_SCENARIOS_BY_KIND.storefront_poster.map((s) => (
                    <p key={s} className="text-[11px] text-slate-500">
                      • {s}
                    </p>
                  ))}
                  <button
                    type="button"
                    onClick={() => showToast('Vitrin QR linki panoya kopyalandı!')}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#4F46E5]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Linki Paylaş
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. REGÜLATİF SINIR & PO BARKOD KABUL */}
      <div className={`rounded-3xl p-4 space-y-2.5 shadow-sm ${cardSurface}`}>
        <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Fiziksel kart terminali entegrasyonu hazırlık aşamasındadır; QR/Nakit tahsilat ve kalem dökümü tam çalışır.
          </span>
        </div>

        <span className="text-xs font-black flex items-center gap-1.5 pt-1">
          <PackageCheck className="w-4 h-4 text-[#4F46E5]" />
          Tedarikçi PO Barkodlu Mal Kabulü
        </span>
        <button
          type="button"
          disabled={poLocked}
          onClick={handleBarcodePoReceive}
          style={{ minHeight: '44px' }}
          className="w-full rounded-xl bg-[#EEF2FF] border-2 border-[#4F46E5]/30 text-[#4338CA] text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="partner-po-receive-btn"
        >
          <Barcode className="w-4 h-4" />
          PO-2026-01 (12x Serum) Barkod Okut & Stoğa Al
        </button>
        {poStatus && (
          <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            Sonuç: {poStatus}
          </p>
        )}
      </div>
    </div>
  );
};

export default MobilePartnerPosAndInventoryPage;
