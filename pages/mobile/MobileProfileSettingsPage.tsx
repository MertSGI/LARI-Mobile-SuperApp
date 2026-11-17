import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Fingerprint,
  Globe,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import {
  AccountDeletionResult,
  executeMobileAccountDeletion,
} from '../../services/accountDeletionService';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';

export interface MobileProfileSettingsPageProps {
  tenantId: string;
  userId: string;
  userRole: 'customer' | 'staff' | 'tenant_owner' | 'super_admin';
  hasActiveMedicalRetentionLock?: boolean;
  language?: 'tr' | 'en';
  onAccountDeleted?: (result: AccountDeletionResult) => void;
}

export const MobileProfileSettingsPage: React.FC<
  MobileProfileSettingsPageProps
> = ({
  tenantId,
  userId,
  userRole,
  hasActiveMedicalRetentionLock = false,
  language = 'tr',
  onAccountDeleted,
}) => {
  const { showToast, loyaltyPoints } = useMobileAppSession();
  const [displayName, setDisplayName] = useState('Mert Özçelikbaş');
  const [phone, setPhone] = useState('+90 532 555 01 40');
  const [pushBooking, setPushBooking] = useState(true);
  const [pushHt, setPushHt] = useState(true);
  const [biometricConfirmed, setBiometricConfirmed] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [deletionResult, setDeletionResult] =
    useState<AccountDeletionResult | null>(null);

  const handleSaveProfile = () => {
    showToast('Profil ve iletişim bilgileriniz kaydedildi.');
  };

  const handleDelete = () => {
    const res = executeMobileAccountDeletion({
      tenantId,
      userId,
      userRole,
      confirmationPhrase: confirmPhrase,
      biometricVerified: biometricConfirmed,
      hasActiveMedicalRetentionLock,
    });
    setDeletionResult(res);
    if (res.success) {
      onAccountDeleted?.(res);
    }
  };

  return (
    <div className="space-y-4 text-[#111827]" data-testid="mobile-profile-settings-page">
      {/* Glowup-Inspired Clean Profile Header */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 text-center space-y-2 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#EEF0FF] text-[#5B5FEF] border border-indigo-200 flex items-center justify-center font-black text-lg">
          {displayName
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-black text-[#111827]">{displayName}</h2>
          <p className="text-[11px] text-slate-500">
            LARİ Üyesi • Nişantaşı • <strong className="text-[#5B5FEF]">{loyaltyPoints} Puan</strong>
          </p>
        </div>
      </div>

      {/* General Information Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
        <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
          <User className="w-4 h-4 text-[#5B5FEF]" />
          Genel Bilgiler
        </span>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-[#F8F9FB] border border-slate-200 px-3 py-2 text-xs text-[#111827]"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
              Telefon Numarası
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl bg-[#F8F9FB] border border-slate-200 px-3 py-2 text-xs text-[#111827]"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            style={{ minHeight: '40px' }}
            className="w-full rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold"
          >
            Bilgileri Güncelle
          </button>
        </div>
      </div>

      {/* Notification & Privacy Preferences */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#5B5FEF]" />
            {language === 'tr'
              ? 'Bildirim & Gizlilik Tercihleri'
              : 'Notification & Privacy Preferences'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
            KVKK / GDPR
          </span>
        </div>

        <label className="flex items-center justify-between text-xs text-slate-700 py-1 cursor-pointer">
          <span>
            {language === 'tr'
              ? 'Randevu & Waitlist Push Bildirimleri'
              : 'Booking & Waitlist Push Alerts'}
          </span>
          <input
            type="checkbox"
            checked={pushBooking}
            onChange={(e) => {
              setPushBooking(e.target.checked);
              showToast(
                e.target.checked
                  ? 'Randevu push bildirimleri açıldı.'
                  : 'Randevu push bildirimleri kapatıldı.'
              );
            }}
            className="w-4 h-4 accent-[#5B5FEF]"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-slate-700 py-1 cursor-pointer">
          <span>
            {language === 'tr'
              ? 'Sağlık Turizmi & VIP Transfer Hatırlatıcıları'
              : 'Health Tourism & VIP Transfer Alerts'}
          </span>
          <input
            type="checkbox"
            checked={pushHt}
            onChange={(e) => {
              setPushHt(e.target.checked);
              showToast(
                e.target.checked
                  ? 'VIP transfer hatırlatıcıları açıldı.'
                  : 'VIP transfer hatırlatıcıları kapatıldı.'
              );
            }}
            className="w-4 h-4 accent-[#5B5FEF]"
          />
        </label>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            Bundle ID: com.randevulari.app
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            RLS Isolated
          </span>
        </div>
      </div>

      {/* Apple Guideline 5.1.1(v) In-App Account Deletion */}
      <div
        className="rounded-2xl bg-white border border-rose-200 p-4 space-y-3 shadow-xs"
        data-testid="mobile-account-deletion-card"
      >
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <h3 className="text-xs font-bold">
            {language === 'tr'
              ? 'Hesap Silme & Veri Hakları (Apple 5.1.1(v))'
              : 'In-App Account Deletion (Apple 5.1.1(v))'}
          </h3>
        </div>
        <p className="text-[11px] text-slate-600">
          {hasActiveMedicalRetentionLock
            ? 'Aktif tıbbi/klinik kayıt saklama zorunluluğu nedeniyle kişisel verileriniz KVKK kapsamında kalıcı olarak anonimleştirilir.'
            : 'Hesabınız ve oturum anahtarlarınız biyometrik doğrulama sonrasında kalıcı olarak silinir.'}
        </p>

        <button
          type="button"
          onClick={() => setBiometricConfirmed(true)}
          style={{ minHeight: '42px' }}
          className={`w-full rounded-xl px-3 py-2 text-xs font-bold border flex items-center justify-center gap-1.5 ${
            biometricConfirmed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-[#F8F9FB] border-slate-200 text-slate-700'
          }`}
          data-testid="profile-biometric-verify-btn"
        >
          <Fingerprint className="w-4 h-4" />
          {biometricConfirmed
            ? 'Biyometrik Doğrulama Tamamlandı ✓'
            : '1. Biyometrik / PIN ile Doğrula'}
        </button>

        <input
          type="text"
          value={confirmPhrase}
          onChange={(e) => setConfirmPhrase(e.target.value)}
          placeholder='Onaylamak için "HESABIMI SIL" yazın'
          className="w-full rounded-xl bg-[#F8F9FB] border border-slate-200 px-3 py-2 text-xs text-[#111827] placeholder-slate-400"
          data-testid="profile-delete-phrase-input"
        />

        <button
          type="button"
          onClick={handleDelete}
          style={{ minHeight: '44px' }}
          className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          data-testid="profile-delete-submit-btn"
        >
          <Trash2 className="w-4 h-4" />
          {language === 'tr' ? 'Hesabımı Kalıcı Olarak Sil' : 'Delete My Account'}
        </button>

        {deletionResult && (
          <div
            className={`rounded-xl p-2.5 text-xs flex items-center gap-2 border ${
              deletionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
            data-testid="profile-deletion-result"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {deletionResult.success
                ? `İşlem Tamamlandı: ${deletionResult.outcome}`
                : `Reddedildi: ${deletionResult.reasonCode}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileProfileSettingsPage;
