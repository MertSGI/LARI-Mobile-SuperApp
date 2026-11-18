import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CalendarPlus,
  Compass,
  Flame,
  Globe2,
  Home,
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
  Users,
  WifiOff,
} from 'lucide-react';
import {
  MobilePersonaType,
  MobileShellMode,
  MobileShellResolutionResult,
  MobileTabDescriptor,
} from '../../services/mobile/mobileShellPolicyService';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';
import NotificationDrawer from '../mobile/NotificationDrawer';

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
        ? 'text-white scale-110 stroke-[2.4]'
        : 'text-[#4F46E5] scale-110 stroke-[2.4]'
      : isDark
        ? 'text-slate-300 stroke-[1.9]'
        : 'text-slate-600 stroke-[1.9]'
  }`;

  if (tab.id === 'explore') {
    return <Home className={cls} />;
  }
  if (tab.id === 'social_feed') {
    return <Flame className={cls} />;
  }
  if (tab.id === 'storefront') {
    return <Store className={cls} />;
  }
  if (tab.id === 'wallet') {
    return <QrCode className={cls} />;
  }
  if (tab.id === 'quick_book') {
    return <CalendarPlus className={cls} />;
  }
  if (tab.id === 'ai_style') {
    return <Sparkles className={cls} />;
  }
  if (tab.id === 'ht_concierge') {
    return <Plane className={cls} />;
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
  isOffline = false,
  language = 'tr',
  children,
}) => {
  const { themeMode, showToast, activeBooking, completedBreakdown } =
    useMobileAppSession();
  const isDark = themeMode === 'dark';
  const activeTab =
    shellState.tabs.find((t) => t.id === activeTabId) || shellState.tabs[0];

  const [dockVisible, setDockVisible] = useState(true);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(3);
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
        paddingBottom: `calc(112px + ${shellState.layoutMetrics.safeAreaBottomCss})`,
      }}
      data-testid="lari-mobile-app-shell"
      data-effective-mode={shellState.effectiveMode}
      data-effective-persona={shellState.effectivePersona}
    >
      {/* Instagram-Inspired Clean Top Bar (Scrolls naturally with page - zero bounce/reflow!) */}
      <header
        className={`w-full border-b-2 px-4 py-2.5 ${
          isDark
            ? 'bg-slate-950 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-lg mx-auto grid grid-cols-[56px_1fr_56px] items-center gap-2">
          {/* Left: Quick Action CalendarPlus */}
          <div className="flex items-center justify-start gap-1">
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
                aria-label={
                  shellState.effectiveMode === 'b2b_partner'
                    ? 'Walk-in Randevu Ekle'
                    : 'Hızlı Randevu Oluştur'
                }
                data-testid="header-quick-plus-btn"
              >
                <CalendarPlus className="w-6 h-6 stroke-[2.3]" />
              </button>
            )}
          </div>

          {/* Exact Center: LARİ Brand Symbol Badge (High-Contrast in Light & Dark Modes) */}
          <div className="flex items-center justify-center min-w-0">
            <button
              type="button"
              onClick={onBrandHeaderClick}
              aria-label="LARİ Ana Sayfa"
              className={`group inline-flex items-center justify-center rounded-2xl p-1 transition active:scale-95 ${
                isDark
                  ? 'hover:bg-slate-800/80'
                  : 'hover:bg-slate-100/80'
              }`}
              data-testid="header-brand-center-btn"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D1352] via-[#2C1A88] to-[#3B23C4] shadow-[0_6px_18px_rgba(44,26,136,0.32)] ring-2 transition-transform group-hover:scale-105 ${
                  isDark ? 'ring-indigo-400/35' : 'ring-[#4F46E5]/20'
                }`}
              >
                <img
                  src="/brand/lari-symbol-only.svg"
                  alt="LARİ"
                  className="h-8 w-8 object-contain"
                  data-testid="header-brand-symbol"
                />
              </span>
            </button>
          </div>

          {/* Right: Notification Bell */}
          <div className="flex items-center justify-end gap-1">
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
                onClick={() => setNotificationDrawerOpen(true)}
                style={{ minHeight: '40px', minWidth: '40px' }}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
                  isDark ? 'text-white hover:bg-slate-800' : 'text-slate-900 hover:bg-slate-100'
                }`}
                aria-label="Bildirimler"
                data-testid="header-notifications-btn"
              >
                <Bell className="w-5 h-5 stroke-[2.2]" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-black leading-none text-white dark:border-slate-950">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 pt-3 pb-28 overflow-x-hidden">
        {children}
      </main>

      <NotificationDrawer
        open={notificationDrawerOpen}
        unreadCount={unreadNotificationCount}
        isDark={isDark}
        mode={shellState.effectiveMode}
        onPartnerInboxAction={onNotificationBellClick}
        onClose={() => setNotificationDrawerOpen(false)}
        onMarkAllRead={() => {
          setUnreadNotificationCount(0);
          showToast('Tüm bildirimler okundu olarak işaretlendi.');
        }}
        onRepeatAppointment={(businessName, serviceName) => {
          setNotificationDrawerOpen(false);
          showToast(`${businessName} • ${serviceName} yeniden seçildi.`);
          onQuickPlusAction?.();
        }}
      />

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
                    {tab.id === 'wallet' && completedBreakdown && !completedBreakdown.paidViaQr && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -top-0.5 -right-1 animate-pulse" />
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
