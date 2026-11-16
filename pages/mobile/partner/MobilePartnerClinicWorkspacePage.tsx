import React, { useState } from 'react';
import {
  CheckCircle2,
  FileSignature,
  Fingerprint,
  Lock,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { clinicService } from '../../../services/clinicService';
import { canManageClinicPatientProfile, canWriteClinicEncounterNote } from '../../../services/clinicUiPolicy';
import { requireBiometricReauth } from '../../../services/mobile/nativeBridgeService';
import type { ClinicPatientHistory, ClinicStaffContext } from '../../../types/clinic';

export type MobileCommercialContext = { eligible: boolean; subscription_status?: string; grace_until?: string | null; verticals: { clinic_enabled: boolean; health_tourism_enabled: boolean } };
export class MobileClinicAccessError extends Error { constructor(public readonly code: 'BIOMETRIC_REAUTH_REQUIRED' | 'COMMERCIAL_ELIGIBILITY_REQUIRED' | 'FORBIDDEN_BRANCH_SCOPE' | 'CLINIC_OPERATION_FAILED' | 'PRACTITIONER_SIGN_OFF_REQUIRED') { super(code); } }
export function requireMobileVertical(c: MobileCommercialContext, v: 'clinic' | 'health_tourism', now = new Date()): void { const grace = c.grace_until != null && new Date(c.grace_until) > now; const blocked = c.subscription_status === 'expired' || (c.subscription_status === 'past_due' && !grace); if (!c.eligible || blocked || (v === 'clinic' ? !c.verticals.clinic_enabled : !c.verticals.health_tourism_enabled)) throw new MobileClinicAccessError('COMMERCIAL_ELIGIBILITY_REQUIRED'); }
type ClinicApi = Pick<typeof clinicService, 'getClinicPatientProfile' | 'getClinicPatientHistory' | 'upsertClinicPatientProfile' | 'startClinicEncounter' | 'saveClinicEncounterNote' | 'completeClinicEncounter'>;
export type MobileClinicDeps = { clinic?: ClinicApi; biometric?: typeof requireBiometricReauth };

export async function loadMobileClinicPatientCard(input: { tenantId: string; staffOrUserId: string; biometricToken?: string; commercial: MobileCommercialContext; staff: ClinicStaffContext; customerId: string; patientBranchIds: string[]; upsert?: Parameters<typeof clinicService.upsertClinicPatientProfile>[0] }, deps: MobileClinicDeps = {}) {
  requireMobileVertical(input.commercial, 'clinic');
  const biometric = await (deps.biometric ?? requireBiometricReauth)({ tenantId: input.tenantId, staffOrUserId: input.staffOrUserId, scope: 'clinic_phi_access', pinOrBiometricToken: input.biometricToken });
  if (!biometric.verified) throw new MobileClinicAccessError('BIOMETRIC_REAUTH_REQUIRED');
  const permitted = new Set(input.staff.permitted_branch_ids);
  if (!input.patientBranchIds.some(id => permitted.has(id))) throw new MobileClinicAccessError('FORBIDDEN_BRANCH_SCOPE');
  const api = deps.clinic ?? clinicService;
  if (input.upsert) { if (!canManageClinicPatientProfile(input.staff)) throw new MobileClinicAccessError('FORBIDDEN_BRANCH_SCOPE'); const w = await api.upsertClinicPatientProfile(input.upsert); if (!w.success) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED'); }
  const [profile, history] = await Promise.all([api.getClinicPatientProfile(input.customerId), api.getClinicPatientHistory(input.customerId)]);
  if (!profile.success || !history.success) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  const filtered: ClinicPatientHistory = { ...history.data!, encounters: history.data!.encounters.filter(e => !!e.branch_id && permitted.has(e.branch_id)) };
  return { biometric, profile: profile.data!, history: filtered };
}
export function createDeterministicClinicalDraft(value: string) { const brief = value.trim(); if (!brief) throw new Error('CLINICAL_BRIEF_REQUIRED'); return { subjective: brief, objective: 'Practitioner examination required.', assessment: 'Draft assessment - practitioner review required.', plan: 'Draft plan - practitioner review and sign-off required.', note_status: 'draft' as const, requiresPractitionerSignOff: true }; }
export async function executeMobileClinicalEncounterFlow(input: { appointmentId: string; reasonForVisit?: string; briefOrVoiceTranscript: string; staff: ClinicStaffContext; practitionerSignedOff: boolean }, deps: Pick<MobileClinicDeps, 'clinic'> = {}) {
  if (!input.practitionerSignedOff) throw new MobileClinicAccessError('PRACTITIONER_SIGN_OFF_REQUIRED'); const api = deps.clinic ?? clinicService;
  const started = await api.startClinicEncounter({ appointment_id: input.appointmentId, reason_for_visit: input.reasonForVisit }); if (!started.success) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  if (!canWriteClinicEncounterNote(input.staff, 'open', input.staff.staff_id)) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED'); const draft = createDeterministicClinicalDraft(input.briefOrVoiceTranscript);
  const note = await api.saveClinicEncounterNote({ encounter_id: started.data!.encounter_id, subjective: draft.subjective, objective: draft.objective, assessment: draft.assessment, plan: draft.plan, note_status: 'final' }); if (!note.success) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  const completed = await api.completeClinicEncounter({ encounter_id: started.data!.encounter_id }); if (!completed.success) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED'); return { encounter: started.data!, draft, note: note.data!, completion: completed.data! };
}

export const MobilePartnerClinicWorkspacePage: React.FC = () => {
  const hold = clinicService.getRegulatoryHoldStatus();
  const [phiUnlocked, setPhiUnlocked] = useState(false);
  const [clinicalBrief, setClinicalBrief] = useState('Sağ alt çene 46 no diş hassasiyeti, radyografi değerlendirmesi.');
  const [draftNote, setDraftNote] = useState<ReturnType<typeof createDeterministicClinicalDraft> | null>(null);
  const [signedFinal, setSignedFinal] = useState(false);

  const handleBiometricUnlock = async () => {
    const res = await requireBiometricReauth({
      tenantId: 'ten-clinic-1',
      staffOrUserId: 'doc-1',
      scope: 'clinic_phi_access',
      pinOrBiometricToken: 'mobile-preview-biometric-verified',
    });
    if (res.verified) {
      setPhiUnlocked(true);
    }
  };

  const handleGenerateDraft = () => {
    if (!clinicalBrief.trim()) return;
    setDraftNote(createDeterministicClinicalDraft(clinicalBrief));
    setSignedFinal(false);
  };

  return (
    <main className="space-y-4" data-testid="mobile-clinic-workspace">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
            Klinik Hekim Muayene & PHI (Şube İzole)
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {hold.kvkkSpecialCategoryHealthDataApproval}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Yalnız yetkili şubedeki (`staff_branches`) hasta PHI kayıtları görüntülenir.
        </p>

        {!phiUnlocked ? (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            style={{ minHeight: '46px' }}
            className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2"
            data-testid="clinic-phi-unlock-btn"
          >
            <Fingerprint className="w-4 h-4" />
            FaceID / Biyometrik ile PHI Hasta Kartını Aç
          </button>
        ) : (
          <div className="rounded-xl bg-slate-950 border border-emerald-500/30 p-3 space-y-1.5 text-xs" data-testid="clinic-phi-card">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span>Hasta: Ayşe K. (Şube: Nişantaşı Merkez)</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <p className="text-slate-300">Kan Grubu: A Rh+ • Alerji: Penisilin</p>
            <p className="text-slate-400 text-[11px]">Kronik Durum: Yok • Son Muayene: 12.10.2026</p>
          </div>
        )}
      </div>

      {/* Encounter & AI Draft Note */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <FileSignature className="w-4 h-4 text-blue-400" />
          Mobil Encounter & Klinik Not Taslağı
        </span>
        <textarea
          value={clinicalBrief}
          onChange={(e) => setClinicalBrief(e.target.value)}
          rows={2}
          className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleGenerateDraft}
            style={{ minHeight: '42px' }}
            className="rounded-xl bg-blue-600 text-white text-xs font-bold"
          >
            SOAP Taslağı Üret
          </button>
          <button
            type="button"
            disabled={!draftNote}
            onClick={() => setSignedFinal(true)}
            style={{ minHeight: '42px' }}
            className="rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {signedFinal ? 'Hekim İmzaladı (Final)' : 'İmzala & Tamamla'}
          </button>
        </div>
        {draftNote && (
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-[11px] text-slate-300 space-y-1">
            <p><strong>S:</strong> {draftNote.subjective}</p>
            <p><strong>O:</strong> {draftNote.objective}</p>
            <p><strong>P:</strong> {draftNote.plan}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2 text-[11px] text-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>KVKK Özel Nitelikli Sağlık Verisi Onayı: {hold.kvkkSpecialCategoryHealthDataApproval}</span>
      </div>
    </main>
  );
};
export default MobilePartnerClinicWorkspacePage;
