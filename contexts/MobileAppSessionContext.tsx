import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DecodedQrAdmissionResult,
  MobileQrArtifact,
  verifyMobileQrTokenOrPayload,
} from '../services/mobile/lariQrEcosystemService';
import {
  CompletedAppointmentBreakdown,
  INITIAL_PARTNER_CATALOG,
  PartnerCatalogItem,
} from '../services/mobile/voiceCatalogMatcherService';
import {
  DEFAULT_USER_PROFILE,
  convertFromTryMajor,
  getStorefrontEditLockStatus,
  MobileUserProfile,
  resolveDefaultCurrencyForLocation,
  SupportedCurrency,
} from '../services/mobile/mobileRegionCurrencyService';
import {
  continueMobileWithSocialProvider,
  getActiveMobileAuthUser,
  isMobileExplicitlySignedOut,
  loginMobileWithEmail,
  logoutMobileAccount,
  MobileAuthActionResult,
  MobileAuthUser,
  MobileRegistrationPayload,
  refreshMobileAuthUserFromTrustedSource,
  registerMobileAccount,
  updateMobileAuthUserRole,
} from '../services/mobile/mobileAuthService';
import {
  mobileCoreBridgeService,
  MobilePartnerUpgradeResult,
} from '../services/mobile/mobileCoreBridgeService';

const VALID_CURRENCIES: readonly SupportedCurrency[] = ['TRY', 'USD', 'EUR', 'GBP'];

function isValidStaffMember(item: unknown): item is PartnerStaffMember {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const s = item as Partial<PartnerStaffMember>;
  return (
    typeof s.id === 'string' &&
    s.id.length > 0 &&
    typeof s.name === 'string' &&
    typeof s.specialty === 'string' &&
    typeof s.active === 'boolean' &&
    typeof s.available === 'boolean' &&
    typeof s.commissionRate === 'number' &&
    Number.isFinite(s.commissionRate) &&
    typeof s.shiftHours === 'string'
  );
}

function isValidPartnerCampaign(item: unknown): item is PartnerCampaign {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const c = item as Partial<PartnerCampaign>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.code === 'string' &&
    typeof c.discountPercent === 'number' &&
    Number.isFinite(c.discountPercent) &&
    typeof c.active === 'boolean'
  );
}

function parseStoredArray<T extends object>(
  key: string,
  fallback: T[],
  guard?: (item: unknown) => item is T
): T[] {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const clean = parsed.filter((item): item is T =>
      guard
        ? guard(item)
        : typeof item === 'object' && item !== null && !Array.isArray(item)
    );
    if (parsed.length > 0 && clean.length !== parsed.length) {
      return clean.length > 0 ? clean : fallback;
    }
    return clean;
  } catch {
    return fallback;
  }
}

function parseStoredObject<T extends object>(
  key: string,
  fallback: T,
  fieldValidators?: Partial<Record<keyof T, (v: unknown) => boolean>>
): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fallback;
    }
    const obj = parsed as Record<string, unknown>;
    const next = { ...fallback };
    (Object.keys(fallback) as Array<keyof T>).forEach((prop) => {
      const val = obj[prop as string];
      if (val === undefined) return;
      const validator = fieldValidators?.[prop];
      if (validator) {
        if (validator(val)) next[prop] = val as T[keyof T];
      } else if (typeof val === typeof fallback[prop]) {
        next[prop] = val as T[keyof T];
      }
    });
    return next;
  } catch {
    return fallback;
  }
}

function parseStoredScheduleMap<K extends string>(
  key: string,
  fallback: Record<K, BusinessHoursSchedule>
): Record<K, BusinessHoursSchedule> {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fallback;
    }
    const obj = parsed as Record<string, Partial<BusinessHoursSchedule> | undefined>;
    const merged = { ...fallback };
    (Object.keys(fallback) as K[]).forEach((dayKey) => {
      const candidate = obj[dayKey];
      if (
        candidate &&
        typeof candidate === 'object' &&
        typeof candidate.open === 'boolean' &&
        typeof candidate.openTime === 'string' &&
        typeof candidate.closeTime === 'string'
      ) {
        merged[dayKey] = {
          label: typeof candidate.label === 'string' ? candidate.label : fallback[dayKey].label,
          open: candidate.open,
          openTime: candidate.openTime,
          closeTime: candidate.closeTime,
        };
      }
    });
    return merged;
  } catch {
    return fallback;
  }
}
import { sanitizeUserMessage } from '../services/mobile/mobileUiSanitizer';

export interface MobileActiveBooking {
  appointmentId: string;
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  branchLabel: string;
  serviceName: string;
  serviceCategory?: string;
  specialistName: string;
  scheduledDate: string;
  scheduledTime: string;
  priceMajor: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';
  hospitalityDrink: string;
  quietSession: boolean;
  attachedStyleNote?: string;
}

export interface MobilePassportEntry {
  id: string;
  businessName: string;
  serviceTitle: string;
  dateLabel: string;
  formulaOrProtocol: string;
  specialistName: string;
  specialistNote: string;
}

export type ConfirmBookingInput = Omit<MobileActiveBooking, 'status'>;

export interface AdmittedPatientSession {
  qrId: string;
  customerName: string;
  admissionType: 'standard_qr' | 'package_qr' | 'health_tourism_qr';
  packageName?: string;
  remainingCreditsAfter?: number;
  htJourneyCode?: string;
  admittedAtIso: string;
}

export interface MobileCustomSocialPost {
  postId: string;
  tenantSlug: string;
  businessName: string;
  specialist: string;
  caption: string;
  serviceTag: string;
  photoUrl: string;
  baseLikes: number;
}

export type PublishSocialPostInput = Omit<
  MobileCustomSocialPost,
  'postId' | 'baseLikes'
>;

export interface PartnerSubscriptionSnapshot {
  planId: string;
  planName: string;
  billingPeriod: 'monthly' | 'annual';
  businessName: string;
  category: string;
  city: string;
  district: string;
  ownerName: string;
  staffName?: string;
  vkn?: string;
  accentColor?: string;
  coverPhotoUrl?: string;
  tagline?: string;
  whatsappNumber?: string;
  trialDays?: number;
  activatedAtIso: string;
}

export interface UpgradePartnerInput {
  planId: string;
  planName: string;
  billingPeriod: 'monthly' | 'annual';
  businessName: string;
  category: string;
  city: string;
  district: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  staffName?: string;
  vkn?: string;
  accentColor?: string;
  coverPhotoUrl?: string;
  tagline?: string;
  whatsappNumber?: string;
  trialDays?: number;
  initialServiceName?: string;
  initialServicePrice?: number;
  initialServiceDuration?: number;
}

export interface PartnerStorefrontCustomization {
  businessName: string;
  tagline: string;
  accentColor: string;
  coverPhotoUrl: string;
  whatsappNumber: string;
}

export const DEFAULT_STOREFRONT_CUSTOMIZATION: PartnerStorefrontCustomization = {
  businessName: 'Atelier Nişantaşı Hair & Spa',
  tagline: 'Kişiye özel renk tasarımı, keratin ritüeli ve dijital pasaport takibi.',
  accentColor: '#4F46E5',
  coverPhotoUrl: '',
  whatsappNumber: '905325550140',
};

export interface PartnerStaffMember {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  available: boolean;
  commissionRate: number;
  workDaysLabel: string;
  shiftHours: string;
}

