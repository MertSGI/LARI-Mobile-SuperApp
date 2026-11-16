import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import capacitorConfig, {
  LARI_MOBILE_BUNDLE_ID,
  LARI_MOBILE_SCHEMES
} from '../capacitor.config.ts';
import { domainResolverService } from '../services/domainResolverService.ts';
import { marketConfigService } from '../services/marketConfigService.ts';
import {
  MemoryOfflineVaultStorage,
  PwaOfflineVaultService
} from '../services/mobile/pwaOfflineVaultService.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));

assert.equal(capacitorConfig.appId, 'com.randevulari.app');
assert.equal(capacitorConfig.server.hostname, 'app.randevulari.com');
assert.equal(LARI_MOBILE_BUNDLE_ID, 'com.randevulari.app');
assert.deepEqual(LARI_MOBILE_SCHEMES, ['randevulari', 'lari']);

const parsedHost = domainResolverService.parseHostname('app.randevulari.com');
assert.equal(parsedHost.type, 'platform');
const market = marketConfigService.getCurrentMarketConfig();
assert.equal(market.marketId, 'tr');
assert.equal(market.appDomain, 'app.randevulari.com');

const manifestText = fs.readFileSync(path.join(rootDir, 'public', 'manifest.json'), 'utf8');
assert.equal(manifestText.includes('picsum.photos'), false);
const manifest = JSON.parse(manifestText);
assert.equal(manifest.id, 'com.randevulari.app');
assert.equal(manifest.start_url, '/#/m');
assert.equal(manifest.icons.find(icon => icon.purpose === 'maskable')?.src, '/icons/maskable-512.png');

const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const iconName of ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png']) {
  const icon = fs.readFileSync(path.join(rootDir, 'public', 'icons', iconName));
  assert.equal(icon.subarray(0, 8).equals(pngMagic), true, `${iconName} must have PNG magic bytes`);
  assert.ok(icon.length > 200, `${iconName} must be a real binary PNG larger than 200 bytes`);
}

const appleAssociation = readJson('public/.well-known/apple-app-site-association');
const appleDetails = appleAssociation.applinks.details[0];
assert.equal(appleDetails.appID, 'TEAMID.com.randevulari.app');
assert.deepEqual(appleDetails.paths, ['/booking/*', '/s/*', '/appointment/manage/*', '/m/*', '/*']);

const assetLinks = readJson('public/.well-known/assetlinks.json');
assert.ok(assetLinks[0].relation.includes('delegate_permission/common.handle_all_urls'));
assert.equal(assetLinks[0].target.package_name, 'com.randevulari.app');

const storage = new MemoryOfflineVaultStorage();
const vault = new PwaOfflineVaultService(storage);
const tenantA = 'tenant-a';
const tenantB = 'tenant-b';
const appointmentPass = {
  tenantId: tenantA,
  appointmentId: 'appointment-a1',
  startsAt: '2026-11-17T09:00:00.000Z',
  signedQrPayload: 'signed-qr-a'
};
const htPass = {
  tenantId: tenantA,
  itineraryId: 'itinerary-a1',
  approvedQuoteId: 'quote-a1',
  approvedQuote: { currency: 'EUR', total: 2500 },
  itinerary: { arrival: 'IST', nights: 4 }
};

vault.saveAppointmentPass(tenantA, appointmentPass);
vault.saveHtItineraryPass(tenantA, htPass);
vault.markSynced(tenantA, '2026-11-16T08:00:00.000Z');
assert.deepEqual(vault.getAppointmentPasses(tenantA), [appointmentPass]);
assert.deepEqual(vault.getHtItineraryPass(tenantA), htPass);
assert.equal(vault.getLastSyncedAt(tenantA), '2026-11-16T08:00:00.000Z');
assert.deepEqual(vault.getAppointmentPasses(tenantB), []);
assert.equal(vault.getHtItineraryPass(tenantB), null);
assert.throws(
  () => vault.saveAppointmentPass(tenantB, appointmentPass),
  /CROSS_TENANT/
);

const appointmentEntry = storage.entries().find(([key]) => key.endsWith(':appointments'));
assert.ok(appointmentEntry, 'appointment vault envelope must exist');
storage.setItem(appointmentEntry[0], appointmentEntry[1].replace('signed-qr-a', 'tampered-qr'));
assert.deepEqual(vault.getAppointmentPasses(tenantA), [], 'tampered envelope must be rejected');

vault.saveAppointmentPass(tenantA, appointmentPass);
vault.clearOnLogout(tenantA);
assert.deepEqual(vault.getAppointmentPasses(tenantA), []);
assert.equal(vault.getHtItineraryPass(tenantA), null);
assert.equal(vault.getLastSyncedAt(tenantA), null);

console.log('PASS verify-mobile-m1-foundation');
