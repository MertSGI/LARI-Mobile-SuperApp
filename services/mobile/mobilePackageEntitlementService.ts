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
  requiredUpgradeForVoice: string;
  requiredUpgradeForAi: string;
  requiredUpgradeForHtQr: string;
}

/**
 * Resolves package-based feature gates across Partner QR Admission,
 * Voice Catalog Matching, and Embedded AI Image Processing.
 */
export function resolvePartnerFeatureEntitlements(input: {
  partnerSubscription?: PartnerSubscriptionSnapshot | null;
  effectivePersona?: MobilePersonaType;
}): PartnerFeatureEntitlements {
  const persona = input.effectivePersona ?? 'salon_partner';
  const rawPlanId = (input.partnerSubscription?.planId || '') as string;
  const category = (input.partnerSubscription?.category || '').toLocaleLowerCase('tr-TR');

  let effectivePlanId: PartnerPackageTierId = 'baslangic';
  let effectivePlanLabel = 'Başlangıç (999 TRY)';

  if (persona === 'ht_coordinator' || rawPlanId === 'health_tourism') {
    effectivePlanId = 'health_tourism';
    effectivePlanLabel = input.partnerSubscription?.planName || 'Sağlık Turizmi';
  } else if (persona === 'clinic_practitioner' || rawPlanId === 'clinic') {
    effectivePlanId = 'clinic';
    effectivePlanLabel = input.partnerSubscription?.planName || 'Klinik';
  } else if (
    rawPlanId === 'kurumsal' ||
    rawPlanId === 'premium' ||
    rawPlanId === 'professional' ||
    rawPlanId === 'standart' ||
    rawPlanId === 'baslangic'
  ) {
    effectivePlanId = rawPlanId;
    effectivePlanLabel = input.partnerSubscription?.planName || rawPlanId;
  } else if (category.includes('diş') || category.includes('estetik') || category.includes('klinik')) {
    effectivePlanId = 'clinic';
    effectivePlanLabel = 'Klinik';
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

  return {
    effectivePlanId,
    effectivePlanLabel,
    standardQrCheckinVisible: true,
    packageQrCheckinVisible: true,
    healthTourismQrEnabled,
    voiceCatalogMatchEnabled,
    aiVisualizerEnabled,
    aiVisualizerActiveOnStorefront: aiVisualizerEnabled,
    requiredUpgradeForVoice: 'Klinik veya Sağlık Turizmi Paketi',
    requiredUpgradeForAi: 'Profesyonel veya Klinik / Sağlık Turizmi Paketi',
    requiredUpgradeForHtQr: 'Sağlık Turizmi Paketi',
  };
}
