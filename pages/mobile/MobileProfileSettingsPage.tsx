import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Fingerprint,
  Globe,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import {
  AccountDeletionResult,
  executeMobileAccountDeletion,
} from '../../services/accountDeletionService';
import {
  MobilePersonaType,
  MobileShellMode,
  MobileShellResolutionResult,
} from '../../services/mobile/mobileShellPolicyService';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';

const PERSONA_LABELS: Record<MobilePersonaType, { tr: string; en: string }> = {
  salon_customer: { tr: 'Müşteri • Keşfet & Randevu', en: 'Customer • Explore' },
  clinic_patient: { tr: 'Klinik & Muayenehane Hastası', en: 'Clinic Patient' },
  ht_patient: { tr: 'Uluslararası Sağlık Turizmi', en: 'Medical Concierge' },
  salon_partner: { tr: 'İşletme / Uzman Stüdyosu', en: 'Partner • Staff & POS' },
  clinic_practitioner: { tr: 'Klinik Hekim (PHI)', en: 'Clinic Practitioner PHI' },
  ht_coordinator: { tr: 'Sağlık Turizmi Koordinatörü', en: 'HT Lead Ops & Quote' },
};

export interface MobileProfileSettingsPageProps {
  tenantId: string;
  userId: string;
  userRole: 'customer' | 'staff' | 'tenant_owner' | 'super_admin';
  hasActiveMedicalRetentionLock?: boolean;
  language?: 'tr' | 'en';
  shellState?: MobileShellResolutionResult;
  onToggleMode?: (targetMode: MobileShellMode) => void;
  onSwitchPersona?: (persona: MobilePersonaType) => void;
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
  shellState,
  onToggleMode,
  onSwitchPersona,
  onAccountDeleted,
}) => {
  const { showToast, loyaltyPoints, themeMode, setThemeMode } =
    useMobileAppSession();
  const isDark = themeMode === 'dark';

  const [displayName, setDisplayName] = useState('Mert Özçelikbaş');
  const [phone, setPhone] = useState('+90 532 555 01 40');
  const [pushBooking, setPushBooking] = useState(true);
  const [pushHt, setPushHt] = useState(true);
  const [biometricConfirmed, setBiometricConfirmed] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [deletionResult, setDeletionResult] =
    useState<AccountDeletionResult | null>(null);

  const isPartner = shellState?.effectiveMode === 'b2b_partner';
  const hasPartnerAccess = Boolean(
    shellState?.availablePersonas.some((p) =>
      ['salon_partner', 'clinic_practitioner', 'ht_coordinator'].includes(p)
    )
  );

  const cardSurface = isDark
    ? 'bg-slate-900 border-2 border-slate-700 text-white'
    : 'bg-white border-2 border-slate-300 text-slate-900';

  const inputSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-400'
    : 'bg-[#F8FAFC] border-2 border-slate-300 text-slate-900 placeholder-slate-400';

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
    <div className="space-y-4" data-testid="mobile-profile-settings-page">
      {/* Profile Header */}
      <div className={`rounded-3xl p-5 text-center space-y-2 shadow-sm ${cardSurface}`}>
        <div className="w-16 h-16 mx-auto rounded-full bg-[#EEF2FF] text-[#4F46E5] border-2 border-[#4F46E5] flex items-center justify-center font-black text-lg">
          {displayName
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-black">{displayName}</h2>
          <p className="text-xs font-semibold text-slate-500">
            LARİ Üyesi • Nişantaşı •{' '}
            <strong className="text-[#4F46E5]">{loyaltyPoints} Puan</strong>
          </p>
        </div>
      </div>

      {/* Appearance (Light/Dark), Account Mode (Customer/Partner) & Persona Switcher */}
      <div className={`rounded-3xl p-4 space-y-4 shadow-sm ${cardSurface}`}>
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
            Uygulama Teması (Güneş / Ay)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setThemeMode('light');
                showToast('Güneş • Açık (Kurumsal) mod aktif edildi.');
              }}
              style={{ minHeight: '48px' }}
              className={`rounded-xl border-2 px-3 py-2 text-sm font-black flex items-center justify-center gap-2 transition ${
                !isDark
                  ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
              data-testid="theme-light-btn"
            >
              <Sun className="w-5 h-5 text-amber-500 fill-amber-400/40" />
              Güneş • Açık Mod
            </button>
            <button
              type="button"
              onClick={() => {
                setThemeMode('dark');
                showToast('Ay • Koyu mod aktif edildi.');
              }}
              style={{ minHeight: '48px' }}
              className={`rounded-xl border-2 px-3 py-2 text-sm font-black flex items-center justify-center gap-2 transition ${
                isDark
                  ? 'bg-[#4F46E5] border-[#818CF8] text-white shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
              data-testid="theme-dark-btn"
            >
              <Moon className="w-5 h-5 fill-current/20" />
              Ay • Koyu Mod
            </button>
          </div>
        </div>

        {/* Role & Panel Visibility Boundary Matrix */}
        <div
          className={`rounded-2xl p-3 border-2 space-y-1.5 text-xs ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-200'
              : 'bg-[#F8FAFC] border-slate-200 text-slate-700'
          }`}
          data-testid="panel-visibility-boundaries-card"
        >
          <span className="text-xs font-black text-[#4F46E5] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Panel Erişim Sınırı ({isPartner ? 'İşletme / Partner Yetkili' : 'Müşteri Profili'})
          </span>
          <p className="text-xs leading-relaxed">
            {isPartner
              ? 'Aktif Yetki: Cep Ajanda, QR Müşteri Kabul, Sesli Katalog Eşleştirme, Cep POS, Fiyat Dökümü, Katalog Yönetimi ve (FaceID ile) Klinik PHI.'
              : hasPartnerAccess
                ? 'Aktif Görünüm: Keşfet & Sosyal Akış, Google Haritalar, Randevu/Paket QR, Fiyat Dökümü Ödeme ve Sağlık Turizmi. İşletme araçları yalnızca Partner modunda açılır.'
                : 'Misafir / Müşteri Hesabı: Yalnızca Keşfet, Randevu, QR Pass, Fiyat Dökümü ve Sağlık Turizmi ekranlarını görür; İşletme/POS panelleri rol bazlı kilitlidir.'}
          </p>
        </div>

        {hasPartnerAccess && onToggleMode && (
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
              Çalışma Modu
            </span>
            <button
              type="button"
              onClick={() =>
                onToggleMode(isPartner ? 'b2c_customer' : 'b2b_partner')
              }
              style={{ minHeight: '48px' }}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold border-2 flex items-center justify-between transition ${
                isPartner
                  ? 'bg-[#4F46E5] border-[#4338CA] text-white'
                  : 'bg-[#EEF2FF] border-[#4F46E5] text-[#4338CA]'
              }`}
              data-testid="mobile-mode-toggle-btn"
            >
              <span>
                {isPartner
                  ? 'Müşteri Moduna Geç (Keşfet & Randevu)'
                  : 'Partner / İşletme Moduna Geç'}
              </span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {shellState && shellState.availablePersonas.length > 1 && onSwitchPersona && (
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
              Dikey Deneyim / Rol Seçimi
            </span>
            <div className="grid grid-cols-1 gap-2">
              {shellState.availablePersonas.map((persona) => {
                const active = persona === shellState.effectivePersona;
                return (
                  <button
                    key={persona}
                    type="button"
                    onClick={() => onSwitchPersona(persona)}
                    style={{ minHeight: '44px' }}
                    className={`px-3.5 py-2 rounded-xl text-sm font-bold text-left transition border-2 flex items-center justify-between ${
                      active
                        ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                        : isDark
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-[#F8FAFC] text-slate-800 border-slate-300'
                    }`}
                    data-testid={`persona-pill-${persona}`}
                  >
                    <span>{PERSONA_LABELS[persona][language]}</span>
                    {active && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* General Information Card */}
      <div className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}>
        <span className="text-sm font-black flex items-center gap-1.5">
          <User className="w-4 h-4 text-[#4F46E5]" />
          Genel Bilgiler
        </span>
        <div className="space-y-2.5">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm font-medium ${inputSurface}`}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">
              Telefon Numarası
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm font-medium ${inputSurface}`}
            />
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            style={{ minHeight: '46px' }}
            className="w-full rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-black"
          >
            Bilgileri Güncelle
          </button>
        </div>
      </div>

      {/* Notification & Privacy Preferences */}
      <div className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#4F46E5]" />
            {language === 'tr'
              ? 'Bildirim & Gizlilik Tercihleri'
              : 'Notification & Privacy'}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold">
            KVKK / GDPR
          </span>
        </div>

        <label className="flex items-center justify-between text-sm font-semibold py-1 cursor-pointer">
          <span>Randevu & Waitlist Bildirimleri</span>
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
            className="w-5 h-5 accent-[#4F46E5]"
          />
        </label>

        <label className="flex items-center justify-between text-sm font-semibold py-1 cursor-pointer">
          <span>Sağlık Turizmi & VIP Transfer Uyarıları</span>
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
            className="w-5 h-5 accent-[#4F46E5]"
          />
        </label>

        <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-emerald-600" />
            com.randevulari.app
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            RLS Isolated
          </span>
        </div>
      </div>

      {/* Apple Guideline 5.1.1(v) In-App Account Deletion */}
      <div
        className={`rounded-3xl p-4 space-y-3 shadow-sm border-2 ${
          isDark ? 'bg-slate-900 border-rose-500/40' : 'bg-white border-rose-300'
        }`}
        data-testid="mobile-account-deletion-card"
      >
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-black">
            {language === 'tr'
              ? 'Hesap Silme & Veri Hakları (Apple 5.1.1(v))'
              : 'In-App Account Deletion (Apple 5.1.1(v))'}
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          {hasActiveMedicalRetentionLock
            ? 'Aktif tıbbi kayıt saklama zorunluluğu nedeniyle kişisel verileriniz KVKK kapsamında kalıcı olarak anonimleştirilir.'
            : 'Hesabınız ve oturum anahtarlarınız biyometrik doğrulama sonrasında kalıcı olarak silinir.'}
        </p>

        <button
          type="button"
          onClick={() => setBiometricConfirmed(true)}
          style={{ minHeight: '44px' }}
          className={`w-full rounded-xl px-3 py-2 text-xs font-bold border-2 flex items-center justify-center gap-1.5 ${
            biometricConfirmed
              ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
              : inputSurface
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
          className={`w-full rounded-xl px-3 py-2.5 text-sm font-medium ${inputSurface}`}
          data-testid="profile-delete-phrase-input"
        />

        <button
          type="button"
          onClick={handleDelete}
          style={{ minHeight: '46px' }}
          className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black flex items-center justify-center gap-1.5"
          data-testid="profile-delete-submit-btn"
        >
          <Trash2 className="w-4 h-4" />
          {language === 'tr' ? 'Hesabımı Kalıcı Olarak Sil' : 'Delete My Account'}
        </button>

        {deletionResult && (
          <div
            className={`rounded-xl p-3 text-xs font-bold flex items-center gap-2 border-2 ${
              deletionResult.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
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
