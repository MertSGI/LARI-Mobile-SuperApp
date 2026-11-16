import React, { useState } from 'react';
import {
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  Coffee,
  Gift,
  Navigation,
  Package,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  Stamp,
  Star,
  VolumeX,
  Wallet,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  generateSignedQrCheckinPass,
  QrCheckinAndReviewRegistry,
} from '../../../services/mobile/qrCheckinService';

export interface MobileCustomerWalletPageProps {
  tenantId: string;
  customerId?: string;
  language?: 'tr' | 'en';
}

const walletReviewRegistry = new QrCheckinAndReviewRegistry();

export const MobileCustomerWalletPage: React.FC<
  MobileCustomerWalletPageProps
> = ({ tenantId, customerId = 'cust-demo-1', language = 'tr' }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'qr' | 'passport' | 'loyalty' | 'reviews'
  >('qr');
  const [liveStage, setLiveStage] = useState<1 | 2 | 3 | 4>(2);
  const [selectedDrink, setSelectedDrink] = useState<string>('Filtre Kahve');
  const [quietMode, setQuietMode] = useState<boolean>(true);
  const [stampCount, setStampCount] = useState<number>(4);
  const [routineChecks, setRoutineChecks] = useState<Record<string, boolean>>({
    morning_serum: true,
    evening_mask: false,
    night_retainer: false,
  });

  const [giftCode, setGiftCode] = useState('');
  const [walletBalanceMinor, setWalletBalanceMinor] = useState(125000);
  const [loyaltyPoints, setLoyaltyPoints] = useState(480);
  const [giftMessage, setGiftMessage] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [rescheduleRequested, setRescheduleRequested] = useState(false);

  const qrPass = generateSignedQrCheckinPass({
    tenantId,
    appointmentId: 'apt-live-101',
    customerId,
    selfServiceToken: 'tok-self-101',
    scheduledDate: '2026-11-18',
    scheduledTime: '15:30',
    businessName: 'Atelier Nişantaşı Hair & Spa',
    serviceName: 'Soft Balayage & Bakım',
  });

  const handleRedeemGiftCard = () => {
    if (giftCode.trim().toUpperCase() === 'LARI500') {
      setWalletBalanceMinor((v) => v + 50000);
      setGiftMessage('LARI500 (+500.00 TRY) cüzdana eklendi!');
      setGiftCode('');
    } else {
      setGiftMessage('Geçersiz hediye kartı kodu (Örn: LARI500)');
    }
  };

  const handleToggleRoutine = (key: string) => {
    setRoutineChecks((prev) => {
      const next = !prev[key];
      if (next) setLoyaltyPoints((p) => p + 15);
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
      setLoyaltyPoints((p) => p + 50);
      setReviewStatus('Doğrulanmış yorumunuz yayınlandı (+50 Sadakat Puanı)!');
    } else {
      setReviewStatus(`Yorum reddedildi: ${res.reasonCode}`);
    }
  };

  return (
    <div className="space-y-4" data-testid="mobile-customer-wallet-page">
      {/* 4 Native Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
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
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
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
          {/* Live Activity Companion Banner */}
          <div
            className="rounded-3xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/30 p-4 space-y-3 shadow-lg"
            data-testid="live-appointment-companion-card"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                CANLI RANDEVU ASİSTANI
              </span>
              <span className="text-[11px] font-bold text-blue-200">
                Adım {liveStage} / 4
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { s: 1, label: 'Onaylandı' },
                { s: 2, label: 'Yola Çık (15dk)' },
                { s: 3, label: 'Lobi Check-in' },
                { s: 4, label: 'Koltukta' },
              ].map((st) => (
                <button
                  key={st.s}
                  type="button"
                  onClick={() => setLiveStage(st.s as 1 | 2 | 3 | 4)}
                  className={`rounded-xl p-2 text-center border transition ${
                    liveStage >= st.s
                      ? 'bg-blue-600/30 border-blue-400 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-black block">{st.label}</span>
                </button>
              ))}
            </div>

            {/* Pre-Arrival VIP Hospitality Controls */}
            <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5" />
                  Koltuk İkram & Konfor Tercihin:
                </span>
                <button
                  type="button"
                  onClick={() => setQuietMode((q) => !q)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    quietMode
                      ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {quietMode ? '🤫 Sessiz Seans Aktif' : '💬 Normal Sohbet'}
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
                    onClick={() => setSelectedDrink(dr)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border ${
                      selectedDrink === dr
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    ☕ {dr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Apple Wallet Style Offline QR Pass Card */}
          <div
            className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-xl"
            data-testid="wallet-qr-pass-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  ONAYLANDI • {qrPass.payload.scheduledDate}{' '}
                  {qrPass.payload.scheduledTime}
                </span>
                <h3 className="text-sm font-black text-white">
                  Atelier Nişantaşı Hair & Spa
                </h3>
                <p className="text-xs text-slate-400">
                  Soft Balayage & Bakım • Uzman: Merve Y.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                <WifiOff className="w-3 h-3" />
                Offline QR
              </span>
            </div>

            <div className="rounded-2xl bg-white p-4 flex flex-col items-center justify-center text-slate-900 shadow-inner">
              <QrCode className="w-28 h-28 text-slate-900" />
              <span className="text-[10px] font-mono mt-2 text-slate-600">
                SIG: {qrPass.payload.signature} • ID:{' '}
                {qrPass.payload.appointmentId}
              </span>
              <span className="text-[10px] font-bold text-indigo-700 mt-1">
                İkram: {selectedDrink} • {quietMode ? 'Sessiz Seans' : 'Standart'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRescheduleRequested(true)}
                style={{ minHeight: '42px' }}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {rescheduleRequested ? 'İstendi' : 'Ertele'}
              </button>
              <button
                type="button"
                style={{ minHeight: '42px' }}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                İptal Et
              </button>
              <button
                type="button"
                style={{ minHeight: '42px' }}
                className="rounded-xl bg-blue-600/20 border border-blue-500/30 text-xs font-semibold text-blue-300 flex items-center justify-center gap-1"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Takvim (.ics)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PERSONAL BEAUTY & HEALTH CARE PASSPORT */}
      {activeSubTab === 'passport' && (
        <div className="space-y-3" data-testid="wallet-care-passport-panel">
          <div className="rounded-3xl bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-slate-900 border border-fuchsia-500/30 p-4 space-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-fuchsia-300">
              <BookOpen className="w-3.5 h-3.5" />
              KİŞİSEL GÜZELLİK & SAĞLIK PASAPORTU
            </span>
            <h3 className="text-sm font-black text-white">
              Kayıtlı Boya Formüllerin, Klinik Notların & Ev Rutinin
            </h3>
            <p className="text-[11px] text-slate-300">
              Gittiğin işletmelerde uygulanan tam karışım formülleri burada arşivlenir; başka bir uzmana gittiğinde tek dokunuşla paylaşabilirsin.
            </p>
          </div>

          {/* Recorded Formulas Timeline */}
          <div className="space-y-2.5">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Atelier Nişantaşı • Soft Balayage
                </span>
                <span className="text-[10px] text-slate-400">15 Ekim 2026</span>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-amber-200">
                Formül: Dip 7.1 Küllü Kumral (20 Vol) + Uçlar 9.12 Soğuk Bej Tonlama + Olaplex No.1/No.2
              </div>
              <p className="text-[11px] text-slate-400">
                Uzman Notu (Merve Y.): Saç uçları ince telli, ısı işlemi öncesi mutlaka Keratin Serum uygulanmalı.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  LARİ Dent Kadıköy • Dijital Gülüş Analizi
                </span>
                <span className="text-[10px] text-slate-400">22 Eylül 2026</span>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-cyan-200">
                Protokol: Üst Çene 10 Üye E-Max Mockup • Seçilen Renk Skala: OM1 Doğal Beyaz
              </div>
            </div>
          </div>

          {/* Interactive Home Care Routine Tracker */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Bugünkü Ev Devam Rutinin (+15 Sadakat Puanı)
              </span>
              <span className="text-[11px] font-black text-amber-400">
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
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <span>{item.label}</span>
                <CheckCircle2
                  className={`w-4 h-4 ${
                    routineChecks[item.key]
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STACKED WALLET CARDS, STAMP CARD & PACKAGES */}
      {activeSubTab === 'loyalty' && (
        <div className="space-y-3" data-testid="wallet-loyalty-panel">
          {/* Card 1: LARİ Platinum Digital Wallet */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-900 border border-indigo-500/40 p-4 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1">
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
              <p className="text-lg font-black text-amber-400">
                {loyaltyPoints} P
              </p>
            </div>
          </div>

          {/* Card 2: Interactive 5-Slot Digital Stamp Card */}
          <div
            className="rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/30 p-4 space-y-3"
            data-testid="wallet-stamp-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-300 uppercase flex items-center gap-1">
                  <Stamp className="w-3.5 h-3.5" />
                  DİJİTAL DAMGA KARTI • ATELIER NİŞANTAŞI
                </span>
                <p className="text-xs font-bold text-white mt-0.5">
                  {stampCount >= 5
                    ? '🎉 5/5 Tamamlandı: Ücretsiz Fön & Keratin Bakım Hediye!'
                    : `${stampCount}/5 Tamamlandı • 5. İşlemde Ücretsiz Bakım!`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStampCount((c) => (c < 5 ? c + 1 : 1))}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold"
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
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <span>{idx === 5 ? '🎁' : idx <= stampCount ? '✓' : idx}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Multi-Session Package Progress */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-400" />8 Seans Lazer /
                Medikal Bakım Paketi
              </span>
              <span className="text-emerald-300 font-bold">Kalan: 5 / 8</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 w-[62%]" />
            </div>
            <p className="text-[11px] text-slate-400">
              İdeal 4. Seans Tarihi: <strong className="text-slate-200">2 Aralık 2026</strong> (Otomatik hatırlatıcı açık)
            </p>
          </div>

          {/* Gift Card & Referral */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-pink-400" />
              Hediye Kartı / Kampanya Kodu Yükle
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
                placeholder="Örn: LARI500"
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleRedeemGiftCard}
                style={{ minHeight: '40px' }}
                className="px-4 rounded-xl bg-pink-600 text-white text-xs font-bold"
              >
                Uygula
              </button>
            </div>
            {giftMessage && (
              <p className="text-[11px] text-emerald-300">{giftMessage}</p>
            )}
            <button
              type="button"
              style={{ minHeight: '40px' }}
              className="w-full rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              Arkadaşına WhatsApp’tan Hediye Bakım Zarfı Gönder (LARI-ARKADAS)
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VERIFIED REVIEWS */}
      {activeSubTab === 'reviews' && (
        <div
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3"
          data-testid="wallet-verified-review-panel"
        >
          <h3 className="text-xs font-bold text-white">
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
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
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
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-300 hover:border-blue-500"
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
            className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-white"
          />
          <button
            type="button"
            onClick={handleSubmitReview}
            style={{ minHeight: '44px' }}
            className="w-full rounded-xl bg-blue-600 text-white text-xs font-bold"
          >
            Doğrulanmış Yorumu Gönder (+50 Puan)
          </button>
          {reviewStatus && (
            <p className="text-[11px] text-emerald-300">{reviewStatus}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileCustomerWalletPage;
