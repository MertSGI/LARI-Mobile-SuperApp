import assert from 'node:assert/strict';
import {
  generateSignedQrCheckinPass,
  getOfflineAppointmentPasses,
  QrCheckinAndReviewRegistry,
} from '../services/mobile/qrCheckinService';

function run() {
  const registry = new QrCheckinAndReviewRegistry();

  // 1. Signed QR pass generation & offline vault persistence
  const { rawQrPayload, payload } = generateSignedQrCheckinPass({
    tenantId: 'ten-salon-a',
    branchId: 'br-1',
    appointmentId: 'apt-501',
    customerId: 'cust-1',
    selfServiceToken: 'tok-501',
    scheduledDate: '2026-11-18',
    scheduledTime: '14:00',
    businessName: 'Atelier Nişantaşı',
    serviceName: 'Balayage',
    ttlHours: 24,
    issuedAtIso: '2026-11-18T10:00:00Z',
  });
  const offlinePasses = getOfflineAppointmentPasses('ten-salon-a');
  assert.equal(offlinePasses.length >= 1, true);
  assert.equal(getOfflineAppointmentPasses('ten-salon-b').length, 0);

  // 2. Cross-tenant QR scan rejected
  const crossTenant = registry.verifyQrCheckinPass(
    rawQrPayload,
    'ten-salon-b',
    '2026-11-18T13:50:00Z'
  );
  assert.equal(crossTenant.valid, false);
  assert.equal(crossTenant.reasonCode, 'TENANT_MISMATCH');

  // 3. Tampered QR payload rejected
  const tampered = JSON.stringify({ ...payload, appointmentId: 'apt-hacked' });
  const sigFail = registry.verifyQrCheckinPass(
    tampered,
    'ten-salon-a',
    '2026-11-18T13:50:00Z'
  );
  assert.equal(sigFail.valid, false);
  assert.equal(sigFail.reasonCode, 'SIGNATURE_MISMATCH');

  // 4. Expired QR rejected
  const expired = registry.verifyQrCheckinPass(
    rawQrPayload,
    'ten-salon-a',
    '2026-11-20T12:00:00Z'
  );
  assert.equal(expired.valid, false);
  assert.equal(expired.reasonCode, 'QR_PASS_EXPIRED');

  // 5. Valid scan succeeds once, replay is blocked
  const firstScan = registry.verifyQrCheckinPass(
    rawQrPayload,
    'ten-salon-a',
    '2026-11-18T13:55:00Z'
  );
  assert.equal(firstScan.valid, true);
  assert.equal(firstScan.reasonCode, 'VALID');

  const replayScan = registry.verifyQrCheckinPass(
    rawQrPayload,
    'ten-salon-a',
    '2026-11-18T13:56:00Z'
  );
  assert.equal(replayScan.valid, false);
  assert.equal(replayScan.reasonCode, 'ALREADY_CHECKED_IN');

  // 6. Verified Review Gate (fail-closed on uncompleted, cross-tenant, wrong token, duplicate)
  const uncompleted = registry.submitVerifiedReview({
    tenantId: 'ten-salon-a',
    appointmentId: 'apt-501',
    appointmentTenantId: 'ten-salon-a',
    appointmentStatus: 'confirmed',
    selfServiceToken: 'tok-501',
    expectedSelfServiceToken: 'tok-501',
    rating: 5,
    comment: 'Harika',
  });
  assert.equal(uncompleted.accepted, false);
  assert.equal(uncompleted.reasonCode, 'APPOINTMENT_NOT_COMPLETED');

  const validReview = registry.submitVerifiedReview({
    tenantId: 'ten-salon-a',
    appointmentId: 'apt-501',
    appointmentTenantId: 'ten-salon-a',
    appointmentStatus: 'completed',
    selfServiceToken: 'tok-501',
    expectedSelfServiceToken: 'tok-501',
    rating: 5,
    comment: 'Mükemmel hizmet!',
  });
  assert.equal(validReview.accepted, true);

  const dupReview = registry.submitVerifiedReview({
    tenantId: 'ten-salon-a',
    appointmentId: 'apt-501',
    appointmentTenantId: 'ten-salon-a',
    appointmentStatus: 'completed',
    selfServiceToken: 'tok-501',
    expectedSelfServiceToken: 'tok-501',
    rating: 5,
    comment: 'Tekrar',
  });
  assert.equal(dupReview.accepted, false);
  assert.equal(dupReview.reasonCode, 'DUPLICATE_REVIEW_FOR_APPOINTMENT');

  console.log('PASS: verify-mobile-m5-wallet-loyalty-reviews (all assertions)');
}

run();
