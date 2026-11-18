import assert from 'node:assert/strict';
import {
  buildQrMatrix25,
  createMobileQrArtifact,
  verifyMobileQrTokenOrPayload,
} from '../services/mobile/lariQrEcosystemService';
import {
  buildItemizedCheckoutBreakdown,
  INITIAL_PARTNER_CATALOG,
  matchSpokenUtteranceToCatalog,
} from '../services/mobile/voiceCatalogMatcherService';

function run() {
  // 1. Multi-purpose QR issuance & cryptographic-style signature validation
  const htQr = createMobileQrArtifact({
    kind: 'ht_package_checkin',
    titleTr: 'Sağlık Turizmi VIP Kabul QR',
    subtitleTr: 'Elena Rostova (DE)',
    tenantId: 'ten-atelier-nisantasi',
    customerId: 'cust-ht-42',
    customerName: 'Elena Rostova',
    htJourneyCode: 'HT-IST-2026-42',
    packageName: 'VIP Zirkonyum + Otel',
    remainingCredits: 4,
  });

  assert.equal(htQr.usageScenariosTr.length, 3);
  const decodedOk = verifyMobileQrTokenOrPayload(htQr.rawPayload, 'ten-atelier-nisantasi');
  assert.equal(decodedOk.valid, true);
  assert.equal(decodedOk.reasonCode, 'ADMITTED_OK');
  assert.equal(decodedOk.artifact?.htJourneyCode, 'HT-IST-2026-42');

  const wrongTenant = verifyMobileQrTokenOrPayload(htQr.rawPayload, 'ten-other');
  assert.equal(wrongTenant.valid, false);
  assert.equal(wrongTenant.reasonCode, 'TENANT_MISMATCH');

  const tampered = htQr.rawPayload.replace('HT-IST-2026-42', 'HT-FAKE-999');
  assert.equal(verifyMobileQrTokenOrPayload(tampered, 'ten-atelier-nisantasi').valid, false);

  const rawTokenInjected = JSON.stringify({
    ...JSON.parse(htQr.rawPayload),
    selfServiceToken: 'must-never-enter-a-qr-payload',
  });
  assert.equal(
    verifyMobileQrTokenOrPayload(rawTokenInjected, 'ten-atelier-nisantasi').valid,
    false
  );

  const qrMatrix = buildQrMatrix25(htQr.rawPayload);
  assert.equal(qrMatrix.length, 25);
  assert.equal(qrMatrix[0][0], true);

  // 2. Voice-to-Catalog matching across multiple industries & quantities
  const beautyVoice = matchSpokenUtteranceToCatalog(
    'Soft balayage, iki adet serum ve keratin bakım uygulandı',
    INITIAL_PARTNER_CATALOG,
    { packageActive: true }
  );
  assert.ok(beautyVoice.matchedLines.length >= 3);
  const serumLine = beautyVoice.matchedLines.find((m) => m.catalogItem.id === 'cat-serum-urun');
  assert.equal(serumLine?.quantity, 2);
  assert.equal(serumLine?.coveredByPackage, false);

  const keratinLine = beautyVoice.matchedLines.find((m) => m.catalogItem.id === 'cat-keratin-bakim');
  assert.equal(keratinLine?.coveredByPackage, true);

  const clinicVoice = matchSpokenUtteranceToCatalog(
    '2 adet zirkonyum kron ve panoramik röntgen çekildi',
    INITIAL_PARTNER_CATALOG,
    { packageActive: false }
  );
  const zirkLine = clinicVoice.matchedLines.find((m) => m.catalogItem.id === 'cat-zirkonyum-kron');
  assert.equal(zirkLine?.quantity, 2);

  // 3. Itemized checkout breakdown & strictly optional tip (defaults to 0)
  const breakdownNoTip = buildItemizedCheckoutBreakdown({
    appointmentId: 'apt-test-1',
    customerName: 'Selin Demir',
    admissionType: 'package_qr',
    matchedLines: beautyVoice.matchedLines,
  });
  assert.equal(breakdownNoTip.optionalTipMajor, 0);
  assert.ok(breakdownNoTip.packageDiscountMajor > 0);
  assert.equal(breakdownNoTip.grandTotalMajor, breakdownNoTip.netPayableBeforeTipMajor);

  const breakdownWithTip = buildItemizedCheckoutBreakdown({
    appointmentId: 'apt-test-1',
    customerName: 'Selin Demir',
    admissionType: 'package_qr',
    matchedLines: beautyVoice.matchedLines,
    optionalTipMajor: 250,
  });
  assert.equal(breakdownWithTip.optionalTipMajor, 250);
  assert.equal(
    breakdownWithTip.grandTotalMajor,
    breakdownWithTip.netPayableBeforeTipMajor + 250
  );

  console.log('PASS: verify-mobile-m10-qr-voice-catalog (all assertions)');
}

run();
