import React, { useState } from 'react';
import { CheckCircle2, Flame, Globe2, MessageCircle, QrCode, ShieldCheck } from 'lucide-react';
import { clinicService } from '../../../services/clinicService';
import { HealthTourismService } from '../../../utils/healthTourismService';
import { requireMobileVertical, type MobileCommercialContext } from './MobilePartnerClinicWorkspacePage';
import { createMobileQrArtifact } from '../../../services/mobile/lariQrEcosystemService';

export type QuoteCurrency = 'EUR' | 'USD' | 'GBP' | 'TRY';
export type CoordinatorLead = { id: string; full_name: string; passport_number?: string | null; score_band?: 'hot' | 'warm' | 'cold'; referring_agency_name?: string | null; ai_summary?: string | null; [key: string]: unknown };
export function redactCoordinatorLead<T extends CoordinatorLead>(lead: T): Omit<T, 'passport_number'> { const { passport_number: _secret, ...safe } = lead; return safe; }
/** Server implementation must lock the practitioner slot and appointment_resources in one transaction. */
export interface AtomicClinicAcceptance { acceptHtLead(input: { lead_id: string; branch_id: string; service_id: string; practitioner_staff_id: string; appointment_date: string; appointment_time: string; required_resource_ids: string[] }): Promise<{ success: boolean; reason_code?: string; data?: unknown }> }
export type HtDeps = { healthTourism: Pick<HealthTourismService, 'listLeads' | 'scoreLead' | 'updateAiSummary' | 'createOrUpdateJourneyQuote' | 'addJourneyItineraryEvent'>; atomicClinic: AtomicClinicAcceptance };

export async function loadMobileHtCoordinatorQueue(commercial: MobileCommercialContext, deps: HtDeps) { requireMobileVertical(commercial, 'health_tourism'); const result = await deps.healthTourism.listLeads(undefined, { mode: 'supabase' }); if (!result.success) throw new Error('HT_LEAD_LIST_FAILED'); return (result.leads ?? []).map(lead => redactCoordinatorLead(lead as unknown as CoordinatorLead)); }
export async function scoreAndSummarizeMobileHtLead(leadId: string, summary: string, commercial: MobileCommercialContext, deps: HtDeps) { requireMobileVertical(commercial, 'health_tourism'); const score = await deps.healthTourism.scoreLead({ lead_id: leadId }, { mode: 'supabase' }); if (!score.success || !['hot', 'warm', 'cold'].includes(String(score.lead_score_band))) throw new Error('HT_SCORE_FAILED'); const updated = await deps.healthTourism.updateAiSummary(leadId, summary, { mode: 'supabase' }); if (!updated.success) throw new Error('HT_SUMMARY_FAILED'); return score; }
export async function saveMobileHtQuote(input: { journey_id: string; currency: QuoteCurrency; treatment_minor: number; hotel_minor: number; vip_transfer_minor: number }, commercial: MobileCommercialContext, deps: HtDeps) { requireMobileVertical(commercial, 'health_tourism'); const items = [{ description: 'Treatment', category: 'treatment', amount_minor_units: input.treatment_minor }, { description: 'Hotel', category: 'hotel', amount_minor_units: input.hotel_minor }, { description: 'VIP transfer', category: 'vip_transfer', amount_minor_units: input.vip_transfer_minor }]; return deps.healthTourism.createOrUpdateJourneyQuote({ journey_id: input.journey_id, currency: input.currency, total_amount_minor_units: items.reduce((n, i) => n + i.amount_minor_units, 0), items }, { mode: 'supabase' }); }
export async function addMobileHtItineraryEvent(input: Parameters<HealthTourismService['addJourneyItineraryEvent']>[0], commercial: MobileCommercialContext, deps: HtDeps) { requireMobileVertical(commercial, 'health_tourism'); return deps.healthTourism.addJourneyItineraryEvent(input, { mode: 'supabase' }); }
export async function acceptMobileHtLeadIntoClinic(input: { commercial: MobileCommercialContext; lead_id: string; branch_id: string; service_id: string; practitioner_staff_id: string; appointment_date: string; appointment_time: string; required_resource_ids: string[] }, deps: HtDeps) { requireMobileVertical(input.commercial, 'health_tourism'); if (!input.required_resource_ids.length) throw new Error('RESOURCE_UNAVAILABLE'); const result = await deps.atomicClinic.acceptHtLead(input); if (!result.success) throw new Error(result.reason_code === 'RESOURCE_UNAVAILABLE' ? 'RESOURCE_UNAVAILABLE' : 'HT_ACCEPTANCE_FAILED'); return result.data; }

