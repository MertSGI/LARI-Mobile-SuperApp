import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eraser,
  FileSignature,
  Fingerprint,
  Lock,
  PenTool,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { clinicService } from '../../../services/clinicService';
import {
  canManageClinicPatientProfile,
  canWriteClinicEncounterNote,
} from '../../../services/clinicUiPolicy';
import { requireBiometricReauth } from '../../../services/mobile/nativeBridgeService';
import type { ClinicPatientHistory, ClinicStaffContext } from '../../../types/clinic';

export type MobileCommercialContext = {
  eligible: boolean;
  subscription_status?: string;
  grace_until?: string | null;
  verticals: { clinic_enabled: boolean; health_tourism_enabled: boolean };
};
export class MobileClinicAccessError extends Error {
  constructor(
    public readonly code:
      | 'BIOMETRIC_REAUTH_REQUIRED'
      | 'COMMERCIAL_ELIGIBILITY_REQUIRED'
      | 'FORBIDDEN_BRANCH_SCOPE'
      | 'CLINIC_OPERATION_FAILED'
      | 'PRACTITIONER_SIGN_OFF_REQUIRED'
  ) {
    super(code);
  }
}
export function requireMobileVertical(
  c: MobileCommercialContext,
  v: 'clinic' | 'health_tourism',
  now = new Date()
): void {
  const grace = c.grace_until != null && new Date(c.grace_until) > now;
  const blocked =
    c.subscription_status === 'expired' ||
    (c.subscription_status === 'past_due' && !grace);
  if (
    !c.eligible ||
    blocked ||
    (v === 'clinic'
      ? !c.verticals.clinic_enabled
      : !c.verticals.health_tourism_enabled)
  )
    throw new MobileClinicAccessError('COMMERCIAL_ELIGIBILITY_REQUIRED');
}
type ClinicApi = Pick<
  typeof clinicService,
  | 'getClinicPatientProfile'
  | 'getClinicPatientHistory'
  | 'upsertClinicPatientProfile'
  | 'startClinicEncounter'
  | 'saveClinicEncounterNote'
  | 'completeClinicEncounter'
>;
export type MobileClinicDeps = {
  clinic?: ClinicApi;
  biometric?: typeof requireBiometricReauth;
};

export async function loadMobileClinicPatientCard(
  input: {
    tenantId: string;
    staffOrUserId: string;
    biometricToken?: string;
    commercial: MobileCommercialContext;
    staff: ClinicStaffContext;
    customerId: string;
    patientBranchIds: string[];
    upsert?: Parameters<typeof clinicService.upsertClinicPatientProfile>[0];
  },
  deps: MobileClinicDeps = {}
) {
  requireMobileVertical(input.commercial, 'clinic');
  const biometric = await (deps.biometric ?? requireBiometricReauth)({
    tenantId: input.tenantId,
    staffOrUserId: input.staffOrUserId,
    scope: 'clinic_phi_access',
    pinOrBiometricToken: input.biometricToken,
  });
  if (!biometric.verified)
    throw new MobileClinicAccessError('BIOMETRIC_REAUTH_REQUIRED');
  const permitted = new Set(input.staff.permitted_branch_ids);
  if (!input.patientBranchIds.some((id) => permitted.has(id)))
    throw new MobileClinicAccessError('FORBIDDEN_BRANCH_SCOPE');
  const api = deps.clinic ?? clinicService;
  if (input.upsert) {
    if (!canManageClinicPatientProfile(input.staff))
      throw new MobileClinicAccessError('FORBIDDEN_BRANCH_SCOPE');
    const w = await api.upsertClinicPatientProfile(input.upsert);
    if (!w.success) throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  }
  const [profile, history] = await Promise.all([
    api.getClinicPatientProfile(input.customerId),
    api.getClinicPatientHistory(input.customerId),
  ]);
  if (!profile.success || !history.success)
    throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  const filtered: ClinicPatientHistory = {
    ...history.data!,
    encounters: history.data!.encounters.filter(
      (e) => !!e.branch_id && permitted.has(e.branch_id)
    ),
  };
  return { biometric, profile: profile.data!, history: filtered };
}

