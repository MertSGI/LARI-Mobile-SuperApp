import React, { useState } from 'react';
import { Crown, Fingerprint, Gift, RefreshCw, Users } from 'lucide-react';
import { customer360Service } from '../../../services/customer360Service';
import { loyaltyReactivationService } from '../../../services/loyaltyReactivationService';
import { requireBiometricReauth } from '../../../services/mobile/nativeBridgeService';

export type Customer360Deps = { biometric?: typeof requireBiometricReauth; customer360?: Pick<typeof customer360Service, 'getCustomer360ViewSafe' | 'listSegmentsSafe'>; loyalty?: Pick<typeof loyaltyReactivationService, 'scanReactivationCohorts' | 'grantCustomerPackage'> };
export async function loadMobileCustomer360(input: { tenantId: string; customerId: string; staffOrUserId: string; biometricToken?: string }, deps: Customer360Deps = {}) { const auth = await (deps.biometric ?? requireBiometricReauth)({ tenantId: input.tenantId, staffOrUserId: input.staffOrUserId, scope: 'customer_360_pii', pinOrBiometricToken: input.biometricToken }); if (!auth.verified) throw new Error('BIOMETRIC_REAUTH_REQUIRED'); const svc = deps.customer360 ?? customer360Service; const [view, segments] = await Promise.all([svc.getCustomer360ViewSafe(input.tenantId, input.customerId), svc.listSegmentsSafe(input.tenantId)]); if (!view.success || !segments.success) throw new Error('CUSTOMER_360_FETCH_FAILED'); const highlighted = segments.data!.filter(s => ['vip', 'churn-risk', 'at-risk'].includes(s.name.toLowerCase())); return { auth, view: view.data, segments: highlighted }; }
export async function scanMobileReactivationCohorts(tenantId: string, days: 60 | 90, deps: Customer360Deps = {}) { return (deps.loyalty ?? loyaltyReactivationService).scanReactivationCohorts(tenantId, days); }
export async function grantMobileCustomerPackage(input: Parameters<typeof loyaltyReactivationService.grantCustomerPackage>[0], deps: Customer360Deps = {}) { return (deps.loyalty ?? loyaltyReactivationService).grantCustomerPackage(input); }

export const MobilePartnerCustomer360Page: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [reactivationQueued, setReactivationQueued] = useState(false);

  const handleUnlock = async () => {
    const auth = await requireBiometricReauth({
      tenantId: 'ten-1',
      staffOrUserId: 'staff-1',
      scope: 'customer_360_pii',
      pinOrBiometricToken: 'mobile-preview-biometric-verified',
    });
    if (auth.verified) setUnlocked(true);
  };

  return (
    <main className="space-y-4" data-testid="mobile-customer-360">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-400" />
            Müşteri 360 CRM & Geri Kazanım
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
            FaceID Korumalı
          </span>
        </div>

        {!unlocked ? (
          <button
            type="button"
            onClick={handleUnlock}
            style={{ minHeight: '46px' }}
            className="w-full rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-4 h-4" />
            Biyometrik Doğrulama ile PII / Harcama Özeti Aç
          </button>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="rounded-xl bg-slate-950 border border-amber-500/30 p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Selin Demir (VIP Segment)
                </p>
                <p className="text-slate-400 text-[11px]">Toplam Harcama: 18,450 TRY • 14 Ziyaret</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Sadık</span>
            </div>
            <button
              type="button"
              onClick={() => setReactivationQueued(true)}
              style={{ minHeight: '42px' }}
              className="w-full rounded-xl bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              {reactivationQueued ? '60 Günlük Kayıp Müşteri Kampanyası Kuyruğa Alındı (Outbox)' : '60 Günlük Kayıp Müşterileri Tara & Kampanya Gönder'}
            </button>
            <button
              type="button"
              style={{ minHeight: '42px' }}
              className="w-full rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-200 font-semibold flex items-center justify-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              Tek Tıkla 5 Seans Paketi Tanımla
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
export default MobilePartnerCustomer360Page;
