import React, { useState } from 'react';
import { BellRing, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import {
  MobileDiscoveryListingItem,
  MobileResourceWaitlistRegistry,
} from '../../../services/mobile/mobileDiscoveryService';

export interface MobileBookingBottomSheetProps {
  listing: MobileDiscoveryListingItem;
  language?: 'tr' | 'en';
  onClose: () => void;
  onBookingConfirmed?: (summary: {
    tenantId: string;
    serviceId: string;
    slotTime: string;
    mode: 'direct_booking' | 'waitlist_claim';
  }) => void;
}

const sharedWaitlistRegistry = new MobileResourceWaitlistRegistry();

export const MobileBookingBottomSheet: React.FC<
  MobileBookingBottomSheetProps
> = ({ listing, language = 'tr', onClose, onBookingConfirmed }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSlot, setSelectedSlot] = useState(
    listing.nextAvailableSlot || '15:30'
  );
  const [confirmed, setConfirmed] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<string | null>(null);

  const primaryService = listing.popularServices[0];

  const handleConfirm = async () => {
    setConfirmed(true);
    onBookingConfirmed?.({
      tenantId: listing.tenantId,
      serviceId: primaryService?.id || 'srv-default',
      slotTime: selectedSlot,
      mode: 'direct_booking',
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
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      data-testid="mobile-booking-bottom-sheet"
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-slate-900 border-t border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase">
              Adım {step} / 3 • {listing.name}
            </span>
            <h3 className="text-sm font-bold text-white">
              {step === 1
                ? language === 'tr'
                  ? '1. Hizmet & Paket Seçimi'
                  : '1. Select Service'
                : step === 2
                  ? language === 'tr'
                    ? '2. Uzman & Saat Seçimi'
                    : '2. Select Staff & Slot'
                  : language === 'tr'
                    ? '3. Depozito & OTP Onayı'
                    : '3. Deposit & OTP Confirm'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && primaryService && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-950 border border-blue-500/40 p-3 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-white">{primaryService.name}</p>
                <p className="text-slate-400">{primaryService.durationMinutes} dk</p>
              </div>
              <span className="font-bold text-blue-300">
                {primaryService.priceMajor} {primaryService.currency}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{ minHeight: '46px' }}
              className="w-full rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              {language === 'tr' ? 'Devam Et (Saat Seç)' : 'Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {['14:00', '15:30', '17:00'].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  style={{ minHeight: '44px' }}
                  className={`rounded-xl text-xs font-bold border ${
                    selectedSlot === slot
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleWaitlistClaim}
              style={{ minHeight: '42px' }}
              className="w-full rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5"
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
              className="w-full rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              {language === 'tr' ? 'Onay Adımına Geç' : 'Review & Confirm'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {language === 'tr'
                  ? 'No-Show Politikası: Randevudan 4 saat öncesine kadar ücretsiz erteleme/iptal yapabilirsiniz.'
                  : 'No-Show Policy: Free reschedule/cancel up to 4 hours before appointment.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              style={{ minHeight: '46px' }}
              className="w-full rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmed
                ? language === 'tr'
                  ? 'Randevunuz Onaylandı & QR Üretildi!'
                  : 'Confirmed & QR Pass Generated!'
                : language === 'tr'
                  ? 'Randevuyu Onayla'
                  : 'Confirm Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileBookingBottomSheet;
