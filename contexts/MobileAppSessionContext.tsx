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
  registerMobileAccount,
  updateMobileAuthUserRole,
} from '../services/mobile/mobileAuthService';

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
  partnerGroupedHours: Record<BusinessHoursKey, BusinessHoursSchedule>;
  setPartnerGroupedHours: React.Dispatch<React.SetStateAction<Record<BusinessHoursKey, BusinessHoursSchedule>>>;
  partnerDailyHours: Record<DailyBusinessHoursKey, BusinessHoursSchedule>;
  setPartnerDailyHours: React.Dispatch<React.SetStateAction<Record<DailyBusinessHoursKey, BusinessHoursSchedule>>>;
  partnerDailyHoursMode: boolean;
  setPartnerDailyHoursMode: React.Dispatch<React.SetStateAction<boolean>>;
  partnerCampaigns: PartnerCampaign[];
  setPartnerCampaigns: React.Dispatch<React.SetStateAction<PartnerCampaign[]>>;
  userProfile: MobileUserProfile;
  selectedCurrency: SupportedCurrency;
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
  ) => { accepted: boolean; reasonCode?: string; countdownText?: string };
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleThemeMode: () => void;
  showToast: (message: string) => void;
  confirmBooking: (input: ConfirmBookingInput) => {
    accepted: boolean;
    reasonCode?: 'SAME_CATEGORY_DAILY_CONFLICT';
    message?: string;
  };
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
  ) => {
    accepted: boolean;
    reasonCode?: 'SAME_CATEGORY_DAILY_CONFLICT';
    message?: string;
  };
  cancelActiveBooking: (reason?: string) => void;
  setHospitalityPreferences: (drink: string, quiet: boolean) => void;
  appendPassportFormula: (entry: MobilePassportEntry) => void;
  addLoyaltyPoints: (delta: number) => void;
  incrementStamp: () => void;
  redeemGiftCode: (code: string) => void;
  addCatalogItem: (item: Omit<PartnerCatalogItem, 'id'>) => void;
  updateCatalogItem: (
    id: string,
    patch: Partial<Omit<PartnerCatalogItem, 'id'>>
  ) => void;
  removeCatalogItem: (id: string) => void;
  admitCustomerByQr: (rawPayload: string, expectedTenantId?: string) => DecodedQrAdmissionResult;
  publishCheckoutBreakdown: (breakdown: CompletedAppointmentBreakdown, paymentQr: MobileQrArtifact) => void;
  completeQrPayment: (optionalTipMajor: number) => void;
  toggleLikeSocialPost: (postId: string) => void;
  toggleSaveSocialPost: (postId: string) => void;
  addVenuePhoto: (tenantSlug: string, photoUrl: string) => void;
  removeVenuePhoto: (tenantSlug: string, photoUrl: string) => void;
  publishSocialPost: (post: PublishSocialPostInput) => void;
  upgradeToPartnerAccount: (input: UpgradePartnerInput) => void;
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
const noopBooking = () => ({ accepted: true });
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
  partnerGroupedHours: INITIAL_GROUPED_HOURS,
  setPartnerGroupedHours: noop as any,
  partnerDailyHours: INITIAL_DAILY_HOURS,
  setPartnerDailyHours: noop as any,
  partnerDailyHoursMode: false,
  setPartnerDailyHoursMode: noop as any,
  partnerCampaigns: INITIAL_PARTNER_CAMPAIGNS,
  setPartnerCampaigns: noop as any,
  userProfile: DEFAULT_USER_PROFILE,
  selectedCurrency: 'TRY',
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
  saveStorefrontCustomization: () => ({ accepted: true }),
  setThemeMode: noop,
  toggleThemeMode: noop,
  showToast: noop,
  confirmBooking: noopBooking,
  checkSameDayCategoryConflict: noopConflict,
  updateUserProfile: noop,
  setSelectedCurrency: noop,
  rescheduleActiveBooking: noopBooking,
  cancelActiveBooking: noop,
  setHospitalityPreferences: noop,
  appendPassportFormula: noop,
  addLoyaltyPoints: noop,
  incrementStamp: noop,
  redeemGiftCode: noop,
  addCatalogItem: noop,
  updateCatalogItem: noop,
  removeCatalogItem: noop,
  admitCustomerByQr: () => ({ valid: false, reasonCode: 'MALFORMED_QR' }),
  publishCheckoutBreakdown: noop,
  completeQrPayment: noop,
  toggleLikeSocialPost: noop,
  toggleSaveSocialPost: noop,
  addVenuePhoto: noop,
  removeVenuePhoto: noop,
  publishSocialPost: noop,
  upgradeToPartnerAccount: noop,
  updateLiveAppointmentStage: noop,
};

