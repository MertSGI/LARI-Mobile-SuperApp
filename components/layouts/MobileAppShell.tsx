import React from 'react';
import {
  CalendarClock,
  CalendarPlus,
  Compass,
  Globe2,
  Inbox,
  Lock,
  Plane,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Store,
  UserCheck,
  Users,
  WifiOff,
} from 'lucide-react';
import {
  MobileCapabilityTier,
  MobilePersonaType,
  MobileShellMode,
  MobileShellResolutionResult,
  MobileTabDescriptor,
} from '../../services/mobile/mobileShellPolicyService';

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
  salon_customer: { tr: 'Salon & Wellness Müşterisi', en: 'Salon & Wellness Guest' },
  clinic_patient: { tr: 'Klinik & Muayenehane Hastası', en: 'Clinic Patient' },
  ht_patient: { tr: 'Uluslararası Sağlık Turizmi', en: 'Medical Tourism Concierge' },
  salon_partner: { tr: 'LARİ Partner • Uzman & POS', en: 'LARİ Partner • Staff & POS' },
  clinic_practitioner: { tr: 'LARİ Klinik • Hekim Muayene (PHI)', en: 'LARİ Clinic • Practitioner PHI' },
  ht_coordinator: { tr: 'LARİ HT • Koordinatör & Teklif', en: 'LARİ HT • Lead Ops & Quote' },
};

const TIER_BADGE_STYLES: Record<
  MobileCapabilityTier,
  { labelTr: string; labelEn: string; className: string }
> = {
  LIVE_ACTIVE: {
    labelTr: 'CANLI YETKİLİ',
    labelEn: 'LIVE ACTIVE',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  LOCAL_OR_SANDBOX_ONLY: {
    labelTr: 'YEREL / SANDBOX',
    labelEn: 'SANDBOX MODE',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  DISABLED_EXTERNAL_HOLD: {
    labelTr: 'DIŞ ONAY BEKLİYOR (HOLD)',
    labelEn: 'EXTERNAL HOLD',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

function renderTabIcon(iconName: string, isActive: boolean) {
  const cls = `w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'opacity-80'}`;
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
  businessDisplayName = 'LARİ Super-App',
  branchDisplayName,
  isOffline = false,
  language = 'tr',
  children,
}) => {
  const isPartner = shellState.effectiveMode === 'b2b_partner';
  const activeTab =
    shellState.tabs.find((t) => t.id === activeTabId) || shellState.tabs[0];
  const tierMeta = TIER_BADGE_STYLES[activeTab.capabilityTier];

  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-slate-950 text-slate-100 select-none"
      style={{
        paddingTop: shellState.layoutMetrics.safeAreaTopCss,
        paddingBottom: `calc(76px + ${shellState.layoutMetrics.safeAreaBottomCss})`,
      }}
      data-testid="lari-mobile-app-shell"
      data-effective-mode={shellState.effectiveMode}
      data-effective-persona={shellState.effectivePersona}
    >
      {/* Top Native-Feel Status & Persona Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/90 border-b border-slate-800 px-3.5 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
                isPartner
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
              }`}
            >
              L
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate">
                  {businessDisplayName}
                </span>
                {shellState.whiteLabelStorefrontLock.active && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0"
                    data-testid="white-label-lock-badge"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {language === 'tr' ? '%0 Komisyon Mağaza' : '0% Direct Store'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {PERSONA_LABELS[shellState.effectivePersona][language]}
                {branchDisplayName ? ` • ${branchDisplayName}` : ''}
              </p>
            </div>
          </div>

          {/* Honest Capability Tier + Mode Switch */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isOffline && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                data-testid="offline-vault-indicator"
              >
                <WifiOff className="w-3 h-3" />
                Offline QR
              </span>
            )}
            <span
              className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${tierMeta.className}`}
              data-testid="capability-tier-badge"
            >
              {language === 'tr' ? tierMeta.labelTr : tierMeta.labelEn}
            </span>
            {shellState.availablePersonas.some((p) =>
              ['salon_partner', 'clinic_practitioner', 'ht_coordinator'].includes(p)
            ) && (
              <button
                type="button"
                onClick={() =>
                  onToggleMode(isPartner ? 'b2c_customer' : 'b2b_partner')
                }
                style={{ minHeight: '36px' }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                  isPartner
                    ? 'bg-indigo-600/30 border-indigo-400/40 text-indigo-200 hover:bg-indigo-600/40'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                data-testid="mobile-mode-toggle-btn"
              >
                {isPartner
                  ? language === 'tr'
                    ? 'Müşteri Modu'
                    : 'Customer Mode'
                  : language === 'tr'
                    ? 'Partner Modu'
                    : 'Partner Mode'}
              </button>
            )}
          </div>
        </div>

        {/* Persona Selector Strip (Multi-Vertical Adaptive Switcher) */}
        {shellState.availablePersonas.length > 1 && (
          <div className="max-w-lg mx-auto mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {shellState.availablePersonas.map((persona) => {
              const active = persona === shellState.effectivePersona;
              return (
                <button
                  key={persona}
                  type="button"
                  onClick={() => onSwitchPersona(persona)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  data-testid={`persona-pill-${persona}`}
                >
                  {PERSONA_LABELS[persona][language]}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 py-4 overflow-x-hidden">
        {children}
      </main>

      {/* Bottom 5-Tab Native Navigation Bar */}
      <nav
        aria-label={language === 'tr' ? 'Mobil Alt Navigasyon' : 'Mobile Bottom Navigation'}
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/95 border-t border-slate-800"
        style={{
          paddingBottom: shellState.layoutMetrics.safeAreaBottomCss,
        }}
        data-testid="mobile-bottom-tab-bar"
      >
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 px-2 py-1.5">
          {shellState.tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            const isPrimaryCenter =
              tab.id === 'quick_book' || tab.id === 'partner_pos';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab)}
                style={{ minHeight: `${tab.minTouchTargetPx}px` }}
                className={`relative flex flex-col items-center justify-center rounded-xl px-1 py-1 transition ${
                  isPrimaryCenter
                    ? isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : isActive
                      ? 'text-blue-400 bg-slate-800/80'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
                data-testid={`mobile-tab-${tab.id}`}
              >
                <div className="relative flex items-center justify-center">
                  {renderTabIcon(tab.iconName, isActive)}
                  {tab.requiresBiometricGate && (
                    <Lock
                      className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-2"
                      aria-label="Biometric Protected"
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1 leading-tight truncate max-w-full">
                  {language === 'tr' ? tab.labelTr : tab.labelEn}
                </span>
                {tab.badgeText && (
                  <span className="absolute -top-1 right-1 px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {tab.badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileAppShell;
