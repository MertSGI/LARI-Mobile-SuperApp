import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  CalendarPlus,
  Check,
  Compass,
  Globe2,
  Inbox,
  Lock,
  Moon,
  Plane,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Store,
  Sun,
  User,
  UserCheck,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  MobileCapabilityTier,
  MobilePersonaType,
  MobileShellMode,
  MobileShellResolutionResult,
  MobileTabDescriptor,
} from '../../services/mobile/mobileShellPolicyService';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';

export interface MobileAppShellProps {
  shellState: MobileShellResolutionResult;
  activeTabId: string;
  onSelectTab: (tab: MobileTabDescriptor) => void;
  onSwitchPersona: (persona: MobilePersonaType) => void;
  onToggleMode: (targetMode: MobileShellMode) => void;
  businessDisplayName?: string;
  branchDisplayName?: string;
  isOffline?: boolean;
  language?: 'tr' | 'en';
  children: React.ReactNode;
}

const PERSONA_LABELS: Record<MobilePersonaType, { tr: string; en: string }> = {
  salon_customer: { tr: 'Müşteri • Keşfet & Randevu', en: 'Customer • Explore' },
  clinic_patient: { tr: 'Klinik & Muayenehane Hastası', en: 'Clinic Patient' },
  ht_patient: { tr: 'Uluslararası Sağlık Turizmi', en: 'Medical Concierge' },
  salon_partner: { tr: 'İşletme / Uzman Stüdyosu', en: 'Partner • Staff & POS' },
  clinic_practitioner: { tr: 'Klinik Hekim (PHI)', en: 'Clinic Practitioner PHI' },
  ht_coordinator: { tr: 'Sağlık Turizmi Koordinatörü', en: 'HT Lead Ops & Quote' },
};

const TIER_BADGE_STYLES: Record<
  MobileCapabilityTier,
  { labelTr: string; labelEn: string; className: string }