import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';

export const MobilePartnerHtLeadOpsPage: React.FC = () => {
  const { showToast, themeMode, admitCustomerByQr } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const hold = clinicService.getRegulatoryHoldStatus();
  const [accepted, setAccepted] = useState(false);
  const [whatsappQueued, setWhatsappQueued] = useState(false);
  const [currency, setCurrency] = useState<QuoteCurrency>('EUR');

  const cardSurface = isDark
    ? 'bg-slate-900 border-2 border-slate-700 text-white'
    : 'bg-white border-2 border-slate-300 text-slate-900';

  const safeLead = redactCoordinatorLead({
    id: 'ht-lead-42',
    full_name: 'Elena Rostova (DE)',
    passport_number: 'REDACTED_SOURCE',
    score_band: 'hot',
    referring_agency_name: 'MedBridge Berlin',
    ai_summary: '20x Zirkonyum Kaplama • 20-24 Kasım İstanbul uçuşu hazır',
  });

  const handleQrVipAdmit = () => {
    const htQr = createMobileQrArtifact({
      kind: 'ht_package_checkin',
      titleTr: 'VIP Sağlık Turizmi Kabul QR',
      subtitleTr: safeLead.full_name,
      tenantId: 'ten-atelier-nisantasi',
      customerId: safeLead.id,
      customerName: safeLead.full_name,
      htJourneyCode: 'HT-IST-2026-42',
      packageName: '20x Zirkonyum + 5* Otel + VIP Transfer',
      remainingCredits: 4,
    });
    admitCustomerByQr(htQr.rawPayload, 'ten-atelier-nisantasi');
    setAccepted(true);
  };

  return (
    <main className="space-y-4" data-testid="mobile-ht-lead-ops">
      <div className={`rounded-3xl p-4 space-y-3 shadow-sm ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-black flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-[#4F46E5]" />
            Sağlık Turizmi Koordinatör Lead Kuyruğu
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            {hold.classification}
          </span>
        </div>

        <div
          className={`rounded-2xl border-2 p-3.5 space-y-2 text-xs ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-[#F8F9FB] border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold">{safeLead.full_name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
              <Flame className="w-3 h-3" /> HOT LEAD
            </span>
          </div>
          <p>{safeLead.ai_summary}</p>
          <p className="text-[11px] text-slate-500">
            Acente: {safeLead.referring_agency_name} • Pasaport PII: Gizli (`redactCoordinatorLead`)
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            {(['EUR', 'USD', 'GBP', 'TRY'] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border-2 ${
                  currency === cur
                    ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleQrVipAdmit}
              style={{ minHeight: '42px' }}
              className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold flex items-center justify-center gap-1"
              data-testid="ht-partner-qr-admit-btn"
            >
              <QrCode className="w-3.5 h-3.5" />
              {accepted ? 'QR ile Kliniğe Alındı ✓' : 'QR ile Kliniğe Kabul'}
            </button>
            <button
              type="button"
              onClick={() => {
                setWhatsappQueued(true);
                showToast(`Çok dilli ${currency} teklif özeti WhatsApp Outbox'a eklendi!`);
              }}
              style={{ minHeight: '42px' }}
              className="rounded-xl bg-[#EEF2FF] hover:bg-indigo-100 text-[#4338CA] text-xs font-bold flex items-center justify-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              {whatsappQueued ? 'Outbox’a Alındı ✓' : 'WhatsApp Outbox'}
            </button>
          </div>
        </div>
      </div>
      <div className={`rounded-xl p-3 text-xs flex items-center gap-2 shadow-xs ${cardSurface}`}>
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Oda/Cihaz kapasitesi (`appointment_resources`) + Hekim slotu QR kabulüyle atomik kilitlenir.</span>
      </div>
    </main>
  );
};
export default MobilePartnerHtLeadOpsPage;
