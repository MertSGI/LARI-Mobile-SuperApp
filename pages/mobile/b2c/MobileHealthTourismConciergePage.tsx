import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarCheck2,
  Camera,
  Car,
  CheckCircle2,
  Copy,
  FileCheck2,
  Globe2,
  MessageCircle,
  PlaneLanding,
  PlaneTakeoff,
  QrCode,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import { createMobileQrArtifact } from '../../../services/mobile/lariQrEcosystemService';
import LariQrCodeSvg from '../../../components/mobile/LariQrCodeSvg';

export type SupportedHtCurrency = 'EUR' | 'USD' | 'GBP' | 'TRY';
export type SupportedHtLanguage = 'en' | 'de' | 'ar' | 'ru' | 'tr';

export interface MobileHtIntakePayload {
  tenantId: string;
  tenantEligible: boolean;
  healthTourismEnabled: boolean;
  fullName: string;
  countryCode: string;
  preferredLanguage: SupportedHtLanguage;
  preferredCurrency: SupportedHtCurrency;
  phone: string;
  email?: string;
  passportNumberRaw?: string;
  treatmentCategory:
    | 'dental_implant_veneers'
    | 'hair_transplant'
    | 'rhinoplasty_aesthetic'
    | 'medical_checkup';
  medicalNotes?: string;
  attachedPhotoCount: number;
}

export interface SafeHtPatientProjection {
  leadId: string;
  tenantId: string;
  fullName: string;
  countryCode: string;
  preferredLanguage: SupportedHtLanguage;
  preferredCurrency: SupportedHtCurrency;
  treatmentCategory: MobileHtIntakePayload['treatmentCategory'];
  attachedPhotoCount: number;
  passportRedacted: true;
}

export interface MobileHtPackageQuote {
  quoteId: string;
  version: number;
  currency: SupportedHtCurrency;
  treatmentMinorUnits: number;
  hotelNights: number;
  hotelName: string;
  hotelMinorUnits: number;
  vipTransferIncluded: boolean;
  vipTransferMinorUnits: number;
  totalMinorUnits: number;
  status: 'draft' | 'proposed' | 'accepted_by_patient';
}

export type HtItineraryStepType =
  | 'flight_arrival'
  | 'vip_airport_pickup'
  | 'hotel_checkin'
  | 'clinic_preop_lab'
  | 'main_procedure'
  | 'postop_control'
  | 'flight_departure';

export interface MobileHtItineraryItem {
  id: string;
  stepType: HtItineraryStepType;
  titleTr: string;
  titleEn: string;
  scheduledAtIso: string;
  locationLabel: string;
  status: 'completed' | 'active_next' | 'upcoming';
  notes?: string;
}

export interface MobileHtConciergeEvaluationResult {
  success: boolean;
  reasonCode?:
    | 'INVALID_TENANT'
    | 'COMMERCIAL_ELIGIBILITY_REQUIRED'
    | 'HEALTH_TOURISM_NOT_ENABLED'
    | 'MISSING_REQUIRED_FIELDS'
    | 'UNSUPPORTED_CURRENCY';
  patientProjection?: SafeHtPatientProjection;
  quote?: MobileHtPackageQuote;
  itinerary: MobileHtItineraryItem[];
  handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD';
  regulatoryHoldClassification: 'EXTERNAL_HOLD';
}

const VALID_CURRENCIES: ReadonlySet<string> = new Set(['EUR', 'USD', 'GBP', 'TRY']);

/**
 * Evaluates and builds a complete Health Tourism patient concierge state while enforcing:
 * 1. Commercial eligibility & health_tourism_enabled gate (ADIM036-VERTICAL-003 / COMM-010 parity),
 * 2. Strict exclusion of raw passport_number from ordinary browser/mobile read projections,
 * 3. Multi-currency package quote + 7-step medical travel itinerary.
 */
