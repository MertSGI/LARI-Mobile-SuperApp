import React, { useMemo, useRef, useState } from 'react';
import {
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

const TR_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_MONTHS_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToIso(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return toLocalIsoDate(dt);
}

function formatChipInfo(iso: string, todayIso: string): { top: string; bottom: string } {
  const tomorrowIso = addDaysToIso(todayIso, 1);
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const bottom = `${d} ${TR_MONTHS_SHORT[dt.getMonth()]}`;
  if (iso === todayIso) return { top: 'Bugün', bottom };
  if (iso === tomorrowIso) return { top: 'Yarın', bottom };
  return { top: TR_DAYS_SHORT[dt.getDay()], bottom };
}

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

  const todayIso = useMemo(() => toLocalIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [dayOffset, setDayOffset] = useState<number>(0);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

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

  const visibleDays = useMemo(
    () => Array.from({ length: 4 }, (_, idx) => addDaysToIso(todayIso, dayOffset + idx)),
    [todayIso, dayOffset]
  );

  const availableSlots = useMemo(() => {
    if (selectedDate === todayIso) {
      return ['13:30', '14:00', '15:30', '17:00'];
    }
    return ['10:30', '13:30', '15:30', '17:00'];
  }, [selectedDate, todayIso]);

  const selectedChipInfo = useMemo(
    () => formatChipInfo(selectedDate, todayIso),
    [selectedDate, todayIso]
  );

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
      scheduledDate: selectedDate,
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
      slotKey: `${selectedDate}_${selectedSlot}`,
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
              {primaryService.priceMajor.toLocaleString('tr-TR')} {primaryService.currency}
            </span>
          </div>
        )}

        {attachedStyleNote && (
          <div className="rounded-xl bg-[#EEF2FF] border-2 border-[#4F46E5]/30 p-3 text-xs font-bold text-[#3730A3] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4F46E5] shrink-0" />
            <span>AI Stil Notu Eklendi: {attachedStyleNote}</span>
          </div>
        )}

        {/* Date Selector Strip (Swipe/Arrow Navigation + Direct Calendar Picker) */}
        <div className="space-y-2" data-testid="booking-date-selector">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500">
              Tarih Seçimi
            </span>
            <div className="relative flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const input = dateInputRef.current;
                  if (input) {
                    if (typeof (input as any).showPicker === 'function') {
                      (input as any).showPicker();
                    } else {
                      input.focus();
                      input.click();
                    }
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 text-xs font-bold transition ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-indigo-300 hover:bg-slate-700'
                    : 'bg-[#EEF2FF] border-[#4F46E5]/30 text-[#4338CA] hover:bg-indigo-100'
                }`}
                data-testid="booking-calendar-picker-btn"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Takvimden Seç</span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                min={todayIso}
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setSelectedDate(val);
                  const [y1, m1, d1] = todayIso.split('-').map(Number);
                  const [y2, m2, d2] = val.split('-').map(Number);
                  const diff = Math.round(
                    (new Date(y2, m2 - 1, d2).getTime() -
                      new Date(y1, m1 - 1, d1).getTime()) /
                      86400000
                  );
                  if (diff >= 0) {
                    setDayOffset(diff);
                  }
                }}
                className="sr-only"
                aria-label="Randevu tarihi seç"
                data-testid="booking-date-native-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDayOffset((prev) => Math.max(0, prev - 4))}
              disabled={dayOffset === 0}
              aria-label="Önceki günler"
              data-testid="booking-date-prev-btn"
              className={`flex h-12 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition ${
                dayOffset === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                  : isDark
                    ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {visibleDays.map((iso) => {
                const chip = formatChipInfo(iso, todayIso);
                const active = selectedDate === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    style={{ minHeight: '48px' }}
                    data-testid={`booking-day-chip-${iso}`}
                    className={`rounded-xl border-2 px-1 py-1.5 text-center transition ${
                      active
                        ? 'bg-[#4F46E5] text-white border-[#4338CA] shadow-xs'
                        : isDark
                          ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase leading-tight opacity-85">
                      {chip.top}
                    </span>
                    <span className="block text-xs font-black leading-tight mt-0.5">
                      {chip.bottom}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDayOffset((prev) => prev + 4)}
              aria-label="Sonraki günler"
              data-testid="booking-date-next-btn"
              className={`flex h-12 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Instant Time Slot Selector */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase text-slate-500 block">
            {selectedDate === todayIso
              ? 'Bugün Müsait Saatler'
              : `${selectedChipInfo.bottom} (${selectedChipInfo.top}) Müsait Saatler`}
          </span>
          <div className="grid grid-cols-4 gap-2">
            {availableSlots.map((slot) => (
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
                {selectedChipInfo.bottom} ({selectedChipInfo.top}) • Saat {selectedSlot} • İptal/Erteleme ücretsiz (4 saat öncesine kadar).
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
              : `Hemen Randevu Al (${(primaryService?.priceMajor || 0).toLocaleString('tr-TR')} ${primaryService?.currency || 'TRY'})`}
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
