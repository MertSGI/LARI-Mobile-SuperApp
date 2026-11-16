import assert from 'node:assert/strict';
import {
  resolveHonestCapabilityTier,
  resolveMobileShellState,
} from '../services/mobile/mobileShellPolicyService';

function run() {
  const fullVerticals = {
    eligible: true,
    clinicEnabled: true,
    healthTourismEnabled: true,
    posInventoryEnabled: true,
    loyaltyWalletEnabled: true,
    aiVisualizerEnabled: true,
  };

  // 1. Customer cannot escalate to b2b_partner mode
  const custEsc = resolveMobileShellState({
    userRole: 'customer',
    requestedMode: 'b2b_partner',
    verticals: fullVerticals,
  });
  assert.equal(custEsc.effectiveMode, 'b2c_customer');
  assert.equal(custEsc.modeSwitchAllowed, false);
  assert.equal(custEsc.modeRejectionReason, 'FORBIDDEN_PARTNER_ROLE');
  assert.ok(!custEsc.availablePersonas.includes('salon_partner'));

  // 2. Guest with White-Label Storefront Lock gets %0 commission storefront tab
  const whiteLabel = resolveMobileShellState({
    userRole: 'guest',
    requestedMode: 'b2c_customer',
    verticals: fullVerticals,
    whiteLabelLockedTenantSlug: 'atelier-nisantasi',
  });
  assert.equal(whiteLabel.whiteLabelStorefrontLock.active, true);
  assert.equal(whiteLabel.whiteLabelStorefrontLock.competitorDiscoveryHidden, true);
  assert.equal(whiteLabel.whiteLabelStorefrontLock.marketplaceCommissionBps, 0);
  assert.equal(whiteLabel.tabs[0].id, 'storefront');
  assert.equal(whiteLabel.tabs[0].routePath, '/m/storefront/atelier-nisantasi');

  // 3. HT Patient persona activates VIP Seyahat & Teklif tab
  const htPatient = resolveMobileShellState({
    userRole: 'customer',
    requestedPersona: 'ht_patient',
    verticals: fullVerticals,
  });
  assert.equal(htPatient.effectivePersona, 'ht_patient');
  assert.equal(htPatient.tabs[3].id, 'ht_concierge');

  // 4. Clinic Practitioner persona requires clinicEnabled + eligible
  const clinicBlocked = resolveMobileShellState({
    userRole: 'tenant_owner',
    requestedPersona: 'clinic_practitioner',
    verticals: { ...fullVerticals, clinicEnabled: false },
  });
  assert.equal(clinicBlocked.modeSwitchAllowed, false);
  assert.equal(clinicBlocked.modeRejectionReason, 'VERTICAL_NOT_ENABLED');

  const ineligibleBlocked = resolveMobileShellState({
    userRole: 'tenant_owner',
    requestedPersona: 'ht_coordinator',
    verticals: { ...fullVerticals, eligible: false },
  });
  assert.equal(ineligibleBlocked.modeSwitchAllowed, false);
  assert.equal(ineligibleBlocked.modeRejectionReason, 'COMMERCIAL_ELIGIBILITY_REQUIRED');

  // 5. Partner Clinic Practitioner & HT Coordinator personas activate specialized 4th tab
  const clinicDoc = resolveMobileShellState({
    userRole: 'staff',
    requestedPersona: 'clinic_practitioner',
    verticals: fullVerticals,
  });
  assert.equal(clinicDoc.effectiveMode, 'b2b_partner');
  assert.equal(clinicDoc.effectivePersona, 'clinic_practitioner');
  assert.equal(clinicDoc.tabs[3].id, 'clinic_phi');
  assert.equal(clinicDoc.tabs[3].requiresBiometricGate, true);

  const htCoord = resolveMobileShellState({
    userRole: 'tenant_owner',
    requestedPersona: 'ht_coordinator',
    verticals: fullVerticals,
  });
  assert.equal(htCoord.effectivePersona, 'ht_coordinator');
  assert.equal(htCoord.tabs[3].id, 'ht_lead_ops');

  // 6. Touch target & layout invariants across all 5 tabs
  for (const tab of htCoord.tabs) {
    assert.ok(tab.minTouchTargetPx >= 44, `Tab ${tab.id} touch target < 44px`);
  }
  assert.equal(htCoord.layoutMetrics.horizontalOverflowPolicy, 'hidden');
  assert.equal(
    resolveHonestCapabilityTier('pos_card_terminal_and_wallet'),
    'DISABLED_EXTERNAL_HOLD'
  );

  console.log('PASS: verify-mobile-m3-polymorphic-shell (6/6 assertions)');
}

run();