export function evaluateMobileHtPatientConcierge(
  input: MobileHtIntakePayload
): MobileHtConciergeEvaluationResult {
  if (!input.tenantId || !input.tenantId.trim()) {
    return {
      success: false,
      reasonCode: 'INVALID_TENANT',
      itinerary: [],
      handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD',
      regulatoryHoldClassification: 'EXTERNAL_HOLD',
    };
  }

  if (!input.tenantEligible) {
    return {
      success: false,
      reasonCode: 'COMMERCIAL_ELIGIBILITY_REQUIRED',
      itinerary: [],
      handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD',
      regulatoryHoldClassification: 'EXTERNAL_HOLD',
    };
  }

  if (!input.healthTourismEnabled) {
    return {
      success: false,
      reasonCode: 'HEALTH_TOURISM_NOT_ENABLED',
      itinerary: [],
      handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD',
      regulatoryHoldClassification: 'EXTERNAL_HOLD',
    };
  }

  if (!VALID_CURRENCIES.has(input.preferredCurrency)) {
    return {
      success: false,
      reasonCode: 'UNSUPPORTED_CURRENCY',
      itinerary: [],
      handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD',
      regulatoryHoldClassification: 'EXTERNAL_HOLD',
    };
  }

  if (!input.fullName?.trim() || !input.phone?.trim() || !input.countryCode?.trim()) {
    return {
      success: false,
      reasonCode: 'MISSING_REQUIRED_FIELDS',
      itinerary: [],
      handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD',
      regulatoryHoldClassification: 'EXTERNAL_HOLD',
    };
  }

  // Raw passport_number is intentionally omitted from SafeHtPatientProjection
  const patientProjection: SafeHtPatientProjection = {
    leadId: `ht_lead_${input.tenantId.slice(0, 8)}`,
    tenantId: input.tenantId.trim(),
    fullName: input.fullName.trim(),
    countryCode: input.countryCode.trim().toUpperCase(),
    preferredLanguage: input.preferredLanguage,
    preferredCurrency: input.preferredCurrency,
    treatmentCategory: input.treatmentCategory,
    attachedPhotoCount: Math.max(0, input.attachedPhotoCount),
    passportRedacted: true,
  };

  const baseMultiplier =
    input.preferredCurrency === 'TRY'
      ? 36
      : input.preferredCurrency === 'USD'
        ? 1.08
        : input.preferredCurrency === 'GBP'
          ? 0.85
          : 1;

  const treatmentMinor = Math.round(240000 * baseMultiplier);
  const hotelMinor = Math.round(45000 * baseMultiplier);
  const transferMinor = 0; // Complimentary VIP transfer

  const quote: MobileHtPackageQuote = {
    quoteId: `ht_quote_${patientProjection.leadId}_v1`,
    version: 1,
    currency: input.preferredCurrency,
    treatmentMinorUnits: treatmentMinor,
    hotelNights: 4,
    hotelName: '5* Nişantaşı Medical Partner Suites',
    hotelMinorUnits: hotelMinor,
    vipTransferIncluded: true,
    vipTransferMinorUnits: transferMinor,
    totalMinorUnits: treatmentMinor + hotelMinor + transferMinor,
    status: 'proposed',
  };

  const itinerary: MobileHtItineraryItem[] = [
    {
      id: 'it-1',
      stepType: 'flight_arrival',
      titleTr: 'İstanbul Havalimanı (IST) İniş & Karşılama',
      titleEn: 'Istanbul Airport (IST) Arrival & Meet',
      scheduledAtIso: '2026-11-20T11:30:00Z',
      locationLabel: 'IST Terminal • Gate 14 VIP Cikis',
      status: 'completed',
    },
    {
      id: 'it-2',
      stepType: 'vip_airport_pickup',
      titleTr: 'VIP Vito Transfer (Havalimanı -> Otel)',
      titleEn: 'VIP Chauffeur Transfer (Airport -> Hotel)',
      scheduledAtIso: '2026-11-20T12:15:00Z',
      locationLabel: 'Plaka: 34 LARI 01 • Koordinatör Eşlikli',
      status: 'active_next',
    },
    {
      id: 'it-3',
      stepType: 'hotel_checkin',
      titleTr: '5* Partner Otel Check-in & Dinlenme',
      titleEn: '5* Partner Hotel Check-in & Rest',
      scheduledAtIso: '2026-11-20T13:30:00Z',
      locationLabel: quote.hotelName,
      status: 'upcoming',
    },
    {
      id: 'it-4',
      stepType: 'clinic_preop_lab',
      titleTr: 'Klinik Pre-Op Muayene, Panoramik Röntgen & Kan Testi',
      titleEn: 'Clinic Pre-Op Exam, 3D Scan & Lab Tests',
      scheduledAtIso: '2026-11-21T09:00:00Z',
      locationLabel: 'LARİ Partner Klinik • Oda A-1',
      status: 'upcoming',
    },
    {
      id: 'it-5',
      stepType: 'main_procedure',
      titleTr: 'Ana Tedavi / Operasyon Oturumu',
      titleEn: 'Primary Treatment / Procedure Session',
      scheduledAtIso: '2026-11-21T11:00:00Z',
      locationLabel: 'Steril Operasyon Süiti • Oda A-1',
      status: 'upcoming',
    },
    {
      id: 'it-6',
      stepType: 'postop_control',
      titleTr: 'Post-Op Hekim Kontrolü & Bakım Kiti Teslimi',
      titleEn: 'Post-Op Doctor Check & Aftercare Kit Handover',
      scheduledAtIso: '2026-11-23T10:30:00Z',
      locationLabel: 'LARİ Partner Klinik',
      status: 'upcoming',
    },
    {
      id: 'it-7',
      stepType: 'flight_departure',
      titleTr: 'VIP Transfer ile Havalimanına Dönüş & Uçuş',
      titleEn: 'VIP Return Transfer to Airport & Departure',
      scheduledAtIso: '2026-11-24T14:00:00Z',
      locationLabel: 'Otel Lobi -> IST Havalimanı',
      status: 'upcoming',
    },
  ];

  return {
    success: true,
    patientProjection,
    quote,
    itinerary,
    handoffChannel: 'OUTBOX_QUEUED_EXTERNAL_HOLD',
    regulatoryHoldClassification: 'EXTERNAL_HOLD',
  };
}