const MobileAppSessionContext = createContext<MobileAppSessionValue | null>(null);

export const MobileAppSessionProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [activeBooking, setActiveBooking] = useState<MobileActiveBooking | null>(
    null
  );
  const [bookingHistory, setBookingHistory] = useState<MobileActiveBooking[]>(
    () => INITIAL_BOOKING_HISTORY.map((item) => ({ ...item }))
  );
  const [passportEntries, setPassportEntries] = useState<MobilePassportEntry[]>(
    () => INITIAL_PASSPORT_ENTRIES.map((entry) => ({ ...entry }))
  );
  const [loyaltyPoints, setLoyaltyPoints] = useState(480);
  const [stampCount, setStampCount] = useState(4);
  const [walletBalanceMinor, setWalletBalanceMinor] = useState(125000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [partnerCatalog, setPartnerCatalog] = useState<PartnerCatalogItem[]>(
    () => INITIAL_PARTNER_CATALOG.map((item) => ({ ...item }))
  );
  const [packageCreditsRemaining, setPackageCreditsRemaining] = useState(5);
  const [admittedPatientSession, setAdmittedPatientSession] =
    useState<AdmittedPatientSession | null>(null);
  const [completedBreakdown, setCompletedBreakdown] =
    useState<CompletedAppointmentBreakdown | null>(null);
  const [activePaymentQr, setActivePaymentQr] =
    useState<MobileQrArtifact | null>(null);
  const [likedSocialPosts, setLikedSocialPosts] = useState<string[]>([]);
  const [savedSocialPosts, setSavedSocialPosts] = useState<string[]>([]);
  const [customVenuePhotos, setCustomVenuePhotos] = useState<Record<string, string[]>>(
    {}
  );
  const [customSocialPosts, setCustomSocialPosts] = useState<MobileCustomSocialPost[]>(
    []
  );
  const [partnerSubscription, setPartnerSubscription] =
    useState<PartnerSubscriptionSnapshot | null>(null);
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

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
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
  const [mobileAuthUser, setMobileAuthUser] = useState<MobileAuthUser | null>(() =>
    getActiveMobileAuthUser()
  );
  const [isExplicitlySignedOut, setIsExplicitlySignedOut] = useState<boolean>(() =>
    isMobileExplicitlySignedOut()
  );
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');
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
    (input: ConfirmBookingInput) => {
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

      const confirmedItem: MobileActiveBooking = {
        ...input,
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
    },
    [bookingHistory, showToast]
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

  const applyAuthenticatedSession = useCallback(
    (result: MobileAuthActionResult, welcomeVerb: string) => {
      if (!result.success || !result.user) return;
      setMobileAuthUser(result.user);
      setIsExplicitlySignedOut(false);
      if (result.profile) {
        updateUserProfile(result.profile);
      }
      setAuthModalOpen(false);
      showToast(`${welcomeVerb}, ${result.user.fullName}!`);
    },
    [showToast, updateUserProfile]
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
    setMobileAuthUser(null);
    setIsExplicitlySignedOut(true);
    setPartnerSubscription(null);
    setAdmittedPatientSession(null);
    setAuthModalInitialTab('login');
    setAuthModalOpen(true);
    showToast('Oturumunuz güvenle kapatıldı.');
  }, [showToast]);

  const rescheduleActiveBooking = useCallback(
    (newDate: string, newTime: string) => {
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

      setActiveBooking((booking) => {
        if (!booking) return null;
        const updated: MobileActiveBooking = {
          ...booking,
          scheduledDate: newDate,
          scheduledTime: newTime,
          status: 'rescheduled',
        };
        setBookingHistory((prev) =>
          prev.map((item) =>
            item.appointmentId === updated.appointmentId ? updated : item
          )
        );
        return updated;
      });
      showToast('Randevu tarihi güncellendi.');
      return { accepted: true };
    },
    [activeBooking, bookingHistory, showToast]
  );

  const cancelActiveBooking = useCallback(
    (reason?: string) => {
      setActiveBooking((booking) => {
        if (booking) {
          setBookingHistory((prev) =>
            prev.map((item) =>
              item.appointmentId === booking.appointmentId
                ? { ...item, status: 'cancelled' }
                : item
            )
          );
        }
        return null;
      });
      showToast(
        reason
          ? `Randevu iptal edildi (${reason}).`
          : 'Randevu iptal edildi. Yeni bir deneyim keşfedebilirsiniz.'
      );
    },
    [showToast]
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

  const addCatalogItem = useCallback(
    (item: Omit<PartnerCatalogItem, 'id'>) => {
      const created: PartnerCatalogItem = {
        ...item,
        id: `cat-custom-${Date.now().toString(36)}`,
      };
      setPartnerCatalog((prev) => [created, ...prev]);
      showToast(`"${item.name}" işletme kataloğuna eklendi.`);
    },
    [showToast]
  );

  const updateCatalogItem = useCallback(
    (id: string, patch: Partial<Omit<PartnerCatalogItem, 'id'>>) => {
      setPartnerCatalog((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
      showToast('Katalog kalemi güncellendi.');
    },
    [showToast]
  );

  const removeCatalogItem = useCallback(
    (id: string) => {
      setPartnerCatalog((prev) => prev.filter((item) => item.id !== id));
      showToast('Katalog kalemi silindi.');
    },
    [showToast]
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
    (patch: Partial<PartnerStorefrontCustomization>) => {
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
    (input: UpgradePartnerInput) => {
      setPartnerSubscription({
        planId: input.planId,
        planName: input.planName,
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
        trialDays: input.trialDays,
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
      if (input.initialServiceName && input.initialServicePrice) {
        setPartnerCatalog((current) => [
          {
            id: `cat-onboard-${Date.now().toString(36)}`,
            tenantId: 'ten-atelier-nisantasi',
            name: input.initialServiceName!,
            category: 'beauty',
            unitPriceMajor: input.initialServicePrice!,
            durationMinutes: input.initialServiceDuration || 60,
            currency: 'TRY',
            taxRateBps: 2000,
            commissionRateBps: 2500,
            packageEligible: true,
            keywords: input.initialServiceName!
              .toLocaleLowerCase('tr-TR')
              .split(/\s+/)
              .filter(Boolean),
          },
          ...current,
        ]);
      }
      const promotedAuth = updateMobileAuthUserRole('tenant_owner');
      if (promotedAuth) {
        setMobileAuthUser(promotedAuth);
      }
      setIsExplicitlySignedOut(false);
      showToast(
        `${input.businessName} için ${input.planName} Partner hesabı aktif edildi!`
      );
    },
    [showToast]
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
      partnerGroupedHours,
      setPartnerGroupedHours,
      partnerDailyHours,
      setPartnerDailyHours,
      partnerDailyHoursMode,
      setPartnerDailyHoursMode,
      partnerCampaigns,
      setPartnerCampaigns,
      userProfile,
      selectedCurrency,
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
      partnerGroupedHours,
      setPartnerGroupedHours,
      partnerDailyHours,
      setPartnerDailyHours,
      partnerDailyHoursMode,
      setPartnerDailyHoursMode,
      partnerCampaigns,
      setPartnerCampaigns,
      userProfile,
      selectedCurrency,
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
