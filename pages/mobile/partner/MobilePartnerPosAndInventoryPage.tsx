import React, { useState } from 'react';
import {
  Barcode,
  CheckCircle2,
  PackageCheck,
  QrCode,
  ShieldAlert,
  ShoppingBag,
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
}

const uiPosEngine = new PartnerMobilePosEngine();

export const MobilePartnerPosAndInventoryPage: React.FC<
  MobilePartnerPosAndInventoryPageProps
> = ({ tenantId, userRole, language = 'tr' }) => {
  const access = verifyPartnerMobileAccess(userRole, tenantId, tenantId);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [poStatus, setPoStatus] = useState<string | null>(null);

  if (!access.allowed) {
    return (
      <div
        className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700"
        data-testid="partner-pos-forbidden"
      >
        Erişim Engellendi: {access.reasonCode}
      </div>
    );
  }

  const handleCashCheckout = () => {
    const res = uiPosEngine.checkoutMixedCart({
      userRole,
      actorTenantId: tenantId,
      orderTenantId: tenantId,
      orderCurrency: 'TRY',
      paymentMethod: 'cash',
      idempotencyKey: `ui-pos-${Date.now()}`,
      items: [
        {
          itemType: 'service',
          name: 'Soft Balayage',
          productCurrency: 'TRY',
          unitPriceMinor: 350000,
          quantity: 1,
          taxRateBps: 2000,
          commissionRateBps: 3000,
        },
        {
          itemType: 'product',
          name: 'Keratin Serum 100ml',
          productCurrency: 'TRY',
          unitPriceMinor: 85000,
          quantity: 1,
          taxRateBps: 2000,
          commissionRateBps: 1000,
        },
      ],
      tipMinorUnits: 20000,
    });
    setCheckoutStatus(
      `${res.reasonCode} • Toplam: ${(res.totalMinorUnits / 100).toFixed(2)} TRY • Prim: ${(res.staffCommissionMinor / 100).toFixed(2)} TRY`
    );
  };

  const handleBarcodePoReceive = () => {
    const res = uiPosEngine.receivePurchaseOrder({
      userRole,
      actorTenantId: tenantId,
      poTenantId: tenantId,
      poId: 'po-2026-01',
      idempotencyKey: `po-ui-${Date.now()}`,
      items: [{ poItemId: 'serum-100ml', quantity: 12 }],
    });
    setPoStatus(res.reasonCode);
  };

  return (
    <div className="space-y-4 text-[#111827]" data-testid="mobile-partner-pos-page">
      <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-[#5B5FEF]" />
            {language === 'tr'
              ? 'Kamera QR Check-in & Karma Sepet Cep POS'
              : 'QR Check-in & Mixed-Cart Mobile POS'}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            LOCAL_SIMULATION
          </span>
        </div>

        <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-3 text-xs space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Soft Balayage (Hizmet)</span>
            <span className="font-bold text-[#111827]">3,500.00 TRY</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Keratin Serum 100ml (Barkod Ürün)</span>
            <span className="font-bold text-[#111827]">850.00 TRY</span>
          </div>
          <div className="flex justify-between text-emerald-700 pt-1 border-t border-slate-200">
            <span>Uzman Bahşişi</span>
            <span className="font-bold">+200.00 TRY</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCashCheckout}
          style={{ minHeight: '46px' }}
          className="w-full rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
          data-testid="partner-pos-cash-checkout-btn"
        >
          <ShoppingBag className="w-4 h-4" />
          Nakit Sepet Tahsilatı & Prim İşle
        </button>

        {checkoutStatus && (
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {checkoutStatus}
          </p>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Fiziksel Kart Terminali (card_terminal_adapter) ve Müşteri Cüzdanı
            otomatik çekimi canlı PSP kimliği gelene kadar EXTERNAL_HOLD
            kapsamındadır.
          </span>
        </div>
      </div>

      {/* Mobile Barcode PO Receiving */}
      <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-sm">
        <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
          <PackageCheck className="w-4 h-4 text-[#5B5FEF]" />
          Tedarikçi PO Barkodlu Mal Kabulü
        </span>
        <button
          type="button"
          onClick={handleBarcodePoReceive}
          style={{ minHeight: '44px' }}
          className="w-full rounded-xl bg-[#EEF0FF] hover:bg-indigo-100 text-[#4338CA] text-xs font-bold flex items-center justify-center gap-2"
          data-testid="partner-po-receive-btn"
        >
          <Barcode className="w-4 h-4" />
          PO-2026-01 (12x Serum) Barkod Okut & Stoğa Al
        </button>
        {poStatus && (
          <p className="text-[11px] text-emerald-700 font-semibold">Sonuç: {poStatus}</p>
        )}
      </div>
    </div>
  );
};

export default MobilePartnerPosAndInventoryPage;
