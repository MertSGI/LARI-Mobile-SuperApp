import { Role } from '../../types';
import { getDataSourceMode } from '../dataSourceConfig';

export type MobileShellMode = 'b2c_customer' | 'b2b_partner';

export type MobilePersonaType =
  | 'salon_customer'
  | 'clinic_patient'
  | 'ht_patient'
  | 'salon_partner'
  | 'clinic_practitioner'
  | 'ht_coordinator';

export type MobileCapabilityTier =
  | 'LIVE_ACTIVE'
  | 'LOCAL_OR_SANDBOX_ONLY'
  | 'DISABLED_EXTERNAL_HOLD';

export interface MobileVerticalEntitlements {
  eligible: boolean;
  clinicEnabled: boolean;
  healthTourismEnabled: boolean;
  posInventoryEnabled: boolean;
  loyaltyWalletEnabled: boolean;
  aiVisualizerEnabled: boolean;
}

export interface MobileTabDescriptor {
  id: string;
  labelTr: string;
  labelEn: string;
  iconName: string;
  routePath: string;
  minTouchTargetPx: number;
  requiresBiometricGate: boolean;
  capabilityTier: MobileCapabilityTier;
  badgeText?: string;
}

export interface MobileShellResolutionInput {
  userRole: Role | 'guest' | null;
  requestedMode?: MobileShellMode;
  requestedPersona?: MobilePersonaType;
  verticals: MobileVerticalEntitlements;
  whiteLabelLockedTenantSlug?: string | null;
  activeLanguage?: 'tr' | 'en';
}

export interface MobileShellResolutionResult {
  effectiveMode: MobileShellMode;
  effectivePersona: MobilePersonaType;
  modeSwitchAllowed: boolean;
  modeRejectionReason?: 'FORBIDDEN_PARTNER_ROLE' | 'COMMERCIAL_ELIGIBILITY_REQUIRED' | 'VERTICAL_NOT_ENABLED';
  whiteLabelStorefrontLock: {
    active: boolean;
    lockedTenantSlug: string | null;
    competitorDiscoveryHidden: boolean;
    marketplaceCommissionBps: number;
  };
  layoutMetrics: {
    safeAreaTopCss: string;
    safeAreaBottomCss: string;
    minTouchTargetPx: number;
    horizontalOverflowPolicy: 'hidden';
  };
  tabs: MobileTabDescriptor[];
  availablePersonas: MobilePersonaType[];
  honestCapabilitySummary: Record<string, MobileCapabilityTier>;
}

const PARTNER_ALLOWED_ROLES: ReadonlySet<string> = new Set([
  'tenant_owner',
  'staff',
  'super_admin',
]);

export function resolveHonestCapabilityTier(
  featureKey:
    | 'core_booking_and_qr'
    | 'waitlist_and_resources'
    | 'pos_cash_and_inventory'
    | 'pos_card_terminal_and_wallet'
    | 'clinic_phi_workspace'
    | 'health_tourism_concierge'
    | 'live_sms_whatsapp_push'
    | 'ai_style_and_clinical_draft'
): MobileCapabilityTier {
  let isSupabase = false;
  try {
    isSupabase = getDataSourceMode() === 'supabase';
  } catch {
    isSupabase = false;
  }
  switch (featureKey) {
    case 'core_booking_and_qr':
    case 'waitlist_and_resources':
    case 'pos_cash_and_inventory':
      return isSupabase ? 'LIVE_ACTIVE' : 'LOCAL_OR_SANDBOX_ONLY';
    case 'clinic_phi_workspace':
    case 'health_tourism_concierge':
    case 'ai_style_and_clinical_draft':
      return 'LOCAL_OR_SANDBOX_ONLY';
    case 'pos_card_terminal_and_wallet':
    case 'live_sms_whatsapp_push':
      return 'DISABLED_EXTERNAL_HOLD';
  }
}

