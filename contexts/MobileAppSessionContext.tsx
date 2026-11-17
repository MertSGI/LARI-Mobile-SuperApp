import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

export interface MobileAppSessionValue {
  activeBooking: MobileActiveBooking | null;
  passportEntries: MobilePassportEntry[];
  loyaltyPoints: number;
  stampCount: number;
  walletBalanceMinor: number;
  toastMessage: string | null;
  showToast: (message: string) => void;
  confirmBooking: (input: ConfirmBookingInput) => void;
  rescheduleActiveBooking: (newDate: string, newTime: string) => void;
  cancelActiveBooking: () => void;
  setHospitalityPreferences: (drink: string, quiet: boolean) => void;
  appendPassportFormula: (entry: MobilePassportEntry) => void;
  addLoyaltyPoints: (delta: number) => void;
  incrementStamp: () => void;
  redeemGiftCode: (code: string) => void;
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
  activeBooking: null,
  passportEntries: INITIAL_PASSPORT_ENTRIES,
  loyaltyPoints: 480,
  stampCount: 4,
  walletBalanceMinor: 125000,
  toastMessage: null,
  showToast: noop,
  confirmBooking: noop,
  rescheduleActiveBooking: noop,
  cancelActiveBooking: noop,
  setHospitalityPreferences: noop,
  appendPassportFormula: noop,
  addLoyaltyPoints: noop,
  incrementStamp: noop,
  redeemGiftCode: noop,
};

const MobileAppSessionContext = createContext<MobileAppSessionValue | null>(null);

export const MobileAppSessionProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
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

  const value = useMemo<MobileAppSessionValue>(
    () => ({
      activeBooking,
      passportEntries,
      loyaltyPoints,
      stampCount,
      walletBalanceMinor,
      toastMessage,
      showToast,
      confirmBooking,
      rescheduleActiveBooking,
      cancelActiveBooking,
      setHospitalityPreferences,
      appendPassportFormula,
      addLoyaltyPoints,
      incrementStamp,
      redeemGiftCode,
    }),
    [
      activeBooking,
      passportEntries,
      loyaltyPoints,
      stampCount,
      walletBalanceMinor,
      toastMessage,
      showToast,
      confirmBooking,
      rescheduleActiveBooking,
      cancelActiveBooking,
      setHospitalityPreferences,
      appendPassportFormula,
      addLoyaltyPoints,
      incrementStamp,
      redeemGiftCode,
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