function formatMinorMoney(minor: number, currency: SupportedHtCurrency): string {
  const major = (minor / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${major} ${currency}`;
}

export interface MobileHealthTourismConciergePageProps {
  tenantId: string;
  tenantEligible?: boolean;
  healthTourismEnabled?: boolean;
  language?: 'tr' | 'en';
}

export const MobileHealthTourismConciergePage: React.FC<
  MobileHealthTourismConciergePageProps
> = ({
  tenantId,
  tenantEligible = true,
  healthTourismEnabled = true,
  language = 'tr',
}) => {
  const { showToast, themeMode } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const [currency, setCurrency] = useState<SupportedHtCurrency>('EUR');
  const [treatment, setTreatment] =
    useState<MobileHtIntakePayload['treatmentCategory']>('dental_implant_veneers');
  const [quoteAccepted, setQuoteAccepted] = useState(false);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [recoveryDaySelected, setRecoveryDaySelected] = useState<
    'day1' | 'day3' | 'day7' | 'day30'
  >('day3');
  const [recoveryPhotoSubmitted, setRecoveryPhotoSubmitted] = useState(false);
  const [preOpChecks, setPreOpChecks] = useState<Record<string, boolean>>({
    fasting_8h: true,
    blood_thinners: true,
    passport_qr: false,
  });

  const state = evaluateMobileHtPatientConcierge({
    tenantId,
    tenantEligible,
    healthTourismEnabled,
    fullName: 'Elena Rostova',
    countryCode: 'DE',
    preferredLanguage: language === 'tr' ? 'tr' : 'en',
    preferredCurrency: currency,
    phone: '+4915123456789',
    treatmentCategory: treatment,
    attachedPhotoCount: 3,
  });

  const htAdmissionQr = useMemo(
    () =>
      createMobileQrArtifact({
        kind: 'ht_package_checkin',
        titleTr: 'VIP Sağlık Turizmi Kabul QR',
        subtitleTr: 'Elena Rostova (DE) • HT-IST-2026-42',
        tenantId,
        customerId: 'cust-ht-elena',
        customerName: 'Elena Rostova (Sağlık Turizmi VIP)',
        htJourneyCode: 'HT-IST-2026-42',
        packageName: 'Her Şey Dahil Medikal + 5* Otel + VIP Transfer Paketi',
        remainingCredits: 4,
      }),
    [tenantId]
  );

  if (!state.success) {
    return (
      <div
        className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700"
        data-testid="ht-concierge-blocked"
      >
        {language === 'tr'
          ? `Sağlık Turizmi Modülü Kapalı (${state.reasonCode})`
          : `Health Tourism Module Unavailable (${state.reasonCode})`}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-[#111827]" data-testid="mobile-ht-concierge-page">
      {/* Header & Multi-Currency Selector */}
      <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EEF0FF] text-[#4338CA] border border-indigo-200">
            <Globe2 className="w-3.5 h-3.5" />
            {language === 'tr'
              ? 'Uluslararası Sağlık Turizmi Konsiyerj'
              : 'International Medical Concierge'}
          </span>
          <div className="flex items-center gap-1">
            {(['EUR', 'USD', 'GBP', 'TRY'] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  currency === cur
                    ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                    : 'bg-[#F8F9FB] text-slate-600 border-slate-200'
                }`}
                data-testid={`ht-currency-${cur}`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-base font-black text-[#111827]">
          {language === 'tr'
            ? 'Tedavi + 5* Otel + VIP Transfer Paketiniz ve Seyahat Takviminiz'
            : 'Your All-Inclusive Treatment, Hotel & VIP Transfer Itinerary'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'tr'
            ? 'Pasaport numaranız gizlilik kalkanı (PII Redaction) ile korunmaktadır.'
            : 'Your passport number is protected with strict PII redaction.'}
        </p>

        {/* Treatment Category Switcher */}
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          {(
            [
              { id: 'dental_implant_veneers', tr: 'Diş İmplant & Gülüş', en: 'Dental & Veneers' },
              { id: 'hair_transplant', tr: 'Saç Ekimi (FUE/DHI)', en: 'Hair Transplant' },
              { id: 'rhinoplasty_aesthetic', tr: 'Estetik & Cerrahi', en: 'Aesthetic Surgery' },
              { id: 'medical_checkup', tr: 'Check-Up & Longevity', en: 'Executive Check-Up' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTreatment(cat.id)}
              style={{ minHeight: '42px' }}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border text-left ${
                treatment === cat.id
                  ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                  : 'bg-[#F8F9FB] text-slate-700 border-slate-200'
              }`}
            >
              {language === 'tr' ? cat.tr : cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Currency Package Quote Card */}
      {state.quote && (
        <div
          className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
          data-testid="ht-quote-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#5B5FEF]" />
              {language === 'tr' ? 'Her Şey Dahil Paket Teklifi' : 'All-Inclusive Package Quote'}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              v{state.quote.version} • {state.quote.currency}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{language === 'tr' ? 'Medikal Tedavi Paketi' : 'Medical Treatment'}</span>
              <span className="font-semibold text-[#111827]">
                {formatMinorMoney(state.quote.treatmentMinorUnits, state.quote.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                {state.quote.hotelNights}{' '}
                {language === 'tr' ? 'Gece 5* Partner Otel' : 'Nights 5* Partner Hotel'}
              </span>
              <span className="font-semibold text-[#111827]">
                {formatMinorMoney(state.quote.hotelMinorUnits, state.quote.currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                {language === 'tr'
                  ? 'Havalimanı - Otel - Klinik VIP Transfer'
                  : 'Airport - Hotel - Clinic VIP Transfer'}
              </span>
              <span className="font-bold text-emerald-700">
                {language === 'tr' ? 'ÜCRETSİZ (Dahil)' : 'INCLUDED'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-[#111827]">
                {language === 'tr' ? 'Toplam Paket Tutarı' : 'Total Package Price'}
              </span>
              <span
                className="text-sm font-black text-[#5B5FEF]"
                data-testid="ht-quote-total"
              >
                {formatMinorMoney(state.quote.totalMinorUnits, state.quote.currency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setQuoteAccepted(true);
                showToast(language === 'tr' ? 'Paket teklifiniz onaylandı.' : 'Package quote approved.');
              }}
              style={{ minHeight: '44px' }}
              className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                quoteAccepted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white'
              }`}
              data-testid="ht-accept-quote-btn"
            >
              <CheckCircle2 className="w-4 h-4" />
              {quoteAccepted
                ? language === 'tr'
                  ? 'Teklif Onaylandı'
                  : 'Quote Approved'
                : language === 'tr'
                  ? 'Teklifi Onayla'
                  : 'Approve Quote'}
            </button>
            <button
              type="button"
              onClick={() => {
                setHandoffRequested(true);
                showToast(language === 'tr' ? 'VIP koordinatörünüz bilgilendirildi.' : 'Your VIP coordinator was notified.');
              }}
              style={{ minHeight: '44px' }}
              className="rounded-xl px-3 py-2 text-xs font-semibold bg-[#EEF0FF] hover:bg-indigo-100 text-[#4338CA] flex items-center justify-center gap-1.5"
              data-testid="ht-whatsapp-handoff-btn"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              {handoffRequested
                ? language === 'tr'
                  ? 'Koordinatöre İletildi'
                  : 'Coordinator Notified'
                : language === 'tr'
                  ? 'VIP Koordinatöre Bağlan'
                  : 'VIP Coordinator Chat'}
            </button>
          </div>
        </div>
      )}

      {/* Step-by-Step Live Medical Travel Itinerary */}
      <div
        className={`rounded-3xl border-2 p-4 space-y-3 shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
        data-testid="ht-vip-admission-qr-card"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black flex items-center gap-1.5 text-[#4F46E5]">
            <QrCode className="w-4 h-4" />
            Havalimanı VIP Transfer & Klinik Hasta Kabul QR
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
            HT-IST-2026-42
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 py-1">
          <LariQrCodeSvg payload={htAdmissionQr.rawPayload} sizePx={136} />
          <p className="text-xs text-slate-500 text-center">
            Pasaport numaranız maskelenerek (KVKK) yalnızca transfer, otel ve klinik kabul için kullanılır.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard?.writeText(htAdmissionQr.rawPayload);
              } catch {
                // fallback
              }
              showToast('VIP Sağlık Turizmi QR tokeni kopyalandı!');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#EEF2FF] border-2 border-[#4F46E5]/30 text-[#4338CA] text-xs font-bold flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Sağlık Turizmi QR Tokeni Kopyala
          </button>
        </div>
      </div>

      {/* Step-by-Step Live Medical Travel Itinerary */}
      <div
        className="rounded-2xl bg-white border-2 border-slate-300 p-4 space-y-3 shadow-sm"
        data-testid="ht-itinerary-timeline"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
            <CalendarCheck2 className="w-4 h-4 text-[#5B5FEF]" />
            {language === 'tr'
              ? 'Adım Adım Canlı Seyahat & Tedavi Takviminiz'
              : 'Live Step-by-Step Travel & Treatment Timeline'}
          </span>
          <span className="text-[10px] text-slate-500">7 Adım</span>
        </div>

        <div className="space-y-2.5">
          {state.itinerary.map((item, idx) => {
            const isCompleted = item.status === 'completed';
            const isNext = item.status === 'active_next';
            return (
              <div
                key={item.id}
                className={`rounded-xl p-3 border flex items-start gap-3 ${
                  isNext
                    ? 'bg-[#EEF0FF] border-[#5B5FEF]/40'
                    : isCompleted
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-[#F8F9FB] border-slate-200'
                }`}
                data-testid={`ht-itinerary-step-${idx + 1}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isNext
                      ? 'bg-[#5B5FEF] text-white'
                      : isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.stepType === 'flight_arrival' && <PlaneLanding className="w-4 h-4" />}
                  {item.stepType === 'vip_airport_pickup' && <Car className="w-4 h-4" />}
                  {item.stepType === 'hotel_checkin' && <Building2 className="w-4 h-4" />}
                  {(item.stepType === 'clinic_preop_lab' ||
                    item.stepType === 'main_procedure' ||
                    item.stepType === 'postop_control') && <Stethoscope className="w-4 h-4" />}
                  {item.stepType === 'flight_departure' && <PlaneTakeoff className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#111827]">
                      {language === 'tr' ? item.titleTr : item.titleEn}
                    </span>
                    {isNext && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#5B5FEF] text-white shrink-0">
                        {language === 'tr' ? 'SIRADAKİ ADIM' : 'UP NEXT'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{item.locationLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pre-Op Preparation & Post-Op Recovery Photo Check-In (App-Exclusive) */}
      <div
        className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
        data-testid="ht-postop-recovery-card"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#111827] flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-[#5B5FEF]" />
            Pre-Op Hazırlık & Gün Gün Post-Op Doktor Takibi
          </span>
          <span className="text-[10px] font-bold text-emerald-700">
            Canlı Asistan
          </span>
        </div>

        <div className="space-y-1.5">
          {[
            {
              key: 'fasting_8h',
              label: 'Operasyondan 8 saat önce yeme/içmeyi durdurma sayacı',
            },
            {
              key: 'blood_thinners',
              label: 'Kan sulandırıcı / takviye kısıtlama onayı',
            },
            {
              key: 'passport_qr',
              label: 'IST Havalimanı Gate 14 VIP Karşılama Kodu Hazır',
            },
          ].map((chk) => (
            <button
              key={chk.key}
              type="button"
              onClick={() =>
                setPreOpChecks((p) => ({ ...p, [chk.key]: !p[chk.key] }))
              }
              className={`w-full rounded-xl p-2 border text-left text-[11px] font-semibold flex items-center justify-between ${
                preOpChecks[chk.key]
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-[#F8F9FB] border-slate-200 text-slate-700'
              }`}
            >
              <span>{chk.label}</span>
              <CheckCircle2
                className={`w-4 h-4 ${
                  preOpChecks[chk.key] ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-bold text-[#4338CA] block">
            Operasyon Sonrası Uzaktan Hekim Fotoğraf Kontrolü:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'day1', label: '1. Gün' },
                { id: 'day3', label: '3. Gün' },
                { id: 'day7', label: '7. Gün' },
                { id: 'day30', label: '30. Gün' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setRecoveryDaySelected(d.id);
                  setRecoveryPhotoSubmitted(false);
                }}
                className={`py-1.5 rounded-lg text-[10px] font-bold border ${
                  recoveryDaySelected === d.id
                    ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                    : 'bg-[#F8F9FB] text-slate-600 border-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setRecoveryPhotoSubmitted(true);
              showToast(`${recoveryDaySelected.toUpperCase()} iyileşme fotoğrafı hekime iletildi!`);
            }}
            style={{ minHeight: '42px' }}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
            data-testid="ht-submit-recovery-photo-btn"
          >
            <Camera className="w-3.5 h-3.5" />
            {recoveryPhotoSubmitted
              ? `${recoveryDaySelected.toUpperCase()} İyileşme Fotoğrafı Hekime İletildi ✓`
              : `${recoveryDaySelected.toUpperCase()} Kontrol Fotoğrafı Çek & Hekime Gönder`}
          </button>
        </div>
      </div>

      {/* Regulatory & Privacy Shield Footer */}
      <div className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between text-[11px] text-slate-500 shadow-xs">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          KVKK / GDPR Passport Redaction: ACTIVE
        </span>
        <span className="text-amber-700 font-semibold">
          Mevzuat Kapısı: {state.regulatoryHoldClassification}
        </span>
      </div>
    </div>
  );
};

export default MobileHealthTourismConciergePage;
