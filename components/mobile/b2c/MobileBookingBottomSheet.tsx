import React, { useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Coffee,
  QrCode,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  MobileDiscoveryListingItem,
  MobileResourceWaitlistRegistry,
} from '../../../services/mobile/mobileDiscoveryService';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';

export interface MobileBookingBottomSheetProps {
  listing: MobileDiscoveryListingItem;
  language?: 'tr' | 'en';
  preselectedSpecialistName?: string;
  preselectedServiceNames?: string[];
  attachedStyleNote?: string;
  onClose: () => void;
  onBookingConfirmed?: (summary: {
    tenantId: string;
    serviceId: string;
    slotTime: string;
    mode: 'direct_booking' | 'waitlist_claim';
    hospitalityDrink?: string;
    quietSession?: boolean;
  }) => void;
}

const sharedWaitlistRegistry = new MobileResourceWaitlistRegistry();

export const MobileBookingBottomSheet: React.FC<
  MobileBookingBottomSheetProps
> = ({
  listing,
  language = 'tr',
  preselectedSpecialistName,
  preselectedServiceNames,
  attachedStyleNote,
  onClose,
  onBookingConfirmed,
}) => {
  const { confirmBooking } = useMobileAppSession();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSlot, setSelectedSlot] = useState(
    listing.nextAvailableSlot || '15:30'
  );
  const [selectedSpecialist, setSelectedSpecialist] = useState(
    preselectedSpecialistName || 'Merve Yılmaz (Art Director)'
  );
  const [hospitalityDrink, setHospitalityDrink] = useState<string>('Filtre Kahve');
  const [quietSession, setQuietSession] = useState<boolean>(false);
  const [sharePassportFormula, setSharePassportFormula] = useState<boolean>(true);
  const [confirmed, setConfirmed] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<string | null>(null);

  const primaryService = listing.popularServices[0];

  const handleConfirm = async () => {
    confirmBooking({
      appointmentId: `mobile-${listing.tenantId}-${Date.now()}`,
      tenantId: listing.tenantId,
      tenantSlug: listing.slug,
      businessName: listing.name,
      branchLabel: `${listing.district}, ${listing.city}`,
      serviceName: preselectedServiceNames?.join(' + ') || primaryService?.name || 'LARI Mobile Service',
      specialistName: selectedSpecialist,
      scheduledDate: '2026-11-17',
      scheduledTime: selectedSlot,
      priceMajor: primaryService?.priceMajor || 0,
      currency: primaryService?.currency || 'TRY',
      hospitalityDrink,
      quietSession,
      attachedStyleNote,
    });
    setConfirmed(true);
    onBookingConfirmed?.({
      tenantId: listing.tenantId,
      serviceId: primaryService?.id || 'srv-default',
      slotTime: selectedSlot,
      mode: 'direct_booking',
      hospitalityDrink,
      quietSession,
    });
  };

  const handleWaitlistClaim = async () => {
    const res = await sharedWaitlistRegistry.claimSlot({
      tenantId: listing.tenantId,
      customerId: 'cust-mobile-guest',
      slotKey: `2026-11-17_${selectedSlot}`,
      staffId: 'staff-1',
      requiredResourceId: primaryService?.requiredResourceId || 'room-1',
      resourceCapacity: 1,
    });
    setWaitlistStatus(res.reasonCode);
    if (res.claimed) {
      onBookingConfirmed?.({
        tenantId: listing.tenantId,
        serviceId: primaryService?.id || 'srv-default',
        slotTime: selectedSlot,
        mode: 'waitlist_claim',
        hospitalityDrink,
        quietSession,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[85] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center"
      data-testid="mobile-booking-bottom-sheet"
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-white border-t border-slate-200 p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl text-[#111827]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#5B5FEF] uppercase tracking-wider">
              Adım {step} / 3 • {listing.name}
            </span>
            <h3 className="text-sm font-black text-[#111827]">
              {step === 1
                ? language === 'tr'
                  ? '1. Hizmet & Uzman Seçimi'
                  : '1. Select Service & Specialist'
                : step === 2
                  ? language === 'tr'
                    ? '2. Saat & VIP Konfor Tercihi'
                    : '2. Select Slot & VIP Hospitality'
                  : language === 'tr'
                    ? '3. Özet, Pasaport Paylaşımı & QR Onay'
                    : '3. Summary & QR Pass'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && primaryService && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#F8F9FB] border border-indigo-200 p-3.5 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-[#111827]">
                  {preselectedServiceNames?.length
                    ? preselectedServiceNames.join(' + ')
                    : primaryService.name}
                </p>
                <p className="text-slate-500 mt-0.5">
                  {primaryService.durationMinutes} dk • Doğrulanmış Mağaza Garantisi
                </p>
              </div>
              <span className="font-black text-[#5B5FEF] text-sm">
                {primaryService.priceMajor} {primaryService.currency}
              </span>
            </div>

            {attachedStyleNote && (
              <div className="rounded-xl bg-[#EEF0FF] border border-indigo-200 p-2.5 text-[11px] text-[#4338CA] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5B5FEF] shrink-0" />
                <span>Ekli AI Stil Referansı: {attachedStyleNote}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#5B5FEF]" />
                Uzman / Hekim Tercihi
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  preselectedSpecialistName || 'Merve Yılmaz (Art Director)',
                  'İlk Müsait Kıdemli Uzman',
                ].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSelectedSpecialist(sp)}
                    className={`p-2.5 rounded-xl text-left text-[11px] font-semibold border transition ${
                      selectedSpecialist === sp
                        ? 'bg-[#EEF0FF] border-[#5B5FEF] text-[#4338CA]'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{ minHeight: '46px' }}
              className="w-full rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-black shadow-sm"
            >
              {language === 'tr'
                ? 'Devam Et (Saat & VIP İkram Seç)'
                : 'Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3.5">
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Müsait Saat Dilimleri (Bugün)
              </span>
              <div className="grid grid-cols-4 gap-2">
                {['13:30', '14:00', '15:30', '17:00'].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    style={{ minHeight: '42px' }}
                    className={`rounded-xl text-xs font-bold border ${
                      selectedSlot === slot
                        ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* App-Exclusive VIP Hospitality Selector */}
            <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-3.5 space-y-2.5">
              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                Uygulamaya Özel: Salona Girmeden İkramını Seç
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Filtre Kahve',
                  'Buzlu Matcha Latte',
                  'Organik Bitki Çayı',
                  'İkram İstemiyorum',
                ].map((drink) => (
                  <button
                    key={drink}
                    type="button"
                    onClick={() => setHospitalityDrink(drink)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border text-left ${
                      hospitalityDrink === drink
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {drink}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setQuietSession((q) => !q)}
                className={`w-full rounded-xl p-2.5 border text-xs font-semibold flex items-center justify-between ${
                  quietSession
                    ? 'bg-[#EEF0FF] border-[#5B5FEF] text-[#4338CA]'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  {quietSession ? (
                    <VolumeX className="w-4 h-4 text-[#5B5FEF]" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-400" />
                  )}
                  Sessiz / Dinlenme Seansı İstiyorum
                </span>
                <span className="text-[10px] font-bold">
                  {quietSession ? 'AKTİF' : 'Normal Mod'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleWaitlistClaim}
              style={{ minHeight: '42px' }}
              className="w-full rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <BellRing className="w-3.5 h-3.5" />
              {waitlistStatus
                ? `Waitlist Durumu: ${waitlistStatus}`
                : language === 'tr'
                  ? 'Dolu Slotta Oda Kilitli Waitlist ile Kap'
                  : 'Claim Resource-Locked Waitlist'}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              style={{ minHeight: '46px' }}
              className="w-full rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-black"
            >
              {language === 'tr' ? 'Onay Adımına Geç' : 'Review & Confirm'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Saat & Uzman:</span>
                <span className="font-bold text-[#111827]">
                  Bugün {selectedSlot} • {selectedSpecialist}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VIP Ağırlama:</span>
                <span className="font-bold text-amber-700">
                  {hospitalityDrink} {quietSession ? '• Sessiz Seans' : ''}
                </span>
              </div>
              <label className="flex items-center gap-2 pt-2 border-t border-slate-200 text-[11px] text-emerald-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sharePassportFormula}
                  onChange={(e) => setSharePassportFormula(e.target.checked)}
                />
                <span>
                  Bakım Pasaportumdaki geçmiş boya/işlem formülümü uzmana otomatik ilet
                </span>
              </label>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {language === 'tr'
                  ? 'No-Show Politikası: Randevudan 4 saat öncesine kadar ücretsiz erteleme/iptal yapabilirsiniz.'
                  : 'No-Show Policy: Free reschedule/cancel up to 4 hours before appointment.'}
              </span>
            </div>

            {confirmed && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-3">
                <QrCode className="w-10 h-10 text-emerald-700 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900">
                    Offline QR Pass Cüzdanına Eklendi!
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Uzmanına &ldquo;{hospitalityDrink}&rdquo; ve pasaport formülün iletildi.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              style={{ minHeight: '46px' }}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmed
                ? language === 'tr'
                  ? 'Randevunuz Onaylandı & QR Üretildi!'
                  : 'Confirmed & QR Pass Generated!'
                : language === 'tr'
                  ? 'Randevuyu Onayla & QR Oluştur'
                  : 'Confirm Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileBookingBottomSheet;
