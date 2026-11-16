import assert from 'node:assert/strict';
import { buildAppointmentIcsContent, calculateHaversineDistanceKm, requireBiometricReauth, requestContextualPermission } from '../services/mobile/nativeBridgeService.ts';
import { resolveMobileDeepLink } from '../services/mobile/deepLinkRouterService.ts';
let passed = 0;
async function check(name, fn) { await fn(); passed += 1; console.log(`PASS ${name}`); }
await check('contextual permission guard', async () => { await assert.rejects(() => requestContextualPermission('camera', ' '), /CONTEXTUAL_USER_TRIGGER_REQUIRED/); });
await check('haversine distance accuracy', () => { const d = calculateHaversineDistanceKm({ latitude: 40.9909, longitude: 29.0277 }, { latitude: 41.052, longitude: 28.9878 }); assert.ok(d >= 7 && d <= 9, `${d} km`); assert.equal(d, Number(d.toFixed(2))); });
await check('biometric tenant/user/scope isolation and expiry', async () => {
  const base = { tenantId: 'tenant-a', staffOrUserId: 'user-1', scope: 'clinic_phi_access' };
  assert.equal((await requireBiometricReauth({ ...base, pinOrBiometricToken: 'test-token', ttlSeconds: 10 })).verified, true);
  assert.equal((await requireBiometricReauth(base)).method, 'session_reauth');
  for (const changed of [{ ...base, tenantId: 'tenant-b' }, { ...base, staffOrUserId: 'user-2' }, { ...base, scope: 'customer_360_pii' }]) {
    const result = await requireBiometricReauth(changed); assert.equal(result.verified, false); assert.equal(result.reasonCode, 'BIOMETRIC_REAUTH_REQUIRED');
  }
  const expired = await requireBiometricReauth({ tenantId: 'expired', staffOrUserId: 'expired', scope: 'account_deletion', pinOrBiometricToken: 'test-token', ttlSeconds: 0 });
  assert.equal(expired.verified, false); assert.equal(expired.reasonCode, 'BIOMETRIC_REAUTH_REQUIRED');
});
await check('RFC 5545 calendar integrity', () => {
  const ics = buildAppointmentIcsContent({ appointmentId: 'apt-47', title: 'Kontrol, Seansi', businessName: 'Randevulari Klinik', address: 'Nisantasi; Istanbul', startIso: '2026-11-17T09:00:00+03:00', durationMinutes: 45 });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')); assert.match(ics, /\r\nBEGIN:VEVENT\r\n/); assert.match(ics, /DTSTART:20261117T060000Z\r\n/); assert.match(ics, /DTEND:20261117T064500Z\r\n/); assert.match(ics, /SUMMARY:Kontrol\\, Seansi\r\n/); assert.ok(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));
});
await check('white-label, self-service, HT, and partner deep links', () => {
  for (const raw of ['randevulari://s/atelier-nisantasi', 'https://randevulari.com/#/s/atelier-nisantasi', 'https://atelier-nisantasi.randevulari.com']) { const r = resolveMobileDeepLink(raw); assert.equal(r.valid, true); assert.equal(r.tenantSlug, 'atelier-nisantasi'); assert.equal(r.routePath, '/m/storefront/atelier-nisantasi'); assert.equal(r.whiteLabelStorefrontLock, true); }
  const branch = resolveMobileDeepLink('randevulari://booking/atelier-nisantasi/sube-kadikoy'); assert.equal(branch.branchSlug, 'sube-kadikoy'); assert.equal(branch.routePath, '/m/storefront/atelier-nisantasi/sube-kadikoy'); assert.equal(branch.whiteLabelStorefrontLock, true);
  const self = resolveMobileDeepLink('randevulari://appointment/manage/tok_123456'); assert.equal(self.selfServiceToken, 'tok_123456'); assert.equal(self.routePath, '/m/wallet/manage/tok_123456'); assert.equal(self.whiteLabelStorefrontLock, false);
  const ht = resolveMobileDeepLink('randevulari://ht/journey/jrn_999'); assert.equal(ht.htJourneyId, 'jrn_999'); assert.equal(ht.routePath, '/m/concierge/jrn_999');
  const partner = resolveMobileDeepLink('randevulari://partner'); assert.equal(partner.targetMode, 'b2b_partner'); assert.equal(partner.routePath, '/m/partner');
});
await check('malicious deep link rejection', () => {
  for (const [raw, reason] of [['javascript:alert(1)', 'MALICIOUS_SCHEME'], ['data:text/html,bad', 'MALICIOUS_SCHEME'], ['vbscript:bad', 'MALICIOUS_SCHEME'], ['file:///etc/passwd', 'MALICIOUS_SCHEME'], ['https://evil.com/s/salon', 'UNTRUSTED_EXTERNAL_HOST'], ['https://randevulari.com/#/s/../admin', 'PATH_TRAVERSAL'], ['randevulari://s/%2e%2e/admin', 'PATH_TRAVERSAL']]) { const r = resolveMobileDeepLink(raw); assert.equal(r.valid, false, raw); assert.equal(r.rejectedReason, reason, raw); }
});
console.log(`\nMOBILE_M2_NATIVE_BRIDGE: ${passed}/${passed} PASS (100%)`);
