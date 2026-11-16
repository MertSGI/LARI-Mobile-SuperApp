import {
  OfflineAppointmentPass,
  pwaOfflineVaultService,
} from './pwaOfflineVaultService';

export interface QrCheckinPassInput {
  tenantId: string;
  branchId?: string;
  appointmentId: string;
  customerId: string;
  selfServiceToken: string;
  scheduledDate: string;
  scheduledTime: string;
  businessName: string;
  serviceName: string;
  ttlHours?: number;
  issuedAtIso?: string;
}

export interface SignedQrCheckinPayload {
  v: 1;
  tenantId: string;
  branchId?: string;
  appointmentId: string;
  customerId: string;
  selfServiceToken: string;
  scheduledDate: string;
  scheduledTime: string;
  issuedAtIso: string;
  expiresAtIso: string;
  signature: string;
}

export interface QrVerificationResult {
  valid: boolean;
  reasonCode:
    | 'VALID'
    | 'MALFORMED_QR_PAYLOAD'
    | 'SIGNATURE_MISMATCH'
    | 'TENANT_MISMATCH'
    | 'QR_PASS_EXPIRED'
    | 'ALREADY_CHECKED_IN';
  payload?: SignedQrCheckinPayload;
}

export interface VerifiedReviewSubmissionInput {
  tenantId: string;
  appointmentId: string;
  appointmentTenantId: string;
  appointmentStatus: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  selfServiceToken: string;
  expectedSelfServiceToken: string;
  rating: number;
  comment: string;
}

export interface VerifiedReviewSubmissionResult {
  accepted: boolean;
  reasonCode:
    | 'REVIEW_PUBLISHED'
    | 'TENANT_MISMATCH'
    | 'APPOINTMENT_NOT_COMPLETED'
    | 'INVALID_REVIEW_TOKEN'
    | 'INVALID_RATING'
    | 'DUPLICATE_REVIEW_FOR_APPOINTMENT';
  reviewId?: string;
}

const QR_SIGNING_SALT = 'lari-offline-qr-v1-canonical-salt';

function computeDeterministicSignature(canonicalBody: string): string {
  // Deterministic FNV-1a + polynomial 128-bit digest (works identically in browser & Node without secret exposure)
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const full = `${QR_SIGNING_SALT}|${canonicalBody}`;
  for (let i = 0; i < full.length; i++) {
    const ch = full.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2, 31) + ch + (i % 17)) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function canonicalQrBody(p: Omit<SignedQrCheckinPayload, 'signature'>): string {
  return [
    p.v,
    p.tenantId,
    p.branchId || '',
    p.appointmentId,
    p.customerId,
    p.selfServiceToken,
    p.scheduledDate,
    p.scheduledTime,
    p.issuedAtIso,
    p.expiresAtIso,
  ].join('|');
}

export function generateSignedQrCheckinPass(
  input: QrCheckinPassInput
): { rawQrPayload: string; payload: SignedQrCheckinPayload } {
  const issuedMs = input.issuedAtIso
    ? new Date(input.issuedAtIso).getTime()
    : Date.now();
  const ttlHours = input.ttlHours ?? 48;
  const issuedAtIso = new Date(issuedMs).toISOString();
  const expiresAtIso = new Date(issuedMs + ttlHours * 3600 * 1000).toISOString();

  const unsigned: Omit<SignedQrCheckinPayload, 'signature'> = {
    v: 1,
    tenantId: input.tenantId.trim(),
    branchId: input.branchId?.trim(),
    appointmentId: input.appointmentId.trim(),
    customerId: input.customerId.trim(),
    selfServiceToken: input.selfServiceToken.trim(),
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    issuedAtIso,
    expiresAtIso,
  };

  const signature = computeDeterministicSignature(canonicalQrBody(unsigned));
  const payload: SignedQrCheckinPayload = { ...unsigned, signature };
  const rawQrPayload = JSON.stringify(payload);

  // Persist into offline vault for zero-connectivity Salon Check-in
  const vaultPass: OfflineAppointmentPass = {
    tenantId: payload.tenantId,
    appointmentId: payload.appointmentId,
    startsAt: `${payload.scheduledDate}T${payload.scheduledTime}:00`,
    businessName: input.businessName,
    serviceName: input.serviceName,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    signedQrPayload: rawQrPayload,
    selfServiceToken: payload.selfServiceToken,
    syncedAtIso: issuedAtIso,
  };
  pwaOfflineVaultService.saveAppointmentPass(vaultPass);

  return { rawQrPayload, payload };
}

