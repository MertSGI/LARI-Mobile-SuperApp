import React, { useState } from 'react';
import {
  CalendarPlus,
  Gift,
  Package,
  QrCode,
  RefreshCw,
  Share2,
  Star,
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
  const [activeSubTab, setActiveSubTab] = useState<'qr' | 'loyalty' | 'reviews'>('qr');
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
      {/* 3 Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'qr', tr: 'Randevu & QR', en: 'Booking & QR' },
            { id: 'loyalty', tr: 'Paket & Cüzdan', en: 'Packs & Wallet' },
            { id: 'reviews', tr: 'Değerlendir', en: 'Reviews' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            style={{ minHeight: '40px' }}
            className={`rounded-lg text-xs font-bold transition ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            data-testid={`wallet-subtab-${tab.id}`}
          >
            {language === 'tr' ? tab.tr : tab.en}
          </button>
        ))}
      </div>

      {activeSubTab === 'qr' && (
        <div
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3"
          data-testid="wallet-qr-pass-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                ONAYLANDI • {qrPass.payload.scheduledDate} {qrPass.payload.scheduledTime}
              </span>
              <h3 className="text-sm font-bold text-white">
                Atelier Nişantaşı Hair & Spa
              </h3>
              <p className="text-xs text-slate-400">Soft Balayage & Bakım</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              <WifiOff className="w-3 h-3" />
              Offline QR
            </span>
          </div>

          <div className="rounded-2xl bg-white p-4 flex flex-col items-center justify-center text-slate-900">
            <QrCode className="w-28 h-28 text-slate-900" />
            <span className="text-[10px] font-mono mt-2 text-slate-600">
              SIG: {qrPass.payload.signature} • ID: {qrPass.payload.appointmentId}
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
      )}

      {activeSubTab === 'loyalty' && (
        <div className="space-y-3" data-testid="wallet-loyalty-panel">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                LARİ Dijital Cüzdan
              </span>
              <p className="text-xl font-black text-white mt-1">
                {(walletBalanceMinor / 100).toFixed(2)} TRY
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-300 font-bold">
                SADAKAT PUANI
              </span>
              <p className="text-lg font-black text-amber-400">{loyaltyPoints} P</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-400" />
                8 Seans Lazer / Bakım Paketi
              </span>
              <span className="text-emerald-300 font-bold">Kalan: 5 / 8</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500 w-[62%]" />
            </div>
          </div>

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
              Arkadaşını Davet Et (Referans Kodu: LARI-ARKADAS)
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'reviews' && (
        <div
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3"
          data-testid="wallet-verified-review-panel"
        >
          <h3 className="text-xs font-bold text-white">
            Tamamlanan Randevunuzu Değerlendirin (Doğrulanmış Müşteri)
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
            Doğrulanmış Yorumu Gönder
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
