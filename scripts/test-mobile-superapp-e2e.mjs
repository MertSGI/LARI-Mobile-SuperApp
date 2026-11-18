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
      page.on('console', (message) => {
        if (message.type() === 'error') pageErrors.push(message.text());
      });

      // A) Native App Boot Redirect (`/?app=1` -> `/m`) & B2C Customer Mode Default Launch
      await page.goto(`${url}/?app=1#/`, { waitUntil: 'networkidle' });
      try {
        await page.waitForSelector('[data-testid="lari-mobile-app-shell"]');
      } catch (error) {
        const bodyText = await page.locator('body').innerText().catch(() => 'BODY_UNAVAILABLE');
        throw new Error(
          `Mobile shell boot failed on ${vp.name}. Page errors: ${pageErrors.join('; ') || 'none'}. Body: ${bodyText.slice(0, 500)}`,
          { cause: error }
        );
      }
      const startupMode = await page.getAttribute('[data-testid="lari-mobile-app-shell"]', 'data-effective-mode');
      assert.equal(startupMode, 'b2c_customer', `Expected default startup mode b2c_customer on ${vp.name}`);
      await page.waitForSelector('[data-testid="mobile-story-reels-strip"]');
      await page.waitForSelector('[data-testid="mobile-explore-marketplace-page"]');
      await page.waitForSelector('[data-testid="interactive-radar-map-card"]');
      await page.waitForSelector('[data-testid="marketplace-card-maslak-auto-studio"]');
      await page.waitForSelector('[data-testid="explore-partner-invite-card"]');
      assert.equal(
        await page.locator('[data-testid="lari-social-showcase-feed"]').count(),
        0,
        `Social feed must not be rendered on Home on ${vp.name}`
      );

      // Story modal advances with the right-side tap zone.
      await page.click('[data-testid="story-bubble-story-flash-nisantasi"]');
      await page.waitForSelector('[data-testid="mobile-story-fullscreen-modal"]');
      const firstStoryTitle = await page.locator('[data-testid="active-story-title"]').innerText();
      await page.click('[data-testid="story-tap-next"]');
      const secondStoryTitle = await page.locator('[data-testid="active-story-title"]').innerText();
      assert.notEqual(secondStoryTitle, firstStoryTitle, `Story must advance on ${vp.name}`);
      await page.click('[data-testid="close-story-modal-btn"]');
      await page.waitForSelector('[data-testid="mobile-story-fullscreen-modal"]', {
        state: 'detached',
      });

      // Search clear affordance + expanded real-photo category catalog
      await page.fill('[data-testid="explore-search-input"]', 'Nişantaşı');
      await page.click('[data-testid="explore-search-clear-btn"]');
      assert.equal(await page.inputValue('[data-testid="explore-search-input"]'), '');
      await page.click('[data-testid="explore-voice-search-btn"]');
      await page.waitForSelector('[data-testid="voice-search-fallback-bar"]');
      await page.click('[data-testid="voice-search-fallback-bar"] button:has-text("Maslak oto servis")');
      assert.equal(
        await page.inputValue('[data-testid="explore-search-input"]'),
        'Maslak oto servis'
      );
      await page.click('[data-testid="explore-search-clear-btn"]');
      await page.click('[data-testid="category-visibility-toggle"]');
      await page.waitForSelector('[data-testid="category-card-health_tourism"]');
      await page.click('[data-testid="category-visibility-toggle"]');

      await page.click('[data-testid="explore-expand-map-btn"]');
      await page.waitForSelector('[data-testid="explore-expanded-map-modal"]');
      assert.ok(
        (await page.locator('[data-testid^="expanded-map-pin-"]').count()) >= 6,
        `Expanded map must expose all LARİ businesses on ${vp.name}`
      );
      await page.click('[data-testid="explore-expanded-map-close-btn"]');
      await page.waitForSelector('[data-testid="explore-expanded-map-modal"]', {
        state: 'detached',
      });

      await page.click('[data-testid="mobile-tab-social_feed"]');
      await page.waitForSelector('[data-testid="mobile-social-feed-page"]');
      await page.waitForSelector('[data-testid="lari-social-showcase-feed"]');
      const legacySocialCtaCount = await page
        .locator('button:has-text("Bu İşlem İçin Hemen Randevu Al")')
        .count();
      assert.equal(legacySocialCtaCount, 0);
      assert.ok((await page.locator('[data-testid^="social-quick-book-"]').count()) > 0);
      assert.ok(
        (await page.getByText('İlgi Alanınıza Göre', { exact: true }).count()) > 0,
        `Preferred-sector badges must appear in Discover on ${vp.name}`
      );
      await page.click('[data-testid="mobile-tab-explore"]');

      // Header brand + notification center drawer + quick booking date navigation
      await page.waitForSelector('[data-testid="header-brand-symbol"]');
      await page.click('[data-testid="header-quick-plus-btn"]');
      await page.waitForSelector('[data-testid="mobile-quick-book-carousel-sheet"]');
      assert.ok(
        (await page.locator('[data-testid^="quick-book-business-"]').count()) >= 6,
        `Quick-book carousel must show all nearby businesses on ${vp.name}`
      );
      await page.click('[data-testid="quick-book-filter-auto_service"]');
      assert.equal(
        await page.locator('[data-testid^="quick-book-business-"]').count(),
        1,
        `Quick-book sector filter must narrow businesses on ${vp.name}`
      );
      await page.click('[data-testid="quick-book-filter-all"]');
      await page.click('[data-testid="quick-book-book-atelier-nisantasi"]');
      await page.waitForSelector('[data-testid="mobile-booking-bottom-sheet"]');
      await page.waitForSelector('[data-testid="booking-date-selector"]');
      await page.waitForSelector('[data-testid="booking-calendar-picker-btn"]');
      await page.click('[data-testid="booking-date-next-btn"]');
      await page.click('[data-testid="mobile-booking-bottom-sheet"] button:has-text("Hemen Randevu Al")');
      await page.waitForSelector('[data-testid="mobile-booking-bottom-sheet"]', { state: 'detached' });
      await page.click('[data-testid="mobile-tab-explore"]');

      await page.click('[data-testid="header-notifications-btn"]');
      await page.waitForSelector('[data-testid="notification-drawer"]');
      await page.click('[data-testid="notification-mark-all-read-btn"]');
      await page.click('[data-testid="notification-drawer-close-btn"]');

      // A.2) Open Filter Drawer & verify auto_service + Google Business options
      await page.click('[data-testid="explore-filter-drawer-btn"]');
      await page.waitForSelector('[data-testid="explore-filter-modal"]');
      await page.click('[data-testid="explore-filter-modal"] button:has-text("Uygula")');

      // A.3) Open Full-Screen Storefront Detail Drawer & verify tabs
      await page.click('[data-testid="open-storefront-btn-atelier-nisantasi"]');
      await page.waitForSelector('[data-testid="mobile-storefront-detail-drawer"]');
      await page.waitForSelector('[data-testid="storefront-hero-carousel"]');
      await page.waitForSelector('[data-testid="storefront-overlap-avatar"]');
      const storefrontWhatsappButton = page.locator(
        '[data-testid="mobile-storefront-detail-drawer"] [data-testid="storefront-whatsapp-btn"]'
      );
      await storefrontWhatsappButton.waitFor();
      assert.match(
        (await storefrontWhatsappButton.getAttribute('href')) || '',
        /^https:\/\/wa\.me\/\d+\?text=/
      );
      await page.click('[data-testid="storefront-tab-specialists"]');
      await page.click('[data-testid="storefront-tab-portfolio"]');
      await page.click('[data-testid="close-storefront-drawer-btn"]');

      // Check zero horizontal overflow
      const overflowB2c = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      assert.equal(overflowB2c, false, `Horizontal overflow detected on ${vp.name} B2C`);

      // B) Switch to Wallet, Live Companion, Real QR SVG, Package QR Mode, Care Passport & Stamp Card
      await page.click('[data-testid="mobile-tab-wallet"]');
      await page.waitForSelector('[data-testid="live-appointment-companion-card"]');
      await page.waitForSelector('[data-testid="wallet-booking-history-card"]');
      await page.waitForSelector('[data-testid="wallet-qr-pass-card"]');
      await page.waitForSelector('[data-testid="lari-qr-svg-container"]');
      await page.waitForSelector('[data-testid="wallet-cancellation-policy-card"]');
      await page.click('[data-testid="wallet-cancel-open-btn"]');
      await page.waitForSelector('[data-testid="wallet-cancel-confirm-modal"]');
      assert.match(
        await page.locator('[data-testid="wallet-cancel-confirm-modal"]').innerText(),
        /Emin misiniz\?/
      );
      await page.click('[data-testid="wallet-cancel-dismiss-btn"]');
      await page.waitForSelector('[data-testid="wallet-cancel-confirm-modal"]', {
        state: 'detached',
      });
      await page.click('[data-testid="wallet-cancel-open-btn"]');
      await page.waitForSelector('[data-testid="wallet-cancel-confirm-btn"]');
      assert.equal(
        await page.locator('[data-testid="wallet-cancel-confirm-btn"]').isEnabled(),
        true,
        `Cancellation confirmation must be actionable on ${vp.name}`
      );
      await page.click('[data-testid="wallet-cancel-dismiss-btn"]');
      await page.waitForSelector('[data-testid="wallet-cancel-confirm-modal"]', {
        state: 'detached',
      });
      await page.click('[data-testid="wallet-qr-mode-package"]');
      await page.click('[data-testid="wallet-subtab-passport"]');
      await page.waitForSelector('[data-testid="wallet-care-passport-panel"]');
      await page.click('[data-testid="wallet-subtab-loyalty"]');
      await page.waitForSelector('[data-testid="wallet-stamp-card"]');

      // C) Tap 5th Floating Avatar Tab (Profile) -> Test Panel Boundaries, Dark/Light toggle & Switch to HT Patient Concierge + VIP QR
      await page.click('[data-testid="mobile-tab-profile"]');
      await page.waitForSelector('[data-testid="mobile-profile-settings-page"]');
      await page.waitForSelector('[data-testid="profile-booking-history-card"]');
      await page.waitForSelector('[data-testid="panel-visibility-boundaries-card"]');
      await page.click('[data-testid="theme-mode-toggle-btn"]');
      const darkTheme = await page.getAttribute('[data-testid="lari-mobile-app-shell"]', 'data-theme');
      assert.equal(darkTheme, 'dark');
      await page.click('[data-testid="theme-mode-toggle-btn"]');
      await page.click('[data-testid="persona-role-dropdown-btn"]');
      await page.click('[data-testid="persona-pill-ht_patient"]');
      await page.waitForSelector('[data-testid="mobile-ht-concierge-page"]');
      await page.waitForSelector('[data-testid="ht-vip-admission-qr-card"]');
      await page.waitForSelector('[data-testid="ht-itinerary-timeline"]');
      await page.waitForSelector('[data-testid="ht-postop-recovery-card"]');

      // D) Switch to Partner Mode -> HT QR Admission + Voice Catalog Match + Publish Breakdown & Optional-Tip Payment QR
      await page.click('[data-testid="mobile-tab-profile"]');
      await page.click('[data-testid="mobile-mode-partner-btn"]');
      await page.waitForSelector('[data-testid="mobile-partner-agenda-page"]');
      await page.waitForSelector('[data-testid="partner-daily-commission-card"]');

      // D.1) Business Management Center -> agenda, catalog and staff CRUD + direct storefront
      await page.click('[data-testid="partner-agenda-add-toggle-btn"]');
      await page.fill('[data-testid="partner-agenda-customer-input"]', 'E2E Walk-in Müşteri');
      await page.fill('[data-testid="partner-agenda-service-input"]', 'E2E Hızlı Bakım');
      await page.fill('[data-testid="partner-agenda-time-input"]', '16:45');
      await page.fill('[data-testid="partner-agenda-resource-input"]', 'E2E Oda 3');
      await page.click('[data-testid="partner-agenda-add-submit-btn"]');
      const addedAgendaItem = page
        .locator('[data-testid^="partner-agenda-item-"]')
        .filter({ hasText: 'E2E Walk-in Müşteri' });
      await addedAgendaItem.waitFor();
      assert.match(await addedAgendaItem.innerText(), /E2E Hızlı Bakım/);
      await addedAgendaItem.locator('[data-testid^="partner-agenda-delete-"]').click();
      await addedAgendaItem.waitFor({ state: 'detached' });

      await page.click('[data-testid="approve-req-req-101"]');
      await page.click('[data-testid="partner-inbox-clear-req-101"]');
      await page.waitForSelector('[data-testid="partner-inbox-clear-req-101"]', {
        state: 'detached',
      });

      await page.click('[data-testid="partner-management-tab-catalog"]');
      await page.waitForSelector('[data-testid="partner-management-catalog-panel"]');
      await page.fill('[data-testid="partner-catalog-name-input"]', 'E2E VIP Bakım');
      await page.fill('[data-testid="partner-catalog-price-input"]', '4200');
      await page.fill('[data-testid="partner-catalog-duration-input"]', '75');
      await page.click('[data-testid="partner-catalog-add-btn"]');
      const addedCatalogItem = page
        .locator('[data-testid^="partner-catalog-item-"]')
        .filter({ hasText: 'E2E VIP Bakım' });
      await addedCatalogItem.waitFor();
      assert.match(await addedCatalogItem.innerText(), /4\.200 TRY/);
      const addedCatalogTestId = await addedCatalogItem.getAttribute('data-testid');
      assert.ok(addedCatalogTestId);
      const addedCatalogRow = page.locator(`[data-testid="${addedCatalogTestId}"]`);
      await addedCatalogRow.locator('[data-testid^="partner-catalog-edit-"]').click();
      await addedCatalogRow
        .locator('[data-testid^="partner-catalog-edit-name-"]')
        .fill('E2E VIP Bakım Güncel');
      await addedCatalogRow.locator('[data-testid^="partner-catalog-edit-price-"]').fill('4500');
      await addedCatalogRow.locator('[data-testid^="partner-catalog-save-"]').click();
      assert.match(await addedCatalogRow.innerText(), /E2E VIP Bakım Güncel/);
      assert.match(await addedCatalogRow.innerText(), /4\.500 TRY/);
      await addedCatalogRow.locator('[data-testid^="partner-catalog-delete-"]').click();
      await addedCatalogRow.waitFor({ state: 'detached' });

      await page.click('[data-testid="partner-management-tab-staff_reports"]');
      await page.waitForSelector('[data-testid="partner-management-staff-reports-panel"]');
      await page.click('[data-testid="partner-staff-add-toggle-btn"]');
      await page.fill('[data-testid="partner-staff-name-input"]', 'E2E Uzman Deniz');
      await page.fill('[data-testid="partner-staff-specialty-input"]', 'E2E Renk Uzmanı');
      await page.fill('[data-testid="partner-staff-commission-input"]', '22');
      await page.fill('[data-testid="partner-staff-shift-input"]', '08:00–17:00');
      await page.click('[data-testid="partner-staff-add-submit-btn"]');
      const addedStaffMember = page
        .locator('[data-testid^="partner-staff-item-"]')
        .filter({ hasText: 'E2E Uzman Deniz' });
      await addedStaffMember.waitFor();
      assert.match(await addedStaffMember.innerText(), /Prim %22/);
      const addedStaffTestId = await addedStaffMember.getAttribute('data-testid');
      assert.ok(addedStaffTestId);
      const addedStaffId = addedStaffTestId.replace('partner-staff-item-', '');
      await addedStaffMember
        .locator(`[data-testid="partner-staff-commission-edit-${addedStaffId}"]`)
        .fill('27');
      await addedStaffMember
        .locator(`[data-testid="partner-staff-shift-edit-${addedStaffId}"]`)
        .fill('10:00–18:00');
      assert.equal(
        await addedStaffMember
          .locator(`[data-testid="partner-staff-commission-edit-${addedStaffId}"]`)
          .inputValue(),
        '27'
      );
      assert.equal(
        await addedStaffMember
          .locator(`[data-testid="partner-staff-shift-edit-${addedStaffId}"]`)
          .inputValue(),
        '10:00–18:00'
      );
      await addedStaffMember.locator('[data-testid^="partner-staff-delete-"]').click();
      await addedStaffMember.waitFor({ state: 'detached' });

      await page.click('[data-testid="partner-revenue-period-monthly"]');
      assert.equal(
        await page.getAttribute('[data-testid="partner-revenue-period-monthly"]', 'aria-pressed'),
        'true'
      );
      await page.click('[data-testid="partner-revenue-period-quarterly"]');
      assert.equal(
        await page.getAttribute('[data-testid="partner-revenue-period-quarterly"]', 'aria-pressed'),
        'true'
      );
      assert.match(
        await page.locator('[data-testid="partner-management-staff-reports-panel"]').innerText(),
        /798\.500 TRY/
      );

      await page.click('[data-testid="partner-management-tab-storefront"]');
      await page.waitForSelector('[data-testid="partner-management-storefront-panel"]');
      await page.waitForSelector('[data-testid="partner-copy-storefront-link-btn"]');
      await page.waitForSelector('[data-testid="partner-ai-upgrade-gate"]');
      await page.fill('[data-testid="partner-hours-open-weekdays"]', '08:30');
      await page.fill('[data-testid="partner-hours-close-weekdays"]', '21:00');
      assert.equal(await page.inputValue('[data-testid="partner-hours-open-weekdays"]'), '08:30');
      assert.equal(await page.inputValue('[data-testid="partner-hours-close-weekdays"]'), '21:00');
      await page.click('[data-testid="partner-hours-daily-mode-toggle"]');
      assert.equal(
        await page.getAttribute('[data-testid="partner-hours-daily-mode-toggle"]', 'aria-pressed'),
        'true'
      );
      assert.equal(await page.locator('[data-testid^="partner-hours-toggle-"]').count(), 7);
      await page.fill('[data-testid="partner-hours-open-monday"]', '08:00');
      await page.fill('[data-testid="partner-hours-close-monday"]', '18:30');
      assert.equal(await page.inputValue('[data-testid="partner-hours-open-monday"]'), '08:00');
      assert.equal(await page.inputValue('[data-testid="partner-hours-close-monday"]'), '18:30');

      await page.setInputFiles('[data-testid="partner-gallery-file-input"]', {
        name: 'e2e-gallery.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#4F46E5"/></svg>'
        ),
      });
      await page.waitForSelector('[data-testid="partner-gallery-photo-0"]');
      await page.click('[data-testid="partner-gallery-delete-0"]');
      await page.waitForSelector('[data-testid="partner-gallery-photo-0"]', {
        state: 'detached',
      });
      const overflowPartner = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      assert.equal(overflowPartner, false, `Horizontal overflow detected on ${vp.name} Partner`);
      await page.click('[data-testid="partner-management-tab-agenda"]');
      await page.waitForSelector('[data-testid="partner-management-agenda-panel"]');

      await page.click('[data-testid="mobile-tab-partner_pos"]');
      await page.waitForSelector('[data-testid="mobile-partner-pos-page"]');
      await page.fill('[data-testid="partner-inventory-name-input"]', 'E2E Onarım Şampuanı');
      await page.fill('[data-testid="partner-inventory-price-input"]', '690');
      await page.fill('[data-testid="partner-inventory-stock-input"]', '4');
      await page.click('[data-testid="partner-inventory-add-btn"]');
      const addedInventoryItem = page
        .locator('[data-testid^="partner-inventory-item-"]')
        .filter({ hasText: 'E2E Onarım Şampuanı' });
      await addedInventoryItem.waitFor();
      assert.match(await addedInventoryItem.innerText(), /Stok: 4/);
      await addedInventoryItem.locator('[data-testid^="partner-inventory-increment-"]').click();
      assert.match(await addedInventoryItem.innerText(), /Stok: 5/);
      await addedInventoryItem.locator('[data-testid^="partner-inventory-decrement-"]').click();
      assert.match(await addedInventoryItem.innerText(), /Stok: 4/);
      await addedInventoryItem.locator('[data-testid^="partner-inventory-delete-"]').click();
      await addedInventoryItem.waitFor({ state: 'detached' });

      assert.equal(await page.locator('[data-testid="partner-admit-ht-qr-btn"]').count(), 0);
      await page.click('[data-testid="partner-voice-match-btn"]');
      await page.waitForSelector('[data-testid="partner-voice-upgrade-gate"]');

      // D.2) HT Coordinator package unlocks Embedded AI, HT QR and Voice Catalog Match
      await page.click('[data-testid="mobile-tab-partner_switch"]');
      await page.click('[data-testid="persona-role-dropdown-btn"]');
      await page.click('[data-testid="persona-pill-ht_coordinator"]');
      await page.waitForSelector('[data-testid="mobile-ht-lead-ops"]');
      await page.click('[data-testid="mobile-tab-partner_agenda"]');
      await page.waitForSelector('[data-testid="mobile-partner-agenda-page"]');
      await page.click('[data-testid="partner-management-tab-storefront"]');
      assert.equal(await page.locator('[data-testid="partner-ai-upgrade-gate"]').count(), 0);
      await page.waitForSelector('[data-testid="partner-embedded-ai-studio"]');
      await page.click('[data-testid="mobile-tab-partner_pos"]');
      await page.waitForSelector('[data-testid="mobile-partner-pos-page"]');
      await page.waitForSelector('[data-testid="partner-admit-ht-qr-btn"]');
      await page.click('[data-testid="partner-admit-ht-qr-btn"]');
      await page.waitForSelector('[data-testid="partner-admitted-patient-banner"]');
      await page.click('[data-testid="partner-voice-match-btn"]');
      await page.waitForSelector('[data-testid="partner-live-breakdown-card"]');
      await page.click('[data-testid="partner-publish-breakdown-qr-btn"]');
      await page.waitForSelector('[data-testid="partner-generated-payment-qr"]');
      await page.click('[data-testid="partner-pos-cash-checkout-btn"]');

      // D.3) Switch back to Customer Mode & confirm Payment QR with Optional Tip in Wallet
      await page.click('[data-testid="mobile-tab-partner_switch"]');
      await page.click('[data-testid="mobile-mode-customer-btn"]');
      await page.click('[data-testid="mobile-tab-wallet"]');
      await page.waitForSelector('[data-testid="wallet-checkout-breakdown-card"]');
      await page.click('[data-testid="customer-confirm-qr-payment-btn"]');

      // D.4) Switch back to Partner -> Clinic Practitioner PHI Persona & Touch Canvas
      await page.click('[data-testid="mobile-tab-profile"]');
      await page.click('[data-testid="mobile-mode-partner-btn"]');
      await page.click('[data-testid="mobile-tab-partner_switch"]');
      await page.click('[data-testid="persona-role-dropdown-btn"]');
      await page.click('[data-testid="persona-pill-clinic_practitioner"]');
      await page.waitForSelector('[data-testid="mobile-clinic-workspace"]');
      await page.waitForSelector('[data-testid="clinic-touch-drawing-studio"]');
      await page.waitForSelector('[data-testid="clinic-consultation-canvas"]');

      // F) Role-Based Panel Isolation (?app=1&role=guest must show Partner button as muted/locked and block entry)
      await page.goto(`${url}/?app=1&role=guest#/`, { waitUntil: 'networkidle' });
      await page.click('[data-testid="mobile-tab-profile"]');
      await page.waitForSelector('[data-testid="panel-visibility-boundaries-card"]');
      assert.equal(
        await page.getAttribute('[data-testid="mobile-mode-partner-btn"]', 'data-locked'),
        'true',
        `Partner button must be muted/locked for guest role on ${vp.name}`
      );
      await page.click('[data-testid="mobile-mode-partner-btn"]', { force: true });
      assert.equal(
        await page.getAttribute('[data-testid="lari-mobile-app-shell"]', 'data-effective-mode'),
        'b2c_customer',
        `Guest must not enter partner mode on ${vp.name}`
      );
      await page.waitForSelector('[data-testid="mobile-partner-onboarding-funnel"]');
      await page.waitForSelector('[data-testid="partner-funnel-step-showcase"]');
      const showcaseText = await page
        .locator('[data-testid="partner-funnel-step-showcase"]')
        .innerText();
      assert.match(showcaseText, /90 GÜN ÜCRETSİZ DENEME/);
      assert.doesNotMatch(showcaseText, /Müşteri ve Partner Dünyaları Ayrı/i);
      await page.click('[data-testid="partner-funnel-open-preview-btn"]');
      await page.waitForSelector('[data-testid="partner-funnel-step-preview"]');
      await page.fill(
        '[data-testid="partner-funnel-business-name-input"]',
        'E2E LARİ Partner Stüdyo'
      );
      await page.click('[data-testid="partner-funnel-preview-management-tab"]');
      await page.waitForSelector('[data-testid="partner-funnel-management-preview"]');
      await page.click('[data-testid="partner-funnel-preview-continue-btn"]');
      await page.waitForSelector('[data-testid="partner-funnel-step-pricing"]');
      const starterPlan = page.locator('[data-testid="partner-funnel-plan-baslangic"]');
      assert.match(await starterPlan.innerText(), /999 TRY/);
      assert.match(await starterPlan.innerText(), /90 Gün Ücretsiz Deneme/);
      await starterPlan.click();
      await page.fill('[data-testid="partner-funnel-owner-name-input"]', 'E2E İşletme Sahibi');
      await page.fill('[data-testid="partner-funnel-phone-input"]', '5321234567');
      await page.fill('[data-testid="partner-funnel-email-input"]', 'partner-e2e@lari.app');
      await page.fill('[data-testid="partner-funnel-vkn-input"]', '1234567890');
      if (!(await page.isChecked('[data-testid="partner-funnel-name-confirm-checkbox"]'))) {
        await page.check('[data-testid="partner-funnel-name-confirm-checkbox"]');
      }
      await page.check('[data-testid="partner-funnel-kvkk-checkbox"]');
      await page.click('[data-testid="partner-funnel-checkout-btn"]');
      await page.waitForSelector('[data-testid="partner-funnel-step-setup"]');
      await page.fill('[data-testid="partner-funnel-service-name-input"]', 'E2E İmza Bakım');
      await page.fill('[data-testid="partner-funnel-staff-name-input"]', 'E2E Uzman Ada');
      await page.click('[data-testid="partner-funnel-activate-btn"]');
      await page.waitForSelector('[data-testid="mobile-partner-onboarding-funnel"]', {
        state: 'detached',
      });
      await page.waitForSelector('[data-testid="mobile-partner-agenda-page"]');
      assert.equal(
        await page.getAttribute('[data-testid="lari-mobile-app-shell"]', 'data-effective-mode'),
        'b2b_partner',
        `Completed guest onboarding must activate partner mode on ${vp.name}`
      );
      await page.click('[data-testid="partner-management-tab-storefront"]');
      await page.waitForSelector('[data-testid="partner-management-storefront-panel"]');

      // Verify daily working hours persistence across Partner tab navigation
      const dailyModePressed = await page.getAttribute(
        '[data-testid="partner-hours-daily-mode-toggle"]',
        'aria-pressed'
      );
      if (dailyModePressed !== 'true') {
        await page.click('[data-testid="partner-hours-daily-mode-toggle"]');
      }
      await page.waitForSelector('[data-testid="partner-hours-toggle-monday"]');
      await page.click('[data-testid="mobile-tab-partner_pos"]');
      await page.waitForSelector('[data-testid="mobile-partner-pos-page"]');
      await page.click('[data-testid="mobile-tab-partner_agenda"]');
      await page.click('[data-testid="partner-management-tab-storefront"]');
      await page.waitForSelector('[data-testid="partner-hours-toggle-monday"]');

      // Trigger 24h storefront edit lock and confirm hours/gallery are locked
      await page.click('[data-testid="partner-storefront-save-btn"]');
      const editLockBanner = page.locator(
        '[data-testid="partner-storefront-edit-lock-banner"]'
      );
      await editLockBanner.waitFor();
      assert.match(await editLockBanner.innerText(), /24 saatlik vitrin düzenleme kilidi/i);
      assert.match(await editLockBanner.innerText(), /\d{2}:\d{2}:\d{2} kaldı/);
      assert.equal(
        await page.locator('[data-testid="partner-hours-toggle-monday"]').isDisabled(),
        true,
        `Storefront lock must disable working hours edits on ${vp.name}`
      );
      assert.equal(
        await page.locator('[data-testid="partner-gallery-add-url-btn"]').isDisabled(),
        true,
        `Storefront lock must disable gallery URL additions on ${vp.name}`
      );

      // [SEV-0] Baslangic subscriber must NOT escalate persona to ht_coordinator or clinic_practitioner
      await page.click('[data-testid="mobile-tab-partner_switch"]');
      await page.click('[data-testid="persona-role-dropdown-btn"]');
      assert.equal(
        await page.locator('[data-testid="persona-pill-ht_coordinator"]').count(),
        0,
        `Baslangic plan must not expose ht_coordinator persona on ${vp.name}`
      );
      assert.equal(
        await page.locator('[data-testid="persona-pill-clinic_practitioner"]').count(),
        0,
        `Baslangic plan must not expose clinic_practitioner persona on ${vp.name}`
      );

      // [SEV-1] Multi-currency selection (USD) must propagate across Wallet
      await page.click('[data-testid="mobile-mode-customer-btn"]');
      await page.click('[data-testid="mobile-tab-profile"]');
      if ((await page.locator('#profile-currency').count()) === 0) {
        await page.click('button:has-text("Kişisel Bilgiler & İletişim")');
      }
      await page.waitForSelector('#profile-currency');
      await page.selectOption('#profile-currency', 'USD');
      await page.click('[data-testid="mobile-tab-wallet"]');
      await page.click('[data-testid="wallet-subtab-loyalty"]');
      await page.waitForSelector('[data-testid="wallet-loyalty-panel"]');
      const walletLoyaltyText = await page
        .locator('[data-testid="wallet-loyalty-panel"]')
        .innerText();
      assert.match(walletLoyaltyText, /\bUSD\b/);
      assert.doesNotMatch(walletLoyaltyText, /\bTRY\b/);

      // G) White-Label Storefront Lock (/m?slug=atelier-nisantasi)
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
