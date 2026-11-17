import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Coffee,
  Gift,
  Package,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  Stamp,
  Star,
  Wallet,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  generateSignedQrCheckinPass,
  QrCheckinAndReviewRegistry,
} from '../../../services/mobile/qrCheckinService';
import { buildAppointmentIcsContent } from '../../../services/mobile/nativeBridgeService';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';

export interface MobileCustomerWalletPageProps {
  tenantId: string;
  customerId?: string;
  language?: 'tr' | 'en';
  onGoToExplore?: () => void;
}

const walletReviewRegistry = new QrCheckinAndReviewRegistry();

export const MobileCustomerWalletPage: React.FC<
  MobileCustomerWalletPageProps
> = ({ tenantId, customerId = 'cust-demo-1', language = 'tr', onGoToExplore }) => {
  const {
    activeBooking,
    passportEntries,
    loyaltyPoints,
    stampCount,
    walletBalanceMinor,
    rescheduleActiveBooking,
    cancelActiveBooking,
    setHospitalityPreferences,
    addLoyaltyPoints,
    incrementStamp,
    redeemGiftCode,
    showToast,
  } = useMobileAppSession();

  const [activeSubTab, setActiveSubTab] = useState<
    'qr' | 'passport' | 'loyalty' | 'reviews'
  >('qr');
  const [liveStage, setLiveStage] = useState<1 | 2 | 3 | 4>(2);
  const [cancelledEmpty, setCancelledEmpty] = useState(false);
  const [showRescheduleSlots, setShowRescheduleSlots] = useState(false);
  const [routineChecks, setRoutineChecks] = useState<Record<string, boolean>>({
    morning_serum: true,
    evening_mask: false,
    night_retainer: false,
  });

  const [giftCode, setGiftCode] = useState('');
  const [giftMessage, setGiftMessage] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const displayedBooking = activeBooking
    ? activeBooking
    : !cancelledEmpty
      ? {
          appointmentId: 'apt-live-101',
          tenantId,
          tenantSlug: 'atelier-nisantasi',
          businessName: 'Atelier Nişantaşı Hair & Spa',
          branchLabel: 'Nişantaşı Merkez',
          serviceName: 'Soft Balayage & Bakım',
          specialistName: 'Merve Y.',
          scheduledDate: '2026-11-18',
          scheduledTime: '15:30',
          priceMajor: 4200,
          currency: 'TRY',
          status: 'confirmed' as const,
          hospitalityDrink: 'Filtre Kahve',
          quietSession: true,
        }
      : null;

  const selectedDrink = displayedBooking?.hospitalityDrink || 'Filtre Kahve';
  const quietMode = displayedBooking?.quietSession ?? true;

  const qrPass = generateSignedQrCheckinPass({
    tenantId: displayedBooking?.tenantId || tenantId,
    appointmentId: displayedBooking?.appointmentId || 'apt-live-101',
    customerId,
    selfServiceToken: 'tok-self-101',
    scheduledDate: displayedBooking?.scheduledDate || '2026-11-18',
    scheduledTime: displayedBooking?.scheduledTime || '15:30',
    businessName: displayedBooking?.businessName || 'Atelier Nişantaşı Hair & Spa',
    serviceName: displayedBooking?.serviceName || 'Soft Balayage & Bakım',
  });

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
    if (giftCode.trim().toUpperCase() === 'LARI500') {
      redeemGiftCode(giftCode);
      setGiftMessage('LARI500 (+500.00 TRY) cüzdana eklendi!');
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

  const handleToggleRoutine = (key: string) => {
    setRoutineChecks((prev) => {
      const next = !prev[key];
      if (next) {
        addLoyaltyPoints(15);
        showToast('Günlük rutin tamamlandı • +15 LARİ Puan');
      }
      return { ...prev, [key]: next };
    });
  };

  const handleSubmitReview = () => {
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
      addLoyaltyPoints(50);
      setReviewStatus('Doğrulanmış yorumunuz yayınlandı (+50 Sadakat Puanı)!');
      showToast('Doğrulanmış yorumunuz eklendi (+50 Puan)');
    } else {
      setReviewStatus(`Yorum reddedildi: ${res.reasonCode}`);
    }
  };

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

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { s: 1, label: 'Onaylandı' },
                    { s: 2, label: 'Yola Çık' },
                    { s: 3, label: 'Check-in' },
                    { s: 4, label: 'Koltukta' },
                  ].map((st) => (
                    <button
                      key={st.s}
                      type="button"
                      onClick={() => setLiveStage(st.s as 1 | 2 | 3 | 4)}
                      className={`rounded-xl p-2 text-center border transition ${
                        liveStage >= st.s
                          ? 'bg-[#EEF0FF] border-[#5B5FEF]/40 text-[#4338CA]'
                          : 'bg-[#F8F9FB] border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-bold block">{st.label}</span>
                    </button>
                  ))}
                </div>

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
                  <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-4 flex flex-col items-center justify-center text-[#111827]">
                    <QrCode className="w-28 h-28 text-[#111827]" />
                    <span className="text-[10px] font-mono mt-2 text-slate-500">
                      SIG: {qrPass.payload.signature} • ID: {qrPass.payload.appointmentId}
                    </span>
                    <span className="text-[11px] font-bold text-[#5B5FEF] mt-1">
                      İkram: {selectedDrink} • {quietMode ? 'Sessiz Seans' : 'Standart'}
                    </span>
                  </div>

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
                            onClick={() => {
                              rescheduleActiveBooking('2026-11-19', slot);
                              setShowRescheduleSlots(false);
                            }}
                            className="py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#5B5FEF] text-[11px] font-bold text-[#111827]"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                      onClick={() => {
                        cancelActiveBooking();
                        setCancelledEmpty(true);
                      }}
                      style={{ minHeight: '42px' }}
                      className="rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center justify-center gap-1"
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
            {passportEntries.map((entry) => (
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
            ))}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#5B5FEF]" />
                Bugünkü Ev Devam Rutinin (+15 Puan)
              </span>
              <span className="text-[11px] font-black text-amber-600">
                {loyaltyPoints} P
              </span>
            </div>
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
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggleRoutine(item.key)}
                className={`w-full rounded-xl p-2.5 border text-left text-xs font-semibold flex items-center justify-between transition ${
                  routineChecks[item.key]
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#F8F9FB] border-slate-200 text-slate-700'
                }`}
              >
                <span>{item.label}</span>
                <CheckCircle2
                  className={`w-4 h-4 ${
                    routineChecks[item.key] ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
              </button>
            ))}
          </div>
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
                {(walletBalanceMinor / 100).toFixed(2)} TRY
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
                  DİJİTAL DAMGA KARTI • ATELIER NİŞANTAŞI
                </span>
                <p className="text-xs font-bold text-[#111827] mt-0.5">
                  {stampCount >= 5
                    ? '5/5 Tamamlandı: Ücretsiz Fön & Keratin Bakım Hediye!'
                    : `${stampCount}/5 Tamamlandı • 5. İşlemde Ücretsiz Bakım!`}
                </p>
              </div>
              <button
                type="button"
                onClick={incrementStamp}
                className="px-2.5 py-1 rounded-lg bg-[#EEF0FF] border border-indigo-200 text-[#4338CA] text-[10px] font-bold"
              >
                + Damga Test
              </button>
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
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#111827] flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#5B5FEF]" />8 Seans Lazer / Medikal Bakım Paketi
              </span>
              <span className="text-emerald-700 font-bold">Kalan: 5 / 8</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#5B5FEF] w-[62%]" />
            </div>
            <p className="text-[11px] text-slate-500">
              İdeal 4. Seans Tarihi: <strong className="text-[#111827]">2 Aralık 2026</strong>
            </p>
          </div>

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
            onClick={handleSubmitReview}
            style={{ minHeight: '44px' }}
            className="w-full rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold"
          >
            Doğrulanmış Yorumu Gönder (+50 Puan)
          </button>
          {reviewStatus && (
            <p className="text-[11px] text-emerald-700 font-semibold">{reviewStatus}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileCustomerWalletPage;