export function resolveMobileShellState(
  input: MobileShellResolutionInput
): MobileShellResolutionResult {
  const role = input.userRole ?? 'guest';
  const canAccessPartner = PARTNER_ALLOWED_ROLES.has(role);

  let effectiveMode: MobileShellMode = 'b2c_customer';
  let modeSwitchAllowed = true;
  let modeRejectionReason: MobileShellResolutionResult['modeRejectionReason'];

  if (input.requestedMode === 'b2b_partner') {
    if (!canAccessPartner) {
      effectiveMode = 'b2c_customer';
      modeSwitchAllowed = false;
      modeRejectionReason = 'FORBIDDEN_PARTNER_ROLE';
    } else {
      effectiveMode = 'b2b_partner';
    }
  }

  const eligibleVerticals: MobileVerticalEntitlements = input.verticals.eligible
    ? input.verticals
    : {
        eligible: false,
        clinicEnabled: false,
        healthTourismEnabled: false,
        posInventoryEnabled: false,
        loyaltyWalletEnabled: false,
        aiVisualizerEnabled: false,
      };

  const availablePersonas: MobilePersonaType[] = ['salon_customer'];
  if (eligibleVerticals.clinicEnabled) {
    availablePersonas.push('clinic_patient');
  }
  if (eligibleVerticals.healthTourismEnabled) {
    availablePersonas.push('ht_patient');
  }

  if (canAccessPartner) {
    availablePersonas.push('salon_partner');
    if (eligibleVerticals.clinicEnabled) {
      availablePersonas.push('clinic_practitioner');
    }
    if (eligibleVerticals.healthTourismEnabled) {
      availablePersonas.push('ht_coordinator');
    }
  }

  let effectivePersona: MobilePersonaType =
    effectiveMode === 'b2b_partner' ? 'salon_partner' : 'salon_customer';

  if (input.requestedPersona) {
    const reqP = input.requestedPersona;
    const isPartnerPersona =
      reqP === 'salon_partner' || reqP === 'clinic_practitioner' || reqP === 'ht_coordinator';

    if (isPartnerPersona && !canAccessPartner) {
      modeSwitchAllowed = false;
      modeRejectionReason = 'FORBIDDEN_PARTNER_ROLE';
    } else if (
      (reqP === 'clinic_patient' || reqP === 'clinic_practitioner') &&
      !eligibleVerticals.clinicEnabled
    ) {
      modeSwitchAllowed = false;
      modeRejectionReason = input.verticals.eligible
        ? 'VERTICAL_NOT_ENABLED'
        : 'COMMERCIAL_ELIGIBILITY_REQUIRED';
    } else if (
      (reqP === 'ht_patient' || reqP === 'ht_coordinator') &&
      !eligibleVerticals.healthTourismEnabled
    ) {
      modeSwitchAllowed = false;
      modeRejectionReason = input.verticals.eligible
        ? 'VERTICAL_NOT_ENABLED'
        : 'COMMERCIAL_ELIGIBILITY_REQUIRED';
    } else {
      effectivePersona = reqP;
      effectiveMode = isPartnerPersona ? 'b2b_partner' : 'b2c_customer';
    }
  }

  const lockedSlug = input.whiteLabelLockedTenantSlug?.trim() || null;
  const whiteLabelLock = {
    active: Boolean(lockedSlug),
    lockedTenantSlug: lockedSlug,
    competitorDiscoveryHidden: Boolean(lockedSlug),
    marketplaceCommissionBps: 0,
  };

  const tabs: MobileTabDescriptor[] =
    effectiveMode === 'b2c_customer'
      ? buildB2cTabs(effectivePersona, eligibleVerticals, whiteLabelLock.active, lockedSlug)
      : buildB2bPartnerTabs(effectivePersona, eligibleVerticals);

  return {
    effectiveMode,
    effectivePersona,
    modeSwitchAllowed,
    modeRejectionReason,
    whiteLabelStorefrontLock: whiteLabelLock,
    layoutMetrics: {
      safeAreaTopCss: 'env(safe-area-inset-top, 0px)',
      safeAreaBottomCss: 'env(safe-area-inset-bottom, 0px)',
      minTouchTargetPx: 44,
      horizontalOverflowPolicy: 'hidden',
    },
    tabs,
    availablePersonas,
    honestCapabilitySummary: {
      core_booking_and_qr: resolveHonestCapabilityTier('core_booking_and_qr'),
      waitlist_and_resources: resolveHonestCapabilityTier('waitlist_and_resources'),
      pos_cash_and_inventory: resolveHonestCapabilityTier('pos_cash_and_inventory'),
      pos_card_terminal_and_wallet: resolveHonestCapabilityTier('pos_card_terminal_and_wallet'),
      clinic_phi_workspace: resolveHonestCapabilityTier('clinic_phi_workspace'),
      health_tourism_concierge: resolveHonestCapabilityTier('health_tourism_concierge'),
      live_sms_whatsapp_push: resolveHonestCapabilityTier('live_sms_whatsapp_push'),
      ai_style_and_clinical_draft: resolveHonestCapabilityTier('ai_style_and_clinical_draft'),
    },
  };
}

