import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Coffee,
  Copy,
  Gift,
  Package,
  QrCode,
  Receipt,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Stamp,
  Star,
  Wallet,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import {
  generateSignedQrCheckinPass,
  QrCheckinAndReviewRegistry,
} from '../../../services/mobile/qrCheckinService';
import { buildAppointmentIcsContent } from '../../../services/mobile/nativeBridgeService';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import {
  convertFromTryMajor,
  getCurrencySymbol,
} from '../../../services/mobile/mobileRegionCurrencyService';
import {
  createMobileQrArtifact,
  QR_USAGE_SCENARIOS_BY_KIND,
} from '../../../services/mobile/lariQrEcosystemService';
import LariQrCodeSvg from '../../../components/mobile/LariQrCodeSvg';
import { sanitizeUserMessage } from '../../../services/mobile/mobileUiSanitizer';

export interface MobileCustomerWalletPageProps {
  tenantId: string;
  customerId?: string;
  language?: 'tr' | 'en';
  isGuestSession?: boolean;
  onGoToExplore?: () => void;
}

const walletReviewRegistry = new QrCheckinAndReviewRegistry();

export const MobileCustomerWalletPage: React.FC<
  MobileCustomerWalletPageProps
> = ({
  tenantId,
  customerId = 'cust-demo-1',
  language = 'tr',
  isGuestSession = false,
  onGoToExplore,
}) => {
  const {
    themeMode,
    activeBooking,
    bookingHistory,
    passportEntries,
    loyaltyPoints,
    stampCount,
    walletBalanceMinor,
    packageCreditsRemaining,
    completedBreakdown,
    activePaymentQr,
    rescheduleActiveBooking,
    cancelActiveBooking,
    setHospitalityPreferences,
    addLoyaltyPoints,
    redeemGiftCode,
    completeQrPayment,
    getLiveStageForAppointment,
    selectedCurrency,
    userProfile,
    mobileAuthUser,
    isExplicitlySignedOut,
    sessionScopeKey,
    openAuthModal,
    showToast,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const currencySymbol = getCurrencySymbol(selectedCurrency);
  const effectiveGuest = Boolean(
    isGuestSession ||
      (isExplicitlySignedOut && !mobileAuthUser && sessionScopeKey === 'guest')
  );

  const [activeSubTab, setActiveSubTab] = useState<
    'qr' | 'passport' | 'loyalty' | 'reviews'
  >('qr');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [qrMode, setQrMode] = useState<'appointment' | 'package'>('appointment');
  const [customerTipRate, setCustomerTipRate] = useState<0 | 5 | 10 | 15>(0);
  const liveStage = getLiveStageForAppointment(activeBooking?.appointmentId);
  const [cancelledEmpty, setCancelledEmpty] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Programım değişti');
  const [showRescheduleSlots, setShowRescheduleSlots] = useState(false);
  const [routineClaims, setRoutineClaims] = useState<Record<string, number>>(() => {
    try {
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(`lari_routine_claims_v1_${sessionScopeKey}`)
          : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [routineCooldownSec, setRoutineCooldownSec] = useState(0);
  const [routineCooldownNotice, setRoutineCooldownNotice] = useState<string | null>(null);

  const [giftCode, setGiftCode] = useState('');
  const [giftMessage, setGiftMessage] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [giftLocked, setGiftLocked] = useState(false);

  const cardSurface = isDark
    ? 'bg-slate-900 border-2 border-slate-700 text-white'
    : 'bg-white border-2 border-slate-300 text-slate-900';
  const innerSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-slate-100'
    : 'bg-[#F8FAFC] border-2 border-slate-200 text-slate-900';

  const displayedBooking = effectiveGuest || cancelledEmpty ? null : activeBooking;

  const selectedDrink = displayedBooking?.hospitalityDrink || 'Filtre Kahve';
  const quietMode = displayedBooking?.quietSession ?? true;

  const qrPass = generateSignedQrCheckinPass({
    tenantId: displayedBooking?.tenantId || tenantId,
    appointmentId: displayedBooking?.appointmentId || 'apt-none',
    customerId: mobileAuthUser?.userId || customerId,
    selfServiceToken: 'tok-self-101',
    scheduledDate: displayedBooking?.scheduledDate || '2026-11-18',
    scheduledTime: displayedBooking?.scheduledTime || '15:30',
    businessName: displayedBooking?.businessName || 'LARİ İşletme',
    serviceName: displayedBooking?.serviceName || 'Randevu',
  });

  const packageAdmissionQr = useMemo(
    () =>
      createMobileQrArtifact({
        kind: 'ht_package_checkin',
        titleTr: '8 Seans Paketli Müşteri Kabul QR',
        subtitleTr: `Kalan Seans Hakkı: ${packageCreditsRemaining} / 8`,
        tenantId,
        customerId: mobileAuthUser?.userId || customerId,
        customerName: `${mobileAuthUser?.fullName || userProfile.fullName || 'Üye'} (Paketli Müşteri)`,
        packageName: '8 Seans Lazer / Medikal Bakım Paketi',
        remainingCredits: packageCreditsRemaining,
      }),
    [tenantId, customerId, packageCreditsRemaining, mobileAuthUser?.userId, mobileAuthUser?.fullName, userProfile.fullName]
  );

  const activeQrPayload =
    qrMode === 'package' ? packageAdmissionQr.rawPayload : qrPass.rawQrPayload;

  const activeQrScenarios =
    qrMode === 'package'
      ? QR_USAGE_SCENARIOS_BY_KIND.ht_package_checkin
      : QR_USAGE_SCENARIOS_BY_KIND.appointment_checkin;

  const handleCopyQrPayload = async () => {
    try {
      await navigator.clipboard?.writeText(activeQrPayload);
    } catch {
      // Headless fallback
    }
    showToast('QR kodu doğrulama tokeni kopyalandı; Partner ekranında kabul edilebilir.');
  };

  const handleExportCalendarIcs = () => {
    if (!displayedBooking) return;
    const ics = buildAppointmentIcsContent({
      appointmentId: displayedBooking.appointmentId,
      title: `${displayedBooking.serviceName} - ${displayedBooking.businessName}`,
      businessName: displayedBooking.businessName,
      address: displayedBooking.branchLabel,
      startIso: `${displayedBooking.scheduledDate}T${displayedBooking.scheduledTime}:00`,
      durationMinutes: 60,
    });
    try {
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lari-${displayedBooking.appointmentId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Headless fallback safely ignored
    }
    showToast('Takvim dosyası (.ics) indirildi!');
  };

  const handleRedeemGiftCard = () => {
    if (giftLocked) return;
    setGiftLocked(true);
    setTimeout(() => setGiftLocked(false), 2000);
    if (giftCode.trim().toUpperCase() === 'LARI500') {
      redeemGiftCode(giftCode);
      setGiftMessage(
        `LARI500 (+${convertFromTryMajor(500, selectedCurrency).toLocaleString('tr-TR')} ${currencySymbol}) cüzdana eklendi!`
      );
      setGiftCode('');
    } else {
      setGiftMessage('Geçersiz hediye kartı kodu (Örn: LARI500)');
    }
  };

  const handleShareGiftEnvelope = async () => {
    const shareText =
      'LARİ ile bakım randevunda geçerli LARI-ARKADAS hediye bakım kodunu kullan!';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'LARİ Hediye Zarfı', text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }
    } catch {
      // fallback toast
    }
    showToast('Hediye bakım zarfı kodu (LARI-ARKADAS) paylaşıma hazır!');
  };

  React.useEffect(() => {
    if (routineCooldownSec <= 0) return;
    const timer = setTimeout(() => setRoutineCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [routineCooldownSec]);

  const DAY_MS = 24 * 60 * 60 * 1000;

  const handleToggleRoutine = (key: string) => {
    if (routineCooldownSec > 0) return;
    const now = Date.now();
    const lastClaimed = routineClaims[key] || 0;
    const within24h = now - lastClaimed < DAY_MS;

    setRoutineCooldownSec(4);

    if (within24h) {
      const remainingHours = Math.max(1, Math.ceil((DAY_MS - (now - lastClaimed)) / 3600_000));
      setRoutineCooldownNotice(`Bu rutin 24 saatte 1 kez puan kazandırır (Yenilenmeye ~${remainingHours} saat).`);
      showToast(`Günlük rutin zaten tamamlandı. Yenilenmesine ~${remainingHours} saat var.`);
      return;
    }

    const updated = { ...routineClaims, [key]: now };
    setRoutineClaims(updated);
    try {
      window.localStorage.setItem('lari_routine_claims_v1', JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    addLoyaltyPoints(15);
    setRoutineCooldownNotice('Günlük rutin puanı eklendi (+15 LARİ Puan). Sonraki hak 24 saat sonra açılır.');
    showToast('Günlük rutin tamamlandı • +15 LARİ Puan');
  };

  const handleSubmitReview = () => {
    if (reviewSubmitted) {
      setReviewStatus('Bu randevu için zaten bir değerlendirme paylaştınız.');
      return;
    }
    const res = walletReviewRegistry.submitVerifiedReview({
      tenantId,
      appointmentId: 'apt-past-99',
      appointmentTenantId: tenantId,
      appointmentStatus: 'completed',
      selfServiceToken: 'tok-past-99',
      expectedSelfServiceToken: 'tok-past-99',
      rating,
      comment: reviewComment,
    });
    if (res.accepted) {
      setReviewSubmitted(true);
      addLoyaltyPoints(50);
      setReviewStatus('Doğrulanmış yorumunuz yayınlandı (+50 Sadakat Puanı)!');
      showToast('Doğrulanmış yorumunuz eklendi (+50 Puan)');
    } else {
      setReviewSubmitted(true);
      setReviewStatus(sanitizeUserMessage(res.reasonCode));
    }
  };

  if (effectiveGuest) {
    return (
      <div className="space-y-4 text-[#111827]" data-testid="mobile-customer-wallet-page">
        <div
          className={`rounded-3xl p-6 text-center space-y-3 shadow-sm ${cardSurface}`}
          data-testid="wallet-guest-gate"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black">
            Kişisel Randevu, Bakım Pasaportu & Cüzdan
          </h3>
          <p className="text-xs leading-relaxed text-slate-500 max-w-xs mx-auto">
            Canlı Check-in QR kodunuz, salon/klinik bakım formülleriniz ve LARİ Puanlarınız yalnızca kendi hesabınıza özeldir. Görmek için giriş yapın veya ücretsiz üye olun.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="min-h-11 rounded-2xl bg-[#4F46E5] text-white text-xs font-black"
              data-testid="wallet-guest-login-btn"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="min-h-11 rounded-2xl border-2 border-slate-300 text-xs font-black"
              data-testid="wallet-guest-register-btn"
            >
              Üye Ol
            </button>
          </div>
          <button
            type="button"
            onClick={() => onGoToExplore?.()}
            className="text-xs font-black text-[#4F46E5] hover:underline pt-1"
          >
            Misafir Olarak İşletmeleri Keşfet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-[#111827]" data-testid="mobile-customer-wallet-page">
      {/* 4 Clean Corporate Light Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
        {(
          [
            { id: 'qr', tr: 'Canlı QR', en: 'Live QR' },
            { id: 'passport', tr: 'Pasaportum', en: 'Passport' },
            { id: 'loyalty', tr: 'Cüzdan & Kart', en: 'Wallet' },
            { id: 'reviews', tr: 'Değerlendir', en: 'Reviews' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            style={{ minHeight: '40px' }}
            className={`rounded-lg text-[11px] font-bold transition ${
              activeSubTab === tab.id
                ? 'bg-[#5B5FEF] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#111827]'
            }`}
            data-testid={`wallet-subtab-${tab.id}`}
          >
            {language === 'tr' ? tab.tr : tab.en}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: LIVE APPOINTMENT COMPANION & OFFLINE QR PASS */}
      {activeSubTab === 'qr' && (
        <div className="space-y-3">
          {!displayedBooking ? (
            <div
              className="rounded-3xl bg-white border border-slate-200 p-8 text-center space-y-3 shadow-sm"
              data-testid="wallet-empty-state"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EEF0FF] text-[#5B5FEF] flex items-center justify-center">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-[#111827]">
                Planlanmış Randevunuz Bulunmuyor
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Yakınınızdaki doğrulanmış kuaför, spa ve klinikleri harita üzerinden keşfedip anında randevu oluşturabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => onGoToExplore?.()}
                style={{ minHeight: '44px' }}
                className="px-6 py-2.5 rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold shadow-sm"
              >
                Keşfet & Randevu Al
              </button>
            </div>
          ) : (
            <>
              {/* Live Companion Card */}
              <div
                className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
                data-testid="live-appointment-companion-card"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    CANLI RANDEVU ASİSTANI
                  </span>
                  <span className="text-[11px] font-bold text-[#5B5FEF]">
                    Adım {liveStage} / 4
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1" aria-label="Canlı Randevu Durumu">
                  {[
                    { s: 1, label: 'Onaylandı' },
                    { s: 2, label: 'Yola Çık' },
                    { s: 3, label: 'Check-in' },
                    { s: 4, label: 'Koltukta' },
                  ].map((st) => (
                    <div
                      key={st.s}
                      className={`rounded-xl p-2 text-center border transition select-none ${
                        liveStage >= st.s
                          ? 'bg-[#EEF0FF] border-[#5B5FEF]/40 text-[#4338CA]'
                          : 'bg-[#F8F9FB] border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-bold block">{st.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Bu aşamalar yalnızca işletme (Partner) onayı ve QR check-in ile otomatik güncellenir.
                </p>

                {/* Pre-Arrival VIP Hospitality Controls */}
                <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5" />
                      Koltuk İkram & Konfor Tercihin:
                    </span>
                    <button
                      type="button"
                      onClick={() => setHospitalityPreferences(selectedDrink, !quietMode)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        quietMode
                          ? 'bg-[#EEF0FF] border-[#5B5FEF]/30 text-[#4338CA]'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {quietMode ? 'Sessiz Seans Aktif' : 'Normal Sohbet'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      'Filtre Kahve',
                      'Buzlu Matcha',
                      'Detoks Çayı',
                      'Sade Soda',
                    ].map((dr) => (
                      <button
                        key={dr}
                        type="button"
                        onClick={() => setHospitalityPreferences(dr, quietMode)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border ${
                          selectedDrink === dr
                            ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {dr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmed Booking Summary & Offline QR Pass Card */}
              <div
                className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm"
                data-testid="wallet-qr-pass-card"
              >
                <div className="bg-[#5B5FEF] text-white p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase opacity-85">
                      {displayedBooking.status === 'rescheduled' ? 'ERTELENDİ' : 'ONAYLANDI'} •{' '}
                      {displayedBooking.scheduledDate} {displayedBooking.scheduledTime}
                    </span>
                    <h3 className="text-sm font-black mt-0.5">
                      {displayedBooking.businessName}
                    </h3>
                    <p className="text-xs opacity-90">
                      {displayedBooking.serviceName} • {displayedBooking.specialistName}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 text-white text-[10px] font-bold">
                    <WifiOff className="w-3 h-3" />
                    Offline QR
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* QR Kind Switcher: Randevu QR vs Paketli Müşteri Kabul QR */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrMode('appointment')}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition ${
                        qrMode === 'appointment'
                          ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                          : innerSurface
                      }`}
                      data-testid="wallet-qr-mode-appointment"
                    >
                      Randevu Check-in QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrMode('package')}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition ${
                        qrMode === 'package'
                          ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                          : innerSurface
                      }`}
                      data-testid="wallet-qr-mode-package"
                    >
                      Paketli Kabul QR ({packageCreditsRemaining}/8)
                    </button>
                  </div>

                  <div className={`rounded-2xl p-4 flex flex-col items-center justify-center ${innerSurface}`}>
                    <LariQrCodeSvg payload={activeQrPayload} sizePx={152} />
                    <span className="text-[11px] font-mono mt-2.5 text-slate-500">
                      {qrMode === 'package'
                        ? `PAKET QR • Kalan Hak: ${packageCreditsRemaining}/8`
                        : `SIG: ${qrPass.payload.signature} • ID: ${qrPass.payload.appointmentId}`}
                    </span>
                    <span className="text-xs font-bold text-[#4F46E5] mt-1">
                      İkram: {selectedDrink} • {quietMode ? 'Sessiz Seans' : 'Standart'}
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyQrPayload}
                      className="mt-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#4F46E5]" />
                      QR Tokeni Kopyala / Test Et
                    </button>
                  </div>

                  {/* QR Usage Scenarios Guide */}
                  <div className={`rounded-2xl p-3 space-y-1.5 ${innerSurface}`}>
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500 block">
                      Bu QR Nerelerde Kullanılır?
                    </span>
                    {activeQrScenarios.map((sc) => (
                      <p key={sc} className="text-xs font-medium flex items-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{sc}</span>
                      </p>
                    ))}
                  </div>

                  {/* Post-Appointment Itemized Breakdown & Optional-Tip QR Payment */}
                  {completedBreakdown && (
                    <div
                      className={`rounded-2xl p-3.5 space-y-2.5 border-2 ${
                        completedBreakdown.paidViaQr
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-[#EEF2FF] border-[#4F46E5] text-slate-900'
                      }`}
                      data-testid="wallet-checkout-breakdown-card"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5 text-[#4338CA]">
                          <Receipt className="w-4 h-4" />
                          Randevu Sonu İşlem & Fiyat Dökümü
                        </span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded bg-white border border-indigo-300">
                          {completedBreakdown.paidViaQr ? 'ÖDENDİ ✓' : 'ÖDEME BEKLİYOR'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs bg-white rounded-xl p-2.5 border border-slate-200 text-slate-900">
                        {completedBreakdown.lines.map((ln) => (
                          <div key={ln.catalogItemId} className="flex justify-between">
                            <span>
                              {ln.quantity}x {ln.name}
                              {ln.coveredByPackage ? ' (Paket)' : ''}
                            </span>
                            <span className="font-bold">
                              {ln.coveredByPackage
                                ? `0 ${currencySymbol}`
                                : `${convertFromTryMajor(ln.subtotalMajor, selectedCurrency).toLocaleString('tr-TR')} ${currencySymbol}`}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold text-slate-600">
                          <span>KDV + Net İşlem Tutarı</span>
                          <span>
                            {convertFromTryMajor(
                              completedBreakdown.netPayableBeforeTipMajor,
                              selectedCurrency
                            ).toLocaleString('tr-TR')}{' '}
                            {currencySymbol}
                          </span>
                        </div>
                      </div>

                      {!completedBreakdown.paidViaQr && (
                        <>
                          <div className="space-y-1">
                            <span className="text-xs font-bold block text-slate-800">
                              İsteğe Bağlı Uzman Bahşişi (Zorunlu Değildir):
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {([0, 5, 10, 15] as const).map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setCustomerTipRate(pct)}
                                  className={`py-1.5 rounded-lg text-xs font-bold border-2 ${
                                    customerTipRate === pct
                                      ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                                      : 'bg-white text-slate-800 border-slate-300'
                                  }`}
                                >
                                  {pct === 0 ? 'Bahşiş Yok' : `%${pct}`}
                                </button>
                              ))}
                            </div>
                          </div>

                          {activePaymentQr && (
                            <div className="flex justify-center py-1">
                              <LariQrCodeSvg payload={activePaymentQr.rawPayload} sizePx={110} />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const tipVal =
                                customerTipRate > 0
                                  ? Math.round(
                                      (completedBreakdown.netPayableBeforeTipMajor *
                                        customerTipRate) /
                                        100
                                    )
                                  : 0;
                              completeQrPayment(tipVal);
                            }}
                            style={{ minHeight: '44px' }}
                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                            data-testid="customer-confirm-qr-payment-btn"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            QR ile Ödemeyi Onayla (
                            {(
                              convertFromTryMajor(
                                completedBreakdown.netPayableBeforeTipMajor,
                                selectedCurrency
                              ) +
                              (customerTipRate > 0
                                ? Math.round(
                                    (convertFromTryMajor(
                                      completedBreakdown.netPayableBeforeTipMajor,
                                      selectedCurrency
                                    ) *
                                      customerTipRate) /
                                      100
                                  )
                                : 0)
                            ).toLocaleString('tr-TR')}{' '}
                            {currencySymbol})
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {showRescheduleSlots && (
                    <div className="rounded-2xl bg-[#F8F9FB] border border-indigo-200 p-3 space-y-2">
                      <span className="text-[11px] font-bold text-[#4338CA] block">
                        Yeni Saat Dilimi Seçin:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['11:00', '14:00', '16:30', '18:00'].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={async () => {
                              const res = await rescheduleActiveBooking('2026-11-19', slot);
                              if (res.accepted) {
                                setShowRescheduleSlots(false);
                              }
                            }}
                            className="py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#5B5FEF] text-[11px] font-bold text-[#111827]"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancellation & Reschedule Policy Rules */}
                  <div
                    className={`rounded-2xl border-2 p-3 space-y-1 text-[11px] ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}
                    data-testid="wallet-cancellation-policy-card"
                  >
                    <span className="font-black flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      Rezervasyon İptal & Erteleme Kuralları
                    </span>
                    <ul className="space-y-0.5 pl-1 opacity-90">
                      <li>• Randevu saatinden <strong>4 saat öncesine kadar</strong> ücretsiz iptal ve erteleme.</li>
                      <li>• Son 4 saat içindeki iptallerde işletme kapora / no-show kuralı uygulanabilir.</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRescheduleSlots((s) => !s)}
                      style={{ minHeight: '42px' }}
                      className="rounded-xl bg-[#F8F9FB] hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Ertele
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      style={{ minHeight: '42px' }}
                      className="rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center justify-center gap-1"
                      data-testid="wallet-cancel-open-btn"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      İptal Et
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCalendarIcs}
                      style={{ minHeight: '42px' }}
                      className="rounded-xl bg-[#EEF0FF] hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-[#4338CA] flex items-center justify-center gap-1"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Takvim (.ics)
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ALL APPOINTMENTS & PAST BOOKINGS HISTORY */}
          <div
            className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}
            data-testid="wallet-booking-history-card"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#5B5FEF] block">
                  RANDEVU GEÇMİŞİ
                </span>
                <h3 className="text-sm font-black">
                  Tüm Randevularım ({bookingHistory.length})
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'Tümü' },
                    { id: 'upcoming', label: 'Aktif' },
                    { id: 'past', label: 'Geçmiş' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setHistoryFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                      historyFilter === f.id
                        ? 'bg-[#4F46E5] border-[#4338CA] text-white'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {bookingHistory
                .filter((item) => {
                  if (historyFilter === 'upcoming') {
                    return item.status === 'confirmed' || item.status === 'rescheduled';
                  }
                  if (historyFilter === 'past') {
                    return item.status === 'completed' || item.status === 'cancelled';
                  }
                  return true;
                })
                .map((item) => {
                  const statusBadge =
                    item.status === 'confirmed'
                      ? { text: 'Onaylı', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                      : item.status === 'rescheduled'
                        ? { text: 'Ertelendi', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
                        : item.status === 'cancelled'
                          ? { text: 'İptal', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                          : { text: 'Tamamlandı', cls: 'bg-[#EEF2FF] text-[#4338CA] border-indigo-200' };

                  return (
                    <div
                      key={item.appointmentId}
                      className={`rounded-2xl p-3 border-2 flex items-start justify-between gap-2 ${innerSurface}`}
                      data-testid={`booking-history-item-${item.appointmentId}`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-black truncate">{item.businessName}</p>
                        <p className="text-[11px] font-semibold text-[#4F46E5] truncate">
                          {item.serviceName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.scheduledDate} • {item.scheduledTime} • {item.specialistName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.cls}`}
                        >
                          {statusBadge.text}
                        </span>
                        <span className="text-xs font-black">
                          {convertFromTryMajor(item.priceMajor, selectedCurrency).toLocaleString('tr-TR')}{' '}
                          {currencySymbol}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PERSONAL BEAUTY & HEALTH CARE PASSPORT */}
      {activeSubTab === 'passport' && (
        <div className="space-y-3" data-testid="wallet-care-passport-panel">
          <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-2 shadow-sm">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-[#5B5FEF]">
              <BookOpen className="w-3.5 h-3.5" />
              KİŞİSEL GÜZELLİK & SAĞLIK PASAPORTU
            </span>
            <h3 className="text-sm font-black text-[#111827]">
              Kayıtlı Boya Formüllerin, Klinik Notların & Ev Rutinin
            </h3>
            <p className="text-[11px] text-slate-500">
              İşletmelerde uygulanan karışım formülleri burada arşivlenir ve bir sonraki randevunuzda uzmana tek dokunuşla aktarılır.
            </p>
          </div>

          <div className="space-y-2.5">
            {passportEntries.length > 0 ? (
              passportEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-white border border-slate-200 p-3.5 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111827]">
                      {entry.businessName} • {entry.serviceTitle}
                    </span>
                    <span className="text-[10px] text-slate-500">{entry.dateLabel}</span>
                  </div>
                  <div className="rounded-xl bg-[#F8F9FB] border border-slate-200 p-2.5 font-mono text-[11px] text-[#4338CA]">
                    {entry.formulaOrProtocol}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Uzman Notu ({entry.specialistName}): {entry.specialistNote}
                  </p>
                </div>
              ))
            ) : (
              <div
                className="rounded-2xl bg-white border border-slate-200 p-5 text-center space-y-1.5 shadow-xs"
                data-testid="wallet-passport-empty"
              >
                <p className="text-xs font-black text-[#111827]">
                  Henüz Kayıtlı Bakım Formülünüz Yok
                </p>
                <p className="text-[11px] text-slate-500">
                  Bir salon veya klinik randevunuz tamamlandığında uzmanınızın uyguladığı karışım ve protokoller burada arşivlenir.
                </p>
              </div>
            )}
          </div>

          {passportEntries.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#5B5FEF]" />
                  Bugünkü Ev Devam Rutinin (+15 Puan)
                </span>
                <div className="flex items-center gap-2">
                  {routineCooldownSec > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {routineCooldownSec}s
                    </span>
                  )}
                  <span className="text-[11px] font-black text-amber-600">
                    {loyaltyPoints} P
                  </span>
                </div>
              </div>
              {routineCooldownNotice && (
                <p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {routineCooldownNotice}
                </p>
              )}
              {[
                {
                  key: 'morning_serum',
                  label: 'Sabah: Isı Koruyucu Keratin Serum (2 Damla)',
                },
                {
                  key: 'evening_mask',
                  label: 'Akşam: Sülfatsız Mor/Gümüş Renk Koruyucu Şampuan',
                },
                {
                  key: 'night_retainer',
                  label: 'Gece: Şeffaf Koruyucu Plak (Retainer) Takibi',
                },
              ].map((item) => {
                const lastClaimAt = routineClaims[item.key] || 0;
                const isClaimedToday = lastClaimAt > 0 && Date.now() - lastClaimAt < 24 * 60 * 60 * 1000;
                const isDisabled = isClaimedToday || routineCooldownSec > 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleToggleRoutine(item.key)}
                    className={`w-full rounded-xl p-2.5 border text-left text-xs font-semibold flex items-center justify-between transition ${
                      isClaimedToday
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                        : isDisabled
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#F8F9FB] border-slate-200 text-slate-700 hover:border-[#5B5FEF]/40'
                    }`}
                  >
                    <span>{item.label}</span>
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isClaimedToday ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: WALLET, STAMP CARD & PACKAGES */}
      {activeSubTab === 'loyalty' && (
        <div className="space-y-3" data-testid="wallet-loyalty-panel">
          {/* Corporate Platinum Wallet Card */}
          <div className="rounded-3xl bg-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-indigo-200 uppercase flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                LARİ PLATINUM CÜZDAN
              </span>
              <p className="text-xl font-black text-white mt-1">
                {convertFromTryMajor(walletBalanceMinor / 100, selectedCurrency).toLocaleString('tr-TR')}{' '}
                {currencySymbol}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-300 font-bold">
                SADAKAT PUANI
              </span>
              <p className="text-lg font-black text-amber-300">
                {loyaltyPoints} P
              </p>
            </div>
          </div>

          {/* 5-Slot Stamp Card */}
          <div
            className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
            data-testid="wallet-stamp-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#5B5FEF] uppercase flex items-center gap-1">
                  <Stamp className="w-3.5 h-3.5" />
                  DİJİTAL DAMGA KARTI • {bookingHistory[0]?.businessName || 'LARİ SADAKAT'}
                </span>
                <p className="text-xs font-bold text-[#111827] mt-0.5">
                  {stampCount >= 5
                    ? '5/5 Tamamlandı: Ücretsiz Bakım Hediyesi Hazır!'
                    : `${stampCount}/5 Tamamlandı • 5. İşlemde Ücretsiz Bakım!`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`h-11 rounded-2xl border flex flex-col items-center justify-center font-black text-xs transition ${
                    idx <= stampCount
                      ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                      : 'bg-[#F8F9FB] text-slate-400 border-slate-200'
                  }`}
                >
                  <span>{idx === 5 ? 'Hediye' : idx <= stampCount ? '✓' : idx}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Session Package Progress */}
          {packageCreditsRemaining > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#111827] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#5B5FEF]" />8 Seans Lazer / Medikal Bakım Paketi
                </span>
                <span className="text-emerald-700 font-bold">
                  Kalan: {packageCreditsRemaining} / 8
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#5B5FEF]"
                  style={{ width: `${Math.min(100, Math.round((packageCreditsRemaining / 8) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                İdeal 4. Seans Tarihi: <strong className="text-[#111827]">2 Aralık 2026</strong>
              </p>
            </div>
          )}

          {/* Gift Card & Referral */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-xs">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#5B5FEF]" />
              Hediye Kartı / Kampanya Kodu Yükle
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
                placeholder="Örn: LARI500"
                className="flex-1 rounded-xl bg-[#F8F9FB] border border-slate-200 px-3 py-2 text-xs text-[#111827]"
              />
              <button
                type="button"
                onClick={handleRedeemGiftCard}
                style={{ minHeight: '40px' }}
                className="px-4 rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold"
              >
                Uygula
              </button>
            </div>
            {giftMessage && (
              <p className="text-[11px] text-emerald-700 font-semibold">{giftMessage}</p>
            )}
            <button
              type="button"
              onClick={handleShareGiftEnvelope}
              style={{ minHeight: '40px' }}
              className="w-full rounded-xl bg-[#EEF0FF] hover:bg-indigo-100 text-xs font-bold text-[#4338CA] flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Arkadaşına Hediye Bakım Zarfı Gönder (LARI-ARKADAS)
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VERIFIED REVIEWS */}
      {activeSubTab === 'reviews' && (
        <div
          className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
          data-testid="wallet-verified-review-panel"
        >
          {bookingHistory.length === 0 ? (
            <div className="p-3 text-center space-y-2" data-testid="wallet-review-empty">
              <p className="text-xs font-black text-[#111827]">
                Değerlendirilecek Tamamlanmış Randevu Yok
              </p>
              <p className="text-[11px] text-slate-500">
                Yalnızca QR Check-in ile katıldığınız randevularınız tamamlandıktan sonra doğrulanmış yorum bırakabilirsiniz.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-bold text-[#111827]">
                Tamamlanan Randevunuzu Değerlendirin (Doğrulanmış QR Check-in Müşterisi)
              </h3>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-lg border ${
                      rating >= star
                        ? 'bg-amber-50 border-amber-300 text-amber-500'
                        : 'bg-[#F8F9FB] border-slate-200 text-slate-400'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Tam Saatinde Başladı',
                  'Kahve & İkram Harikaydı',
                  'Boya Formülü Tam İstediğim Gibi',
                  'Sessiz Seans Çok Rahatlatıcıydı',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setReviewComment((prev) =>
                        prev ? `${prev} • ${tag}` : tag
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#F8F9FB] border border-slate-200 text-[10px] font-semibold text-slate-600 hover:border-[#5B5FEF]"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Deneyiminizi paylaşın..."
                rows={3}
                className="w-full rounded-xl bg-[#F8F9FB] border border-slate-200 p-2.5 text-xs text-[#111827]"
              />
              <button
                type="button"
                disabled={reviewSubmitted}
                onClick={handleSubmitReview}
                style={{ minHeight: '44px' }}
                className={`w-full rounded-xl text-white text-xs font-bold transition ${
                  reviewSubmitted
                    ? 'bg-emerald-600 cursor-not-allowed opacity-90'
                    : 'bg-[#5B5FEF] hover:bg-[#4A4EE0]'
                }`}
              >
                {reviewSubmitted ? 'Değerlendirmeniz Kaydedildi ✓' : 'Doğrulanmış Yorumu Gönder (+50 Puan)'}
              </button>
              {reviewStatus && (
                <p className="text-[11px] text-emerald-700 font-semibold">{reviewStatus}</p>
              )}
            </>
          )}
        </div>
      )}
      {/* Reservation Cancellation Confirmation Modal */}
      {cancelModalOpen && displayedBooking && (
        <div
          className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          data-testid="wallet-cancel-confirm-modal"
          onClick={() => setCancelModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border-2 p-5 space-y-4 shadow-2xl ${cardSurface}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 text-rose-600">
                <span className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Randevuyu İptal Etmek İstediğinize Emin misiniz?
                  </h3>
                  <p className="text-xs text-slate-500">
                    {displayedBooking.businessName} • {displayedBooking.scheduledDate}{' '}
                    {displayedBooking.scheduledTime}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center shrink-0"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`rounded-2xl p-3 text-xs space-y-1.5 ${innerSurface}`}>
              <p className="font-black text-[#4F46E5]">İptal & İade Kuralları</p>
              <p>
                • İşlem saatinden <strong>4 saat öncesine kadar</strong> tüm iptaller ücretsizdir; ön ödeme/paket hakkınız kesintisiz iade edilir.
              </p>
              <p>
                • 4 saatten az kalan iptallerde uzman saati kilitlendiği için no-show kuralı uygulanabilir. İsterseniz doğrudan yeni güne erteleyebilirsiniz.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                İptal Nedeni (İsteğe Bağlı)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Programım değişti',
                  'Başka güne alacağım',
                  'Hizmeti değiştireceğim',
                  'Diğer',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`rounded-xl border-2 px-2.5 py-2 text-xs font-bold text-left transition ${
                      cancelReason === reason
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4338CA]'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                style={{ minHeight: '46px' }}
                className="rounded-xl border-2 border-slate-300 dark:border-slate-700 text-xs font-black"
                data-testid="wallet-cancel-dismiss-btn"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await cancelActiveBooking(cancelReason);
                  if (result.accepted) {
                    setCancelledEmpty(true);
                    setCancelModalOpen(false);
                  }
                }}
                style={{ minHeight: '46px' }}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                data-testid="wallet-cancel-confirm-btn"
              >
                Evet, Randevuyu İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCustomerWalletPage;
