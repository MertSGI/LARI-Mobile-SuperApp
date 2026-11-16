import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { executeMobileAccountDeletion } from '../services/accountDeletionService';

const DIST_DIR = path.resolve('dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function startStaticDistServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function run() {
  // 1. Account Deletion Service Invariants (Apple Guideline 5.1.1(v))
  const noBio = executeMobileAccountDeletion({
    tenantId: 'ten-1',
    userId: 'usr-1',
    userRole: 'customer',
    confirmationPhrase: 'HESABIMI SIL',
    biometricVerified: false,
    hasActiveMedicalRetentionLock: false,
  });
  assert.equal(noBio.success, false);
  assert.equal(noBio.reasonCode, 'BIOMETRIC_REAUTH_REQUIRED');

  const medAnonymized = executeMobileAccountDeletion({
    tenantId: 'ten-1',
    userId: 'usr-2',
    userRole: 'customer',
    confirmationPhrase: 'HESABIMI SIL',
    biometricVerified: true,
    hasActiveMedicalRetentionLock: true,
  });
  assert.equal(medAnonymized.success, true);
  assert.equal(medAnonymized.outcome, 'ANONYMIZED_RETENTION_LOCKED');
  assert.equal(medAnonymized.medicalRecordsAnonymizedOnly, true);

  const fullDelete = executeMobileAccountDeletion({
    tenantId: 'ten-1',
    userId: 'usr-3',
    userRole: 'customer',
    confirmationPhrase: 'HESABIMI SIL',
    biometricVerified: true,
    hasActiveMedicalRetentionLock: false,
  });
  assert.equal(fullDelete.success, true);
  assert.equal(fullDelete.outcome, 'DELETED_FULL');

  // 2. Playwright Headless Chromium E2E across iPhone 15 Pro & Pixel 7 viewports
  const { server, url } = await startStaticDistServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    const viewports = [
      { name: 'iPhone 15 Pro', width: 393, height: 852 },
      { name: 'Pixel 7', width: 412, height: 915 },
    ];

    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      // A) Native App Boot Redirect (`/?app=1` -> `/m`) & B2C Mobile Super-App Launch
      await page.goto(`${url}/?app=1#/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="lari-mobile-app-shell"]');
      await page.waitForSelector('[data-testid="mobile-story-reels-strip"]');
      await page.waitForSelector('[data-testid="mobile-explore-marketplace-page"]');
      await page.waitForSelector('[data-testid="interactive-radar-map-card"]');
      await page.waitForSelector('[data-testid="flash-slots-strip"]');

      // A.2) Open Full-Screen Storefront Detail Drawer & verify tabs
      await page.click('[data-testid="open-storefront-btn-atelier-nisantasi"]');
      await page.waitForSelector('[data-testid="mobile-storefront-detail-drawer"]');
      await page.click('[data-testid="storefront-tab-specialists"]');
      await page.click('[data-testid="storefront-tab-portfolio"]');
      await page.click('[data-testid="close-storefront-drawer-btn"]');

      // Check zero horizontal overflow
      const overflowB2c = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      assert.equal(overflowB2c, false, `Horizontal overflow detected on ${vp.name} B2C`);

      // B) Switch to Wallet, Live Companion, Care Passport & Stamp Card
      await page.click('[data-testid="mobile-tab-wallet"]');
      await page.waitForSelector('[data-testid="live-appointment-companion-card"]');
      await page.waitForSelector('[data-testid="wallet-qr-pass-card"]');
      await page.click('[data-testid="wallet-subtab-passport"]');
      await page.waitForSelector('[data-testid="wallet-care-passport-panel"]');
      await page.click('[data-testid="wallet-subtab-loyalty"]');
      await page.waitForSelector('[data-testid="wallet-stamp-card"]');

      // B.2) Switch to AI Style Studio & verify Before/After Slider
      await page.click('[data-testid="mobile-tab-ai_style"]');
      await page.waitForSelector('[data-testid="ai-before-after-viewfinder"]');
      await page.waitForSelector('[data-testid="ai-comparison-slider"]');

      // C) Switch to HT Patient Concierge Persona & Post-Op Recovery Check-in
      await page.click('[data-testid="persona-pill-ht_patient"]');
      await page.waitForSelector('[data-testid="mobile-ht-concierge-page"]');
      await page.waitForSelector('[data-testid="ht-itinerary-timeline"]');
      await page.waitForSelector('[data-testid="ht-postop-recovery-card"]');

      // D) Switch to Partner Mode, Commission Card & POS
      await page.click('[data-testid="mobile-mode-toggle-btn"]');
      await page.waitForSelector('[data-testid="mobile-partner-agenda-page"]');
      await page.waitForSelector('[data-testid="partner-daily-commission-card"]');
      await page.click('[data-testid="mobile-tab-partner_pos"]');
      await page.waitForSelector('[data-testid="mobile-partner-pos-page"]');
      await page.click('[data-testid="partner-pos-cash-checkout-btn"]');

      // E) Switch to Clinic Practitioner PHI Persona & Touch Consultation Canvas
      await page.click('[data-testid="persona-pill-clinic_practitioner"]');
      await page.waitForSelector('[data-testid="mobile-clinic-workspace"]');
      await page.waitForSelector('[data-testid="clinic-touch-drawing-studio"]');
      await page.waitForSelector('[data-testid="clinic-consultation-canvas"]');

      // F) White-Label Storefront Lock (/m?slug=atelier-nisantasi)
      await page.goto(`${url}/#/m?slug=atelier-nisantasi`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="white-label-lock-badge"]');
      await page.waitForSelector('[data-testid="white-label-storefront-banner"]');
      const cardCount = await page.locator('[data-testid^="marketplace-card-"]').count();
      assert.equal(cardCount, 1, `White-label lock on ${vp.name} must show exactly 1 tenant`);

      assert.equal(pageErrors.length, 0, `Page errors on ${vp.name}: ${pageErrors.join('; ')}`);
      await context.close();
      console.log(`PASS: Playwright E2E on ${vp.name} (${vp.width}x${vp.height})`);
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log('PASS: test-mobile-superapp-e2e (all assertions)');
}

run();
