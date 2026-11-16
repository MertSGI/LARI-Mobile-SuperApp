import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildMobilePushTemplate,
  queueMobilePushDispatchDryRun,
} from '../services/mobile/mobilePushNotificationService';

function run() {
  const migrationPath = path.resolve(
    'supabase/migrations/20261020_mobile_device_push_tokens_and_notification_routing.sql'
  );
  const edgePath = path.resolve('supabase/functions/mobile-push-dispatch/index.ts');

  assert.ok(fs.existsSync(migrationPath), 'Push migration SQL missing');
  assert.ok(fs.existsSync(edgePath), 'mobile-push-dispatch Edge Function missing');

  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS must be enabled');
  assert.ok(
    sql.includes('REVOKE ALL ON TABLE public.mobile_device_push_tokens FROM PUBLIC, anon, authenticated'),
    'Direct table DML must be revoked'
  );
  assert.ok(
    sql.includes('SET search_path = public, pg_temp'),
    'SECURITY DEFINER RPCs must set search_path = public, pg_temp'
  );

  // Cross-tenant dispatch must fail closed
  const crossTenant = queueMobilePushDispatchDryRun({
    actorTenantId: 'tenant-A',
    targetTenantId: 'tenant-B',
    targetUserId: 'user-1',
    eventType: 'WAITLIST_SLOT_OPENED',
    tenantSlug: 'salon-b',
    referenceId: 'apt-1',
  });
  assert.equal(crossTenant.queued, false);
  assert.equal(crossTenant.reasonCode, 'CROSS_TENANT_BLOCKED');

  // Same-tenant dispatch queues with EXTERNAL_HOLD (0 TL rule)
  const validDispatch = queueMobilePushDispatchDryRun({
    actorTenantId: 'tenant-A',
    targetTenantId: 'tenant-A',
    targetUserId: 'user-1',
    eventType: 'HT_VIP_TRANSFER_IMMINENT',
    tenantSlug: 'clinic-a',
    referenceId: 'jrn-77',
  });
  assert.equal(validDispatch.queued, true);
  assert.equal(validDispatch.executionAuthority, 'EXTERNAL_HOLD');
  assert.equal(validDispatch.template?.deepLinkUrl, 'randevulari://ht/journey/jrn-77');

  const tpl = buildMobilePushTemplate({
    eventType: 'PACKAGE_CREDIT_DEDUCTED',
    tenantSlug: 'atelier-nisantasi',
    referenceId: 'tok-99',
  });
  assert.equal(tpl.category, 'pos_loyalty');
  assert.equal(tpl.targetMode, 'b2c_customer');

  console.log('PASS: verify-mobile-m9-push-migrations (all assertions)');
}

run();
