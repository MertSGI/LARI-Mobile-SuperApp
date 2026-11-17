import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Globe,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
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
  onOpenPartnerOnboarding?: () => void;
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
  onOpenPartnerOnboarding,
}) => {
  const {
    showToast,
    loyaltyPoints,
    packageCreditsRemaining,
    bookingHistory,
    themeMode,
    setThemeMode,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';

  const [displayName, setDisplayName] = useState('Mert Özçelikbaş');
  const [phone, setPhone] = useState('+90 532 555 01 40');
  const [pushBooking, setPushBooking] = useState(true);
  const [pushHt, setPushHt] = useState(true);
  const [biometricConfirmed, setBiometricConfirmed] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [openSection, setOpenSection] = useState<
    'personal' | 'notifications' | 'security' | null
  >(null);
  const [showPermissionDetail, setShowPermissionDetail] = useState(false);
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

  const innerSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-slate-100'
    : 'bg-[#F8FAFC] border-2 border-slate-200 text-slate-900';

  const inputSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-400'
    : 'bg-[#F8FAFC] border-2 border-slate-300 text-slate-900 placeholder-slate-400';

  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = () => {
    showToast('Profil ve iletişim bilgileriniz kaydedildi.');
    setOpenSection(null);
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

  const toggleAccordion = (section: 'personal' | 'notifications' | 'security') => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const displayedHistory = showAllBookings
    ? bookingHistory
    : bookingHistory.slice(0, 2);

  return (
    <div className="space-y-4 pb-28" data-testid="mobile-profile-settings-page">
      {/* Corporate Bento Profile Hero Card */}
      <div
        className={`rounded-3xl overflow-hidden shadow-sm ${cardSurface}`}
      >
        <div className="bg-gradient-to-br from-[#1D1352] via-[#2C1A88] to-[#3B23C4] px-5 pt-5 pb-4 text-white">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/35 flex items-center justify-center font-black text-lg text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black truncate">{displayName}</h2>
                <span className="shrink-0 rounded-full bg-[#15B89B]/25 border border-[#16CFD1]/50 px-2 py-0.5 text-[10px] font-black text-[#A7F3D0]">
                  {isPartner ? 'Partner' : 'Üye'}
                </span>
              </div>
              <p className="text-xs text-indigo-100/85 truncate mt-0.5">
                Nişantaşı, İstanbul • {phone}
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Bento Stats Row */}
        <div className="grid grid-cols-3 divide-x-2 divide-slate-200 dark:divide-slate-700">
          <div className="p-3 text-center">
            <span className="block text-[10px] font-black uppercase text-slate-500">
              LARİ Puan
            </span>
            <span className="text-base font-black text-[#4F46E5] mt-0.5 block">
              {loyaltyPoints}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAllBookings((prev) => !prev)}
            className="p-3 text-center transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="block text-[10px] font-black uppercase text-slate-500">
              Randevularım
            </span>
            <span className="text-base font-black mt-0.5 block">
              {bookingHistory.length}
            </span>
          </button>
          <div className="p-3 text-center">
            <span className="block text-[10px] font-black uppercase text-slate-500">
              Paket Hakkı
            </span>
            <span className="text-base font-black text-emerald-600 mt-0.5 block">
              {packageCreditsRemaining}/8
            </span>
          </div>
        </div>
      </div>

      {/* Appearance, Working Mode & Role Selector Card */}
      <div className={`rounded-3xl p-4 space-y-4 shadow-sm ${cardSurface}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
            Deneyim & Görünüm
          </span>
          <button
            type="button"
            onClick={() => setShowPermissionDetail((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-[#4338CA] dark:text-indigo-300"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isPartner ? 'Partner Yetkisi' : 'Müşteri Sınırı'}</span>
          </button>
        </div>

        <div
          className={`rounded-2xl p-3 text-xs leading-relaxed ${innerSurface}`}
          data-testid="panel-visibility-boundaries-card"
        >
          <button
            type="button"
            onClick={() => setShowPermissionDetail((v) => !v)}
            className="w-full flex items-center justify-between text-left font-bold text-[#4338CA] dark:text-indigo-300"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isPartner
                  ? 'Partner / İşletme Yetkisi Aktif'
                  : hasPartnerAccess
                    ? 'Müşteri Profili (Partner Geçişi Açık)'
                    : 'Müşteri Profili (İşletme Araçları Kilitli)'}
              </span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showPermissionDetail ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showPermissionDetail && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {isPartner
                ? 'Aktif Yetki: Cep Ajanda, QR Müşteri Kabul, Sesli Katalog Eşleştirme, Cep POS, Fiyat Dökümü, Katalog Yönetimi ve (FaceID ile) Klinik PHI.'
                : hasPartnerAccess
                  ? 'Aktif Görünüm: Keşfet & Sosyal Akış, Google Haritalar, Randevu/Paket QR, Fiyat Dökümü Ödeme ve Sağlık Turizmi. İşletme araçları yalnızca Partner modunda açılır.'
                  : 'Misafir / Müşteri Hesabı: Yalnızca Keşfet, Randevu, QR Pass, Fiyat Dökümü ve Sağlık Turizmi ekranlarını görür; İşletme/POS panelleri rol bazlı kilitlidir.'}
            </p>
          )}
        </div>

        {/* Single Smart Theme Toggle */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
            Uygulama Teması
          </span>
          <button
            type="button"
            onClick={() => {
              const nextMode = isDark ? 'light' : 'dark';
              setThemeMode(nextMode);
              showToast(
                nextMode === 'dark'
                  ? 'Ay • Koyu mod aktif edildi.'
                  : 'Güneş • Açık mod aktif edildi.'
              );
            }}
            style={{ minHeight: '48px' }}
            className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-[#FFFBEB] border-amber-300 text-amber-950'
            }`}
            data-testid="theme-mode-toggle-btn"
            aria-label={
              isDark
                ? 'Koyu Mod (Ay) — Açık Moda Geç'
                : 'Açık Mod (Güneş) — Koyu Moda Geç'
            }
          >
            <span className="flex items-center gap-2.5">
              {isDark ? (
                <Moon className="h-5 w-5 text-indigo-300 fill-indigo-300/25" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500 fill-amber-400/40" />
              )}
              <span>{isDark ? 'Koyu Mod (Ay)' : 'Açık Mod (Güneş)'}</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isDark
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-amber-200/80 text-amber-900'
              }`}
            >
              {isDark ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
            </span>
          </button>
        </div>

        {/* Dual Segmented Working Mode (Partner button visible but muted/locked for Customer accounts) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Çalışma Modu
            </span>
            {!hasPartnerAccess && (
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                İşletme Yetkisi Gerekir
              </span>
            )}
          </div>
          <div
            className={`grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 border-2 ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-[#F8FAFC] border-slate-200'
            }`}
            data-testid="mobile-mode-toggle-group"
          >
            <button
              type="button"
              onClick={() => {
                if (isPartner && onToggleMode) onToggleMode('b2c_customer');
              }}
              style={{ minHeight: '44px' }}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                !isPartner
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="mobile-mode-customer-btn"
            >
              Müşteri Modu
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasPartnerAccess) {
                  showToast('LARİ Partner Ekosistemi & İşletme Başvurusu açılıyor...');
                  onOpenPartnerOnboarding?.();
                  return;
                }
                if (!isPartner && onToggleMode) onToggleMode('b2b_partner');
              }}
              aria-disabled={!hasPartnerAccess}
              data-locked={!hasPartnerAccess ? 'true' : 'false'}
              style={{ minHeight: '44px' }}
              className={`rounded-xl px-3 py-2 text-xs font-black transition flex items-center justify-center gap-1.5 ${
                !hasPartnerAccess
                  ? 'opacity-45 cursor-not-allowed bg-slate-200/70 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                  : isPartner
                    ? 'bg-[#4F46E5] text-white shadow-sm'
                    : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="mobile-mode-partner-btn"
            >
              {!hasPartnerAccess && <Lock className="w-3.5 h-3.5 shrink-0" />}
              <span>Partner / İşletme Modu</span>
            </button>
          </div>
        </div>

        {/* Role Selector Dropdown */}
        {shellState && shellState.availablePersonas.length > 1 && onSwitchPersona && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
              Kullanım Rolü
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen((open) => !open)}
                aria-expanded={roleDropdownOpen}
                aria-haspopup="listbox"
                className={`flex min-h-12 w-full items-center justify-between rounded-2xl border-2 px-3.5 py-2 text-left text-sm font-bold ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-[#F8FAFC] border-slate-300 text-slate-800'
                }`}
                data-testid="persona-role-dropdown-btn"
              >
                <span className="truncate">
                  {PERSONA_LABELS[shellState.effectivePersona][language]}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    roleDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {roleDropdownOpen && (
                <div
                  role="listbox"
                  className={`absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 grid gap-1.5 rounded-2xl border-2 p-2 shadow-xl ${
                    isDark
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-white border-slate-200'
                  }`}
                  data-testid="persona-role-dropdown-menu"
                >
                  {shellState.availablePersonas.map((persona) => {
                    const active = persona === shellState.effectivePersona;
                    return (
                      <button
                        key={persona}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onSwitchPersona(persona);
                          setRoleDropdownOpen(false);
                        }}
                        className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                          active
                            ? 'bg-[#4F46E5] text-white'
                            : isDark
                              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                              : 'bg-[#F8FAFC] text-slate-800 hover:bg-slate-100'
                        }`}
                        data-testid={`persona-pill-${persona}`}
                      >
                        <span>{PERSONA_LABELS[persona][language]}</span>
                        {active && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer Past & Active Appointments History */}
      <div
        className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}
        data-testid="profile-booking-history-card"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-black flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#4F46E5]" />
            Önceki & Aktif Randevularım
          </span>
          {bookingHistory.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllBookings((v) => !v)}
              className="text-xs font-black text-[#4F46E5] hover:underline"
              data-testid="profile-toggle-all-bookings-btn"
            >
              {showAllBookings
                ? 'Daralt'
                : `Tümünü Gör (${bookingHistory.length})`}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {displayedHistory.map((apt) => (
            <div
              key={apt.appointmentId}
              className={`rounded-2xl p-3 flex items-center justify-between gap-2 ${innerSurface}`}
              data-testid={`profile-history-item-${apt.appointmentId}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-black truncate">{apt.businessName}</p>
                <p className="text-[11px] font-semibold text-[#4F46E5] truncate">
                  {apt.serviceName}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {apt.scheduledDate} • {apt.scheduledTime} • {apt.specialistName}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    apt.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : apt.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-[#EEF2FF] text-[#4338CA] border-indigo-200'
                  }`}
                >
                  {apt.status === 'confirmed'
                    ? 'Onaylı'
                    : apt.status === 'rescheduled'
                      ? 'Ertelendi'
                      : apt.status === 'cancelled'
                        ? 'İptal'
                        : 'Tamamlandı'}
                </span>
                <p className="text-xs font-black">
                  {apt.priceMajor.toLocaleString('tr-TR')} {apt.currency}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accordion Settings List (Matches Corporate Clean Design) */}
      <div className={`rounded-3xl overflow-hidden shadow-sm divide-y-2 divide-slate-200 dark:divide-slate-800 ${cardSurface}`}>
        {/* 1. Personal Info Accordion */}
        <div>
          <button
            type="button"
            onClick={() => toggleAccordion('personal')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="flex items-center gap-2.5 text-sm font-black">
              <span className="w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <User className="w-4 h-4" />
              </span>
              Kişisel Bilgiler & İletişim
            </span>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSection === 'personal' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {openSection === 'personal' && (
            <div className="px-4 pb-4 pt-1 space-y-2.5">
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
          )}
        </div>

        {/* 2. Notification & Privacy Accordion */}
        <div>
          <button
            type="button"
            onClick={() => toggleAccordion('notifications')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="flex items-center gap-2.5 text-sm font-black">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </span>
              Bildirim & Gizlilik (KVKK)
            </span>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSection === 'notifications' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {openSection === 'notifications' && (
            <div className="px-4 pb-4 pt-1 space-y-2.5">
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
          )}
        </div>

        {/* 3. Account Security & Deletion Accordion */}
        <div data-testid="mobile-account-deletion-card">
          <button
            type="button"
            onClick={() => toggleAccordion('security')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left transition hover:bg-rose-50/40 dark:hover:bg-rose-950/20"
          >
            <span className="flex items-center gap-2.5 text-sm font-black text-rose-700 dark:text-rose-400">
              <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
              Hesap Güvenliği & Kalıcı Silme
            </span>
            <ChevronRight
              className={`w-4 h-4 text-rose-400 transition-transform ${
                openSection === 'security' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {openSection === 'security' && (
            <div className="px-4 pb-4 pt-1 space-y-3">
              <p className="text-xs text-slate-500">
                {hasActiveMedicalRetentionLock
                  ? 'Aktif tıbbi kayıt saklama zorunluluğu nedeniyle kişisel verileriniz KVKK kapsamında kalıcı olarak anonimleştirilir.'
                  : 'Hesabınız ve oturum anahtarlarınız biyometrik doğrulama sonrasında kalıcı olarak silinir (Apple 5.1.1(v)).'}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileProfileSettingsPage;