export type BusinessHoursKey = 'weekdays' | 'saturday' | 'sunday';
export type DailyBusinessHoursKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface BusinessHoursSchedule {
  label: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

export interface PartnerCampaign {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export const INITIAL_PARTNER_STAFF: PartnerStaffMember[] = [
  {
    id: 'staff-merve',
    name: 'Merve Yılmaz',
    specialty: 'Renk & Balayage Uzmanı',
    active: true,
    available: true,
    commissionRate: 25,
    workDaysLabel: 'Pzt–Cmt',
    shiftHours: '09:30–19:30',
  },
  {
    id: 'staff-ece',
    name: 'Dr. Ece Aksoy',
    specialty: 'Medikal Estetik & Lazer',
    active: true,
    available: true,
    commissionRate: 30,
    workDaysLabel: 'Pzt–Cum',
    shiftHours: '10:00–18:30',
  },
  {
    id: 'staff-kemal',
    name: 'Kemal Usta',
    specialty: 'Kıdemli Bakım & Keratin',
    active: true,
    available: false,
    commissionRate: 20,
    workDaysLabel: 'Sal–Paz',
    shiftHours: '10:00–20:00',
  },
];

export const INITIAL_GROUPED_HOURS: Record<BusinessHoursKey, BusinessHoursSchedule> = {
  weekdays: {
    label: 'Hafta İçi (Pzt-Cum)',
    open: true,
    openTime: '09:30',
    closeTime: '20:00',
  },
  saturday: {
    label: 'Cumartesi',
    open: true,
    openTime: '10:00',
    closeTime: '19:00',
  },
  sunday: {
    label: 'Pazar',
    open: false,
    openTime: '11:00',
    closeTime: '17:00',
  },
};

export const INITIAL_DAILY_HOURS: Record<DailyBusinessHoursKey, BusinessHoursSchedule> = {
  monday: { label: 'Pazartesi', open: true, openTime: '09:30', closeTime: '20:00' },
  tuesday: { label: 'Salı', open: true, openTime: '09:30', closeTime: '20:00' },
  wednesday: { label: 'Çarşamba', open: true, openTime: '09:30', closeTime: '20:00' },
  thursday: { label: 'Perşembe', open: true, openTime: '09:30', closeTime: '20:00' },
  friday: { label: 'Cuma', open: true, openTime: '09:30', closeTime: '20:00' },
  saturday: { label: 'Cumartesi', open: true, openTime: '10:00', closeTime: '19:00' },
  sunday: { label: 'Pazar', open: false, openTime: '11:00', closeTime: '17:00' },
};

export const INITIAL_PARTNER_CAMPAIGNS: PartnerCampaign[] = [
  { id: 'camp-hosgeldin15', code: 'HOSGELDIN15', discountPercent: 15, active: true },
  { id: 'camp-vip-sessiz', code: 'SESSIZVIP', discountPercent: 10, active: false },
];

export function slugifyBusinessName(name: string): string {
  const ascii = (name || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'atelier-nisantasi';
}

export interface MobileAppSessionValue {
  themeMode: 'light' | 'dark';
  activeBooking: MobileActiveBooking | null;
  bookingHistory: MobileActiveBooking[];
  passportEntries: MobilePassportEntry[];
  loyaltyPoints: number;
  stampCount: number;
  walletBalanceMinor: number;
  toastMessage: string | null;
  partnerCatalog: PartnerCatalogItem[];
  packageCreditsRemaining: number;
  admittedPatientSession: AdmittedPatientSession | null;
  completedBreakdown: CompletedAppointmentBreakdown | null;
  activePaymentQr: MobileQrArtifact | null;
  likedSocialPosts: string[];
  savedSocialPosts: string[];
  customVenuePhotos: Record<string, string[]>;
  customSocialPosts: MobileCustomSocialPost[];
  partnerSubscription: PartnerSubscriptionSnapshot | null;
  liveAppointmentStage: 1 | 2 | 3 | 4;
  liveStagesByAppointmentId: Record<string, 1 | 2 | 3 | 4>;
  getLiveStageForAppointment: (appointmentId?: string) => 1 | 2 | 3 | 4;
  partnerStaffMembers: PartnerStaffMember[];
  setPartnerStaffMembers: React.Dispatch<React.SetStateAction<PartnerStaffMember[]>>;
  addPartnerStaffMember: (
    tenantId: string,
    input: Omit<PartnerStaffMember, 'id'>
  ) => Promise<void>;
  updatePartnerStaffMember: (
    tenantId: string,
    staffId: string,
    patch: Partial<Omit<PartnerStaffMember, 'id'>>
  ) => Promise<void>;
  removePartnerStaffMember: (tenantId: string, staffId: string) => Promise<void>;
  partnerGroupedHours: Record<BusinessHoursKey, BusinessHoursSchedule>;
  setPartnerGroupedHours: React.Dispatch<React.SetStateAction<Record<BusinessHoursKey, BusinessHoursSchedule>>>;
  updatePartnerGroupedHours: (
    tenantId: string,
    hours: Record<BusinessHoursKey, BusinessHoursSchedule>
  ) => Promise<void>;
  partnerDailyHours: Record<DailyBusinessHoursKey, BusinessHoursSchedule>;
  setPartnerDailyHours: React.Dispatch<React.SetStateAction<Record<DailyBusinessHoursKey, BusinessHoursSchedule>>>;
  updatePartnerDailyHours: (
    tenantId: string,
    hours: Record<DailyBusinessHoursKey, BusinessHoursSchedule>
  ) => Promise<void>;
  partnerDailyHoursMode: boolean;
  setPartnerDailyHoursMode: React.Dispatch<React.SetStateAction<boolean>>;
  partnerCampaigns: PartnerCampaign[];
  setPartnerCampaigns: React.Dispatch<React.SetStateAction<PartnerCampaign[]>>;
  savePartnerCampaign: (tenantId: string, campaign: PartnerCampaign) => Promise<void>;
  removePartnerCampaign: (campaignId: string) => Promise<void>;
  userProfile: MobileUserProfile;
  selectedCurrency: SupportedCurrency;
  sessionScopeKey: string;
  mobileAuthUser: MobileAuthUser | null;
  isExplicitlySignedOut: boolean;
  authModalOpen: boolean;
  authModalInitialTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string, password: string) => Promise<MobileAuthActionResult>;
  registerAccount: (payload: MobileRegistrationPayload) => Promise<MobileAuthActionResult>;
  continueWithSocial: (input: {
    provider: 'google' | 'apple';
    email: string;
    fullName?: string;
  }) => Promise<MobileAuthActionResult>;
  logoutMobileSession: () => Promise<void>;
  storefrontCustomization: PartnerStorefrontCustomization;
  storefrontLastEditedAtIso: string | null;
  saveStorefrontCustomization: (
    patch: Partial<PartnerStorefrontCustomization>
  ) => Promise<{ accepted: boolean; reasonCode?: string; countdownText?: string }>;
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleThemeMode: () => void;
  showToast: (message: string) => void;
  confirmBooking: (input: ConfirmBookingInput) => Promise<{
    accepted: boolean;
    reasonCode?: 'SAME_CATEGORY_DAILY_CONFLICT' | 'CORE_PERSISTENCE_FAILED';
    message?: string;
  }>;
  checkSameDayCategoryConflict: (
    scheduledDate: string,
    serviceName: string,
    serviceCategory?: string
  ) => { conflict: boolean; conflictingService?: string; message?: string };
  updateUserProfile: (nextProfile: MobileUserProfile) => void;
  setSelectedCurrency: (currency: SupportedCurrency) => void;
  rescheduleActiveBooking: (
    newDate: string,
    newTime: string
  ) => Promise<{
    accepted: boolean;
    reasonCode?: 'SAME_CATEGORY_DAILY_CONFLICT' | 'CORE_PERSISTENCE_FAILED';
    message?: string;
  }>;
  cancelActiveBooking: (
    reason?: string
  ) => Promise<{ accepted: boolean; reasonCode?: 'CORE_PERSISTENCE_FAILED' }>;
  setHospitalityPreferences: (drink: string, quiet: boolean) => void;
  appendPassportFormula: (entry: MobilePassportEntry) => void;
  addLoyaltyPoints: (delta: number) => void;
  incrementStamp: () => void;
  redeemGiftCode: (code: string) => void;
  addCatalogItem: (item: Omit<PartnerCatalogItem, 'id'>) => Promise<void>;
  updateCatalogItem: (
    id: string,
    patch: Partial<Omit<PartnerCatalogItem, 'id'>>
  ) => Promise<void>;
  removeCatalogItem: (id: string) => Promise<void>;
  admitCustomerByQr: (rawPayload: string, expectedTenantId?: string) => DecodedQrAdmissionResult;
  publishCheckoutBreakdown: (breakdown: CompletedAppointmentBreakdown, paymentQr: MobileQrArtifact) => void;
  completeQrPayment: (optionalTipMajor: number) => void;
  toggleLikeSocialPost: (postId: string) => void;
  toggleSaveSocialPost: (postId: string) => void;
  addVenuePhoto: (tenantSlug: string, photoUrl: string) => void;
  removeVenuePhoto: (tenantSlug: string, photoUrl: string) => void;
  publishSocialPost: (post: PublishSocialPostInput) => void;
  upgradeToPartnerAccount: (
    input: UpgradePartnerInput
  ) => Promise<MobilePartnerUpgradeResult>;
  updateLiveAppointmentStage: (
    stage: 1 | 2 | 3 | 4,
    actorRole: string,
    appointmentId?: string
  ) => void;
}

const INITIAL_PASSPORT_ENTRIES: MobilePassportEntry[] = [
  {
    id: 'passport-soft-balayage-2026-10-15',
    businessName: 'Atelier Nişantaşı Hair & Spa',
    serviceTitle: 'Soft Balayage',
    dateLabel: '15 Ekim 2026',
    formulaOrProtocol:
      'Dip 7.1 Küllü Kumral (20 Vol) + Uçlar 9.12 Soğuk Bej Tonlama + Olaplex No.1/No.2',
    specialistName: 'Merve Yılmaz',
    specialistNote:
      'Saç uçları ince telli; ısı işlemi öncesi Keratin Serum uygulanmalı.',
  },
  {
    id: 'passport-lari-dent-om1-2026-09-22',
    businessName: 'LARİ Dent Kadıköy',
    serviceTitle: 'Dijital Gülüş Analizi',
    dateLabel: '22 Eylül 2026',
    formulaOrProtocol:
      'Üst çene 10 üye E-Max Mockup • Seçilen renk skalası: OM1 Doğal Beyaz',
    specialistName: 'Dr. Ece Aksoy',
    specialistNote: 'Mockup onayı alındı; doğal yüzey dokusu korunacak.',
  },
];

const DEMO_INITIAL_ACTIVE_BOOKING: MobileActiveBooking = {
  appointmentId: 'apt-live-101',
  tenantId: 'ten-atelier-nisantasi',
  tenantSlug: 'atelier-nisantasi',
  businessName: 'Atelier Nişantaşı Hair & Spa',
  branchLabel: 'Nişantaşı Merkez',
  serviceName: 'Soft Balayage & Bakım',
  serviceCategory: 'beauty_salon',
  specialistName: 'Merve Y.',
  scheduledDate: '2026-11-18',
  scheduledTime: '15:30',
  priceMajor: 4200,
  currency: 'TRY',
  status: 'confirmed',
  hospitalityDrink: 'Filtre Kahve',
  quietSession: true,
};

interface UserSessionVault {
  activeBooking: MobileActiveBooking | null;
  bookingHistory: MobileActiveBooking[];
  passportEntries: MobilePassportEntry[];
  loyaltyPoints: number;
  stampCount: number;
  walletBalanceMinor: number;
  packageCreditsRemaining: number;
  likedSocialPosts: string[];
  savedSocialPosts: string[];
}

function createEmptyUserVault(): UserSessionVault {
  return {
    activeBooking: null,
    bookingHistory: [],
    passportEntries: [],
    loyaltyPoints: 0,
    stampCount: 0,
    walletBalanceMinor: 0,
    packageCreditsRemaining: 0,
    likedSocialPosts: [],
    savedSocialPosts: [],
  };
}

function createDemoUserVault(): UserSessionVault {
  return {
    activeBooking: { ...DEMO_INITIAL_ACTIVE_BOOKING },
    bookingHistory: INITIAL_BOOKING_HISTORY.map((item) => ({ ...item })),
    passportEntries: INITIAL_PASSPORT_ENTRIES.map((entry) => ({ ...entry })),
    loyaltyPoints: 480,
    stampCount: 4,
    walletBalanceMinor: 125000,
    packageCreditsRemaining: 5,
    likedSocialPosts: [],
    savedSocialPosts: [],
  };
}

function isDemoAccountUser(user: MobileAuthUser | null): boolean {
  if (!user) return false;
  return (
    user.userId === 'usr-lari-mert' ||
    user.userId === 'usr-lari-partner' ||
    user.email.trim().toLowerCase() === 'mert@randevulari.com' ||
    user.email.trim().toLowerCase() === 'partner@randevulari.com'
  );
}

function resolveSessionScopeKey(
  user: MobileAuthUser | null,
  signedOut: boolean,
  hasPartnerSubscription = false
): string {
  if (user) {
    return isDemoAccountUser(user) ? 'demo' : `user:${user.userId}`;
  }
  if (hasPartnerSubscription) {
    return 'partner-onboarding';
  }
  if (signedOut) {
    return 'guest';
  }
  if (typeof window !== 'undefined') {
    const roleParam = new URLSearchParams(window.location.search).get('role');
    if (roleParam === 'guest') return 'guest';
    const isNativeCapacitor = Boolean((window as any).Capacitor?.isNativePlatform?.());
    const isLocalhostPreview =
      !isNativeCapacitor && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocalhostPreview ? 'demo' : 'guest';
  }
  return 'demo';
}

function loadUserVaultForScope(scopeKey: string): UserSessionVault {
  if (scopeKey === 'guest') {
    return createEmptyUserVault();
  }
  const fallback = scopeKey === 'demo' ? createDemoUserVault() : createEmptyUserVault();
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(`lari_mobile_user_vault_v1_${scopeKey}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UserSessionVault> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    return {
      activeBooking:
        parsed.activeBooking && typeof parsed.activeBooking === 'object'
          ? parsed.activeBooking
          : fallback.activeBooking,
      bookingHistory: Array.isArray(parsed.bookingHistory)
        ? parsed.bookingHistory
        : fallback.bookingHistory,
      passportEntries: Array.isArray(parsed.passportEntries)
        ? parsed.passportEntries
        : fallback.passportEntries,
      loyaltyPoints:
        typeof parsed.loyaltyPoints === 'number' && Number.isFinite(parsed.loyaltyPoints)
          ? parsed.loyaltyPoints
          : fallback.loyaltyPoints,
      stampCount:
        typeof parsed.stampCount === 'number' && Number.isFinite(parsed.stampCount)
          ? parsed.stampCount
          : fallback.stampCount,
      walletBalanceMinor:
        typeof parsed.walletBalanceMinor === 'number' &&
        Number.isFinite(parsed.walletBalanceMinor)
          ? parsed.walletBalanceMinor
          : fallback.walletBalanceMinor,
      packageCreditsRemaining:
        typeof parsed.packageCreditsRemaining === 'number' &&
        Number.isFinite(parsed.packageCreditsRemaining)
          ? parsed.packageCreditsRemaining
          : fallback.packageCreditsRemaining,
      likedSocialPosts: Array.isArray(parsed.likedSocialPosts)
        ? parsed.likedSocialPosts.filter((x): x is string => typeof x === 'string')
        : [],
      savedSocialPosts: Array.isArray(parsed.savedSocialPosts)
        ? parsed.savedSocialPosts.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    return fallback;
  }
}

function saveUserVaultForScope(scopeKey: string, vault: UserSessionVault): void {
  if (scopeKey === 'guest') return;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `lari_mobile_user_vault_v1_${scopeKey}`,
        JSON.stringify(vault)
      );
    }
  } catch {
    // ignore storage errors
  }
}

function mergeGuestBookingsIntoVault(
  targetVault: UserSessionVault,
  guestActiveBooking: MobileActiveBooking | null,
  guestBookingHistory: MobileActiveBooking[]
): UserSessionVault {
  const mergedHistory = [...guestBookingHistory, ...targetVault.bookingHistory].filter(
    (booking, index, all) =>
      all.findIndex((candidate) => candidate.appointmentId === booking.appointmentId) === index
  );
  return {
    ...targetVault,
    activeBooking: guestActiveBooking ?? targetVault.activeBooking,
    bookingHistory: mergedHistory,
  };
}

function clearPartnerAndProfileStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    Object.keys(window.localStorage)
      .filter(
        (key) =>
          key.startsWith('lari_partner_') ||
          key.startsWith('lari_storefront_') ||
          key === 'lari_mobile_user_profile_v1'
      )
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage errors while still resetting in-memory session state
  }
}

const INITIAL_BOOKING_HISTORY: MobileActiveBooking[] = [
  {
    appointmentId: 'apt-hist-1',
    tenantId: 'ten-atelier-nisantasi',
    tenantSlug: 'atelier-nisantasi',
    businessName: 'Atelier Nişantaşı Hair & Spa',
    branchLabel: 'Nişantaşı, İstanbul',
    serviceName: 'Soft Balayage & Bakım',
    specialistName: 'Merve Yılmaz',
    scheduledDate: '2026-11-01',
    scheduledTime: '14:00',
    priceMajor: 4200,
    currency: 'TRY',
    status: 'completed',
    hospitalityDrink: 'Filtre Kahve',
    quietSession: true,
  },
  {
    appointmentId: 'apt-hist-2',
    tenantId: 'ten-auto-maslak',
    tenantSlug: 'maslak-auto-studio',
    businessName: 'Maslak Auto Studio • Bakım & Servis',
    branchLabel: 'Maslak, İstanbul',
    serviceName: 'Periyodik Bakım & Bilgisayarlı Kontrol',
    specialistName: 'Kemal Usta',
    scheduledDate: '2026-10-24',
    scheduledTime: '11:30',
    priceMajor: 2900,
    currency: 'TRY',
    status: 'completed',
    hospitalityDrink: 'İkram Seçilmedi',
    quietSession: false,
  },
  {
    appointmentId: 'apt-hist-3',
    tenantId: 'ten-dent-kadikoy',
    tenantSlug: 'lari-dent-kadikoy',
    businessName: 'LARİ Dent & Estetik Kliniği',
    branchLabel: 'Kadıköy, İstanbul',
    serviceName: 'Dijital Gülüş Tasarımı Muayenesi',
    specialistName: 'Dr. Ece Aksoy',
    scheduledDate: '2026-10-12',
    scheduledTime: '16:00',
    priceMajor: 1800,
    currency: 'TRY',
    status: 'completed',
    hospitalityDrink: 'Bitki Çayı',
    quietSession: false,
  },
];

const noop = () => undefined;
const noopAsync = async () => undefined;
const noopBooking = async () => ({ accepted: true });
const noopConflict = () => ({ conflict: false });

export function inferFineBookingCategory(
  serviceName: string,
  explicitVertical?: string
): string {
  const normalized = serviceName.toLocaleLowerCase('tr-TR');
  if (/(tırnak|tirnak|manikür|pedikür|protez|jel oje|nail)/i.test(normalized)) {
    return 'nail_studio';
  }
  if (/(berber|sakal|tıraş|tiras|damat)/i.test(normalized)) {
    return 'barber';
  }
  if (/(saç|sac|balayage|boya|fön|keratin|kesim)/i.test(normalized)) {
    return 'beauty_salon';
  }
  if (/(diş|dis|gülüş|zirkonyum|implant|ortodonti|muayene)/i.test(normalized)) {
    return 'dental_clinic';
  }
  if (/(oto|sanayi|periyodik|fren|yağ|yag|servis|motor|araç)/i.test(normalized)) {
    return 'auto_service';
  }
  if (/(masaj|spa|hamam|ritüel|aromaterapi|wellness)/i.test(normalized)) {
    return 'spa_wellness';
  }
  if (/(botoks|dolgu|lazer|cilt|estetik|hydrafacial)/i.test(normalized)) {
    return 'aesthetic_clinic';
  }
  if (/(pet|kedi|köpek|grooming)/i.test(normalized)) {
    return 'pet_grooming';
  }
  return explicitVertical || normalized.replace(/\s+/g, '_');
}

export function findSameDayCategoryConflict(
  bookingHistory: MobileActiveBooking[],
  scheduledDate: string,
  serviceName: string,
  serviceCategory?: string
): { conflict: boolean; conflictingService?: string; message?: string } {
  const targetCategory = inferFineBookingCategory(serviceName, serviceCategory);
  const normalizedService = serviceName.trim().toLocaleLowerCase('tr-TR');

  const match = bookingHistory.find((item) => {
    if (item.status !== 'confirmed' && item.status !== 'rescheduled') {
      return false;
    }
    if (item.scheduledDate !== scheduledDate) {
      return false;
    }
    const existingCategory = inferFineBookingCategory(
      item.serviceName,
      item.serviceCategory
    );
    const existingServiceNorm = item.serviceName.trim().toLocaleLowerCase('tr-TR');
    return (
      existingCategory === targetCategory ||
      existingServiceNorm === normalizedService
    );
  });

  if (!match) {
    return { conflict: false };
  }

  return {
    conflict: true,
    conflictingService: `${match.businessName} (${match.serviceName})`,
    message: `Aynı gün (${scheduledDate}) için "${match.serviceName}" kategorisinde aktif bir randevunuz zaten var. Aynı gün yalnızca farklı bir kategori/hizmetten (örn. farklı sektör veya tırnak/oto bakım) randevu alabilirsiniz.`,
  };
}

const SAFE_FALLBACK: MobileAppSessionValue = {
  themeMode: 'light',
  activeBooking: null,
  bookingHistory: INITIAL_BOOKING_HISTORY,
  passportEntries: INITIAL_PASSPORT_ENTRIES,
  loyaltyPoints: 480,
  stampCount: 4,
  walletBalanceMinor: 125000,
  toastMessage: null,
  partnerCatalog: INITIAL_PARTNER_CATALOG,
  packageCreditsRemaining: 5,
  admittedPatientSession: null,
  completedBreakdown: null,
  activePaymentQr: null,
  likedSocialPosts: [],
  savedSocialPosts: [],
  customVenuePhotos: {},
  customSocialPosts: [],
  partnerSubscription: null,
  liveAppointmentStage: 2,
  liveStagesByAppointmentId: {},
  getLiveStageForAppointment: () => 2,
  partnerStaffMembers: INITIAL_PARTNER_STAFF,
  setPartnerStaffMembers: noop as any,
  addPartnerStaffMember: noopAsync,
  updatePartnerStaffMember: noopAsync,
  removePartnerStaffMember: noopAsync,
  partnerGroupedHours: INITIAL_GROUPED_HOURS,
  setPartnerGroupedHours: noop as any,
  updatePartnerGroupedHours: noopAsync,
  partnerDailyHours: INITIAL_DAILY_HOURS,
  setPartnerDailyHours: noop as any,
  updatePartnerDailyHours: noopAsync,
  partnerDailyHoursMode: false,
  setPartnerDailyHoursMode: noop as any,
  partnerCampaigns: INITIAL_PARTNER_CAMPAIGNS,
  setPartnerCampaigns: noop as any,
  savePartnerCampaign: noopAsync,
  removePartnerCampaign: noopAsync,
  userProfile: DEFAULT_USER_PROFILE,
  selectedCurrency: 'TRY',
  sessionScopeKey: 'guest',
  mobileAuthUser: null,
  isExplicitlySignedOut: false,
  authModalOpen: false,
  authModalInitialTab: 'login',
  openAuthModal: noop,
  closeAuthModal: noop,
  loginWithEmail: async () => ({ success: false }),
  registerAccount: async () => ({ success: false }),
  continueWithSocial: async () => ({ success: false }),
  logoutMobileSession: async () => undefined,
  storefrontCustomization: DEFAULT_STOREFRONT_CUSTOMIZATION,
  storefrontLastEditedAtIso: null,
  saveStorefrontCustomization: async () => ({ accepted: true }),
  setThemeMode: noop,
  toggleThemeMode: noop,
  showToast: noop,
  confirmBooking: noopBooking,
  checkSameDayCategoryConflict: noopConflict,
  updateUserProfile: noop,
  setSelectedCurrency: noop,
  rescheduleActiveBooking: noopBooking,
  cancelActiveBooking: noopBooking,
  setHospitalityPreferences: noop,
  appendPassportFormula: noop,
  addLoyaltyPoints: noop,
  incrementStamp: noop,
  redeemGiftCode: noop,
  addCatalogItem: noopAsync,
  updateCatalogItem: noopAsync,
  removeCatalogItem: noopAsync,
  admitCustomerByQr: () => ({ valid: false, reasonCode: 'MALFORMED_QR' }),
  publishCheckoutBreakdown: noop,
  completeQrPayment: noop,
  toggleLikeSocialPost: noop,
  toggleSaveSocialPost: noop,
  addVenuePhoto: noop,
  removeVenuePhoto: noop,
  publishSocialPost: noop,
  upgradeToPartnerAccount: async () => ({ success: false }),
  updateLiveAppointmentStage: noop,
};

const MobileAppSessionContext = createContext<MobileAppSessionValue | null>(null);

export const MobileAppSessionProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [mobileAuthUser, setMobileAuthUser] = useState<MobileAuthUser | null>(() =>
    getActiveMobileAuthUser()
  );
  useEffect(() => {
    let active = true;
    void refreshMobileAuthUserFromTrustedSource()
      .then((trustedUser) => {
        if (active && trustedUser) setMobileAuthUser(trustedUser);
      })
      .catch(() => {
        // Supabase role resolution is fail-closed by getActiveMobileAuthUser.
      });
    return () => {
      active = false;
    };
  }, []);
  const [isExplicitlySignedOut, setIsExplicitlySignedOut] = useState<boolean>(() =>
    isMobileExplicitlySignedOut()
  );
  const [partnerSubscription, setPartnerSubscription] =
    useState<PartnerSubscriptionSnapshot | null>(null);
  const sessionScopeKey = resolveSessionScopeKey(
    mobileAuthUser,
    isExplicitlySignedOut,
    Boolean(partnerSubscription)
  );
  const [initialVault] = useState<UserSessionVault>(() =>
    loadUserVaultForScope(sessionScopeKey)
  );

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [activeBooking, setActiveBooking] = useState<MobileActiveBooking | null>(
    () => initialVault.activeBooking
  );
  const [bookingHistory, setBookingHistory] = useState<MobileActiveBooking[]>(
    () => initialVault.bookingHistory
  );
  const [passportEntries, setPassportEntries] = useState<MobilePassportEntry[]>(
    () => initialVault.passportEntries
  );
  const [loyaltyPoints, setLoyaltyPoints] = useState(initialVault.loyaltyPoints);
  const [stampCount, setStampCount] = useState(initialVault.stampCount);
  const [walletBalanceMinor, setWalletBalanceMinor] = useState(
    initialVault.walletBalanceMinor
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [partnerCatalog, setPartnerCatalog] = useState<PartnerCatalogItem[]>(
    () => INITIAL_PARTNER_CATALOG.map((item) => ({ ...item }))
  );
  const [packageCreditsRemaining, setPackageCreditsRemaining] = useState(
    initialVault.packageCreditsRemaining
  );
  const [admittedPatientSession, setAdmittedPatientSession] =
    useState<AdmittedPatientSession | null>(null);
  const [completedBreakdown, setCompletedBreakdown] =
    useState<CompletedAppointmentBreakdown | null>(null);
  const [activePaymentQr, setActivePaymentQr] =
    useState<MobileQrArtifact | null>(null);
  const [likedSocialPosts, setLikedSocialPosts] = useState<string[]>(
    () => initialVault.likedSocialPosts
  );
  const [savedSocialPosts, setSavedSocialPosts] = useState<string[]>(
    () => initialVault.savedSocialPosts
  );
  const [customVenuePhotos, setCustomVenuePhotos] = useState<Record<string, string[]>>(
    {}
  );
  const [customSocialPosts, setCustomSocialPosts] = useState<MobileCustomSocialPost[]>(
    []
  );
  const [liveStagesByAppointmentId, setLiveStagesByAppointmentId] = useState<
    Record<string, 1 | 2 | 3 | 4>
  >({});
  const [partnerStaffMembers, setPartnerStaffMembers] = useState<PartnerStaffMember[]>(() =>
    parseStoredArray<PartnerStaffMember>(
      'lari_partner_staff_v1',
      INITIAL_PARTNER_STAFF,
      isValidStaffMember
    )
  );
  const [partnerGroupedHours, setPartnerGroupedHours] = useState<
    Record<BusinessHoursKey, BusinessHoursSchedule>
  >(() =>
    parseStoredScheduleMap<BusinessHoursKey>(
      'lari_partner_grouped_hours_v1',
      INITIAL_GROUPED_HOURS
    )
  );
  const [partnerDailyHours, setPartnerDailyHours] = useState<
    Record<DailyBusinessHoursKey, BusinessHoursSchedule>
  >(() =>
    parseStoredScheduleMap<DailyBusinessHoursKey>(
      'lari_partner_daily_hours_v1',
      INITIAL_DAILY_HOURS
    )
  );
  const [partnerDailyHoursMode, setPartnerDailyHoursMode] = useState<boolean>(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        window.localStorage.getItem('lari_partner_daily_hours_mode_v1') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [partnerCampaigns, setPartnerCampaigns] = useState<PartnerCampaign[]>(() =>
    parseStoredArray<PartnerCampaign>(
      'lari_partner_campaigns_v1',
      INITIAL_PARTNER_CAMPAIGNS,
      isValidPartnerCampaign
    )
  );
  const partnerStorageEnabledRef = useRef(true);

  useEffect(() => {
    try {
      if (partnerStorageEnabledRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(
          'lari_partner_staff_v1',
          JSON.stringify(partnerStaffMembers)
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [partnerStaffMembers]);

  useEffect(() => {
    try {
      if (partnerStorageEnabledRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(
          'lari_partner_grouped_hours_v1',
          JSON.stringify(partnerGroupedHours)
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [partnerGroupedHours]);

  useEffect(() => {
    try {
      if (partnerStorageEnabledRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(
          'lari_partner_daily_hours_v1',
          JSON.stringify(partnerDailyHours)
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [partnerDailyHours]);

  useEffect(() => {
    try {
      if (partnerStorageEnabledRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(
          'lari_partner_daily_hours_mode_v1',
          partnerDailyHoursMode ? 'true' : 'false'
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [partnerDailyHoursMode]);

  useEffect(() => {
    try {
      if (partnerStorageEnabledRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(
          'lari_partner_campaigns_v1',
          JSON.stringify(partnerCampaigns)
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [partnerCampaigns]);

  const [storefrontCustomization, setStorefrontCustomization] =
    useState<PartnerStorefrontCustomization>(() =>
      parseStoredObject<PartnerStorefrontCustomization>(
        'lari_storefront_customization_v1',
        DEFAULT_STOREFRONT_CUSTOMIZATION,
        {
          businessName: (v) => typeof v === 'string',
          tagline: (v) => typeof v === 'string',
          whatsappNumber: (v) => typeof v === 'string',
          accentColor: (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v),
          coverPhotoUrl: (v) => typeof v === 'string',
        }
      )
    );
  const [storefrontLastEditedAtIso, setStorefrontLastEditedAtIso] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem('lari_storefront_edit_lock_v1')
        : null;
    } catch {
      return null;
    }
  });
  const [userProfile, setUserProfile] = useState<MobileUserProfile>(() =>
    parseStoredObject<MobileUserProfile>(
      'lari_mobile_user_profile_v1',
      DEFAULT_USER_PROFILE,
      {
        interestedSectors: (v) =>
          Array.isArray(v) && v.every((s) => typeof s === 'string'),
      }
    )
  );
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    saveUserVaultForScope(sessionScopeKey, {
      activeBooking,
      bookingHistory,
      passportEntries,
      loyaltyPoints,
      stampCount,
      walletBalanceMinor,
      packageCreditsRemaining,
      likedSocialPosts,
      savedSocialPosts,
    });
  }, [
    activeBooking,
    bookingHistory,
    likedSocialPosts,
    loyaltyPoints,
    packageCreditsRemaining,
    passportEntries,
    savedSocialPosts,
    sessionScopeKey,
    stampCount,
    walletBalanceMinor,
  ]);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('lari_mobile_selected_currency_v1') as SupportedCurrency | null)
          : null;
      if (saved && VALID_CURRENCIES.includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage failure
    }
    return resolveDefaultCurrencyForLocation(
      DEFAULT_USER_PROFILE.countryCode,
      DEFAULT_USER_PROFILE.city,
      DEFAULT_USER_PROFILE.district
    );
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lari_mobile_selected_currency_v1', selectedCurrency);
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedCurrency]);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const checkSameDayCategoryConflict = useCallback(
    (scheduledDate: string, serviceName: string, serviceCategory?: string) =>
      findSameDayCategoryConflict(
        bookingHistory,
        scheduledDate,
        serviceName,
        serviceCategory
      ),
    [bookingHistory]
  );

  const confirmBooking = useCallback(
    async (input: ConfirmBookingInput) => {
      const conflict = findSameDayCategoryConflict(
        bookingHistory,
        input.scheduledDate,
        input.serviceName,
        input.serviceCategory
      );
      if (conflict.conflict) {
        const friendly = sanitizeUserMessage(
          conflict.message || 'SAME_CATEGORY_DAILY_CONFLICT'
        );
        showToast(friendly);
        return {
          accepted: false,
          reasonCode: 'SAME_CATEGORY_DAILY_CONFLICT' as const,
          message: friendly,
        };
      }

      try {
        const persisted = await mobileCoreBridgeService.confirmBooking({
          ...input,
          userId: mobileAuthUser?.userId,
          customerName: userProfile.fullName,
          customerEmail: userProfile.email,
          customerPhone: userProfile.phoneDigits,
        });
        const confirmedItem: MobileActiveBooking = {
          ...input,
          appointmentId: persisted.appointmentId,
          serviceCategory: inferFineBookingCategory(
            input.serviceName,
            input.serviceCategory
          ),
          status: 'confirmed',
        };
        setActiveBooking(confirmedItem);
        setBookingHistory((prev) => [
          confirmedItem,
          ...prev.filter((item) => item.appointmentId !== confirmedItem.appointmentId),
        ]);
        setLoyaltyPoints((points) => points + 50);
        showToast('Randevunuz onaylandı • +50 LARİ Puan');
        return { accepted: true };
      } catch {
        const message = 'Randevu çekirdek sisteme kaydedilemedi. Lütfen yeniden deneyin.';
        showToast(message);
        return {
          accepted: false,
          reasonCode: 'CORE_PERSISTENCE_FAILED' as const,
          message,
        };
      }
    },
    [bookingHistory, mobileAuthUser?.userId, showToast, userProfile]
  );

  const updateUserProfile = useCallback((nextProfile: MobileUserProfile) => {
    setUserProfile((prev) => {
      if (prev.countryCode !== nextProfile.countryCode || prev.country !== nextProfile.country) {
        setSelectedCurrency(
          resolveDefaultCurrencyForLocation(
            nextProfile.countryCode,
            nextProfile.city,
            nextProfile.district
          )
        );
      }
      return nextProfile;
    });
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'lari_mobile_user_profile_v1',
          JSON.stringify(nextProfile)
        );
      }
    } catch {
      // ignore storage failure
    }
  }, []);

  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login') => {
    setAuthModalInitialTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const hydrateSessionVault = useCallback((vault: UserSessionVault) => {
    setActiveBooking(vault.activeBooking);
    setBookingHistory(vault.bookingHistory);
    setPassportEntries(vault.passportEntries);
    setLoyaltyPoints(vault.loyaltyPoints);
    setStampCount(vault.stampCount);
    setWalletBalanceMinor(vault.walletBalanceMinor);
    setPackageCreditsRemaining(vault.packageCreditsRemaining);
    setLikedSocialPosts(vault.likedSocialPosts);
    setSavedSocialPosts(vault.savedSocialPosts);
    setCompletedBreakdown(null);
    setActivePaymentQr(null);
    setAdmittedPatientSession(null);
    setLiveStagesByAppointmentId({});
  }, []);

  const applyAuthenticatedSession = useCallback(
    (result: MobileAuthActionResult, welcomeVerb: string) => {
      if (!result.success || !result.user) return;
      const nextScope = resolveSessionScopeKey(result.user, false);
      const targetVault = loadUserVaultForScope(nextScope);
      const nextVault =
        sessionScopeKey === 'guest'
          ? mergeGuestBookingsIntoVault(targetVault, activeBooking, bookingHistory)
          : targetVault;
      partnerStorageEnabledRef.current = true;
      saveUserVaultForScope(nextScope, nextVault);
      hydrateSessionVault(nextVault);
      setMobileAuthUser(result.user);
      setIsExplicitlySignedOut(false);
      if (result.profile) {
        updateUserProfile(result.profile);
      }
      setAuthModalOpen(false);
      showToast(`${welcomeVerb}, ${result.user.fullName}!`);
    },
    [
      activeBooking,
      bookingHistory,
      hydrateSessionVault,
      sessionScopeKey,
      showToast,
      updateUserProfile,
    ]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const result = await loginMobileWithEmail({ email, password });
      applyAuthenticatedSession(result, 'Tekrar hoş geldiniz');
      return result;
    },
    [applyAuthenticatedSession]
  );

  const registerAccount = useCallback(
    async (payload: MobileRegistrationPayload) => {
      const result = await registerMobileAccount(payload);
      applyAuthenticatedSession(result, 'LARİ hesabınız hazır');
      return result;
    },
    [applyAuthenticatedSession]
  );

  const continueWithSocial = useCallback(
    async (input: { provider: 'google' | 'apple'; email: string; fullName?: string }) => {
      const result = await continueMobileWithSocialProvider(input);
      applyAuthenticatedSession(result, 'Hoş geldiniz');
      return result;
    },
    [applyAuthenticatedSession]
  );

  const logoutMobileSession = useCallback(async () => {
    await logoutMobileAccount();
    partnerStorageEnabledRef.current = false;
    clearPartnerAndProfileStorage();
    setMobileAuthUser(null);
    setIsExplicitlySignedOut(true);
    setPartnerSubscription(null);
    hydrateSessionVault(createEmptyUserVault());
    setPartnerCatalog(INITIAL_PARTNER_CATALOG.map((item) => ({ ...item })));
    setPartnerStaffMembers(INITIAL_PARTNER_STAFF.map((item) => ({ ...item })));
    setPartnerGroupedHours({ ...INITIAL_GROUPED_HOURS });
    setPartnerDailyHours({ ...INITIAL_DAILY_HOURS });
    setPartnerDailyHoursMode(false);
    setPartnerCampaigns(INITIAL_PARTNER_CAMPAIGNS.map((item) => ({ ...item })));
    setStorefrontCustomization({ ...DEFAULT_STOREFRONT_CUSTOMIZATION });
    setStorefrontLastEditedAtIso(null);
    setCustomVenuePhotos({});
    setCustomSocialPosts([]);
    setUserProfile({
      ...DEFAULT_USER_PROFILE,
      interestedSectors: [...DEFAULT_USER_PROFILE.interestedSectors],
    });
    setSelectedCurrency(
      resolveDefaultCurrencyForLocation(
        DEFAULT_USER_PROFILE.countryCode,
        DEFAULT_USER_PROFILE.city,
        DEFAULT_USER_PROFILE.district
      )
    );
    setThemeMode('light');
    setAuthModalInitialTab('login');
    setAuthModalOpen(true);
    showToast('Oturumunuz güvenle kapatıldı.');
  }, [hydrateSessionVault, showToast]);

  const rescheduleActiveBooking = useCallback(
    async (newDate: string, newTime: string) => {
      const targetBooking = activeBooking;
      if (targetBooking) {
        const conflict = findSameDayCategoryConflict(
          bookingHistory.filter(
            (item) => item.appointmentId !== targetBooking.appointmentId
          ),
          newDate,
          targetBooking.serviceName,
          targetBooking.serviceCategory
        );
        if (conflict.conflict) {
          const friendly = sanitizeUserMessage(
            conflict.message || 'SAME_CATEGORY_DAILY_CONFLICT'
          );
          showToast(friendly);
          return {
            accepted: false,
            reasonCode: 'SAME_CATEGORY_DAILY_CONFLICT' as const,
            message: friendly,
          };
        }
      }

      if (!targetBooking) {
        return { accepted: false, reasonCode: 'CORE_PERSISTENCE_FAILED' as const };
      }
      try {
        await mobileCoreBridgeService.rescheduleBooking({
          tenantId: targetBooking.tenantId,
          appointmentId: targetBooking.appointmentId,
          scheduledDate: newDate,
          scheduledTime: newTime,
        });
        const updated: MobileActiveBooking = {
          ...targetBooking,
          scheduledDate: newDate,
          scheduledTime: newTime,
          status: 'rescheduled',
        };
        setActiveBooking(updated);
        setBookingHistory((prev) =>
          prev.map((item) =>
            item.appointmentId === updated.appointmentId ? updated : item
          )
        );
        showToast('Randevu tarihi güncellendi.');
        return { accepted: true };
      } catch {
        const message = 'Randevu tarihi çekirdek sistemde güncellenemedi.';
        showToast(message);
        return {
          accepted: false,
          reasonCode: 'CORE_PERSISTENCE_FAILED' as const,
          message,
        };
      }
    },
    [activeBooking, bookingHistory, showToast]
  );

  const cancelActiveBooking = useCallback(
    async (reason?: string) => {
      const targetBooking = activeBooking;
      if (!targetBooking) return { accepted: true };
      try {
        await mobileCoreBridgeService.cancelBooking({
          tenantId: targetBooking.tenantId,
          appointmentId: targetBooking.appointmentId,
          reason,
        });
        setBookingHistory((prev) =>
          prev.map((item) =>
            item.appointmentId === targetBooking.appointmentId
              ? { ...item, status: 'cancelled' }
              : item
          )
        );
        setActiveBooking(null);
        showToast(
          reason
            ? `Randevu iptal edildi (${reason}).`
            : 'Randevu iptal edildi. Yeni bir deneyim keşfedebilirsiniz.'
        );
        return { accepted: true };
      } catch {
        showToast('Randevu çekirdek sistemde iptal edilemedi.');
        return { accepted: false, reasonCode: 'CORE_PERSISTENCE_FAILED' as const };
      }
    },
    [activeBooking, showToast]
  );

  const setHospitalityPreferences = useCallback(
    (drink: string, quiet: boolean) => {
      setActiveBooking((booking) =>
        booking
          ? { ...booking, hospitalityDrink: drink, quietSession: quiet }
          : null
      );
      showToast('İkram ve seans tercihleriniz kaydedildi.');
    },
    [showToast]
  );

  const appendPassportFormula = useCallback((entry: MobilePassportEntry) => {
    setPassportEntries((entries) => [entry, ...entries]);
  }, []);

  const addLoyaltyPoints = useCallback((delta: number) => {
    if (!Number.isFinite(delta)) return;
    setLoyaltyPoints((points) => Math.max(0, points + Math.trunc(delta)));
  }, []);

  const incrementStamp = useCallback(() => {
    setStampCount((count) => Math.min(5, count + 1));
  }, []);

  const redeemGiftCode = useCallback(
    (code: string) => {
      if (code.trim().toUpperCase() === 'LARI500') {
        setWalletBalanceMinor((balance) => balance + 50000);
        const giftDisp = convertFromTryMajor(500, selectedCurrency);
        showToast(`LARI500 ile ${giftDisp.toLocaleString('tr-TR')} ${selectedCurrency} cüzdanınıza eklendi.`);
        return;
      }
      showToast('Hediye kodu geçersiz.');
    },
    [selectedCurrency, showToast]
  );

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const addPartnerStaffMember = useCallback(
    async (tenantId: string, input: Omit<PartnerStaffMember, 'id'>) => {
      try {
        const created = await mobileCoreBridgeService.addPartnerStaffMember(
          tenantId,
          input
        );
        setPartnerStaffMembers((current) => [created, ...current]);
        showToast(`${created.name} uzman kadrosuna eklendi.`);
      } catch {
        showToast('Uzman personel çekirdek sisteme eklenemedi.');
      }
    },
    [showToast]
  );

  const updatePartnerStaffMember = useCallback(
    async (
      tenantId: string,
      staffId: string,
      patch: Partial<Omit<PartnerStaffMember, 'id'>>
    ) => {
      const previous = partnerStaffMembers.find((member) => member.id === staffId);
      if (!previous) return;
      setPartnerStaffMembers((current) =>
        current.map((member) =>
          member.id === staffId ? { ...member, ...patch } : member
        )
      );
      try {
        await mobileCoreBridgeService.updatePartnerStaffMember(
          tenantId,
          staffId,
          patch
        );
      } catch {
        setPartnerStaffMembers((current) =>
          current.map((member) => (member.id === staffId ? previous : member))
        );
        showToast('Personel değişikliği çekirdek sisteme kaydedilemedi.');
      }
    },
    [partnerStaffMembers, showToast]
  );

  const removePartnerStaffMember = useCallback(
    async (tenantId: string, staffId: string) => {
      const previous = partnerStaffMembers.find((member) => member.id === staffId);
      if (!previous) return;
      setPartnerStaffMembers((current) =>
        current.filter((member) => member.id !== staffId)
      );
      try {
        await mobileCoreBridgeService.removePartnerStaffMember(tenantId, staffId);
        showToast('Uzman personel kadrosundan çıkarıldı.');
      } catch {
        setPartnerStaffMembers((current) => [previous, ...current]);
        showToast('Uzman personel çekirdek sistemden kaldırılamadı.');
      }
    },
    [partnerStaffMembers, showToast]
  );

  const updatePartnerGroupedHours = useCallback(
    async (
      tenantId: string,
      hours: Record<BusinessHoursKey, BusinessHoursSchedule>
    ) => {
      const previous = partnerGroupedHours;
      setPartnerGroupedHours(hours);
      try {
        await mobileCoreBridgeService.savePartnerBusinessHours(tenantId, hours);
      } catch {
        setPartnerGroupedHours(previous);
        showToast('Çalışma saatleri çekirdek sisteme kaydedilemedi.');
      }
    },
    [partnerGroupedHours, showToast]
  );

  const updatePartnerDailyHours = useCallback(
    async (
      tenantId: string,
      hours: Record<DailyBusinessHoursKey, BusinessHoursSchedule>
    ) => {
      const previous = partnerDailyHours;
      setPartnerDailyHours(hours);
      try {
        await mobileCoreBridgeService.savePartnerBusinessHours(tenantId, hours);
      } catch {
        setPartnerDailyHours(previous);
        showToast('Günlük çalışma saatleri çekirdek sisteme kaydedilemedi.');
      }
    },
    [partnerDailyHours, showToast]
  );

  const savePartnerCampaign = useCallback(
    async (tenantId: string, campaign: PartnerCampaign) => {
      const previous = partnerCampaigns;
      setPartnerCampaigns((current) => {
        const exists = current.some((item) => item.id === campaign.id);
        return exists
          ? current.map((item) => (item.id === campaign.id ? campaign : item))
          : [campaign, ...current];
      });
      try {
        await mobileCoreBridgeService.savePartnerCampaign(tenantId, campaign);
      } catch {
        setPartnerCampaigns(previous);
        showToast('Kampanya çekirdek sisteme kaydedilemedi.');
      }
    },
    [partnerCampaigns, showToast]
  );

  const removePartnerCampaign = useCallback(
    async (campaignId: string) => {
      const previous = partnerCampaigns;
      setPartnerCampaigns((current) =>
        current.filter((campaign) => campaign.id !== campaignId)
      );
      try {
        await mobileCoreBridgeService.removePartnerCampaign(campaignId);
      } catch {
        setPartnerCampaigns(previous);
        showToast('Kampanya çekirdek sistemden silinemedi.');
      }
    },
    [partnerCampaigns, showToast]
  );

  const addCatalogItem = useCallback(
    async (item: Omit<PartnerCatalogItem, 'id'>) => {
      try {
        const created = await mobileCoreBridgeService.addCatalogItem(item);
        setPartnerCatalog((prev) => [created, ...prev]);
        showToast(`"${item.name}" işletme kataloğuna eklendi.`);
      } catch {
        showToast('Katalog kalemi çekirdek sisteme eklenemedi.');
      }
    },
    [showToast]
  );

  const updateCatalogItem = useCallback(
    async (id: string, patch: Partial<Omit<PartnerCatalogItem, 'id'>>) => {
      const existing = partnerCatalog.find((item) => item.id === id);
      if (!existing) return;
      setPartnerCatalog((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      try {
        await mobileCoreBridgeService.updateCatalogItem(existing.tenantId, id, patch);
        showToast('Katalog kalemi güncellendi.');
      } catch {
        setPartnerCatalog((prev) => prev.map((item) => (item.id === id ? existing : item)));
        showToast('Katalog kalemi çekirdek sistemde güncellenemedi.');
      }
    },
    [partnerCatalog, showToast]
  );

  const removeCatalogItem = useCallback(
    async (id: string) => {
      const existing = partnerCatalog.find((item) => item.id === id);
      if (!existing) return;
      setPartnerCatalog((prev) => prev.filter((item) => item.id !== id));
      try {
        await mobileCoreBridgeService.removeCatalogItem(existing.tenantId, id);
        showToast('Katalog kalemi silindi.');
      } catch {
        setPartnerCatalog((prev) => [existing, ...prev]);
        showToast('Katalog kalemi çekirdek sistemden kaldırılamadı.');
      }
    },
    [partnerCatalog, showToast]
  );

  const admitCustomerByQr = useCallback(
    (rawPayload: string, expectedTenantId?: string): DecodedQrAdmissionResult => {
      const res = verifyMobileQrTokenOrPayload(rawPayload, expectedTenantId);
      if (!res.valid || !res.artifact) {
        showToast(`QR Kabul Başarısız: ${res.reasonCode}`);
        return res;
      }

      const art = res.artifact;
      let nextCredits = packageCreditsRemaining;
      const admissionType: AdmittedPatientSession['admissionType'] = art.htJourneyCode
        ? 'health_tourism_qr'
        : art.packageName
          ? 'package_qr'
          : 'standard_qr';

      if (art.kind === 'ht_package_checkin' && packageCreditsRemaining > 0) {
        nextCredits = Math.max(0, packageCreditsRemaining - 1);
        setPackageCreditsRemaining(nextCredits);
      }

      setAdmittedPatientSession({
        qrId: art.qrId,
        customerName: art.customerName || 'Doğrulanmış Müşteri',
        admissionType,
        packageName: art.packageName,
        remainingCreditsAfter:
          art.kind === 'ht_package_checkin' ? nextCredits : undefined,
        htJourneyCode: art.htJourneyCode,
        admittedAtIso: new Date().toISOString(),
      });

      showToast(
        `${art.customerName || 'Müşteri'} QR ile kabul edildi (${
          admissionType === 'health_tourism_qr'
            ? 'Sağlık Turizmi'
            : admissionType === 'package_qr'
              ? `Paket Kalan: ${nextCredits}`
              : 'Standart Check-in'
        })`
      );
      return res;
    },
    [packageCreditsRemaining, showToast]
  );

  const publishCheckoutBreakdown = useCallback(
    (breakdown: CompletedAppointmentBreakdown, paymentQr: MobileQrArtifact) => {
      setCompletedBreakdown(breakdown);
      setActivePaymentQr(paymentQr);
      showToast('Randevu fiyat dökümü ve Ödeme QR müşteriye iletildi!');
    },
    [showToast]
  );

  const completeQrPayment = useCallback(
    (optionalTipMajor: number) => {
      const safeTip = Math.max(0, Math.round(optionalTipMajor));
      setCompletedBreakdown((prev) =>
        prev
          ? {
              ...prev,
              optionalTipMajor: safeTip,
              grandTotalMajor: prev.netPayableBeforeTipMajor + safeTip,
              paidViaQr: true,
            }
          : null
      );
      setStampCount((s) => Math.min(5, s + 1));
      setLoyaltyPoints((p) => p + 50);
      const formattedTip = convertFromTryMajor(safeTip, selectedCurrency).toLocaleString('tr-TR');
      showToast(
        safeTip > 0
          ? `QR Ödeme (+${formattedTip} ${selectedCurrency} isteğe bağlı bahşiş) tamamlandı • +50 Puan!`
          : 'QR Ödeme (Bahşişsiz) tamamlandı • +50 Puan!'
      );
    },
    [selectedCurrency, showToast]
  );

  const toggleLikeSocialPost = useCallback((postId: string) => {
    setLikedSocialPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  }, []);

  const toggleSaveSocialPost = useCallback(
    (postId: string) => {
      setSavedSocialPosts((prev) => {
        const exists = prev.includes(postId);
        showToast(exists ? 'Kaydedilenlerden çıkarıldı.' : 'Favori işlerime kaydedildi.');
        return exists ? prev.filter((id) => id !== postId) : [...prev, postId];
      });
    },
    [showToast]
  );

  const addVenuePhoto = useCallback(
    (tenantSlug: string, photoUrl: string) => {
      const lockStatus = getStorefrontEditLockStatus(storefrontLastEditedAtIso);
      if (lockStatus.locked) {
        showToast(
          `24 saatlik vitrin düzenleme kilidi aktif (${lockStatus.countdownText} kaldı).`
        );
        return;
      }
      const normalizedUrl = photoUrl.trim();
      if (!normalizedUrl) return;
      setCustomVenuePhotos((current) => {
        const existing = current[tenantSlug] ?? [];
        if (existing.includes(normalizedUrl)) return current;
        return { ...current, [tenantSlug]: [normalizedUrl, ...existing] };
      });
    },
    [storefrontLastEditedAtIso, showToast]
  );

  const removeVenuePhoto = useCallback(
    (tenantSlug: string, photoUrl: string) => {
      const lockStatus = getStorefrontEditLockStatus(storefrontLastEditedAtIso);
      if (lockStatus.locked) {
        showToast(
          `24 saatlik vitrin düzenleme kilidi aktif (${lockStatus.countdownText} kaldı).`
        );
        return;
      }
      setCustomVenuePhotos((current) => ({
        ...current,
        [tenantSlug]: (current[tenantSlug] ?? []).filter((url) => url !== photoUrl),
      }));
    },
    [storefrontLastEditedAtIso, showToast]
  );

  const publishSocialPost = useCallback((post: PublishSocialPostInput) => {
    setCustomSocialPosts((current) => [
      {
        ...post,
        postId: `post-custom-${Date.now().toString(36)}`,
        baseLikes: 0,
      },
      ...current,
    ]);
  }, []);

  const saveStorefrontCustomization = useCallback(
    async (patch: Partial<PartnerStorefrontCustomization>) => {
      const lockStatus = getStorefrontEditLockStatus(storefrontLastEditedAtIso);
      if (lockStatus.locked) {
        const msg = `Vitrin güvenliği için değişiklik kilidi aktif (${lockStatus.countdownText} kaldı). 24 saat dolmadan yeniden güncellenemez.`;
        showToast(msg);
        return {
          accepted: false,
          reasonCode: 'STOREFRONT_24H_EDIT_LOCKED',
          countdownText: lockStatus.countdownText,
        };
      }
      const next: PartnerStorefrontCustomization = {
        ...storefrontCustomization,
        ...patch,
      };
      try {
        await mobileCoreBridgeService.saveStorefrontCustomization(next);
      } catch {
        showToast('Vitrin özelleştirmeleri çekirdek sisteme kaydedilemedi.');
        return { accepted: false, reasonCode: 'CORE_PERSISTENCE_FAILED' };
      }
      const nowIso = new Date().toISOString();
      setStorefrontCustomization(next);
      setStorefrontLastEditedAtIso(nowIso);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'lari_storefront_customization_v1',
            JSON.stringify(next)
          );
          window.localStorage.setItem('lari_storefront_edit_lock_v1', nowIso);
        }
      } catch {
        // ignore storage error
      }
      showToast('Vitrin özelleştirmeleri kaydedildi. 24 saatlik güvenlik kilidi başlatıldı.');
      return { accepted: true };
    },
    [storefrontCustomization, storefrontLastEditedAtIso, showToast]
  );

  const upgradeToPartnerAccount = useCallback(
    async (input: UpgradePartnerInput): Promise<MobilePartnerUpgradeResult> => {
      const result = await mobileCoreBridgeService.upgradePartnerAccount({
        ...input,
        ownerEmail: input.ownerEmail,
        ownerPhone: input.ownerPhone,
        actorUserId: mobileAuthUser?.userId,
      });
      if (!result.success || !result.tenantId || !result.plan) {
        showToast(
          result.message ||
            'Ödeme ve abonelik onayı tamamlanmadan Partner yetkisi açılamaz.'
        );
        return result;
      }

      let promotedAuth = updateMobileAuthUserRole('tenant_owner');
      if (!promotedAuth && result.requiresTrustedOwnerRole) {
        promotedAuth = await refreshMobileAuthUserFromTrustedSource();
      }
      if (
        result.requiresTrustedOwnerRole &&
        (!promotedAuth || promotedAuth.role !== 'tenant_owner')
      ) {
        const blocked: MobilePartnerUpgradeResult = {
          ...result,
          success: false,
          requiresCheckout: false,
          reasonCode: 'PAYMENT_OR_SUBSCRIPTION_APPROVAL_REQUIRED',
          message: 'Güvenilir kullanıcı profili tenant_owner yetkisini henüz doğrulamadı.',
        };
        showToast(blocked.message!);
        return blocked;
      }

      partnerStorageEnabledRef.current = true;
      setPartnerSubscription({
        planId: result.plan.id,
        planName: result.plan.name,
        billingPeriod: input.billingPeriod,
        businessName: input.businessName,
        category: input.category,
        city: input.city,
        district: input.district,
        ownerName: input.ownerName,
        staffName: input.staffName,
        vkn: input.vkn,
        accentColor: input.accentColor,
        coverPhotoUrl: input.coverPhotoUrl,
        tagline: input.tagline,
        whatsappNumber: input.whatsappNumber,
        trialDays: result.plan.trialDays,
        activatedAtIso: new Date().toISOString(),
      });
      const nextCustom: PartnerStorefrontCustomization = {
        businessName: input.businessName || DEFAULT_STOREFRONT_CUSTOMIZATION.businessName,
        tagline: input.tagline || DEFAULT_STOREFRONT_CUSTOMIZATION.tagline,
        accentColor: input.accentColor || DEFAULT_STOREFRONT_CUSTOMIZATION.accentColor,
        coverPhotoUrl: input.coverPhotoUrl || '',
        whatsappNumber: input.whatsappNumber || DEFAULT_STOREFRONT_CUSTOMIZATION.whatsappNumber,
      };
      setStorefrontCustomization(nextCustom);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'lari_storefront_customization_v1',
            JSON.stringify(nextCustom)
          );
        }
      } catch {
        // ignore storage failure
      }
      if (result.initialCatalogItem) {
        setPartnerCatalog((current) => [
          result.initialCatalogItem!,
          ...current,
        ]);
      }
      if (promotedAuth) setMobileAuthUser(promotedAuth);
      setIsExplicitlySignedOut(false);
      showToast(
        `${input.businessName} için ${result.plan.name} Partner hesabı aktif edildi!`
      );
      return result;
    },
    [mobileAuthUser?.userId, showToast]
  );

  const getLiveStageForAppointment = useCallback(
    (appointmentId?: string): 1 | 2 | 3 | 4 => {
      const key = appointmentId || activeBooking?.appointmentId || 'apt-live-101';
      return liveStagesByAppointmentId[key] ?? 2;
    },
    [activeBooking?.appointmentId, liveStagesByAppointmentId]
  );

  const liveAppointmentStage = useMemo<1 | 2 | 3 | 4>(() => {
    const activeId = activeBooking?.appointmentId || 'apt-live-101';
    return liveStagesByAppointmentId[activeId] ?? 2;
  }, [activeBooking?.appointmentId, liveStagesByAppointmentId]);

  const updateLiveAppointmentStage = useCallback(
    (stage: 1 | 2 | 3 | 4, actorRole: string, appointmentId?: string) => {
      if (!['tenant_owner', 'staff', 'super_admin'].includes(actorRole)) {
        showToast('Randevu aşamalarını yalnızca yetkili işletme hesabı güncelleyebilir.');
        return;
      }
      const targetId = appointmentId || activeBooking?.appointmentId || 'apt-live-101';
      setLiveStagesByAppointmentId((prev) => ({ ...prev, [targetId]: stage }));
      const labels: Record<1 | 2 | 3 | 4, string> = {
        1: 'Onaylandı',
        2: 'Yola Çık',
        3: 'Check-in',
        4: 'Koltukta',
      };
      showToast(`Canlı randevu aşaması "${labels[stage]}" olarak güncellendi.`);
    },
    [activeBooking?.appointmentId, showToast]
  );

  const value = useMemo<MobileAppSessionValue>(
    () => ({
      themeMode,
      activeBooking,
      bookingHistory,
      passportEntries,
      loyaltyPoints,
      stampCount,
      walletBalanceMinor,
      toastMessage,
      partnerCatalog,
      packageCreditsRemaining,
      admittedPatientSession,
      completedBreakdown,
      activePaymentQr,
      likedSocialPosts,
      savedSocialPosts,
      customVenuePhotos,
      customSocialPosts,
      partnerSubscription,
      liveAppointmentStage,
      liveStagesByAppointmentId,
      getLiveStageForAppointment,
      partnerStaffMembers,
      setPartnerStaffMembers,
      addPartnerStaffMember,
      updatePartnerStaffMember,
      removePartnerStaffMember,
      partnerGroupedHours,
      setPartnerGroupedHours,
      updatePartnerGroupedHours,
      partnerDailyHours,
      setPartnerDailyHours,
      updatePartnerDailyHours,
      partnerDailyHoursMode,
      setPartnerDailyHoursMode,
      partnerCampaigns,
      setPartnerCampaigns,
      savePartnerCampaign,
      removePartnerCampaign,
      userProfile,
      selectedCurrency,
      sessionScopeKey,
      mobileAuthUser,
      isExplicitlySignedOut,
      authModalOpen,
      authModalInitialTab,
      openAuthModal,
      closeAuthModal,
      loginWithEmail,
      registerAccount,
      continueWithSocial,
      logoutMobileSession,
      storefrontCustomization,
      storefrontLastEditedAtIso,
      saveStorefrontCustomization,
      setThemeMode,
      toggleThemeMode,
      showToast,
      confirmBooking,
      checkSameDayCategoryConflict,
      updateUserProfile,
      setSelectedCurrency,
      rescheduleActiveBooking,
      cancelActiveBooking,
      setHospitalityPreferences,
      appendPassportFormula,
      addLoyaltyPoints,
      incrementStamp,
      redeemGiftCode,
      addCatalogItem,
      updateCatalogItem,
      removeCatalogItem,
      admitCustomerByQr,
      publishCheckoutBreakdown,
      completeQrPayment,
      toggleLikeSocialPost,
      toggleSaveSocialPost,
      addVenuePhoto,
      removeVenuePhoto,
      publishSocialPost,
      upgradeToPartnerAccount,
      updateLiveAppointmentStage,
    }),
    [
      themeMode,
      activeBooking,
      bookingHistory,
      passportEntries,
      loyaltyPoints,
      stampCount,
      walletBalanceMinor,
      toastMessage,
      partnerCatalog,
      packageCreditsRemaining,
      admittedPatientSession,
      completedBreakdown,
      activePaymentQr,
      likedSocialPosts,
      savedSocialPosts,
      customVenuePhotos,
      customSocialPosts,
      partnerSubscription,
      liveAppointmentStage,
      liveStagesByAppointmentId,
      getLiveStageForAppointment,
      partnerStaffMembers,
      setPartnerStaffMembers,
      addPartnerStaffMember,
      updatePartnerStaffMember,
      removePartnerStaffMember,
      partnerGroupedHours,
      setPartnerGroupedHours,
      updatePartnerGroupedHours,
      partnerDailyHours,
      setPartnerDailyHours,
      updatePartnerDailyHours,
      partnerDailyHoursMode,
      setPartnerDailyHoursMode,
      partnerCampaigns,
      setPartnerCampaigns,
      savePartnerCampaign,
      removePartnerCampaign,
      userProfile,
      selectedCurrency,
      sessionScopeKey,
      mobileAuthUser,
      isExplicitlySignedOut,
      authModalOpen,
      authModalInitialTab,
      openAuthModal,
      closeAuthModal,
      loginWithEmail,
      registerAccount,
      continueWithSocial,
      logoutMobileSession,
      storefrontCustomization,
      storefrontLastEditedAtIso,
      saveStorefrontCustomization,
      toggleThemeMode,
      showToast,
      confirmBooking,
      checkSameDayCategoryConflict,
      updateUserProfile,
      rescheduleActiveBooking,
      cancelActiveBooking,
      setHospitalityPreferences,
      appendPassportFormula,
      addLoyaltyPoints,
      incrementStamp,
      redeemGiftCode,
      addCatalogItem,
      updateCatalogItem,
      removeCatalogItem,
      admitCustomerByQr,
      publishCheckoutBreakdown,
      completeQrPayment,
      toggleLikeSocialPost,
      toggleSaveSocialPost,
      addVenuePhoto,
      removeVenuePhoto,
      publishSocialPost,
      upgradeToPartnerAccount,
      updateLiveAppointmentStage,
    ]
  );

  return (
    <MobileAppSessionContext.Provider value={value}>
      {children}
    </MobileAppSessionContext.Provider>
  );
};

export function useMobileAppSession(): MobileAppSessionValue {
  return useContext(MobileAppSessionContext) ?? SAFE_FALLBACK;
}

export default MobileAppSessionContext;
