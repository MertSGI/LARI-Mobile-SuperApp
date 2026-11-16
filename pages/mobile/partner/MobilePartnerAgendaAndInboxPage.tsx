import React, { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock,
  Inbox,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Role } from '../../../types';

export interface PartnerAgendaItem {
  appointmentId: string;
  tenantId: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  scheduledTime: string;
  resourceLabel?: string;
  noShowRiskLevel: 'low' | 'medium' | 'high';
  depositPaid: boolean;
  status: 'confirmed' | 'completed' | 'no_show' | 'cancelled_by_salon';
}

export interface PartnerInboxRequest {
  requestId: string;
  tenantId: string;
  type: 'reschedule' | 'new_booking' | 'waitlist_offer';
  customerName: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PartnerRoleCheckResult {
  allowed: boolean;
  reasonCode?: 'FORBIDDEN_PARTNER_ROLE' | 'TENANT_MISMATCH';
}

const ALLOWED_PARTNER_ROLES: ReadonlySet<string> = new Set([
  'tenant_owner',
  'staff',
  'super_admin',
]);

export function verifyPartnerMobileAccess(
  userRole: Role | 'guest',
  actorTenantId: string,
  targetTenantId: string
): PartnerRoleCheckResult {
  if (!ALLOWED_PARTNER_ROLES.has(userRole)) {
    return { allowed: false, reasonCode: 'FORBIDDEN_PARTNER_ROLE' };
  }
  if (!actorTenantId || actorTenantId !== targetTenantId) {
    return { allowed: false, reasonCode: 'TENANT_MISMATCH' };
  }
  return { allowed: true };
}

export interface MobilePartnerAgendaAndInboxPageProps {
  tenantId: string;
  userRole: Role | 'guest';
  language?: 'tr' | 'en';
}

export const MobilePartnerAgendaAndInboxPage: React.FC<
  MobilePartnerAgendaAndInboxPageProps
> = ({ tenantId, userRole, language = 'tr' }) => {
  const access = verifyPartnerMobileAccess(userRole, tenantId, tenantId);
  const [agenda, setAgenda] = useState<PartnerAgendaItem[]>([
    {
      appointmentId: 'apt-p1',
      tenantId,
      customerName: 'Selin Demir',
      serviceName: 'Soft Balayage & Bakım',
      staffName: 'Merve Yılmaz',
      scheduledTime: '14:00',
      resourceLabel: 'Oda-2 (Boya)',
      noShowRiskLevel: 'low',
      depositPaid: true,
      status: 'confirmed',
    },
    {
      appointmentId: 'apt-p2',
      tenantId,
      customerName: 'Burak Kaya',
      serviceName: 'Lazer Epilasyon (Tam)',
      staffName: 'Dr. Ece Aksoy',
      scheduledTime: '15:30',
      resourceLabel: 'Lazer Cihazı #1',
      noShowRiskLevel: 'high',
      depositPaid: false,
      status: 'confirmed',
    },
  ]);

  const [inbox, setInbox] = useState<PartnerInboxRequest[]>([
    {
      requestId: 'req-101',
      tenantId,
      type: 'reschedule',
      customerName: 'Zeynep Aydın',
      summary: '17 Kasım 13:00 -> 18 Kasım 15:00 saat değişikliği talebi',
      status: 'pending',
    },
  ]);

  if (!access.allowed) {
    return (
      <div
        className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-4 text-xs text-rose-200"
        data-testid="partner-agenda-forbidden"
      >
        Erişim Engellendi: {access.reasonCode}
      </div>
    );
  }

  const handleDecision = (reqId: string, decision: 'approved' | 'rejected') => {
    setInbox((prev) =>
      prev.map((r) => (r.requestId === reqId ? { ...r, status: decision } : r))
    );
  };

  const handleStatusUpdate = (
    aptId: string,
    nextStatus: PartnerAgendaItem['status']
  ) => {
    setAgenda((prev) =>
      prev.map((a) =>
        a.appointmentId === aptId ? { ...a, status: nextStatus } : a
      )
    );
  };

  return (
    <div className="space-y-4" data-testid="mobile-partner-agenda-page">
      {/* Reschedule & Approval Inbox */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Inbox className="w-4 h-4 text-indigo-400" />
            {language === 'tr' ? 'Onay & Erteleme Kutusu' : 'Approval Inbox'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
            {inbox.filter((i) => i.status === 'pending').length} Bekleyen
          </span>
        </div>

        {inbox.map((req) => (
          <div
            key={req.requestId}
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                {req.customerName}
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-300">
                {req.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{req.summary}</p>
            {req.status === 'pending' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision(req.requestId, 'approved')}
                  style={{ minHeight: '40px' }}
                  className="rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1"
                  data-testid={`approve-req-${req.requestId}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Onayla
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(req.requestId, 'rejected')}
                  style={{ minHeight: '40px' }}
                  className="rounded-lg bg-slate-800 text-rose-300 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Reddet
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Daily Agenda with Resource & No-Show Risk Badges */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-blue-400" />
          {language === 'tr'
            ? 'Bugünkü Cep Ajandası & Oda/Cihaz Kilidi'
            : 'Today Mobile Agenda & Resources'}
        </span>

        {agenda.map((item) => (
          <div
            key={item.appointmentId}
            className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {item.scheduledTime} • {item.customerName}
              </span>
              {item.noShowRiskLevel === 'high' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  No-Show Riski
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {item.serviceName} • {item.staffName}
              {item.resourceLabel ? ` • 🔒 ${item.resourceLabel}` : ''}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-emerald-400" />
                Durum: <strong className="text-white">{item.status}</strong>
              </span>
              {item.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(item.appointmentId, 'completed')}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold"
                >
                  Tamamlandı İşaretle
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobilePartnerAgendaAndInboxPage;
