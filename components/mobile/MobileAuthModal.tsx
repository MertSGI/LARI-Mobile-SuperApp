import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';
import {
  MobileAuthAccountRole,
  MobileAuthProvider,
  SOCIAL_QUICK_PRESETS,
} from '../../services/mobile/mobileAuthService';
import {
  COUNTRY_CONFIGS,
  INTERESTED_SECTOR_OPTIONS,
  MobileUserProfile,
  UserGender,
  getCountryConfig,
  resolveDefaultCurrencyForLocation,
  sanitizePhoneDigits,
} from '../../services/mobile/mobileRegionCurrencyService';

interface MobileAuthModalProps {
  open: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onAuthenticated?: (result: { role: MobileAuthAccountRole; isNewPartnerSignup?: boolean }) => void;
}

type AuthViewMode = 'login' | 'register' | 'complete_social' | 'forgot_password';

const IS_LOCAL_DATA_MODE = (import.meta as any).env.VITE_DATA_MODE === 'local';

function createEmptyRegistrationProfile(): MobileUserProfile {
  return {
    fullName: '',
    email: '',
    countryCode: 'TR',
    phoneDigits: '',
    age: '',
    gender: '',
    country: 'Türkiye',
    city: 'İstanbul',
    district: 'Nişantaşı',
    interestedSectors: [],
  };
}

const GoogleLogoSvg: React.FC = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 5.04c1.64 0 3.11.56 4.27 1.66l3.2-3.2C17.53 1.7 14.99.6 12 .6 7.36.6 3.35 3.26 1.4 7.13l3.73 2.9C6.02 7.36 8.76 5.04 12 5.04z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.74-2.4 3.58l3.7 2.87c2.16-1.99 3.72-4.93 3.72-8.69z"
    />
    <path
      fill="#FBBC05"
      d="M5.13 14.07A7.22 7.22 0 0 1 4.75 12c0-.72.13-1.42.38-2.07L1.4 7.03A11.4 11.4 0 0 0 .6 12c0 1.84.44 3.58 1.21 5.12l3.32-3.05z"
    />
    <path
      fill="#34A853"
      d="M12 23.4c3.08 0 5.66-1.02 7.55-2.76l-3.7-2.87c-1.02.69-2.33 1.1-3.85 1.1-3.24 0-5.98-2.32-6.87-5.43l-3.73 2.9C3.35 20.74 7.36 23.4 12 23.4z"
    />
  </svg>
);

