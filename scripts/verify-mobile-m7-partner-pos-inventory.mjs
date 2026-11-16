import assert from 'node:assert/strict';
import { generateSignedQrCheckinPass } from '../services/mobile/qrCheckinService';
import { PartnerMobilePosEngine } from '../pages/mobile/partner/MobilePartnerPosAndInventoryPage';

function run() {
  const engine = new PartnerMobilePosEngine();

  const { rawQrPayload } = generateSignedQrCheckinPass({
    tenantId: 'ten-salon-a',
    appointmentId: 'apt-pos-1',
    customerId: 'cust-1',
    selfServiceToken: 'tok-pos-1',
    scheduledDate: '2026-11-18',
    scheduledTime: '14:00',
    businessName: 'Atelier Nişantaşı',
    serviceName: 'Lazer Paket',
    issuedAtIso: '2026-11-18T10:00:00Z',
  });

  // 1. Customer role MUST be blocked from Partner QR Check-in, POS & PO
  const custBlocked = engine.executeQrCheckin({
    userRole: 'customer',
    actorTenantId: 'ten-salon-a',
    targetTenantId: 'ten-salon-a',
    rawQrPayload,
    nowIso: '2026-11-18T13:50:00Z',
  });
  assert.equal(custBlocked.checkedIn, false);
  assert.equal(custBlocked.reasonCode, 'FORBIDDEN_PARTNER_ROLE');

  // 2. Staff QR Check-in + Package credit deduction succeeds once, replay fails
  const staffOk = engine.executeQrCheckin({
    userRole: 'staff',
    actorTenantId: 'ten-salon-a',
    targetTenantId: 'ten-salon-a',
    rawQrPayload,
    deductPackageCredit: true,
    remainingPackageCredits: 5,
    nowIso: '2026-11-18T13:55:00Z',
  });
  assert.equal(staffOk.checkedIn, true);
  assert.equal(staffOk.remainingCreditsAfter, 4);

  const replay = engine.executeQrCheckin({
    userRole: 'staff',
    actorTenantId: 'ten-salon-a',
    targetTenantId: 'ten-salon-a',
    rawQrPayload,
    nowIso: '2026-11-18T13:56:00Z',
  });
  assert.equal(replay.checkedIn, false);
  assert.equal(replay.reasonCode, 'ALREADY_CHECKED_IN');

  // 3. Mixed-Cart POS: EXTERNAL_HOLD blocked, CURRENCY_MISMATCH blocked
  const extHold = engine.checkoutMixedCart({
    userRole: 'tenant_owner',
    actorTenantId: 'ten-salon-a',
    orderTenantId: 'ten-salon-a',
    orderCurrency: 'TRY',
    paymentMethod: 'card_terminal_adapter',
    idempotencyKey: 'k-ext',
    items: [
      {
        itemType: 'service',
        name: 'Kesim',
        productCurrency: 'TRY',
        unitPriceMinor: 50000,
        quantity: 1,
        taxRateBps: 2000,
        commissionRateBps: 3000,
      },
    ],
    tipMinorUnits: 0,
  });
  assert.equal(extHold.success, false);
  assert.equal(extHold.reasonCode, 'EXTERNAL_HOLD_PAYMENT_METHOD_BLOCKED');

  const curMismatch = engine.checkoutMixedCart({
    userRole: 'tenant_owner',
    actorTenantId: 'ten-salon-a',
    orderTenantId: 'ten-salon-a',
    orderCurrency: 'USD',
    paymentMethod: 'cash',
    idempotencyKey: 'k-cur',
    items: [
      {
        itemType: 'product',
        name: 'Serum',
        productCurrency: 'TRY',
        unitPriceMinor: 50000,
        quantity: 1,
        taxRateBps: 2000,
        commissionRateBps: 1000,
      },
    ],
    tipMinorUnits: 0,
  });
  assert.equal(curMismatch.success, false);
  assert.equal(curMismatch.reasonCode, 'CURRENCY_MISMATCH');

  // 4. Valid Cash Checkout + Idempotency Conflict on altered amount
  const cashOk = engine.checkoutMixedCart({
    userRole: 'tenant_owner',
    actorTenantId: 'ten-salon-a',
    orderTenantId: 'ten-salon-a',
    orderCurrency: 'TRY',
    paymentMethod: 'cash',
    idempotencyKey: 'k-cash-1',
    items: [
      {
        itemType: 'service',
        name: 'Balayage',
        productCurrency: 'TRY',
        unitPriceMinor: 100000,
        quantity: 1,
        taxRateBps: 2000,
        commissionRateBps: 3000,
      },
    ],
    tipMinorUnits: 15000,
  });
  assert.equal(cashOk.success, true);
  assert.equal(cashOk.reasonCode, 'ORDER_COMPLETED');
  assert.equal(cashOk.totalMinorUnits, 100000);
  assert.ok(cashOk.staffCommissionMinor > 0);

  const conflict = engine.checkoutMixedCart({
    userRole: 'tenant_owner',
    actorTenantId: 'ten-salon-a',
    orderTenantId: 'ten-salon-a',
    orderCurrency: 'TRY',
    paymentMethod: 'cash',
    idempotencyKey: 'k-cash-1',
    items: [
      {
        itemType: 'service',
        name: 'Balayage',
        productCurrency: 'TRY',
        unitPriceMinor: 200000,
        quantity: 1,
        taxRateBps: 2000,
        commissionRateBps: 3000,
      },
    ],
    tipMinorUnits: 15000,
  });
  assert.equal(conflict.success, false);
  assert.equal(conflict.reasonCode, 'IDEMPOTENCY_CONFLICT');

  // 5. PO Receiving canonical idempotency
  const poOk = engine.receivePurchaseOrder({
    userRole: 'staff',
    actorTenantId: 'ten-salon-a',
    poTenantId: 'ten-salon-a',
    poId: 'po-1',
    idempotencyKey: 'po-k1',
    items: [
      { poItemId: 'item-a', quantity: 5 },
      { poItemId: 'item-b', quantity: 2 },
    ],
  });
  assert.equal(poOk.accepted, true);

  const poConflict = engine.receivePurchaseOrder({
    userRole: 'staff',
    actorTenantId: 'ten-salon-a',
    poTenantId: 'ten-salon-a',
    poId: 'po-1',
    idempotencyKey: 'po-k1',
    items: [
      { poItemId: 'item-a', quantity: 99 },
      { poItemId: 'item-b', quantity: 2 },
    ],
  });
  assert.equal(poConflict.accepted, false);
  assert.equal(poConflict.reasonCode, 'IDEMPOTENCY_CONFLICT');

  console.log('PASS: verify-mobile-m7-partner-pos-inventory (all assertions)');
}

run();
