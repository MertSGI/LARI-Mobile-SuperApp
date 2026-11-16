import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarClock,
  Check,
  Clock,
  Coffee,
  Inbox,
  ShieldAlert,
  Sparkles,
  VolumeX,
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
  vipDrinkPreference?: string;
  quietSessionRequested?: boolean;
  lastPassportFormula?: string;
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
      vipDrinkPreference: 'Filtre Kahve (Şekersiz)',
      quietSessionRequested: true,
      lastPassportFormula:
        'Dip 7.1 Küllü Kumral (20 Vol) + Uçlar 9.12 Soğuk Bej Tonlama + Olaplex No.2',
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
      vipDrinkPreference: 'Buzlu Matcha Latte',
      quietSessionRequested: false,
      lastPassportFormula: 'Alexandrite 16 J/cm² • Soğutucu Başlık Seviye 4',
    },
  ]);

  const [expandedChairsideId, setExpandedChairsideId] = useState<string | null>(
    'apt-p1'
  );
  const [formulaInput, setFormulaInput] = useState<string>(
    'Dip 7.1 + Uçlar 10.12 Platin Tonlama + Keratin Mühürleme'
  );
  const [savedPassportMessage, setSavedPassportMessage] = useState<
    string | null
  >(null);

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

  const handleSaveFormulaToCustomerPassport = (aptId: string) => {
    setAgenda((prev) =>
      prev.map((a) =>
        a.appointmentId === aptId
          ? { ...a, lastPassportFormula: formulaInput }
          : a
      )
    );
    setSavedPassportMessage(
      'Yeni işlem formülü müşterinin Bakım Pasaportuna canlı olarak işlendi!'
    );
  };

  return (
    <div className="space-y-4" data-testid="mobile-partner-agenda-page">
      {/* Staff Live Commission & Daily Performance Header */}
      <div
        className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 p-4 flex items-center justify-between gap-3 shadow-lg"
        data-testid="partner-daily-commission-card"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            UZMAN CEP STÜDYOSU • CANLI PRİM SAYACI
          </span>
          <p className="text-lg font-black text-white mt-0.5">
            1.860,00 TRY{' '}
            <span className="text-xs font-semibold text-emerald-300">
              (Bugünkü Net Primin)
            </span>
          </p>
          <p className="text-[11px] text-slate-400">
            6 Randevu • 2 VIP Sessiz Seans • %84 Günlük Hedef
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-black text-white">%84</span>
          <span className="text-[9px] text-indigo-200">Hedef</span>
        </div>
      </div>

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

      {/* Chairside Agenda with Hospitality & Passport Formula Drawer */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-blue-400" />
          {language === 'tr'
            ? 'Koltuk Başı (Chairside) Ajanda & Müşteri Pasaportu'
            : 'Chairside Agenda & Client Passport'}
        </span>

        {agenda.map((item) => {
          const isExpanded = expandedChairsideId === item.appointmentId;
          return (
            <div
              key={item.appointmentId}
              className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
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

              <p className="text-[11px] text-slate-300">
                {item.serviceName} • {item.staffName}
                {item.resourceLabel ? ` • 🔒 ${item.resourceLabel}` : ''}
              </p>

              {/* VIP Hospitality Badges sent from Customer App */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.vipDrinkPreference && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    <Coffee className="w-3 h-3" />
                    İkram: {item.vipDrinkPreference}
                  </span>
                )}
                {item.quietSessionRequested && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    <VolumeX className="w-3 h-3" />
                    🤫 Sessiz Seans Talebi
                  </span>
                )}
              </div>

              {/* Chairside Passport Formula Section */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-fuchsia-300 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Müşteri Pasaportundaki Son Formül:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedChairsideId(
                        isExpanded ? null : item.appointmentId
                      )
                    }
                    className="text-[10px] font-bold text-blue-400 underline"
                  >
                    {isExpanded ? 'Gizle' : 'Formül Güncelle'}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-amber-200">
                  {item.lastPassportFormula}
                </p>

                {isExpanded && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-800">
                    <input
                      type="text"
                      value={formulaInput}
                      onChange={(e) => setFormulaInput(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-[11px] text-white"
                      placeholder="Bugün uygulanan boya/bakım formülünü girin..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveFormulaToCustomerPassport(item.appointmentId)
                      }
                      className="w-full py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
                      data-testid={`save-passport-formula-${item.appointmentId}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Müşterinin Pasaportuna Canlı İşle
                    </button>
                    {savedPassportMessage && (
                      <p className="text-[10px] text-emerald-300">
                        {savedPassportMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-emerald-400" />
                  Durum: <strong className="text-white">{item.status}</strong>
                </span>
                {item.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusUpdate(item.appointmentId, 'completed')
                    }
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold"
                  >
                    Tamamlandı İşaretle
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobilePartnerAgendaAndInboxPage;
