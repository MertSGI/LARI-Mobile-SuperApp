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

export interface MobileActiveBooking {
  appointmentId: string;
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  branchLabel: string;
  serviceName: string;
  specialistName: string;
  scheduledDate: string;
  scheduledTime: string;
  priceMajor: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled';
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

export interface MobileAppSessionValue {
  themeMode: 'light' | 'dark';
  activeBooking: MobileActiveBooking | null;
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
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleThemeMode: () => void;
  showToast: (message: string) => void;
  confirmBooking: (input: ConfirmBookingInput) => void;
  rescheduleActiveBooking: (newDate: string, newTime: string) => void;
  cancelActiveBooking: () => void;
  setHospitalityPreferences: (drink: string, quiet: boolean) => void;
  appendPassportFormula: (entry: MobilePassportEntry) => void;
  addLoyaltyPoints: (delta: number) => void;
  incrementStamp: () => void;
  redeemGiftCode: (code: string) => void;
  addCatalogItem: (item: Omit<PartnerCatalogItem, 'id'>) => void;
  admitCustomerByQr: (rawPayload: string, expectedTenantId?: string) => DecodedQrAdmissionResult;
  publishCheckoutBreakdown: (breakdown: CompletedAppointmentBreakdown, paymentQr: MobileQrArtifact) => void;
  completeQrPayment: (optionalTipMajor: number) => void;
  toggleLikeSocialPost: (postId: string) => void;
  toggleSaveSocialPost: (postId: string) => void;
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

const noop = () => undefined;

const SAFE_FALLBACK: MobileAppSessionValue = {
  themeMode: 'light',
  activeBooking: null,
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
  setThemeMode: noop,
  toggleThemeMode: noop,
  showToast: noop,
  confirmBooking: noop,
  rescheduleActiveBooking: noop,
  cancelActiveBooking: noop,
  setHospitalityPreferences: noop,
  appendPassportFormula: noop,
  addLoyaltyPoints: noop,
  incrementStamp: noop,
  redeemGiftCode: noop,
  addCatalogItem: noop,
  admitCustomerByQr: () => ({ valid: false, reasonCode: 'MALFORMED_QR' }),
  publishCheckoutBreakdown: noop,
  completeQrPayment: noop,
  toggleLikeSocialPost: noop,
  toggleSaveSocialPost: noop,
};

const MobileAppSessionContext = createContext<MobileAppSessionValue | null>(null);

export const MobileAppSessionProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [activeBooking, setActiveBooking] = useState<MobileActiveBooking | null>(
    null
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

  const confirmBooking = useCallback(
    (input: ConfirmBookingInput) => {
      setActiveBooking({ ...input, status: 'confirmed' });
      setLoyaltyPoints((points) => points + 50);
      showToast('Randevunuz onaylandı • +50 LARİ Puan');
    },
    [showToast]
  );

  const rescheduleActiveBooking = useCallback(
    (newDate: string, newTime: string) => {
      setActiveBooking((booking) =>
        booking
          ? {
              ...booking,
              scheduledDate: newDate,
              scheduledTime: newTime,
              status: 'rescheduled',
            }
          : null
      );
      showToast('Randevu tarihi güncellendi.');
    },
    [showToast]
  );

  const cancelActiveBooking = useCallback(() => {
    setActiveBooking(null);
    showToast('Randevu iptal edildi. Yeni bir deneyim keşfedebilirsiniz.');
  }, [showToast]);

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
        showToast('LARI500 ile 500,00 TRY cüzdanınıza eklendi.');
        return;
      }
      showToast('Hediye kodu geçersiz.');
    },
    [showToast]
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
      showToast(
        safeTip > 0
          ? `QR Ödeme (+${safeTip} TRY isteğe bağlı bahşiş) tamamlandı • +50 Puan!`
          : 'QR Ödeme (Bahşişsiz) tamamlandı • +50 Puan!'
      );
    },
    [showToast]
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

  const value = useMemo<MobileAppSessionValue>(
    () => ({
      themeMode,
      activeBooking,
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
      setThemeMode,
      toggleThemeMode,
      showToast,
      confirmBooking,
      rescheduleActiveBooking,
      cancelActiveBooking,
      setHospitalityPreferences,
      appendPassportFormula,
      addLoyaltyPoints,
      incrementStamp,
      redeemGiftCode,
      addCatalogItem,
      admitCustomerByQr,
      publishCheckoutBreakdown,
      completeQrPayment,
      toggleLikeSocialPost,
      toggleSaveSocialPost,
    }),
    [
      themeMode,
      activeBooking,
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
      toggleThemeMode,
      showToast,
      confirmBooking,
      rescheduleActiveBooking,
      cancelActiveBooking,
      setHospitalityPreferences,
      appendPassportFormula,
      addLoyaltyPoints,
      incrementStamp,
      redeemGiftCode,
      addCatalogItem,
      admitCustomerByQr,
      publishCheckoutBreakdown,
      completeQrPayment,
      toggleLikeSocialPost,
      toggleSaveSocialPost,
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
