import React from 'react';
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
export const MobilePartnerClinicWorkspacePage: React.FC = () => { const hold = clinicService.getRegulatoryHoldStatus(); return <main data-testid={'mobile-clinic-workspace'}><div>KVKK special category health data: <strong>{hold.kvkkSpecialCategoryHealthDataApproval}</strong></div><h1>Mobile Clinic Workspace</h1><p>Biometric and branch-scoped PHI access. Practitioner sign-off is mandatory.</p></main>; };
export default MobilePartnerClinicWorkspacePage;