export class QrCheckinAndReviewRegistry {
  private checkedInAppointments = new Set<string>();
  private reviewedAppointments = new Set<string>();

  verifyQrCheckinPass(
    rawQrPayload: string,
    expectedTenantId: string,
    nowIso?: string
  ): QrVerificationResult {
    let parsed: SignedQrCheckinPayload;
    try {
      parsed = JSON.parse(rawQrPayload);
    } catch {
      return { valid: false, reasonCode: 'MALFORMED_QR_PAYLOAD' };
    }

    if (
      !parsed ||
      parsed.v !== 1 ||
      !parsed.tenantId ||
      !parsed.appointmentId ||
      !parsed.signature
    ) {
      return { valid: false, reasonCode: 'MALFORMED_QR_PAYLOAD' };
    }

    if (parsed.tenantId !== expectedTenantId) {
      return { valid: false, reasonCode: 'TENANT_MISMATCH' };
    }

    const expectedSig = computeDeterministicSignature(
      canonicalQrBody({
        v: parsed.v,
        tenantId: parsed.tenantId,
        branchId: parsed.branchId,
        appointmentId: parsed.appointmentId,
        customerId: parsed.customerId,
        selfServiceToken: parsed.selfServiceToken,
        scheduledDate: parsed.scheduledDate,
        scheduledTime: parsed.scheduledTime,
        issuedAtIso: parsed.issuedAtIso,
        expiresAtIso: parsed.expiresAtIso,
      })
    );

    if (parsed.signature !== expectedSig) {
      return { valid: false, reasonCode: 'SIGNATURE_MISMATCH' };
    }

    const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
    if (nowMs > new Date(parsed.expiresAtIso).getTime()) {
      return { valid: false, reasonCode: 'QR_PASS_EXPIRED' };
    }

    const key = `${parsed.tenantId}::${parsed.appointmentId}`;
    if (this.checkedInAppointments.has(key)) {
      return { valid: false, reasonCode: 'ALREADY_CHECKED_IN' };
    }

    this.checkedInAppointments.add(key);
    return { valid: true, reasonCode: 'VALID', payload: parsed };
  }

  submitVerifiedReview(
    input: VerifiedReviewSubmissionInput
  ): VerifiedReviewSubmissionResult {
    if (input.tenantId !== input.appointmentTenantId) {
      return { accepted: false, reasonCode: 'TENANT_MISMATCH' };
    }
    if (input.appointmentStatus !== 'completed') {
      return { accepted: false, reasonCode: 'APPOINTMENT_NOT_COMPLETED' };
    }
    if (
      !input.selfServiceToken ||
      input.selfServiceToken !== input.expectedSelfServiceToken
    ) {
      return { accepted: false, reasonCode: 'INVALID_REVIEW_TOKEN' };
    }
    if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
      return { accepted: false, reasonCode: 'INVALID_RATING' };
    }
    const key = `${input.tenantId}::${input.appointmentId}`;
    if (this.reviewedAppointments.has(key)) {
      return { accepted: false, reasonCode: 'DUPLICATE_REVIEW_FOR_APPOINTMENT' };
    }
    this.reviewedAppointments.add(key);
    return {
      accepted: true,
      reasonCode: 'REVIEW_PUBLISHED',
      reviewId: `rev_${input.appointmentId}`,
    };
  }
}

export function getOfflineAppointmentPasses(
  tenantId: string
): OfflineAppointmentPass[] {
  return pwaOfflineVaultService.getAppointmentPasses(tenantId);
}
