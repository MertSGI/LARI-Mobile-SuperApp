import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Fingerprint,
  Globe,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AccountDeletionResult,
  executeMobileAccountDeletion,
} from '../../services/accountDeletionService';

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
  const [pushBooking, setPushBooking] = useState(true);
  const [pushHt, setPushHt] = useState(true);
  const [biometricConfirmed, setBiometricConfirmed] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [deletionResult, setDeletionResult] =
    useState<AccountDeletionResult | null>(null);

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
    <div className="space-y-4" data-testid="mobile-profile-settings-page">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-blue-400" />
            {language === 'tr'
              ? 'Bildirim & Gizlilik Tercihleri'
              : 'Notification & Privacy Preferences'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            KVKK / GDPR
          </span>
        </div>

        <label className="flex items-center justify-between text-xs text-slate-300 py-1">
          <span>
            {language === 'tr'
              ? 'Randevu & Waitlist Push Bildirimleri'
              : 'Booking & Waitlist Push Alerts'}
          </span>
          <input
            type="checkbox"
            checked={pushBooking}
            onChange={(e) => setPushBooking(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-slate-300 py-1">
          <span>
            {language === 'tr'
              ? 'Sağlık Turizmi & VIP Transfer Hatırlatıcıları'
              : 'Health Tourism & VIP Transfer Alerts'}
          </span>
          <input
            type="checkbox"
            checked={pushHt}
            onChange={(e) => setPushHt(e.target.checked)}
            className="w-4 h-4 accent-cyan-500"
          />
        </label>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            Bundle ID: com.randevulari.app
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            RLS Isolated
          </span>
        </div>
      </div>

      {/* Apple Guideline 5.1.1(v) In-App Account Deletion */}
      <div
        className="rounded-2xl bg-rose-950/20 border border-rose-500/30 p-4 space-y-3"
        data-testid="mobile-account-deletion-card"
      >
        <div className="flex items-center gap-2 text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <h3 className="text-xs font-bold">
            {language === 'tr'
              ? 'Hesabımı ve Kişisel Verilerimi Kalıcı Olarak Sil'
              : 'Delete My Account & Personal Data'}
          </h3>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {language === 'tr'
            ? 'Yasal tıbbi kayıt saklama zorunluluğu varsa klinik kayıtlarınız anonimleştirilir; aksi halde tüm hesabınız ve kişisel verileriniz kalıcı olarak silinir. Onay için biyometrik doğrulama yapıp kutuya HESABIMI SIL yazın.'
            : 'If statutory medical retention applies, clinical records are anonymized; otherwise your account and personal data are permanently deleted.'}
        </p>

        <button
          type="button"
          onClick={() => setBiometricConfirmed(true)}
          style={{ minHeight: '44px' }}
          className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border flex items-center justify-center gap-2 ${
            biometricConfirmed
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
          data-testid="account-delete-biometric-btn"
        >
          <Fingerprint className="w-4 h-4" />
          {biometricConfirmed
            ? language === 'tr'
              ? 'Biyometrik Doğrulama Onaylandı'
              : 'Biometric Verified'
            : language === 'tr'
              ? 'FaceID / TouchID ile Kimliği Doğrula'
              : 'Verify Identity with Biometrics'}
        </button>

        <input
          type="text"
          value={confirmPhrase}
          onChange={(e) => setConfirmPhrase(e.target.value)}
          placeholder="HESABIMI SIL"
          className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs text-white placeholder-slate-500"
          data-testid="account-delete-phrase-input"
        />

        <button
          type="button"
          onClick={handleDelete}
          style={{ minHeight: '46px' }}
          className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2.5 flex items-center justify-center gap-2"
          data-testid="account-delete-submit-btn"
        >
          <Trash2 className="w-4 h-4" />
          {language === 'tr' ? 'Hesabı Kalıcı Olarak Sil' : 'Permanently Delete Account'}
        </button>

        {deletionResult && (
          <div
            className={`rounded-xl p-2.5 text-[11px] flex items-center gap-2 ${
              deletionResult.success
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}
            data-testid="account-delete-result-banner"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {deletionResult.success
                ? `${deletionResult.outcome} • Makbuz: ${deletionResult.auditReceiptId}`
                : `Reddedildi: ${deletionResult.reasonCode}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileProfileSettingsPage;