> = {
  LIVE_ACTIVE: {
    labelTr: 'CANLI YETKİLİ',
    labelEn: 'LIVE ACTIVE',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  },
  LOCAL_OR_SANDBOX_ONLY: {
    labelTr: 'YEREL / SANDBOX',
    labelEn: 'SANDBOX MODE',
    className: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  DISABLED_EXTERNAL_HOLD: {
    labelTr: 'DIŞ ONAY BEKLİYOR (HOLD)',
    labelEn: 'EXTERNAL HOLD',
    className: 'bg-rose-50 text-rose-700 border-rose-300',
  },
};

function renderTabIcon(iconName: string, isActive: boolean) {
  const cls = `w-7 h-7 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.9]'}`;
  switch (iconName) {
    case 'Store':
      return <Store className={cls} />;
    case 'Compass':
      return <Compass className={cls} />;
    case 'QrCode':
      return <QrCode className={cls} />;
    case 'CalendarPlus':
      return <CalendarPlus className={cls} />;
    case 'Plane':
      return <Plane className={cls} />;
    case 'Sparkles':
      return <Sparkles className={cls} />;
    case 'UserCheck':
      return <UserCheck className={cls} />;
    case 'CalendarClock':
      return <CalendarClock className={cls} />;
    case 'Inbox':
      return <Inbox className={cls} />;
    case 'ScanLine':
      return <ScanLine className={cls} />;
    case 'Stethoscope':
      return <Stethoscope className={cls} />;
    case 'Globe2':
      return <Globe2 className={cls} />;
    case 'Users':
      return <Users className={cls} />;
    default:
      return <Sliders className={cls} />;
  }
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  shellState,
  activeTabId,
  onSelectTab,
  onSwitchPersona,
  onToggleMode,
  businessDisplayName = 'LARİ',
  branchDisplayName,
  isOffline = false,
  language = 'tr',
  children,
}) => {
  const { themeMode, toggleThemeMode, showToast } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const isPartner = shellState.effectiveMode === 'b2b_partner';
  const activeTab =
    shellState.tabs.find((t) => t.id === activeTabId) || shellState.tabs[0];
  const tierMeta = TIER_BADGE_STYLES[activeTab.capabilityTier];

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [bottomNavVisible, setBottomNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const delta = y - lastScrollY.current;
      if (y <= 40) {
        setBottomNavVisible(true);
      } else if (delta > 12) {
        setBottomNavVisible(false);
      } else if (delta < -6) {
        setBottomNavVisible(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hasPartnerAccess = shellState.availablePersonas.some((p) =>
    ['salon_partner', 'clinic_practitioner', 'ht_coordinator'].includes(p)
  );

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F3F5F9] text-slate-900'
      }`}
      data-theme={themeMode}
      style={{
        paddingTop: shellState.layoutMetrics.safeAreaTopCss,
        paddingBottom: `calc(84px + ${shellState.layoutMetrics.safeAreaBottomCss})`,
      }}
      data-testid="lari-mobile-app-shell"
      data-effective-mode={shellState.effectiveMode}
      data-effective-persona={shellState.effectivePersona}
    >
      {/* Centered Corporate Top Header Bar */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b-2 px-4 py-3 transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-slate-800'
            : 'bg-white/95 border-slate-300'
        }`}
      >
        <div className="max-w-lg mx-auto grid grid-cols-[44px_1fr_44px] items-center gap-2">
          {/* Left Status Slot (Clean Offline or White-Label Badge) */}
          <div className="flex items-center justify-start">
            {isOffline ? (
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border-2 border-amber-300"
                data-testid="offline-vault-indicator"
                title="Offline QR Aktif"
              >
                <WifiOff className="w-4 h-4" />
              </span>
            ) : shellState.whiteLabelStorefrontLock.active ? (
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border-2 border-emerald-300"
                data-testid="white-label-lock-badge"
                title="%0 Komisyon Mağaza"
              >
                <ShieldCheck className="w-4 h-4" />
              </span>
            ) : (
              <span className="w-9 h-9" />
            )}
          </div>

          {/* Center: LARİ Brand Logo + Centered Name */}
          <div className="flex flex-col items-center justify-center min-w-0 text-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-black text-base shadow-sm border border-[#4338CA]">
                L
              </div>
              <span
                className={`font-black text-lg tracking-tight truncate ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {businessDisplayName === 'LARİ Super-App' ? 'LARİ' : businessDisplayName}
              </span>
            </div>
            <span
              className={`text-xs font-semibold truncate max-w-full ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {isPartner ? 'Partner Stüdyo' : branchDisplayName || 'Müşteri Asistanı'}
            </span>
          </div>

          {/* Right: Profile / Theme / Mode Switcher Trigger */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              style={{ minHeight: '42px', minWidth: '42px' }}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition shadow-xs ${
                isDark
                  ? 'bg-slate-800 border-[#4F46E5] text-white'
                  : 'bg-[#EEF2FF] border-[#4F46E5] text-[#4338CA]'
              }`}
              aria-label="Hesap ve Görünüm Menüsü"
              data-testid="header-profile-menu-btn"
            >
              <User className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 py-4 overflow-x-hidden">
        {children}
      </main>

      {/* Instagram-Inspired Large Bottom Navigation Bar (Auto-Hides on Scroll Down) */}
      <nav
        aria-label={language === 'tr' ? 'Mobil Alt Navigasyon' : 'Mobile Bottom Navigation'}
        className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t-2 transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/95 border-slate-700'
            : 'bg-white/95 border-slate-300'
        } ${
          bottomNavVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          paddingBottom: shellState.layoutMetrics.safeAreaBottomCss,
        }}
        data-testid="mobile-bottom-tab-bar"
      >
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 px-2 py-2">
          {shellState.tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            const isPrimaryCenter =
              tab.id === 'quick_book' || tab.id === 'partner_pos';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab)}
                style={{ minHeight: `${Math.max(58, tab.minTouchTargetPx)}px` }}
                className={`relative flex flex-col items-center justify-center rounded-2xl px-1 py-1.5 transition active:scale-95 ${
                  isPrimaryCenter
                    ? isActive
                      ? 'bg-[#4F46E5] text-white shadow-md'
                      : isDark
                        ? 'bg-slate-800 text-[#818CF8] border-2 border-[#4F46E5]/50'
                        : 'bg-[#EEF2FF] text-[#4338CA] border-2 border-[#4F46E5]/40'
                    : isActive
                      ? isDark
                        ? 'text-white bg-slate-800'
                        : 'text-[#4F46E5] bg-[#EEF2FF]'
                      : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid={`mobile-tab-${tab.id}`}
              >
                {isActive && !isPrimaryCenter && (
                  <span className="w-6 h-1 rounded-full bg-[#4F46E5] mb-1" />
                )}
                <div className="relative flex items-center justify-center">
                  {renderTabIcon(tab.iconName, isActive)}
                  {tab.requiresBiometricGate && (
                    <Lock
                      className="w-3 h-3 text-amber-600 absolute -top-1 -right-2"
                      aria-label="Biometric Protected"
                    />
                  )}
                </div>
                <span className="text-xs font-bold mt-1 leading-none truncate max-w-full">
                  {language === 'tr' ? tab.labelTr : tab.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Top-Right Profile Quick Sheet: Theme (Light/Dark), Mode (Customer/Partner) & Persona */}
      {profileDrawerOpen && (
        <div
          className="fixed inset-0 z-[95] bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center"
          data-testid="header-profile-drawer"
          onClick={() => setProfileDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black">Hesap & Görünüm Ayarları</h3>
                <p className="text-xs text-slate-500">
                  Tema, Müşteri / Partner geçişi ve dikey rol seçimi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileDrawerOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Light / Dark Mode Switch */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Uygulama Teması
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDark) toggleThemeMode();
                    showToast('Açık (Kurumsal) mod aktif edildi.');
                  }}
                  style={{ minHeight: '46px' }}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-bold flex items-center justify-center gap-2 ${
                    !isDark
                      ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4338CA]'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  data-testid="theme-light-btn"
                >
                  <Sun className="w-4 h-4" />
                  Açık Mod
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDark) toggleThemeMode();
                    showToast('Koyu mod aktif edildi.');
                  }}
                  style={{ minHeight: '46px' }}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-bold flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-[#4F46E5] border-[#4338CA] text-white'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  data-testid="theme-dark-btn"
                >
                  <Moon className="w-4 h-4" />
                  Koyu Mod
                </button>
              </div>
            </div>

            {/* 2. Customer vs Partner Mode Toggle */}
            {hasPartnerAccess && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Çalışma Modu
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onToggleMode(isPartner ? 'b2c_customer' : 'b2b_partner');
                    setProfileDrawerOpen(false);
                  }}
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

            {/* 3. Persona Switcher */}
            {shellState.availablePersonas.length > 1 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Deneyim / Rol Seçimi
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {shellState.availablePersonas.map((persona) => {
                    const active = persona === shellState.effectivePersona;
                    return (
                      <button
                        key={persona}
                        type="button"
                        onClick={() => {
                          onSwitchPersona(persona);
                          setProfileDrawerOpen(false);
                        }}
                        style={{ minHeight: '44px' }}
                        className={`px-3.5 py-2 rounded-xl text-sm font-bold text-left transition border-2 flex items-center justify-between ${
                          active
                            ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                            : isDark
                              ? 'bg-slate-800 text-slate-200 border-slate-700'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
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

            <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Sistem Yetki Seviyesi
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${tierMeta.className}`}
                data-testid="capability-tier-badge"
              >
                {language === 'tr' ? tierMeta.labelTr : tierMeta.labelEn}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