export function createDeterministicClinicalDraft(value: string) {
  const brief = value.trim();
  if (!brief) throw new Error('CLINICAL_BRIEF_REQUIRED');
  return {
    subjective: brief,
    objective: 'Practitioner examination required.',
    assessment: 'Draft assessment - practitioner review required.',
    plan: 'Draft plan - practitioner review and sign-off required.',
    note_status: 'draft' as const,
    requiresPractitionerSignOff: true,
  };
}

export async function executeMobileClinicalEncounterFlow(
  input: {
    appointmentId: string;
    reasonForVisit?: string;
    briefOrVoiceTranscript: string;
    staff: ClinicStaffContext;
    practitionerSignedOff: boolean;
  },
  deps: Pick<MobileClinicDeps, 'clinic'> = {}
) {
  if (!input.practitionerSignedOff)
    throw new MobileClinicAccessError('PRACTITIONER_SIGN_OFF_REQUIRED');
  const api = deps.clinic ?? clinicService;
  const started = await api.startClinicEncounter({
    appointment_id: input.appointmentId,
    reason_for_visit: input.reasonForVisit,
  });
  if (!started.success)
    throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  if (!canWriteClinicEncounterNote(input.staff, 'open', input.staff.staff_id))
    throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  const draft = createDeterministicClinicalDraft(input.briefOrVoiceTranscript);
  const note = await api.saveClinicEncounterNote({
    encounter_id: started.data!.encounter_id,
    subjective: draft.subjective,
    objective: draft.objective,
    assessment: draft.assessment,
    plan: draft.plan,
    note_status: 'final',
  });
  if (!note.success)
    throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  const completed = await api.completeClinicEncounter({
    encounter_id: started.data!.encounter_id,
  });
  if (!completed.success)
    throw new MobileClinicAccessError('CLINIC_OPERATION_FAILED');
  return {
    encounter: started.data!,
    draft,
    note: note.data!,
    completion: completed.data!,
  };
}

