import { PartnerSubscriptionSnapshot } from '../../contexts/MobileAppSessionContext';
import { MobilePersonaType } from './mobileShellPolicyService';

export type PartnerPackageTierId =
  | 'baslangic'
  | 'standart'
  | 'professional'
  | 'premium'
  | 'kurumsal'
  | 'clinic'
  | 'health_tourism';

export interface PartnerFeatureEntitlements {
  effectivePlanId: PartnerPackageTierId;
  effectivePlanLabel: string;
  standardQrCheckinVisible: true;
  packageQrCheckinVisible: true;
  healthTourismQrEnabled: boolean;
  voiceCatalogMatchEnabled: boolean;
  aiVisualizerEnabled: boolean;
  aiVisualizerActiveOnStorefront: boolean;
  clinicPersonaAllowed: boolean;
  htPersonaAllowed: boolean;
  requiredUpgradeForVoice: string;
  requiredUpgradeForAi: string;
  requiredUpgradeForHtQr: string;
}

/**
 * Resolves package-based feature gates across Partner QR Admission,
 * Voice Catalog Matching, and Embedded AI Image Processing.
 * SECURITY INVARIANT: When an active `partnerSubscription` exists, `planId`
 * is strictly authoritative — demo persona switching CANNOT bypass paid tiers.
 */
export function resolvePartnerFeatureEntitlements(input: {
  partnerSubscription?: PartnerSubscriptionSnapshot | null;
  effectivePersona?: MobilePersonaType;
}): PartnerFeatureEntitlements {
  const persona = input.effectivePersona ?? 'salon_partner';
  const rawPlanId = (input.partnerSubscription?.planId || '') as string;
  const hasExplicitSubscription = Boolean(input.partnerSubscription && rawPlanId);

  let effectivePlanId: PartnerPackageTierId = 'baslangic';
  let effectivePlanLabel = 'Başlangıç (999 TRY)';

  if (hasExplicitSubscription) {
    if (
      rawPlanId === 'kurumsal' ||
      rawPlanId === 'premium' ||
      rawPlanId === 'professional' ||
      rawPlanId === 'standart' ||
      rawPlanId === 'baslangic' ||
      rawPlanId === 'clinic' ||
      rawPlanId === 'health_tourism'
    ) {
      effectivePlanId = rawPlanId;
      effectivePlanLabel = input.partnerSubscription?.planName || rawPlanId;
    }
  } else {
    // Unsubscribed local preview owner switching personas before plan selection:
    // salon_partner stays at basic/non-HT; clinic_practitioner / ht_coordinator preview their verticals.
    if (persona === 'ht_coordinator') {
      effectivePlanId = 'health_tourism';
      effectivePlanLabel = 'Sağlık Turizmi';
    } else if (persona === 'clinic_practitioner') {
      effectivePlanId = 'clinic';
      effectivePlanLabel = 'Klinik';
    }
  }

  // Health Tourism QR Admission: visible ONLY for Health Tourism or Kurumsal packages
  const healthTourismQrEnabled =
    effectivePlanId === 'health_tourism' || effectivePlanId === 'kurumsal';

  // Voice-to-Catalog Match: active ONLY on Clinic and Health Tourism packages (plus Kurumsal)
  const voiceCatalogMatchEnabled =
    effectivePlanId === 'clinic' ||
    effectivePlanId === 'health_tourism' ||
    effectivePlanId === 'kurumsal';

  // AI Image Visualizer in Storefront Settings: active on Profesyonel, Premium, Kurumsal, Clinic, Health Tourism
  const aiVisualizerEnabled =
    effectivePlanId === 'professional' ||
    effectivePlanId === 'premium' ||
    effectivePlanId === 'kurumsal' ||
    effectivePlanId === 'clinic' ||
    effectivePlanId === 'health_tourism';

  const clinicPersonaAllowed = hasExplicitSubscription
    ? effectivePlanId === 'clinic' ||
      effectivePlanId === 'health_tourism' ||
      effectivePlanId === 'kurumsal'
    : true;

  const htPersonaAllowed = hasExplicitSubscription
    ? effectivePlanId === 'health_tourism' || effectivePlanId === 'kurumsal'
    : true;

  return {
    effectivePlanId,
    effectivePlanLabel,
    standardQrCheckinVisible: true,
    packageQrCheckinVisible: true,
    healthTourismQrEnabled,
    voiceCatalogMatchEnabled,
    aiVisualizerEnabled,
    aiVisualizerActiveOnStorefront: aiVisualizerEnabled,
    clinicPersonaAllowed,
    htPersonaAllowed,
    requiredUpgradeForVoice: 'Klinik veya Sağlık Turizmi Paketi',
    requiredUpgradeForAi: 'Profesyonel veya Klinik / Sağlık Turizmi Paketi',
    requiredUpgradeForHtQr: 'Sağlık Turizmi Paketi',
  };
}
