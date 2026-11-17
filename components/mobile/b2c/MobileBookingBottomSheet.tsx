import React, { useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  Coffee,
  QrCode,
  Sparkles,
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
  const { confirmBooking, showToast, themeMode } = useMobileAppSession();
  const isDark = themeMode === 'dark';

  const [selectedSlot, setSelectedSlot] = useState(
    listing.nextAvailableSlot || '15:30'
  );
  const [selectedSpecialist, setSelectedSpecialist] = useState(
    preselectedSpecialistName || 'İlk Müsait Uzman'
  );
  const [showHospitalityOptions, setShowHospitalityOptions] = useState(false);
  const [hospitalityDrink, setHospitalityDrink] = useState<string>('Yok');
  const [quietSession, setQuietSession] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<string | null>(null);

  const primaryService = listing.popularServices[0];
  const serviceLabel = preselectedServiceNames?.length
    ? preselectedServiceNames.join(' + ')
    : primaryService?.name || 'Hizmet';

  const handleFastConfirm = async () => {
    setConfirmed(true);
    confirmBooking({
      appointmentId: `apt-live-${Date.now()}`,
      tenantId: listing.tenantId,
      tenantSlug: listing.slug,
      businessName: listing.name,
      branchLabel: `${listing.district}, ${listing.city}`,
      serviceName: serviceLabel,
      specialistName: selectedSpecialist,
      scheduledDate: '2026-11-18',
      scheduledTime: selectedSlot,
      priceMajor: primaryService?.priceMajor || 0,
      currency: primaryService?.currency || 'TRY',
      hospitalityDrink: hospitalityDrink === 'Yok' ? 'İkram Seçilmedi' : hospitalityDrink,
      quietSession,
      attachedStyleNote,
    });
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
    showToast(`Waitlist Durumu: ${res.reasonCode}`);
  };

  return (
    <div
      className="fixed inset-0 z-[85] bg-slate-950/50 backdrop-blur-sm flex items-end justify-center"
      data-testid="mobile-booking-bottom-sheet"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl border-t-2 p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-[#4F46E5] uppercase tracking-wider">
              Hızlı Randevu • {listing.name}
            </span>
            <h3 className="text-base font-black mt-0.5">
              {language === 'tr' ? 'Saat Seç & Onayla (3 Saniye)' : 'Fast Confirm'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Service & Price Summary */}
        {primaryService && (
          <div className="rounded-2xl bg-[#F8FAFC] border-2 border-slate-300 p-3.5 flex justify-between items-center text-sm text-slate-900">
            <div className="min-w-0 pr-2">
              <p className="font-black truncate">{serviceLabel}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {primaryService.durationMinutes} dk • {selectedSpecialist}
              </p>
            </div>
            <span className="font-black text-[#4F46E5] text-base shrink-0">
              {primaryService.priceMajor} {primaryService.currency}
            </span>
          </div>
        )}

        {attachedStyleNote && (
          <div className="rounded-xl bg-[#EEF2FF] border-2 border-[#4F46E5]/30 p-3 text-xs font-bold text-[#3730A3] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4F46E5] shrink-0" />
            <span>AI Stil Notu Eklendi: {attachedStyleNote}</span>
          </div>
        )}

        {/* Instant Time Slot Selector */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase text-slate-500 block">
            Bugün Müsait Saatler
          </span>
          <div className="grid grid-cols-4 gap-2">
            {['13:30', '14:00', '15:30', '17:00'].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                style={{ minHeight: '46px' }}
                className={`rounded-xl text-sm font-black border-2 transition ${
                  selectedSlot === slot
                    ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                    : isDark
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-white text-slate-800 border-slate-300'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Hospitality & Quiet Session Toggle (Collapsed by default for 3s speed!) */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHospitalityOptions((v) => !v)}
            className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-bold"
            data-testid="toggle-optional-hospitality-btn"
          >
            <span className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-600" />
              İsteğe Bağlı: İkram & Sessiz Seans Ekle
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showHospitalityOptions ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showHospitalityOptions && (
            <div className="p-3.5 pt-1 border-t-2 border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Filtre Kahve',
                  'Bitki Çayı',
                  'Su',
                  'İkram İstemiyorum',
                ].map((drink) => (
                  <button
                    key={drink}
                    type="button"
                    onClick={() => setHospitalityDrink(drink)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 text-left ${
                      hospitalityDrink === drink
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4338CA]'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    {drink}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQuietSession((q) => !q)}
                className={`w-full rounded-xl p-2.5 border-2 text-xs font-bold flex items-center justify-between ${
                  quietSession
                    ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4338CA]'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  {quietSession ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  Sessiz Seans İstiyorum
                </span>
                <span>{quietSession ? 'Aktif' : 'Normal'}</span>
              </button>
            </div>
          )}
        </div>

        {confirmed && (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-3.5 flex items-center gap-3 text-emerald-950">
            <QrCode className="w-10 h-10 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <p className="font-black">Randevunuz Onaylandı & QR Cüzdana Eklendi!</p>
              <p className="font-semibold mt-0.5">
                Saat {selectedSlot} • İptal/Erteleme ücretsiz (4 saat öncesine kadar).
              </p>
            </div>
          </div>
        )}

        {/* Primary 1-Tap Instant Booking Button */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleFastConfirm}
            style={{ minHeight: '52px' }}
            className="w-full rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-black flex items-center justify-center gap-2 shadow-md"
          >
            <CheckCircle2 className="w-5 h-5" />
            {confirmed
              ? 'Randevunuz Onaylandı ✓'
              : `Hemen Randevu Al (${primaryService?.priceMajor || 0} ${primaryService?.currency || 'TRY'})`}
          </button>

          <button
            type="button"
            onClick={handleWaitlistClaim}
            style={{ minHeight: '42px' }}
            className="w-full rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <BellRing className="w-4 h-4" />
            {waitlistStatus
              ? `Waitlist: ${waitlistStatus}`
              : 'Doluysa Oda Kilitli Yedek Sıraya Gir'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileBookingBottomSheet;
