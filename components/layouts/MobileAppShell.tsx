import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CalendarPlus,
  Compass,
  Globe2,
  Home,
  Inbox,
  Lock,
  Plane,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Store,
  UserCheck,
  Users,
  WifiOff,
  ChevronDown,
} from 'lucide-react';
import {
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
  onQuickPlusAction?: () => void;
  onNotificationBellClick?: () => void;
  onBrandHeaderClick?: () => void;
  businessDisplayName?: string;
  branchDisplayName?: string;
  isOffline?: boolean;
  language?: 'tr' | 'en';
  children: React.ReactNode;
}

function renderDockIcon(tab: MobileTabDescriptor, isActive: boolean, isDark: boolean) {
  const cls = `w-7 h-7 transition-transform duration-150 ${
    isActive
      ? isDark
        ? 'text-white scale-110 stroke-[2.5]'
        : 'text-slate-950 scale-110 stroke-[2.5]'
      : isDark
        ? 'text-slate-400 stroke-[1.8]'
        : 'text-slate-600 stroke-[1.8]'
  }`;

  if (tab.id === 'explore' || tab.id === 'storefront') {
    return (
      <Home
        className={cls}
        fill={isActive ? (isDark ? '#FFFFFF' : '#0F172A') : 'none'}
      />
    );
  }
  if (tab.id === 'ai_style') {
    return <Search className={cls} />;
  }
  if (tab.id === 'quick_book') {
    return <Send className={cls} />;
  }
  if (tab.id === 'wallet') {
    return <QrCode className={cls} />;
  }

  switch (tab.iconName) {
    case 'Store':
      return <Store className={cls} />;
    case 'Compass':
      return <Compass className={cls} />;
    case 'CalendarPlus':
      return <CalendarPlus className={cls} />;
    case 'Plane':
      return <Plane className={cls} />;
    case 'Sparkles':
      return <Sparkles className={cls} />;
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
  onQuickPlusAction,
  onNotificationBellClick,
  onBrandHeaderClick,
  businessDisplayName = 'LARİ',
  isOffline = false,
  language = 'tr',
  children,
}) => {
  const { themeMode, activeBooking } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const isPartner = shellState.effectiveMode === 'b2b_partner';
  const activeTab =
    shellState.tabs.find((t) => t.id === activeTabId) || shellState.tabs[0];

  const [dockVisible, setDockVisible] = useState(true);
  const lastScrollY = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getScrollY = () =>
      Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );

    const scheduleReveal = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setDockVisible(true);
      }, 700);
    };

    const handleScroll = () => {
      const y = getScrollY();
      const delta = y - lastScrollY.current;
      if (y <= 48) {
        setDockVisible(true);
      } else if (delta > 8) {
        setDockVisible(false);
        scheduleReveal();
      } else if (delta < -5) {
        setDockVisible(true);
      }
      lastScrollY.current = y;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-clip flex flex-col transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F5F7FA] text-slate-900'
      }`}
      data-theme={themeMode}
      style={{
        paddingTop: shellState.layoutMetrics.safeAreaTopCss,
        paddingBottom: `calc(96px + ${shellState.layoutMetrics.safeAreaBottomCss})`,
      }}
      data-testid="lari-mobile-app-shell"
      data-effective-mode={shellState.effectiveMode}
      data-effective-persona={shellState.effectivePersona}
    >
      {/* Instagram-Inspired Clean Top Bar (Scrolls naturally with page - zero bounce/reflow!) */}
      <header
        className={`w-full border-b-2 px-4 py-3 ${
          isDark
            ? 'bg-slate-950 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-lg mx-auto grid grid-cols-[44px_1fr_44px] items-center gap-2">
          {/* Left: Quick Action + (Just like Instagram top-left +) */}
          <div className="flex items-center justify-start">
            {shellState.whiteLabelStorefrontLock.active ? (
              <span
                className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-400 text-emerald-700 flex items-center justify-center"
                data-testid="white-label-lock-badge"
                title="%0 Komisyon Mağaza"
              >
                <ShieldCheck className="w-5 h-5" />
              </span>
            ) : (
              <button
                type="button"
                onClick={onQuickPlusAction}
                style={{ minHeight: '42px', minWidth: '42px' }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
                  isDark ? 'text-white hover:bg-slate-800' : 'text-slate-900 hover:bg-slate-100'
                }`}
                aria-label="Hızlı Randevu Oluştur"
                data-testid="header-quick-plus-btn"
              >
                <Plus className="w-7 h-7 stroke-[2.2]" />
              </button>
            )}
          </div>

          {/* Exact Center: LARİ Brand Mark & Quick Mode Switcher */}
          <div className="flex items-center justify-center min-w-0">
            <button
              type="button"
              onClick={onBrandHeaderClick}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition"
              data-testid="header-brand-center-btn"
            >
              <span className="w-7 h-7 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center font-black text-sm shadow-xs">
                L
              </span>
              <span
                className={`font-black text-lg tracking-tight truncate ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {businessDisplayName === 'LARİ Super-App'
                  ? isPartner
                    ? 'LARİ Partner'
                    : 'LARİ'
                  : businessDisplayName}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          </div>

          {/* Right: Notification Bell / Offline Vault Status */}
          <div className="flex items-center justify-end">
            {isOffline ? (
              <span
                className="w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-400 text-amber-700 flex items-center justify-center"
                data-testid="offline-vault-indicator"
                title="Offline QR Aktif"
              >
                <WifiOff className="w-4 h-4" />
              </span>
            ) : (
              <button
                type="button"
                onClick={onNotificationBellClick}
                style={{ minHeight: '42px', minWidth: '42px' }}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
                  isDark ? 'text-white hover:bg-slate-800' : 'text-slate-900 hover:bg-slate-100'
                }`}
                aria-label="Bildirimler"
                data-testid="header-notifications-btn"
              >
                <Bell className="w-6 h-6 stroke-[2]" />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-950 absolute top-2 right-2" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 py-3 overflow-x-hidden">
        {children}
      </main>

      {/* Instagram-Authentic Floating Glass Pill Bottom Dock (Icon-Only + Profile Avatar Slot 5) */}
      <nav
        aria-label={language === 'tr' ? 'Mobil Alt Navigasyon' : 'Mobile Bottom Navigation'}
        className={`fixed left-3.5 right-3.5 z-50 transition-all duration-300 pointer-events-none ${
          dockVisible ? 'translate-y-0 opacity-100' : 'translate-y-28 opacity-0'
        }`}
        style={{
          bottom: `calc(14px + ${shellState.layoutMetrics.safeAreaBottomCss})`,
        }}
        data-testid="mobile-bottom-tab-bar"
      >
        <div
          className={`pointer-events-auto max-w-md mx-auto h-16 rounded-full px-2.5 grid grid-cols-5 items-center border-2 backdrop-blur-2xl shadow-[0_10px_35px_rgba(15,23,42,0.16)] ${
            isDark
              ? 'bg-slate-900/90 border-slate-700'
              : 'bg-white/90 border-slate-300/90'
          }`}
        >
          {shellState.tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            const isProfileSlot =
              tab.id === 'profile' || tab.id === 'partner_switch';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab)}
                aria-label={language === 'tr' ? tab.labelTr : tab.labelEn}
                style={{ minHeight: `${Math.max(48, tab.minTouchTargetPx)}px` }}
                className={`relative flex items-center justify-center rounded-full h-12 transition active:scale-90 ${
                  isActive
                    ? isDark
                      ? 'bg-white/10'
                      : 'bg-slate-900/8'
                    : 'hover:bg-slate-900/5 dark:hover:bg-white/5'
                }`}
                data-testid={`mobile-tab-${tab.id}`}
              >
                {isProfileSlot ? (
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 transition ${
                        isActive
                          ? 'border-[#4F46E5] bg-[#4F46E5] text-white scale-110'
                          : isDark
                            ? 'border-slate-500 bg-slate-800 text-white'
                            : 'border-slate-800 bg-[#EEF2FF] text-[#4338CA]'
                      }`}
                    >
                      MÖ
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 -bottom-0.5 -right-0.5 absolute" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    {renderDockIcon(tab, isActive, isDark)}
                    {tab.id === 'quick_book' && activeBooking && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-1" />
                    )}
                    {tab.requiresBiometricGate && (
                      <Lock
                        className="w-3 h-3 text-amber-600 absolute -top-1 -right-1.5"
                        aria-label="Biometric Protected"
                      />
                    )}
                  </div>
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
