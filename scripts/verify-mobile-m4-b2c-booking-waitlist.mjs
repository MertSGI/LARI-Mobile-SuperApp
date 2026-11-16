import assert from 'node:assert/strict';
import {
  buildOneTapRebookCandidate,
  canBrowseWithoutAuth,
  MobileResourceWaitlistRegistry,
  searchMobileMarketplace,
} from '../services/mobile/mobileDiscoveryService';
import { DEFAULT_MOBILE_MARKETPLACE_LISTINGS } from '../pages/mobile/b2c/MobileExploreMarketplacePage';

async function run() {
  // 1. Apple Guideline 5.1.1 Guest Browsing without auth
  assert.equal(canBrowseWithoutAuth(), true);

  // 2. GPS Haversine sorting (user near Kadıköy should see Kadıköy clinic first)
  const kadikoySearch = searchMobileMarketplace({
    listings: DEFAULT_MOBILE_MARKETPLACE_LISTINGS,
    userCoords: { latitude: 40.982, longitude: 29.027 },
    sortBy: 'distance_km',
  });
  assert.equal(kadikoySearch.storefrontLockActive, false);
  assert.equal(kadikoySearch.items[0].slug, 'lari-dent-kadikoy');
  assert.ok((kadikoySearch.items[0].distanceKm ?? 99) < 1);

  // 3. White-Label Storefront Lock: 0% commission, zero competitor leakage
  const locked = searchMobileMarketplace({
    listings: DEFAULT_MOBILE_MARKETPLACE_LISTINGS,
    whiteLabelLockedTenantSlug: 'atelier-nisantasi',
  });
  assert.equal(locked.storefrontLockActive, true);
  assert.equal(locked.competitorLeakageCount, 0);
  assert.equal(locked.marketplaceCommissionBps, 0);
  assert.equal(locked.items.length, 1);
  assert.equal(locked.items[0].slug, 'atelier-nisantasi');

  // 4. 1-Tap Rebook Candidate
  const rebook = buildOneTapRebookCandidate([
    {
      appointmentId: 'apt-1',
      tenantId: 'ten-atelier-nisantasi',
      tenantSlug: 'atelier-nisantasi',
      businessName: 'Atelier Nişantaşı',
      serviceId: 'srv-1',
      serviceName: 'Soft Balayage',
      staffId: 'st-1',
      staffName: 'Merve Yılmaz',
      durationMinutes: 120,
      priceMajor: 4200,
      currency: 'TRY',
      completedAtIso: '2026-11-10T12:00:00Z',
    },
  ]);
  assert.equal(rebook.available, true);
  assert.equal(rebook.suggestedSlots.length, 3);

  // 5. Concurrent Resource-Aware Waitlist Claim Race (10 parallel claims on capacity-1 room)
  const registry = new MobileResourceWaitlistRegistry();
  const claims = await Promise.all(
    Array.from({ length: 10 }, (_, idx) =>
      registry.claimSlot({
        tenantId: 'ten-dent-kadikoy',
        customerId: `cust-${idx}`,
        slotKey: '2026-11-18_14:00',
        staffId: `doc-${idx % 2}`,
        requiredResourceId: 'dental-chair-1',
        resourceCapacity: 1,
      })
    )
  );
  const succeeded = claims.filter((c) => c.claimed && c.httpStatus === 201);
  const conflicted = claims.filter(
    (c) => !c.claimed && c.httpStatus === 409 && c.reasonCode === 'RESOURCE_UNAVAILABLE_CONFLICT'
  );
  assert.equal(succeeded.length, 1);
  assert.equal(conflicted.length, 9);

  console.log('PASS: verify-mobile-m4-b2c-booking-waitlist (all assertions)');
}

run();
