import assert from 'node:assert/strict';
import { evaluateMobileAIStyleRecommendation } from '../pages/mobile/b2c/MobileAIStyleVisualizerPage';
import { evaluateMobileHtPatientConcierge } from '../pages/mobile/b2c/MobileHealthTourismConciergePage';

function run() {
  const samplePhoto =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 1. AI Style requires contextual trigger & blocks paid external API (0 TL rule)
  const noTrigger = evaluateMobileAIStyleRecommendation({
    tenantId: 'tenant-1',
    vertical: 'hair_beauty',
    userActionTrigger: '',
    photoDataUrl: samplePhoto,
  });
  assert.equal(noTrigger.success, false);
  assert.equal(noTrigger.reasonCode, 'CONTEXTUAL_TRIGGER_REQUIRED');
  assert.equal(noTrigger.paidApiCalled, false);
  assert.equal(noTrigger.costIncurredMinorUnits, 0);

  const paidBlocked = evaluateMobileAIStyleRecommendation({
    tenantId: 'tenant-1',
    vertical: 'dental_smile',
    userActionTrigger: 'user_tap_camera',
    photoDataUrl: samplePhoto,
    allowPaidExternalApi: true,
  });
  assert.equal(paidBlocked.success, false);
  assert.equal(paidBlocked.reasonCode, 'PAID_EXTERNAL_AI_DISABLED');
  assert.equal(paidBlocked.paidApiCalled, false);

  const aiOk = evaluateMobileAIStyleRecommendation({
    tenantId: 'tenant-1',
    vertical: 'hair_beauty',
    userActionTrigger: 'user_tap_camera',
    photoDataUrl: samplePhoto,
    styleGoalText: 'Doğal katlı kesim',
  });
  assert.equal(aiOk.success, true);
  assert.equal(aiOk.paidApiCalled, false);
  assert.equal(aiOk.costIncurredMinorUnits, 0);
  assert.ok(aiOk.suggestions.length >= 1);
  assert.ok(aiOk.attachedAppointmentNote.includes('AI Stil Önerisi'));

  // 2. Health Tourism Concierge commercial & vertical gates (fail-closed)
  const htIneligible = evaluateMobileHtPatientConcierge({
    tenantId: 'tenant-ht-1',
    tenantEligible: false,
    healthTourismEnabled: true,
    fullName: 'Elena Rostova',
    countryCode: 'de',
    preferredLanguage: 'de',
    preferredCurrency: 'EUR',
    phone: '+4915123456789',
    treatmentCategory: 'dental_implant_veneers',
    attachedPhotoCount: 2,
  });
  assert.equal(htIneligible.success, false);
  assert.equal(htIneligible.reasonCode, 'COMMERCIAL_ELIGIBILITY_REQUIRED');

  const htDisabled = evaluateMobileHtPatientConcierge({
    tenantId: 'tenant-ht-1',
    tenantEligible: true,
    healthTourismEnabled: false,
    fullName: 'Elena Rostova',
    countryCode: 'de',
    preferredLanguage: 'de',
    preferredCurrency: 'EUR',
    phone: '+4915123456789',
    treatmentCategory: 'dental_implant_veneers',
    attachedPhotoCount: 2,
  });
  assert.equal(htDisabled.success, false);
  assert.equal(htDisabled.reasonCode, 'HEALTH_TOURISM_NOT_ENABLED');

  // 3. Valid HT Concierge multi-currency + PII passport redaction + 7-step itinerary
  for (const cur of ['EUR', 'USD', 'GBP', 'TRY']) {
    const htOk = evaluateMobileHtPatientConcierge({
      tenantId: 'tenant-ht-1',
      tenantEligible: true,
      healthTourismEnabled: true,
      fullName: 'Elena Rostova',
      countryCode: 'de',
      preferredLanguage: 'en',
      preferredCurrency: cur,
      phone: '+4915123456789',
      passportNumberRaw: 'DE9988776655',
      treatmentCategory: 'hair_transplant',
      attachedPhotoCount: 3,
    });
    assert.equal(htOk.success, true);
    assert.equal(htOk.patientProjection?.passportRedacted, true);
    assert.equal('passport_number' in (htOk.patientProjection || {}), false);
    assert.equal('passportNumberRaw' in (htOk.patientProjection || {}), false);
    assert.equal(htOk.quote?.currency, cur);
    assert.equal(htOk.quote?.totalMinorUnits, (htOk.quote?.treatmentMinorUnits || 0) + (htOk.quote?.hotelMinorUnits || 0));
    assert.equal(htOk.itinerary.length, 7);
    assert.equal(htOk.regulatoryHoldClassification, 'EXTERNAL_HOLD');
  }

  console.log('PASS: verify-mobile-m6-ai-and-ht-concierge (all assertions)');
}

run();