const AppleLogoSvg: React.FC = () => (
  <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
  </svg>
);

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({
  open,
  initialTab = 'login',
  onClose,
  onAuthenticated,
}) => {
  const {
    themeMode,
    loginWithEmail,
    registerAccount,
    continueWithSocial,
    setSelectedCurrency,
    showToast,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';

  const [viewMode, setViewMode] = useState<AuthViewMode>(initialTab);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [socialPickerProvider, setSocialPickerProvider] = useState<'google' | 'apple' | null>(null);
  const [socialEmailInput, setSocialEmailInput] = useState('');
  const [socialNameInput, setSocialNameInput] = useState('');

  const [regProvider, setRegProvider] = useState<MobileAuthProvider>('email');
  const [accountRole, setAccountRole] = useState<MobileAuthAccountRole>('customer');
  const [regProfile, setRegProfile] = useState<MobileUserProfile>(createEmptyRegistrationProfile);
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setViewMode(initialTab);
    setRegProvider('email');
    setSocialPickerProvider(null);
    setErrors({});
    setFormBannerError(null);
    setResetEmailSent(false);
  }, [open, initialTab]);

  if (!open) return null;

  const cardSurface = isDark
    ? 'border-slate-700 bg-slate-900 text-white'
    : 'border-slate-200 bg-white text-slate-900';

  const inputSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-400'
    : 'bg-[#F8FAFC] border-2 border-slate-300 text-slate-900 placeholder-slate-400';

  const fieldClass = (field: string) =>
    `w-full min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition ${inputSurface} ${
      errors[field]
        ? 'border-rose-500 focus:border-rose-500'
        : 'focus:border-[#4F46E5]'
    }`;

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateRegField = <K extends keyof MobileUserProfile,>(
    field: K,
    value: MobileUserProfile[K]
  ) => {
    setRegProfile((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const countryConfig = getCountryConfig(regProfile.countryCode);
  const cityOptions = Object.keys(countryConfig.cities);
  const districtOptions = countryConfig.cities[regProfile.city] ?? [];

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormBannerError(null);

    const res = await loginWithEmail(loginEmail, loginPassword);
    setSubmitting(false);
    if (!res.success) {
      setErrors(res.errors || {});
      setFormBannerError(res.errorMessage || 'Giriş yapılamadı.');
      return;
    }
    onAuthenticated?.({ role: res.user?.role || 'customer' });
  };

  const handleSocialAttempt = async (
    provider: 'google' | 'apple',
    email: string,
    fullName?: string
  ) => {
    setSubmitting(true);
    setErrors({});
    setFormBannerError(null);

    const res = await continueWithSocial({ provider, email, fullName });
    setSubmitting(false);

    if (res.success && res.user) {
      onAuthenticated?.({ role: res.user.role });
      return;
    }

    if (res.needsProfileCompletion && res.prefill) {
      setRegProvider(res.prefill.provider);
      setRegProfile((prev) => ({
        ...prev,
        email: res.prefill!.email,
        fullName: res.prefill!.fullName,
      }));
      setSocialPickerProvider(null);
      setViewMode('complete_social');
      showToast('Hesabınız doğrulandı! Devam etmek için eksik bilgilerinizi tamamlayın.');
      return;
    }

    setErrors(res.errors || {});
    setFormBannerError(res.errorMessage || 'Sosyal giriş tamamlanamadı.');
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormBannerError(null);

    const res = await registerAccount({
      provider: regProvider,
      profile: regProfile,
      password: regProvider === 'email' ? regPassword : undefined,
      passwordConfirm: regProvider === 'email' ? regPasswordConfirm : undefined,
      kvkkAccepted,
      accountRole: 'customer',
    });
    setSubmitting(false);

    if (!res.success) {
      setErrors(res.errors || {});
      setFormBannerError(res.errorMessage || 'Kayıt işlemi tamamlanamadı.');
      return;
    }

    setSelectedCurrency(
      resolveDefaultCurrencyForLocation(
        regProfile.countryCode,
        regProfile.city,
        regProfile.district
      )
    );
    onAuthenticated?.({
      role: 'customer',
      isNewPartnerSignup: accountRole === 'tenant_owner',
    });
  };

  const openSocialFlow = (provider: 'google' | 'apple') => {
    setErrors({});
    setFormBannerError(null);
    if (socialPickerProvider === provider) {
      setSocialPickerProvider(null);
      return;
    }
    const preset = SOCIAL_QUICK_PRESETS.find((item) => item.provider === provider);
    setSocialPickerProvider(provider);
    setSocialEmailInput(preset?.email || '');
    setSocialNameInput(preset?.fullName || '');
  };

  const renderSocialButtons = (verb: string) => (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => openSocialFlow('google')}
          className={`flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition active:scale-[0.99] ${
            socialPickerProvider === 'google'
              ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#312E81]'
              : isDark
                ? 'border-slate-700 bg-slate-800 text-white hover:border-slate-600'
                : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
          }`}
          data-testid="auth-google-btn"
        >
          <GoogleLogoSvg />
          <span>Google (Gmail) ile {verb}</span>
        </button>

        <button
          type="button"
          onClick={() => openSocialFlow('apple')}
          className={`flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition active:scale-[0.99] ${
            socialPickerProvider === 'apple'
              ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#312E81]'
              : isDark
                ? 'border-slate-700 bg-slate-950 text-white hover:border-slate-600'
                : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
          }`}
          data-testid="auth-apple-btn"
        >
          <AppleLogoSvg />
          <span>Apple ile {verb}</span>
        </button>
      </div>

      {socialPickerProvider && (
        <div
          className={`rounded-2xl border-2 p-3.5 space-y-2.5 ${
            isDark ? 'border-indigo-500/40 bg-slate-800/90' : 'border-indigo-200 bg-[#EEF2FF]/70'
          }`}
          data-testid="auth-social-email-panel"
        >
          <p className="text-xs font-black text-[#4338CA] dark:text-indigo-300">
            {socialPickerProvider === 'google'
              ? 'Google / Gmail Hesabınızı Seçin veya Yazın'
              : 'Apple / iCloud Hesabınızı Seçin veya Yazın'}
          </p>
          <input
            type="text"
            value={socialNameInput}
            onChange={(e) => setSocialNameInput(e.target.value)}
            placeholder="Ad Soyad"
            className={fieldClass('socialName')}
            data-testid="auth-social-name-input"
          />
          <input
            type="email"
            value={socialEmailInput}
            onChange={(e) => {
              setSocialEmailInput(e.target.value);
              clearFieldError('socialEmail');
            }}
            placeholder={
              socialPickerProvider === 'google' ? 'adiniz@gmail.com' : 'adiniz@icloud.com'
            }
            className={fieldClass('socialEmail')}
            data-testid="auth-social-email-input"
          />
          {errors.socialEmail && (
            <p className="text-[11px] font-bold text-rose-600">{errors.socialEmail}</p>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              void handleSocialAttempt(socialPickerProvider, socialEmailInput, socialNameInput)
            }
            className="w-full min-h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-black transition disabled:opacity-60"
            data-testid="auth-social-continue-btn"
          >
            {submitting
              ? 'Doğrulanıyor...'
              : `${socialPickerProvider === 'google' ? 'Gmail' : 'Apple'} ile Devam Et`}
          </button>
        </div>
      )}
    </div>
  );

  const renderProfileFieldsForm = (isSocialCompletion: boolean) => (
    <form onSubmit={handleRegisterSubmit} className="space-y-3" data-testid="auth-register-form">
      {!isSocialCompletion && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
            Hesap Türü
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccountRole('customer')}
              className={`min-h-11 rounded-2xl border-2 px-3 py-2 text-xs font-black flex items-center justify-center gap-1.5 transition ${
                accountRole === 'customer'
                  ? 'border-[#4338CA] bg-[#4F46E5] text-white'
                  : inputSurface
              }`}
              data-testid="auth-role-customer-btn"
            >
              <UserCheck className="w-4 h-4" />
              <span>Müşteri / Üye</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountRole('tenant_owner')}
              className={`min-h-11 rounded-2xl border-2 px-3 py-2 text-xs font-black flex items-center justify-center gap-1.5 transition ${
                accountRole === 'tenant_owner'
                  ? 'border-[#4338CA] bg-[#4F46E5] text-white'
                  : inputSurface
              }`}
              data-testid="auth-role-partner-btn"
            >
              <Building2 className="w-4 h-4" />
              <span>İşletme / Partner</span>
            </button>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="auth-reg-fullname" className="text-xs font-bold text-slate-500 block mb-1">
          Ad Soyad *
        </label>
        <input
          id="auth-reg-fullname"
          type="text"
          value={regProfile.fullName}
          onChange={(e) => updateRegField('fullName', e.target.value)}
          placeholder="Örn: Ayşe Kaya"
          className={fieldClass('fullName')}
          data-testid="auth-reg-fullname-input"
        />
        {errors.fullName && (
          <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label htmlFor="auth-reg-email" className="text-xs font-bold text-slate-500 block mb-1">
          E-posta (Gmail vb.) *
        </label>
        <input
          id="auth-reg-email"
          type="email"
          value={regProfile.email}
          readOnly={isSocialCompletion}
          onChange={(e) => updateRegField('email', e.target.value)}
          placeholder="ornek@gmail.com"
          className={`${fieldClass('email')} ${isSocialCompletion ? 'opacity-80 cursor-not-allowed' : ''}`}
          data-testid="auth-reg-email-input"
        />
        {errors.email && (
          <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.email}</p>
        )}
      </div>

      {!isSocialCompletion && (
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="auth-reg-password" className="text-xs font-bold text-slate-500 block mb-1">
              Şifre *
            </label>
            <div className="relative">
              <input
                id="auth-reg-password"
                type={showRegPassword ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => {
                  setRegPassword(e.target.value);
                  clearFieldError('password');
                }}
                placeholder="En az 6 hane"
                className={`${fieldClass('password')} pr-10`}
                data-testid="auth-reg-password-input"
              />
              <button
                type="button"
                onClick={() => setShowRegPassword((v) => !v)}
                aria-label="Şifreyi göster/gizle"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.password}</p>
            )}
          </div>
          <div>
            <label htmlFor="auth-reg-password-confirm" className="text-xs font-bold text-slate-500 block mb-1">
              Şifre Tekrar *
            </label>
            <input
              id="auth-reg-password-confirm"
              type={showRegPassword ? 'text' : 'password'}
              value={regPasswordConfirm}
              onChange={(e) => {
                setRegPasswordConfirm(e.target.value);
                clearFieldError('passwordConfirm');
              }}
              placeholder="Tekrar yazın"
              className={fieldClass('passwordConfirm')}
              data-testid="auth-reg-password-confirm-input"
            />
            {errors.passwordConfirm && (
              <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.passwordConfirm}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="auth-reg-country" className="text-xs font-bold text-slate-500 block mb-1">
          Ülke *
        </label>
        <select
          id="auth-reg-country"
          value={regProfile.countryCode}
          onChange={(e) => {
            const nextCfg = getCountryConfig(e.target.value);
            const nextCity = Object.keys(nextCfg.cities)[0] ?? '';
            const nextDistrict = nextCfg.cities[nextCity]?.[0] ?? '';
            setRegProfile((prev) => ({
              ...prev,
              countryCode: nextCfg.code,
              country: nextCfg.label,
              city: nextCity,
              district: nextDistrict,
              phoneDigits: sanitizePhoneDigits(prev.phoneDigits, nextCfg.maxDigits),
            }));
            clearFieldError('country');
            clearFieldError('city');
            clearFieldError('district');
            clearFieldError('phoneDigits');
          }}
          className={fieldClass('country')}
          data-testid="auth-reg-country-select"
        >
          {COUNTRY_CONFIGS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="auth-reg-phone" className="text-xs font-bold text-slate-500 block mb-1">
          Telefon Numarası *
        </label>
        <div className="flex gap-2">
          <span
            className={`flex min-w-16 items-center justify-center rounded-xl border-2 px-3 text-sm font-black ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-indigo-300'
                : 'border-indigo-200 bg-[#EEF2FF] text-[#4338CA]'
            }`}
          >
            {countryConfig.dialCode}
          </span>
          <input
            id="auth-reg-phone"
            type="tel"
            inputMode="numeric"
            value={regProfile.phoneDigits}
            onChange={(e) =>
              updateRegField(
                'phoneDigits',
                sanitizePhoneDigits(e.target.value, countryConfig.maxDigits)
              )
            }
            placeholder={countryConfig.placeholder}
            className={fieldClass('phoneDigits')}
            data-testid="auth-reg-phone-input"
          />
        </div>
        {errors.phoneDigits && (
          <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.phoneDigits}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="auth-reg-age" className="text-xs font-bold text-slate-500 block mb-1">
            Yaş *
          </label>
          <input
            id="auth-reg-age"
            type="number"
            min="16"
            max="110"
            value={regProfile.age}
            onChange={(e) => updateRegField('age', e.target.value)}
            placeholder="28"
            className={fieldClass('age')}
            data-testid="auth-reg-age-input"
          />
          {errors.age && (
            <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.age}</p>
          )}
        </div>
        <div>
          <label htmlFor="auth-reg-gender" className="text-xs font-bold text-slate-500 block mb-1">
            Cinsiyet *
          </label>
          <select
            id="auth-reg-gender"
            value={regProfile.gender}
            onChange={(e) => updateRegField('gender', e.target.value as UserGender | '')}
            className={fieldClass('gender')}
            data-testid="auth-reg-gender-select"
          >
            <option value="">Seçiniz</option>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
            <option value="other">Diğer</option>
            <option value="prefer_not_to_say">Belirtmek İstemiyorum</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.gender}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="auth-reg-city" className="text-xs font-bold text-slate-500 block mb-1">
            İl *
          </label>
          {cityOptions.length > 0 ? (
            <select
              id="auth-reg-city"
              value={regProfile.city}
              onChange={(e) => {
                const nextCity = e.target.value;
                const nextDistrict = countryConfig.cities[nextCity]?.[0] ?? '';
                setRegProfile((prev) => ({
                  ...prev,
                  city: nextCity,
                  district: nextDistrict,
                }));
                clearFieldError('city');
                clearFieldError('district');
              }}
              className={fieldClass('city')}
              data-testid="auth-reg-city-select"
            >
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="auth-reg-city"
              type="text"
              value={regProfile.city}
              onChange={(e) => updateRegField('city', e.target.value)}
              className={fieldClass('city')}
            />
          )}
          {errors.city && (
            <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label htmlFor="auth-reg-district" className="text-xs font-bold text-slate-500 block mb-1">
            İlçe *
          </label>
          {districtOptions.length > 0 ? (
            <select
              id="auth-reg-district"
              value={regProfile.district}
              onChange={(e) => updateRegField('district', e.target.value)}
              className={fieldClass('district')}
              data-testid="auth-reg-district-select"
            >
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="auth-reg-district"
              type="text"
              value={regProfile.district}
              onChange={(e) => updateRegField('district', e.target.value)}
              className={fieldClass('district')}
            />
          )}
          {errors.district && (
            <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.district}</p>
          )}
        </div>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-bold text-slate-500">
          İlgilendiğiniz Sektörler (İsteğe Bağlı)
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTED_SECTOR_OPTIONS.map((sector) => {
            const selected = regProfile.interestedSectors.includes(sector.id);
            return (
              <button
                key={sector.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  updateRegField(
                    'interestedSectors',
                    selected
                      ? regProfile.interestedSectors.filter((id) => id !== sector.id)
                      : [...regProfile.interestedSectors, sector.id]
                  )
                }
                className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-black transition ${
                  selected
                    ? 'border-[#4338CA] bg-[#4F46E5] text-white'
                    : isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200'
                      : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {sector.labelTr}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-start gap-2.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold cursor-pointer">
        <input
          type="checkbox"
          checked={kvkkAccepted}
          onChange={(e) => {
            setKvkkAccepted(e.target.checked);
            clearFieldError('kvkkAccepted');
          }}
          className="mt-0.5 h-4 w-4 accent-[#4F46E5]"
          data-testid="auth-reg-kvkk-checkbox"
        />
        <span>
          <strong>KVKK Aydınlatma Metni</strong> ve LARİ Kullanıcı Sözleşmesi&apos;ni okudum,
          bilgilerimin randevu ve hizmet eşleştirme amacıyla işlenmesini onaylıyorum.
        </span>
      </label>
      {errors.kvkkAccepted && (
        <p className="text-[11px] font-bold text-rose-600">{errors.kvkkAccepted}</p>
      )}

      {formBannerError && (
        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {formBannerError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-12 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-black shadow-sm transition disabled:opacity-60"
        data-testid="auth-register-submit-btn"
      >
        {submitting
          ? 'Hesap Oluşturuluyor...'
          : isSocialCompletion
            ? 'Bilgilerimi Kaydet & Giriş Yap'
            : 'Üye Ol & Giriş Yap'}
      </button>
    </form>
  );

  return (
    <div
      className={`fixed inset-0 z-[95] overflow-y-auto ${
        isDark ? 'bg-slate-950 text-white' : 'bg-[#F8FAFC] text-slate-900'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="LARİ Giriş Yap ve Üye Ol"
      data-testid="mobile-auth-modal"
    >
      <header
        className={`sticky top-0 z-10 border-b-2 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl ${
          isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          {viewMode === 'complete_social' || viewMode === 'forgot_password' ? (
            <button
              type="button"
              onClick={() => {
                setViewMode(viewMode === 'complete_social' ? 'register' : 'login');
                setErrors({});
                setFormBannerError(null);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
              }`}
              aria-label="Geri dön"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D1352] via-[#2C1A88] to-[#3B23C4]">
              <img
                src="/brand/lari-symbol-only.svg"
                alt="LARİ"
                className="h-7 w-7 object-contain"
              />
            </div>
          )}

          <div className="text-center">
            <h1 className="text-base font-black">
              {viewMode === 'login'
                ? 'LARİ Hesabına Giriş'
                : viewMode === 'register'
                  ? 'LARİ Üyelik Oluştur'
                  : viewMode === 'complete_social'
                    ? 'Profil Bilgilerini Tamamla'
                    : 'Şifre Sıfırlama'}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500">
              Randevu, QR Cüzdan & Partner Ekosistemi
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
            }`}
            aria-label="Giriş ekranını kapat"
            data-testid="auth-modal-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-16">
        {/* Hero Brand Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#1D1352] via-[#2C1A88] to-[#3B23C4] p-5 text-white shadow-md">
          <div className="flex items-center gap-2 text-xs font-black text-[#A7F3D0]">
            <Sparkles className="w-4 h-4 text-[#16CFD1]" />
            <span>TEK HESAP • TÜM SEKTÖRLER</span>
          </div>
          <h2 className="mt-1.5 text-lg font-black leading-snug">
            {viewMode === 'complete_social'
              ? 'Son 1 Adım: Bilgilerinizi Doğrulayın'
              : 'Gmail, Apple veya E-posta ile Hızlı Başlayın'}
          </h2>
          <p className="mt-1 text-xs text-indigo-100/90 leading-relaxed">
            {viewMode === 'complete_social'
              ? 'İşletmelerin size randevu onayı ve QR pass gönderebilmesi için zorunlu iletişim bilgilerinizi tamamlayın.'
              : '3 saniyede randevu alın, dijital bakım pasaportunuzu ve QR cüzdanınızı her cihazda senkronize tutun.'}
          </p>
        </div>

        {/* Segmented Login / Register Switcher */}
        {(viewMode === 'login' || viewMode === 'register') && (
          <div
            className={`grid grid-cols-2 gap-1.5 rounded-2xl border-2 p-1.5 ${
              isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setViewMode('login');
                setErrors({});
                setFormBannerError(null);
                setSocialPickerProvider(null);
              }}
              className={`min-h-11 rounded-xl text-sm font-black transition ${
                viewMode === 'login'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : isDark
                    ? 'text-slate-300'
                    : 'text-slate-600'
              }`}
              data-testid="auth-tab-login-btn"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('register');
                setRegProvider('email');
                setErrors({});
                setFormBannerError(null);
                setSocialPickerProvider(null);
              }}
              className={`min-h-11 rounded-xl text-sm font-black transition ${
                viewMode === 'register'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : isDark
                    ? 'text-slate-300'
                    : 'text-slate-600'
              }`}
              data-testid="auth-tab-register-btn"
            >
              Üye Ol
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className={`rounded-3xl border-2 p-5 space-y-4 shadow-sm ${cardSurface}`}>
          {viewMode === 'login' && (
            <>
              {renderSocialButtons('Giriş Yap')}

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t-2 border-slate-200 dark:border-slate-700" />
                <span className="mx-3 shrink-0 text-[11px] font-black uppercase text-slate-400">
                  veya e-posta ile
                </span>
                <div className="flex-grow border-t-2 border-slate-200 dark:border-slate-700" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3" data-testid="auth-login-form">
                <div>
                  <label htmlFor="auth-login-email" className="text-xs font-bold text-slate-500 block mb-1">
                    E-posta (Gmail, iCloud vb.)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        clearFieldError('email');
                      }}
                      placeholder="ornek@gmail.com"
                      className={`${fieldClass('email')} pl-9`}
                      data-testid="auth-login-email-input"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-login-password" className="text-xs font-bold text-slate-500">
                      Şifre
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot_password');
                        setResetEmailSent(false);
                        setFormBannerError(null);
                      }}
                      className="text-xs font-bold text-[#4F46E5] hover:underline"
                    >
                      Şifremi Unuttum
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        clearFieldError('password');
                      }}
                      placeholder="••••••••"
                      className={`${fieldClass('password')} pl-9 pr-10`}
                      data-testid="auth-login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label="Şifreyi göster/gizle"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.password}</p>
                  )}
                </div>

                {formBannerError && (
                  <div
                    className="rounded-xl border-2 border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                    data-testid="auth-login-error"
                  >
                    {formBannerError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-12 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-black shadow-sm transition disabled:opacity-60"
                  data-testid="auth-login-submit-btn"
                >
                  {submitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>

              <div className="rounded-2xl border border-indigo-100 bg-[#F8FAFC] p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-600 text-center">
                  Tek Dokunuşla Demo Hesaplarla Dene (Şifre: lari123)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      setErrors({});
                      setFormBannerError(null);
                      const res = await loginWithEmail('mert@randevulari.com', 'lari123');
                      setSubmitting(false);
                      if (res.success) {
                        onAuthenticated?.({ role: res.user?.role || 'customer' });
                      } else {
                        setFormBannerError(res.errorMessage || 'Demo girişi yapılamadı.');
                      }
                    }}
                    className="min-h-10 rounded-xl border border-indigo-200 bg-white px-2.5 py-2 text-[11px] font-black text-[#4338CA] hover:bg-indigo-50 transition"
                    data-testid="auth-quick-demo-customer-btn"
                  >
                    Demo Müşteri (Mert)
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      setErrors({});
                      setFormBannerError(null);
                      const res = await loginWithEmail('partner@randevulari.com', 'lari123');
                      setSubmitting(false);
                      if (res.success) {
                        onAuthenticated?.({ role: res.user?.role || 'tenant_owner' });
                      } else {
                        setFormBannerError(res.errorMessage || 'Demo girişi yapılamadı.');
                      }
                    }}
                    className="min-h-10 rounded-xl border border-indigo-200 bg-white px-2.5 py-2 text-[11px] font-black text-[#4338CA] hover:bg-indigo-50 transition"
                    data-testid="auth-quick-demo-partner-btn"
                  >
                    Demo Partner (Merve)
                  </button>
                </div>
              </div>
            </>
          )}

          {viewMode === 'register' && (
            <>
              {renderSocialButtons('Hızlı Üye Ol')}

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t-2 border-slate-200 dark:border-slate-700" />
                <span className="mx-3 shrink-0 text-[11px] font-black uppercase text-slate-400">
                  veya bilgilerinle üye ol
                </span>
                <div className="flex-grow border-t-2 border-slate-200 dark:border-slate-700" />
              </div>

              {renderProfileFieldsForm(false)}
            </>
          )}

          {viewMode === 'complete_social' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-emerald-900">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-xs font-black">
                    {regProvider === 'google' ? 'Google (Gmail)' : 'Apple'} Hesabı Doğrulandı
                  </p>
                  <p className="text-[11px] truncate font-semibold">{regProfile.email}</p>
                </div>
              </div>
              {renderProfileFieldsForm(true)}
            </div>
          )}

          {viewMode === 'forgot_password' && (
            <div className="space-y-4">
              {IS_LOCAL_DATA_MODE && (
                <div
                  className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-3.5 py-3 text-xs font-semibold leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                  data-testid="auth-forgot-password-local-preview-note"
                >
                  Yerel önizleme: Bu modda gerçek e-posta gönderilmez; şifre sıfırlama
                  akışı yalnızca arayüz demosudur.
                </div>
              )}
              {resetEmailSent ? (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center space-y-2 text-emerald-900">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-black">Sıfırlama Bağlantısı Hazır</p>
                  <p className="text-xs">
                    {loginEmail || 'E-posta adresiniz'} için şifre sıfırlama talimatları gönderildi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="mt-2 w-full min-h-11 rounded-xl bg-[#4F46E5] text-white text-xs font-black"
                  >
                    Giriş Ekranına Dön
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!loginEmail.trim()) {
                      setErrors({ email: 'Lütfen kayıtlı e-posta adresinizi girin.' });
                      return;
                    }
                    setResetEmailSent(true);
                  }}
                  className="space-y-3"
                >
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Kayıtlı e-posta adresinizi girin, şifre yenileme bağlantısını gönderelim.
                  </p>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    placeholder="ornek@gmail.com"
                    className={fieldClass('email')}
                  />
                  {errors.email && (
                    <p className="text-[11px] font-bold text-rose-600">{errors.email}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full min-h-11 rounded-xl bg-[#4F46E5] text-white text-sm font-black"
                  >
                    Sıfırlama Bağlantısı Gönder
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Apple Guideline 5.1.1 Guest Browsing Footer */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-4 py-2 px-4"
            data-testid="auth-continue-guest-btn"
          >
            Şimdi değil, misafir olarak göz atmaya devam et
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            KVKK & RLS Korumalı Oturum
          </span>
        </div>
      </div>
    </div>
  );
};

export default MobileAuthModal;