function buildB2cTabs(
  persona: MobilePersonaType,
  verticals: MobileVerticalEntitlements,
  isWhiteLabelLocked: boolean,
  lockedSlug: string | null
): MobileTabDescriptor[] {
  const firstTab: MobileTabDescriptor = isWhiteLabelLocked
    ? {
        id: 'storefront',
        labelTr: 'Mağaza Vitrini',
        labelEn: 'Storefront',
        iconName: 'Store',
        routePath: `/m/storefront/${lockedSlug}`,
        minTouchTargetPx: 48,
        requiresBiometricGate: false,
        capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
        badgeText: '%0 Komisyon',
      }
    : {
        id: 'explore',
        labelTr: 'Ana Sayfa',
        labelEn: 'Home',
        iconName: 'Compass',
        routePath: '/m/explore',
        minTouchTargetPx: 48,
        requiresBiometricGate: false,
        capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
      };

  const qrTab: MobileTabDescriptor = {
    id: 'wallet',
    labelTr: 'Randevu & QR',
    labelEn: 'Wallet & QR',
    iconName: 'QrCode',
    routePath: '/m/wallet',
    minTouchTargetPx: 48,
    requiresBiometricGate: false,
    capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
    badgeText: 'Offline',
  };

  const socialFeedTab: MobileTabDescriptor = {
    id: 'social_feed',
    labelTr: 'Keşfet & Akış',
    labelEn: 'Discover Feed',
    iconName: 'Flame',
    routePath: '/m/discover-feed',
    minTouchTargetPx: 48,
    requiresBiometricGate: false,
    capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
  };

  const quickBookTab: MobileTabDescriptor = {
    id: 'quick_book',
    labelTr: 'Hızlı Randevu',
    labelEn: 'Quick Book',
    iconName: 'CalendarPlus',
    routePath: '/m/book',
    minTouchTargetPx: 52,
    requiresBiometricGate: false,
    capabilityTier: resolveHonestCapabilityTier('waitlist_and_resources'),
  };

  const profileTab: MobileTabDescriptor = {
    id: 'profile',
    labelTr: 'Profil & KVKK',
    labelEn: 'Profile & Privacy',
    iconName: 'UserCheck',
    routePath: '/m/profile',
    minTouchTargetPx: 48,
    requiresBiometricGate: false,
    capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
  };

  if (persona === 'ht_patient' && verticals.healthTourismEnabled) {
    return [
      firstTab,
      qrTab,
      socialFeedTab,
      {
        id: 'ht_concierge',
        labelTr: 'VIP Seyahat & Teklif',
        labelEn: 'Medical Concierge',
        iconName: 'Plane',
        routePath: '/m/concierge',
        minTouchTargetPx: 48,
        requiresBiometricGate: false,
        capabilityTier: resolveHonestCapabilityTier('health_tourism_concierge'),
        badgeText: 'EUR/USD',
      },
      profileTab,
    ];
  }

  return [
    firstTab,
    quickBookTab,
    socialFeedTab,
    qrTab,
    profileTab,
  ];
}

function buildB2bPartnerTabs(
  persona: MobilePersonaType,
  verticals: MobileVerticalEntitlements
): MobileTabDescriptor[] {
  const fourthTab: MobileTabDescriptor =
    persona === 'clinic_practitioner' && verticals.clinicEnabled
      ? {
          id: 'clinic_phi',
          labelTr: 'Klinik Muayene (PHI)',
          labelEn: 'Clinic PHI',
          iconName: 'Stethoscope',
          routePath: '/m/partner/clinic',
          minTouchTargetPx: 48,
          requiresBiometricGate: true,
          capabilityTier: resolveHonestCapabilityTier('clinic_phi_workspace'),
          badgeText: 'FaceID',
        }
      : persona === 'ht_coordinator' && verticals.healthTourismEnabled
        ? {
            id: 'ht_lead_ops',
            labelTr: 'HT Lead & Teklif',
            labelEn: 'HT Lead Ops',
            iconName: 'Globe2',
            routePath: '/m/partner/ht-leads',
            minTouchTargetPx: 48,
            requiresBiometricGate: false,
            capabilityTier: resolveHonestCapabilityTier('health_tourism_concierge'),
            badgeText: 'AI Skor',
          }
        : {
            id: 'customer_360',
            labelTr: 'Müşteri 360 CRM',
            labelEn: 'Customer 360',
            iconName: 'Users',
            routePath: '/m/partner/customer360',
            minTouchTargetPx: 48,
            requiresBiometricGate: true,
            capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
          };

  return [
    {
      id: 'partner_agenda',
      labelTr: 'Cep Ajanda',
      labelEn: 'Mobile Agenda',
      iconName: 'CalendarClock',
      routePath: '/m/partner/agenda',
      minTouchTargetPx: 48,
      requiresBiometricGate: false,
      capabilityTier: resolveHonestCapabilityTier('waitlist_and_resources'),
    },
    {
      id: 'partner_inbox',
      labelTr: 'Onay & Waitlist',
      labelEn: 'Approvals',
      iconName: 'Inbox',
      routePath: '/m/partner/inbox',
      minTouchTargetPx: 48,
      requiresBiometricGate: false,
      capabilityTier: resolveHonestCapabilityTier('waitlist_and_resources'),
    },
    {
      id: 'partner_pos',
      labelTr: 'QR & Cep POS',
      labelEn: 'QR & POS',
      iconName: 'ScanLine',
      routePath: '/m/partner/pos',
      minTouchTargetPx: 52,
      requiresBiometricGate: false,
      capabilityTier: resolveHonestCapabilityTier('pos_cash_and_inventory'),
    },
    fourthTab,
    {
      id: 'partner_switch',
      labelTr: 'Salon & Mod',
      labelEn: 'Salon & Mode',
      iconName: 'Sliders',
      routePath: '/m/partner/settings',
      minTouchTargetPx: 48,
      requiresBiometricGate: false,
      capabilityTier: resolveHonestCapabilityTier('core_booking_and_qr'),
    },
  ];
}
