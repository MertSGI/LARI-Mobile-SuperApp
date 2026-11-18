import React, { useEffect } from 'react';
import {
  BellRing,
  CalendarCheck,
  CheckCheck,
  Clock3,
  Gift,
  Inbox,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';
import { MobileShellMode } from '../../services/mobile/mobileShellPolicyService';

interface NotificationDrawerProps {
  open: boolean;
  unreadCount: number;
  isDark?: boolean;
  isGuestSession?: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onRepeatAppointment?: (businessName: string, serviceName: string) => void;
  mode?: MobileShellMode;
  onPartnerInboxAction?: () => void;
}

const PARTNER_NOTIFICATIONS = [
  {
    id: 'partner-inbox-pending',
    title: 'Bekleyen randevu / erteleme talebi var',
    detail: 'Zeynep Aydın ve Aylin Koç talepleri Onay & Erteleme Kutusu’nda yanıt bekliyor.',
    time: 'Az önce',
    icon: Inbox,
    iconClass: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'partner-daily-target',
    title: 'Günlük ciro hedefi %84’e ulaştı',
    detail: 'Ajanda & Personel raporlarından canlı prim dağılımını inceleyin.',
    time: '1 sa önce',
    icon: ShieldCheck,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  unreadCount,
  isDark = false,
  isGuestSession = false,
  onClose,
  onMarkAllRead,
  onOpenAuth,
  onRepeatAppointment,
  mode = 'b2c_customer',
  onPartnerInboxAction,
}) => {
  const { bookingHistory, activeBooking } = useMobileAppSession();
  const recentAppointments = isGuestSession
    ? []
    : bookingHistory.slice(0, 5).map((item) => ({
        businessName: item.businessName,
        serviceName: item.serviceName,
        date: `${item.scheduledDate} • ${item.scheduledTime}`,
      }));

  const notifications = isGuestSession
    ? []
    : mode === 'b2b_partner'
      ? PARTNER_NOTIFICATIONS
      : bookingHistory.length > 0 || activeBooking
        ? [
            ...(activeBooking
              ? [
                  {
                    id: `apt-upcoming-${activeBooking.appointmentId}`,
                    title: `Yaklaşan randevu: ${activeBooking.scheduledDate} ${activeBooking.scheduledTime}`,
                    detail: `${activeBooking.businessName} • ${activeBooking.serviceName}`,
                    time: 'Aktif',
                    icon: Clock3,
                    iconClass: 'bg-amber-100 text-amber-700',
                  },
                ]
              : []),
            ...(bookingHistory[0]
              ? [
                  {
                    id: `apt-record-${bookingHistory[0].appointmentId}`,
                    title: 'Randevu kaydınız senkronize',
                    detail: `${bookingHistory[0].businessName} • ${bookingHistory[0].serviceName}`,
                    time: 'Güncel',
                    icon: ShieldCheck,
                    iconClass: 'bg-emerald-100 text-emerald-700',
                  },
                ]
              : []),
            {
              id: 'campaign',
              title: 'LARİ Puan & Sadakat Avantajları',
              detail: 'Randevularınızdan kazandığınız puanları Cüzdanım sekmesinden kullanabilirsiniz.',
              time: 'Bugün',
              icon: Gift,
              iconClass: 'bg-fuchsia-100 text-fuchsia-700',
            },
          ]
        : [
            {
              id: 'welcome-lari',
              title: 'LARİ’ye Hoş Geldiniz!',
              detail: 'Yakınınızdaki doğrulanmış işletmelerden 3 saniyede ilk randevunuzu oluşturabilirsiniz.',
              time: 'Yeni',
              icon: ShieldCheck,
              iconClass: 'bg-emerald-100 text-emerald-700',
            },
          ];
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const surface = isDark
    ? 'bg-slate-950 text-white border-slate-700'
    : 'bg-[#F8FAFC] text-slate-950 border-slate-200';
  const cardSurface = isDark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-white border-slate-200';

  const handleAppointmentAction = (businessName: string, serviceName: string) => {
    if (mode === 'b2b_partner') {
      onClose();
      onPartnerInboxAction?.();
      return;
    }
    onRepeatAppointment?.(businessName, serviceName);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex justify-end bg-slate-950/50 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
      data-testid="notification-drawer-backdrop"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-drawer-title"
        className={`h-full w-[min(100%,28rem)] overflow-y-auto border-l-2 shadow-2xl ${surface}`}
        onClick={(event) => event.stopPropagation()}
        data-testid="notification-drawer"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-inherit px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="notification-drawer-title" className="flex items-center gap-2 text-lg font-black">
                <BellRing className="h-5 w-5 text-[#4F46E5]" />
                Bildirim Merkezi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} okunmamış bildiriminiz var` : 'Tüm bildirimler okundu'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-10 w-10 items-center justify-center rounded-full border ${cardSurface}`}
              aria-label="Bildirim merkezini kapat"
              data-testid="notification-drawer-close-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-4 pb-28 pt-5">
          {isGuestSession ? (
            <div
              className={`rounded-3xl border-2 p-5 text-center space-y-3 ${cardSurface}`}
              data-testid="notification-guest-empty"
            >
              <BellRing className="mx-auto h-8 w-8 text-[#4F46E5]" />
              <p className="text-sm font-black">Misafir Modundasınız</p>
              <p className="text-xs leading-relaxed text-slate-500">
                Kişisel randevu hatırlatmalarınızı, onay durumlarınızı ve size özel kampanyaları görmek için giriş yapın veya üye olun.
              </p>
              {onOpenAuth && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="min-h-10 rounded-xl bg-[#4F46E5] px-3 text-xs font-black text-white"
                  >
                    Giriş Yap
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="min-h-10 rounded-xl border border-slate-300 px-3 text-xs font-black"
                  >
                    Üye Ol
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {mode === 'b2b_partner' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPartnerInboxAction?.();
                  }}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl border-2 border-indigo-300 bg-[#EEF2FF] px-4 text-left text-sm font-black text-[#312E81] dark:border-indigo-500/60 dark:bg-indigo-950/50 dark:text-indigo-100"
                  data-testid="notification-partner-inbox-cta"
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="h-5 w-5" />
                    Onay & Erteleme Kutusuna Git
                  </span>
                  <span className="rounded-full bg-[#4F46E5] px-2 py-1 text-[10px] text-white">
                    Hızlı Aç
                  </span>
                </button>
              )}

              {mode !== 'b2b_partner' && recentAppointments.length > 0 && (
                <section className="space-y-3" aria-labelledby="recent-appointments-title">
                  <div className="flex items-center justify-between">
                    <h3 id="recent-appointments-title" className="text-sm font-black">
                      Son Randevularım / Tekrarla
                    </h3>
                    <CalendarCheck className="h-4 w-4 text-[#4F46E5]" />
                  </div>
                  <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
                    {recentAppointments.map((appointment, idx) => (
                      <article
                        key={`${appointment.businessName}-${appointment.serviceName}-${idx}`}
                        className={`w-64 shrink-0 snap-start rounded-2xl border-2 p-4 shadow-sm ${cardSurface}`}
                      >
                        <p className="truncate text-sm font-black">{appointment.businessName}</p>
                        <p className="mt-1 min-h-9 text-xs font-semibold text-slate-500">
                          {appointment.serviceName}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">{appointment.date}</p>
                        <button
                          type="button"
                          onClick={() =>
                            handleAppointmentAction(
                              appointment.businessName,
                              appointment.serviceName
                            )
                          }
                          className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] px-3 text-xs font-black text-white"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Tekrarla
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3" aria-labelledby="notifications-title">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="notifications-title" className="text-sm font-black">
                    Güncel Bildirimler
                  </h3>
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    disabled={unreadCount === 0}
                    className="flex items-center gap-1 text-xs font-black text-[#4F46E5] disabled:cursor-default disabled:text-slate-400"
                    data-testid="notification-mark-all-read-btn"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Tümünü Okundu İşaretle
                  </button>
                </div>

                <div className="space-y-2.5">
                  {notifications.map((notification, index) => {
                    const Icon = notification.icon;
                    const isUnread = index < unreadCount;
                    return (
                      <article
                        key={notification.id}
                        className={`relative flex gap-3 rounded-2xl border-2 p-3.5 ${cardSurface}`}
                      >
                        {isUnread && (
                          <span
                            className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500"
                            aria-label="Okunmamış"
                          />
                        )}
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${notification.iconClass}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-black">{notification.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {notification.detail}
                          </p>
                          <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                            {notification.time}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default NotificationDrawer;