export const MobilePartnerClinicWorkspacePage: React.FC = () => {
  const hold = clinicService.getRegulatoryHoldStatus();
  const [phiUnlocked, setPhiUnlocked] = useState(false);
  const [clinicalBrief, setClinicalBrief] = useState(
    'Sağ alt çene 46 no diş hassasiyeti ve üst ark OM1 lamina simetri değerlendirmesi.'
  );
  const [draftNote, setDraftNote] = useState<
    ReturnType<typeof createDeterministicClinicalDraft> | null
  >(null);
  const [signedFinal, setSignedFinal] = useState(false);

  // Interactive Chairside Touch Drawing Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [markerColor, setMarkerColor] = useState<string>('#f43f5e');
  const [templateZone, setTemplateZone] = useState<
    'dental_arch' | 'facial_dermal' | 'hairline_graft'
  >('dental_arch');
  const [strokeCount, setStrokeCount] = useState<number>(0);

  const drawTemplateGuide = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    if (templateZone === 'dental_arch') {
      ctx.beginPath();
      ctx.arc(160, 85, 65, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(160, 75, 65, 1.15 * Math.PI, 1.85 * Math.PI, false);
      ctx.stroke();
    } else if (templateZone === 'facial_dermal') {
      ctx.beginPath();
      ctx.ellipse(160, 80, 52, 68, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(160, 95, 60, 1.1 * Math.PI, 1.9 * Math.PI, false);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  useEffect(() => {
    drawTemplateGuide();
  }, [templateZone]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    ctx.strokeStyle = markerColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStrokeCount((c) => c + 1);
    }
  };

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
    const markedSuffix =
      strokeCount > 0
        ? ` [Konsültasyon Kanvası: ${templateZone} üzerinde ${strokeCount} işaretleme eklendi]`
        : '';
    setDraftNote(
      createDeterministicClinicalDraft(`${clinicalBrief}${markedSuffix}`)
    );
    setSignedFinal(false);
  };

  return (
    <main className="space-y-4 text-[#111827]" data-testid="mobile-clinic-workspace">
      <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-[#5B5FEF]" />
            Klinik Hekim Muayene & PHI (Şube İzole)
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            {hold.kvkkSpecialCategoryHealthDataApproval}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Yalnız yetkili şubedeki (`staff_branches`) hasta PHI kayıtları görüntülenir.
        </p>

        {!phiUnlocked ? (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            style={{ minHeight: '46px' }}
            className="w-full rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            data-testid="clinic-phi-unlock-btn"
          >
            <Fingerprint className="w-4 h-4" />
            FaceID / Biyometrik ile PHI Hasta Kartını Aç
          </button>
        ) : (
          <div
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 space-y-1.5 text-xs"
            data-testid="clinic-phi-card"
          >
            <div className="flex items-center justify-between text-emerald-800 font-bold">
              <span>Hasta: Ayşe K. (Şube: Nişantaşı Merkez)</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <p className="text-slate-700">
              Kan Grubu: A Rh+ • Alerji: Penisilin
            </p>
            <p className="text-slate-600 text-[11px]">
              Kronik Durum: Yok • Son Muayene: 12.10.2026
            </p>
          </div>
        )}
      </div>

      {/* App-Exclusive Chairside Touch Consultation & Marking Canvas */}
      <div
        className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
        data-testid="clinic-touch-drawing-studio"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#111827] flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-[#5B5FEF]" />
            Dokunmatik Konsültasyon & İşaretleme Kanvası
          </span>
          <span className="text-[10px] text-[#5B5FEF] font-bold">
            Parmakla Çiz ({strokeCount} çizim)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'dental_arch', label: 'Diş & Gülüş Arkı' },
              { id: 'facial_dermal', label: 'Yüz & Dermal' },
              { id: 'hairline_graft', label: 'Saç Ekimi Hattı' },
            ] as const
          ).map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => {
                setTemplateZone(z.id);
                setStrokeCount(0);
              }}
              className={`py-1.5 rounded-lg text-[10px] font-bold border ${
                templateZone === z.id
                  ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                  : 'bg-[#F8F9FB] text-slate-600 border-slate-200'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-2 flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full max-w-[320px] h-[160px] rounded-xl bg-white touch-none cursor-crosshair border border-slate-200"
            data-testid="clinic-consultation-canvas"
          />
          <div className="w-full flex items-center justify-between pt-2 px-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { color: '#f43f5e', label: 'İşlem/Enjeksiyon' },
                { color: '#5B5FEF', label: 'Simetri Hattı' },
                { color: '#d97706', label: 'Hassas Bölge' },
              ].map((m) => (
                <button
                  key={m.color}
                  type="button"
                  onClick={() => setMarkerColor(m.color)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                    markerColor === m.color
                      ? 'bg-[#EEF0FF] text-[#4338CA] border-[#5B5FEF]'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                drawTemplateGuide();
                setStrokeCount(0);
              }}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
            >
              <Eraser className="w-3 h-3" />
              Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Encounter & AI Draft Note */}
      <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm">
        <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
          <FileSignature className="w-4 h-4 text-[#5B5FEF]" />
          Mobil Encounter & Klinik Not Taslağı
        </span>
        <textarea
          value={clinicalBrief}
          onChange={(e) => setClinicalBrief(e.target.value)}
          rows={2}
          className="w-full rounded-xl bg-[#F8F9FB] border border-slate-200 p-2.5 text-xs text-[#111827]"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleGenerateDraft}
            style={{ minHeight: '42px' }}
            className="rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold"
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
          <div className="rounded-xl bg-[#F8F9FB] border border-slate-200 p-2.5 text-[11px] text-slate-700 space-y-1">
            <p>
              <strong>S:</strong> {draftNote.subjective}
            </p>
            <p>
              <strong>O:</strong> {draftNote.objective}
            </p>
            <p>
              <strong>P:</strong> {draftNote.plan}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-[11px] text-amber-800">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          KVKK Özel Nitelikli Sağlık Verisi Onayı:{' '}
          {hold.kvkkSpecialCategoryHealthDataApproval}
        </span>
      </div>
    </main>
  );
};
export default MobilePartnerClinicWorkspacePage;
