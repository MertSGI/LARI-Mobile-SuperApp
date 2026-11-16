import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

process.env.LC_ALL = 'C';
process.env.LANG = 'C';

function ensureWindowsVcRuntimeOnPath() {
  if (process.platform !== 'win32') return;
  const sysRoot = process.env.SystemRoot || 'C:\\Windows';
  const sys32 = path.join(sysRoot, 'System32');
  const requiredDlls = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'];
  const hasAll = (dir) => Boolean(dir) && requiredDlls.every((dll) => fs.existsSync(path.join(dir, dll)));
  if (hasAll(sys32)) return;
  const currentEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  if (currentEntries.some((entry) => hasAll(entry))) return;
  const candidates = [
    path.join(sys32, 'Microsoft-Edge-WebView'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'EdgeWebView', 'Application'),
  ];
  const foundDir = candidates.find((dir) => hasAll(dir));
  if (foundDir) {
    process.env.PATH = `${foundDir}${path.delimiter}${process.env.PATH || ''}`;
  }
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function runPgTests() {
  ensureWindowsVcRuntimeOnPath();
  const rootDir = process.cwd();
  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
  const testsDir = path.join(rootDir, 'supabase', 'tests');

  const tmpDir = path.join(os.tmpdir(), `lari-d1-pg-replay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  const pgDataDir = path.join(tmpDir, 'pgdata');
  fs.mkdirSync(pgDataDir, { recursive: true });

  let pgInstance = null;
  let client = null;
  try {
    const port = await getAvailablePort();
    pgInstance = new EmbeddedPostgres({
      databaseDir: pgDataDir,
      user: 'postgres',
      password: 'password',
      port,
      initdbFlags: ['--locale=C', '--encoding=UTF8', '--no-sync'],
      postgresFlags: ['-F'],
      persistent: false,
    });
    await pgInstance.initialise();
    await pgInstance.start();

    client = pgInstance.getPgClient('postgres', '127.0.0.1');
    await client.connect();
    await client.query(`ALTER DATABASE postgres SET synchronous_commit = 'off'; SET synchronous_commit = 'off';`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS extensions;`);
    const bootstrapSql = fs.readFileSync(path.join(testsDir, 'fixtures', 'p2a_managed_runtime_bootstrap.sql'), 'utf8');
    await client.query(bootstrapSql);

    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    assert.equal(migrationFiles.length, 71, `Expected 71 total migrations, got ${migrationFiles.length}`);

    const bridgeSql = fs.readFileSync(
      path.join(testsDir, 'fixtures', 'p2a_historical_replay_bridge_before_migration_38.sql'),
      'utf8'
    );
    for (const file of migrationFiles) {
      if (file === '20260813_h1c_commercial_eligibility_and_quota_enforcement.sql') {
        await client.query(bridgeSql);
      }
      if (file === '20260901_payment_webhook_idempotency_and_replay_security.sql') {
        await client.query(`
          ALTER TABLE public.subscriptions
          ADD COLUMN IF NOT EXISTS provider_token TEXT,
          ADD COLUMN IF NOT EXISTS provider_session_id TEXT;
        `);
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await client.query(sql);
      } catch (err) {
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    console.log(`[PASS] Replayed all ${migrationFiles.length} migrations on disposable PG 17`);

    // 1. Single 15-arg create_public_booking overload check (Pilot 4 invariant)
    const procRes = await client.query(`
      SELECT p.oid, pg_get_function_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'create_public_booking';
    `);
    assert.equal(procRes.rows.length, 1, 'pg_proc must contain exactly ONE create_public_booking overload');

    // 2. Setup fixture tenant, owner, staff, service, branch, availability
    const tenantId = 'bbbb2222-b2b2-b2b2-b2b2-bbbbbbbbbbbb';
    const tenantBId = 'cccc3333-c3c3-c3c3-c3c3-cccccccccccc';
    const ownerUid = '11111111-aaaa-1111-aaaa-111111111111';
    const staffUid = '22222222-bbbb-2222-bbbb-222222222222';
    const branchId = '33333333-cccc-3333-cccc-333333333333';
    const serviceId = '44444444-dddd-4444-dddd-444444444444';
    const staffId = '55555555-eeee-5555-eeee-555555555555';

    // Determine a future Monday date within 90 days (ISO weekday 1)
    const d = new Date();
    d.setDate(d.getDate() + 7);
    while (d.getUTCDay() !== 1) {
      d.setDate(d.getDate() + 1);
    }
    const futureDate = d.toISOString().slice(0, 10);

    await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'owner-d1@example.test'), ($2, 'staff-d1@example.test') ON CONFLICT DO NOTHING;`, [ownerUid, staffUid]);
    await client.query(`
      INSERT INTO public.tenants (id, slug, name, status, onboarding_status, public_site_status)
      VALUES
        ($1, 'd1-salon', 'D1 Salon', 'active', 'completed', 'published'),
        ($2, 'd1-salon-b', 'D1 Salon B', 'active', 'completed', 'published');
    `, [tenantId, tenantBId]);
    await client.query(`
      INSERT INTO public.users_profile (id, tenant_id, name, role, active)
      VALUES
        ($1, $3, 'D1 Owner', 'tenant_owner', true),
        ($2, $3, 'D1 Staff', 'staff', true);
    `, [ownerUid, staffUid, tenantId]);
    await client.query(`
      INSERT INTO public.subscriptions (tenant_id, plan_id, plan_version_id, status, billing_mode, current_period_start, current_period_end)
      SELECT $1, p.code, pv.id, 'active', 'manual', now(), now() + interval '1 year'
      FROM public.plan_versions pv
      JOIN public.plans p ON p.id = pv.plan_id
      WHERE p.code = 'kurumsal' AND pv.lifecycle_status = 'published'
      LIMIT 1;
    `, [tenantId]);
    await client.query(`
      INSERT INTO public.branches (id, tenant_id, name, slug, is_active, is_primary, timezone)
      VALUES ($1, $2, 'Main Branch', 'main-branch', true, true, 'Europe/Istanbul');
    `, [branchId, tenantId]);
    await client.query(`
      INSERT INTO public.services (id, tenant_id, name, name_tr, duration, price, active)
      VALUES ($1, $2, 'Laser Care', 'Lazer Bakım', 60, 1200, true);
    `, [serviceId, tenantId]);
    await client.query(`
      INSERT INTO public.staff (id, tenant_id, user_profile_id, name, active)
      VALUES ($1, $2, $3, 'D1 Specialist', true);
    `, [staffId, tenantId, staffUid]);
    await client.query(`INSERT INTO public.staff_branches (tenant_id, staff_id, branch_id) VALUES ($1, $2, $3);`, [tenantId, staffId, branchId]);
    await client.query(`INSERT INTO public.service_branches (tenant_id, service_id, branch_id) VALUES ($1, $2, $3);`, [tenantId, serviceId, branchId]);
    await client.query(`INSERT INTO public.staff_services (staff_id, service_id) VALUES ($1, $2);`, [staffId, serviceId]);
    await client.query(`
      INSERT INTO public.availability_rules (tenant_id, staff_id, weekday, start_time, end_time, is_active)
      VALUES ($1, $2, 1, '09:00', '18:00', true);
    `, [tenantId, staffId]);

    // 3. Test 20260909 (Scheduling Constraints: Break + Buffer) & 20260915 (Asymmetric Buffer Parity)
    await client.query(`
      INSERT INTO public.staff_breaks (tenant_id, staff_id, weekday, start_time, end_time, label, is_active)
      VALUES ($1, $2, 1, '12:30', '13:30', 'Lunch', true);
    `, [tenantId, staffId]);
    await client.query(`
      INSERT INTO public.booking_buffer_rules (tenant_id, service_id, buffer_before, buffer_after, is_active)
      VALUES ($1, $2, 0, 15, true);
    `, [tenantId, serviceId]);

    const breakCheck = (await client.query(`
      SELECT public.evaluate_booking_slot($1, $2, $3, $4, $5::date, '12:30'::time) AS res;
    `, [tenantId, branchId, serviceId, staffId, futureDate])).rows[0].res;
    assert.equal(breakCheck.allowed, false);
    assert.equal(breakCheck.reason_code, 'staff_break');

    // 4. Test 20260912 (Resource Capacity & Atomic Allocation via create_public_booking)
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    const resCreate = (await client.query(`
      SELECT public.admin_create_resource($1, $2, 'Room A', 'room', 1) AS res;
    `, [tenantId, branchId])).rows[0].res;
    assert.equal(resCreate.success, true);
    const resourceId = resCreate.resource_id;

    const reqCreate = (await client.query(`
      SELECT public.admin_set_service_resource_requirement($1, $2, $3, 'room', 1, true) AS res;
    `, [tenantId, serviceId, resourceId])).rows[0].res;
    assert.equal(reqCreate.success, true);

    // Book at 10:00 via canonical 15-arg create_public_booking as anon
    await client.query(`SELECT set_config('request.jwt.claim.sub', '', false); SET ROLE anon;`);
    const bookRes = (await client.query(`
      SELECT public.create_public_booking(
        'd1-salon', $1, $2, $3::date, '10:00'::time,
        'Ali Veli', 'ali@example.test', '+905551112233',
        true, false, false, 'idemp-d1-1', $4, NULL, 'fp-d1'
      ) AS res;
    `, [serviceId, staffId, futureDate, branchId])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(bookRes.success, true, `Expected booking success, got ${JSON.stringify(bookRes)}`);
    assert.equal(bookRes.allocation_plan.length, 1);
    assert.equal(bookRes.allocation_plan[0].resource_id, resourceId);

    // Verify 20260915 asymmetric buffer parity: 11:00 is inside 10:00-11:00 + 15min buffer_after -> slot_conflict!
    const bufferConflict = (await client.query(`
      SELECT public.evaluate_booking_slot($1, $2, $3, $4, $5::date, '11:00'::time) AS res;
    `, [tenantId, branchId, serviceId, staffId, futureDate])).rows[0].res;
    assert.equal(bufferConflict.allowed, false);
    assert.equal(bufferConflict.reason_code, 'slot_conflict');

    // 11:15 is outside 15min buffer_after -> allowed!
    const afterBufferOk = (await client.query(`
      SELECT public.evaluate_booking_slot($1, $2, $3, $4, $5::date, '11:15'::time) AS res;
    `, [tenantId, branchId, serviceId, staffId, futureDate])).rows[0].res;
    assert.equal(afterBufferOk.allowed, true);
    console.log('[PASS] Scheduling, resource allocation & asymmetric buffer parity verified');

    // 5. Test 20260910 (Waitlist Lifecycle + Rate-Limit + Sanitized Projection + Token Claim)
    await client.query(`SET ROLE anon;`);
    const joinRes = (await client.query(`
      SELECT public.join_booking_waitlist(
        $1, $2, $3::date, 'Ayşe Kaya', '+905559998877', 'ayse@example.test', $4, $5
      ) AS res;
    `, [tenantId, serviceId, futureDate, staffId, branchId])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(joinRes.success, true, `Waitlist join failed: ${JSON.stringify(joinRes)}`);

    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    await client.query(`SET ROLE authenticated;`);
    const offerRes = (await client.query(`
      SELECT public.offer_waitlist_slot($1, $2::date, '14:00'::time, $3, $4, 60) AS res;
    `, [joinRes.waitlist_id, futureDate, staffId, branchId])).rows[0].res;
    assert.equal(offerRes.success, true);
    assert.ok(offerRes.claim_token && offerRes.claim_token.length === 64);

    const listed = (await client.query(`SELECT * FROM public.get_sanitized_waitlist_entries($1);`, [tenantId])).rows;
    assert.equal(listed.length, 1);
    assert.equal('claim_token_hash' in listed[0], false, 'claim_token_hash must never be exposed');
    await client.query(`RESET ROLE;`);

    await client.query(`SELECT set_config('request.jwt.claim.sub', '', false); SET ROLE anon;`);
    const claimRes = (await client.query(`
      SELECT public.claim_waitlist_slot($1) AS res;
    `, [offerRes.claim_token])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(claimRes.success, true, `Waitlist claim failed: ${JSON.stringify(claimRes)}`);
    assert.equal(claimRes.status, 'claimed');

    // ADIM033-RES-001: Verify waitlist claim persisted exact appointment_resources row
    const waitlistResRows = (await client.query(`
      SELECT resource_id, quantity FROM public.appointment_resources WHERE appointment_id = $1;
    `, [claimRes.appointment_id])).rows;
    assert.equal(waitlistResRows.length, 1, 'Waitlist claim must persist appointment_resources row');
    assert.equal(waitlistResRows[0].resource_id, resourceId);
    assert.equal(waitlistResRows[0].quantity, 1);

    // ADIM033-RES-001 negative: two offers for different staff at same time sharing capacity-1 Room A -> only first claim succeeds
    const staff2Uid = '66666666-ffff-6666-ffff-666666666666';
    const staff2Id = '77777777-1111-7777-1111-777777777777';
    await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'staff2-d1@example.test') ON CONFLICT DO NOTHING;`, [staff2Uid]);
    await client.query(`INSERT INTO public.users_profile (id, tenant_id, name, role, active) VALUES ($1, $2, 'D1 Staff 2', 'staff', true);`, [staff2Uid, tenantId]);
    await client.query(`INSERT INTO public.staff (id, tenant_id, user_profile_id, name, active) VALUES ($1, $2, $3, 'D1 Specialist 2', true);`, [staff2Id, tenantId, staff2Uid]);
    await client.query(`INSERT INTO public.staff_branches (tenant_id, staff_id, branch_id) VALUES ($1, $2, $3);`, [tenantId, staff2Id, branchId]);
    await client.query(`INSERT INTO public.staff_services (staff_id, service_id) VALUES ($1, $2);`, [staff2Id, serviceId]);
    await client.query(`INSERT INTO public.availability_rules (tenant_id, staff_id, weekday, start_time, end_time, is_active) VALUES ($1, $2, 1, '09:00', '18:00', true);`, [tenantId, staff2Id]);

    await client.query(`SET ROLE anon;`);
    const joinA = (await client.query(`SELECT public.join_booking_waitlist($1, $2, $3::date, 'Müşteri A', '+905559990001', 'a@example.test', $4, $5) AS res;`, [tenantId, serviceId, futureDate, staffId, branchId])).rows[0].res;
    const joinB = (await client.query(`SELECT public.join_booking_waitlist($1, $2, $3::date, 'Müşteri B', '+905559990002', 'b@example.test', $4, $5) AS res;`, [tenantId, serviceId, futureDate, staff2Id, branchId])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(joinA.success, true);
    assert.equal(joinB.success, true);

    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    await client.query(`SET ROLE authenticated;`);
    const offerA = (await client.query(`SELECT public.offer_waitlist_slot($1, $2::date, '15:30'::time, $3, $4, 60) AS res;`, [joinA.waitlist_id, futureDate, staffId, branchId])).rows[0].res;
    const offerB = (await client.query(`SELECT public.offer_waitlist_slot($1, $2::date, '15:30'::time, $3, $4, 60) AS res;`, [joinB.waitlist_id, futureDate, staff2Id, branchId])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(offerA.success, true);
    assert.equal(offerB.success, true);

    await client.query(`SELECT set_config('request.jwt.claim.sub', '', false); SET ROLE anon;`);
    const claimA = (await client.query(`SELECT public.claim_waitlist_slot($1) AS res;`, [offerA.claim_token])).rows[0].res;
    const claimB = (await client.query(`SELECT public.claim_waitlist_slot($1) AS res;`, [offerB.claim_token])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(claimA.success, true, `First waitlist claim should succeed: ${JSON.stringify(claimA)}`);
    const claimAResRows = (await client.query(`SELECT resource_id, quantity FROM public.appointment_resources WHERE appointment_id = $1;`, [claimA.appointment_id])).rows;
    assert.equal(claimAResRows.length, 1);
    assert.equal(claimAResRows[0].resource_id, resourceId);
    assert.equal(claimAResRows[0].quantity, 1);
    assert.equal(claimB.success, false, 'Second waitlist claim sharing capacity-1 room must be rejected');
    assert.equal(claimB.reason_code, 'resource_unavailable');
    console.log('[PASS] Waitlist lifecycle & cross-staff resource lock invariant (ADIM033-RES-001) verified');

    // ADIM033-RES-002: Overlapping requirements within single allocation_plan must account for planned quantities & merge per resource_id
    const serviceOverlapId = '88888888-2222-8888-2222-888888888888';
    const serviceMergedId = '99999999-3333-9999-3333-999999999999';
    await client.query(`
      INSERT INTO public.services (id, tenant_id, name, name_tr, duration, price, active)
      VALUES
        ($1, $3, 'Overlap Room Service', 'Çakışan Oda', 45, 900, true),
        ($2, $3, 'Merged Chair Service', 'Birleşik Koltuk', 45, 700, true);
    `, [serviceOverlapId, serviceMergedId, tenantId]);
    await client.query(`INSERT INTO public.service_branches (tenant_id, service_id, branch_id) VALUES ($1, $2, $4), ($1, $3, $4);`, [tenantId, serviceOverlapId, serviceMergedId, branchId]);
    await client.query(`INSERT INTO public.staff_services (staff_id, service_id) VALUES ($1, $2), ($1, $3);`, [staffId, serviceOverlapId, serviceMergedId]);

    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    await client.query(`SELECT public.admin_set_service_resource_requirement($1, $2, $3, 'room', 1, true);`, [tenantId, serviceOverlapId, resourceId]);
    await client.query(`SELECT public.admin_set_service_resource_requirement($1, $2, NULL, 'room', 1, true);`, [tenantId, serviceOverlapId]);

    const overlapPlan = (await client.query(`
      SELECT public.evaluate_and_lock_resource_plan($1, $2, $3, $4::date, '16:45'::time, 45, NULL, FALSE) AS res;
    `, [tenantId, branchId, serviceOverlapId, futureDate])).rows[0].res;
    assert.equal(overlapPlan.allowed, false, 'Overlapping requirements on capacity-1 room must fail with resource_unavailable');
    assert.equal(overlapPlan.reason_code, 'resource_unavailable');

    await client.query(`SELECT set_config('request.jwt.claim.sub', '', false); SET ROLE anon;`);
    const overlapBook = (await client.query(`
      SELECT public.create_public_booking(
        'd1-salon', $1, $2, $3::date, '16:45'::time,
        'Veli Can', 'veli@example.test', '+905551112299',
        true, false, false, 'idemp-overlap-1', $4, NULL, 'fp-overlap'
      ) AS res;
    `, [serviceOverlapId, staffId, futureDate, branchId])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(overlapBook.success, false);
    assert.equal(overlapBook.reason_code, 'resource_unavailable');

    // Capacity-2 resource satisfying two quantity=1 requirements merges into single appointment_resources row (quantity=2)
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    const chairRes = (await client.query(`SELECT public.admin_create_resource($1, $2, 'Double Chair', 'chair', 2) AS res;`, [tenantId, branchId])).rows[0].res;
    assert.equal(chairRes.success, true);
    await client.query(`SELECT public.admin_set_service_resource_requirement($1, $2, $3, 'chair', 1, true);`, [tenantId, serviceMergedId, chairRes.resource_id]);
    await client.query(`SELECT public.admin_set_service_resource_requirement($1, $2, NULL, 'chair', 1, true);`, [tenantId, serviceMergedId]);

    await client.query(`SELECT set_config('request.jwt.claim.sub', '', false); SET ROLE anon;`);
    const mergedBook = (await client.query(`
      SELECT public.create_public_booking(
        'd1-salon', $1, $2, $3::date, '16:45'::time,
        'Deniz Ak', 'deniz@example.test', '+905551112288',
        true, false, false, 'idemp-merged-1', $4, NULL, 'fp-merged'
      ) AS res;
    `, [serviceMergedId, staffId, futureDate, branchId])).rows[0].res;
    await client.query(`RESET ROLE;`);
    assert.equal(mergedBook.success, true, `Expected merged chair booking success, got ${JSON.stringify(mergedBook)}`);
    assert.equal(mergedBook.allocation_plan.length, 1, 'Plan must merge overlapping allocations per resource_id');
    assert.equal(mergedBook.allocation_plan[0].quantity, 2);
    const mergedArRows = (await client.query(`SELECT resource_id, quantity FROM public.appointment_resources WHERE appointment_id = $1;`, [mergedBook.appointment_id])).rows;
    assert.equal(mergedArRows.length, 1);
    assert.equal(mergedArRows[0].quantity, 2);
    console.log('[PASS] Intra-plan resource capacity & merge invariant (ADIM033-RES-002) verified');

    // 6. Test 20260911 (Calendar Sync Queue & Background Job Worker Lifecycle + ADIM033-JOB-004 Fencing)
    const jobLegacyProcs = (await client.query(`
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_arguments(p.oid) AS full_args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN ('complete_background_job', 'fail_background_job')
      ORDER BY p.proname;
    `)).rows;
    assert.equal(jobLegacyProcs.length, 2, 'Only hardened complete_background_job and fail_background_job signatures may exist');
    assert.ok(jobLegacyProcs.every((r) => r.args.includes('p_worker_id text')), 'Finalize RPCs must require p_worker_id');
    assert.ok(
      jobLegacyProcs.every((r) => r.full_args.includes('p_lease_token uuid') && !r.full_args.includes('p_lease_token uuid DEFAULT')),
      'Finalize RPCs must require p_lease_token without DEFAULT'
    );

    const calCrossTenant = (await client.query(`
      SELECT public.enqueue_calendar_sync($1, $2, 'deterministic_test') AS res;
    `, [tenantBId, bookRes.appointment_id])).rows[0].res;
    assert.equal(calCrossTenant.success, false);
    assert.equal(calCrossTenant.error, 'APPOINTMENT_TENANT_MISMATCH');

    const calOk = (await client.query(`
      SELECT public.enqueue_calendar_sync($1, $2, 'deterministic_test') AS res;
    `, [tenantId, bookRes.appointment_id])).rows[0].res;
    assert.equal(calOk.success, true);

    const jobEnq = (await client.query(`
      SELECT public.enqueue_background_job('booking_availability_refresh', $1, '{}'::jsonb, 'job-d1-1', 2) AS res;
    `, [tenantId])).rows[0].res;
    assert.equal(jobEnq.success, true);

    // Negative ADIM033-JOB-004: Unclaimed job cannot be completed or failed (and tokenless calls are rejected)
    const dummyToken = crypto.randomUUID();
    const unclaimedComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-1', $2, '{"ok":true}'::jsonb) AS res;
    `, [jobEnq.job_id, dummyToken])).rows[0].res;
    assert.equal(unclaimedComplete.success, false);
    assert.equal(unclaimedComplete.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    const unclaimedFail = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-1', $2, 'ERR', 'unclaimed') AS res;
    `, [jobEnq.job_id, dummyToken])).rows[0].res;
    assert.equal(unclaimedFail.success, false);
    assert.equal(unclaimedFail.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    await assert.rejects(
      async () => client.query(`SELECT public.complete_background_job($1, 'worker-1', '{"ok":true}'::jsonb) AS res;`, [jobEnq.job_id]),
      (err) => err && err.code === '42883',
      'Tokenless complete_background_job call must be rejected by signature'
    );
    await assert.rejects(
      async () => client.query(`SELECT public.fail_background_job($1, 'worker-1', 'ERR', 'no token', 10) AS res;`, [jobEnq.job_id]),
      (err) => err && err.code === '42883',
      'Tokenless fail_background_job call must be rejected by signature'
    );

    // Claim as worker-1 -> non-owner worker-2 rejected -> expire lease & reclaim as worker-2 -> stale worker-1 rejected -> worker-2 succeeds
    const claimed1 = (await client.query(`SELECT public.claim_background_job_batch('worker-1', 5, 60) AS res;`)).rows[0].res;
    assert.equal(claimed1.claimed_count, 1);
    const token1 = claimed1.claimed_jobs[0].lease_token;
    assert.ok(token1);

    const wrongWorkerComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-2', $2, '{"ok":true}'::jsonb) AS res;
    `, [jobEnq.job_id, token1])).rows[0].res;
    assert.equal(wrongWorkerComplete.success, false);

    const nullTokenComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-1', NULL::uuid, '{"ok":true}'::jsonb) AS res;
    `, [jobEnq.job_id])).rows[0].res;
    assert.equal(nullTokenComplete.success, false);
    assert.equal(nullTokenComplete.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    await client.query(`UPDATE public.background_job_runs SET lease_until = NOW() - interval '5 seconds' WHERE id = $1;`, [jobEnq.job_id]);
    const claimed2 = (await client.query(`SELECT public.claim_background_job_batch('worker-2', 5, 60) AS res;`)).rows[0].res;
    assert.equal(claimed2.claimed_count, 1);
    const token2 = claimed2.claimed_jobs[0].lease_token;
    assert.notEqual(token2, token1);

    const staleWorkerComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-1', $2, '{"stale":true}'::jsonb) AS res;
    `, [jobEnq.job_id, token1])).rows[0].res;
    assert.equal(staleWorkerComplete.success, false);

    const staleWorkerFail = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-1', $2, 'STALE', 'stale fail', 10) AS res;
    `, [jobEnq.job_id, token1])).rows[0].res;
    assert.equal(staleWorkerFail.success, false);

    const completed = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-2', $2, '{"ok":true}'::jsonb) AS res;
    `, [jobEnq.job_id, token2])).rows[0].res;
    assert.equal(completed.success, true);
    assert.equal(completed.status, 'completed');

    // Negative ADIM033-JOB-004 (same worker_id fencing): expire lease and reclaim with SAME worker_id -> old token & missing/NULL token rejected, only new token succeeds
    const jobSameWorker = (await client.query(`
      SELECT public.enqueue_background_job('booking_availability_refresh', $1, '{}'::jsonb, 'job-d1-same-worker', 3) AS res;
    `, [tenantId])).rows[0].res;
    assert.equal(jobSameWorker.success, true);

    const sameClaim1 = (await client.query(`SELECT public.claim_background_job_batch('worker-same', 5, 60) AS res;`)).rows[0].res;
    assert.equal(sameClaim1.claimed_count, 1);
    const sameToken1 = sameClaim1.claimed_jobs[0].lease_token;
    assert.ok(sameToken1);

    await client.query(`UPDATE public.background_job_runs SET lease_until = NOW() - interval '5 seconds' WHERE id = $1;`, [jobSameWorker.job_id]);
    const sameClaim2 = (await client.query(`SELECT public.claim_background_job_batch('worker-same', 5, 60) AS res;`)).rows[0].res;
    assert.equal(sameClaim2.claimed_count, 1);
    const sameToken2 = sameClaim2.claimed_jobs[0].lease_token;
    assert.notEqual(sameToken2, sameToken1);

    const sameOldTokenComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-same', $2, '{"stale":true}'::jsonb) AS res;
    `, [jobSameWorker.job_id, sameToken1])).rows[0].res;
    assert.equal(sameOldTokenComplete.success, false);
    assert.equal(sameOldTokenComplete.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    const sameOldTokenFail = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-same', $2, 'STALE', 'old token', 10) AS res;
    `, [jobSameWorker.job_id, sameToken1])).rows[0].res;
    assert.equal(sameOldTokenFail.success, false);
    assert.equal(sameOldTokenFail.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    const sameNullTokenComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-same', NULL::uuid, '{"nullToken":true}'::jsonb) AS res;
    `, [jobSameWorker.job_id])).rows[0].res;
    assert.equal(sameNullTokenComplete.success, false);
    assert.equal(sameNullTokenComplete.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    const sameNullTokenFail = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-same', NULL::uuid, 'NULL_TOK', 'null token', 10) AS res;
    `, [jobSameWorker.job_id])).rows[0].res;
    assert.equal(sameNullTokenFail.success, false);
    assert.equal(sameNullTokenFail.error, 'JOB_LEASE_INVALID_OR_NOT_PROCESSING');

    const sameNewTokenComplete = (await client.query(`
      SELECT public.complete_background_job($1, 'worker-same', $2, '{"fresh":true}'::jsonb) AS res;
    `, [jobSameWorker.job_id, sameToken2])).rows[0].res;
    assert.equal(sameNewTokenComplete.success, true);
    assert.equal(sameNewTokenComplete.status, 'completed');

    // Also test fail_background_job retryable -> dead_letter lifecycle (including same-worker reclaim fencing before valid fail)
    const jobEnq2 = (await client.query(`
      SELECT public.enqueue_background_job('data_export_reminder', $1, '{}'::jsonb, 'job-d1-2', 3) AS res;
    `, [tenantId])).rows[0].res;
    const claimF1 = (await client.query(`SELECT public.claim_background_job_batch('worker-f', 5, 60) AS res;`)).rows[0].res;
    const fToken1 = claimF1.claimed_jobs[0].lease_token;
    await client.query(`UPDATE public.background_job_runs SET lease_until = NOW() - interval '5 seconds' WHERE id = $1;`, [jobEnq2.job_id]);
    const claimF2 = (await client.query(`SELECT public.claim_background_job_batch('worker-f', 5, 60) AS res;`)).rows[0].res;
    const fToken2 = claimF2.claimed_jobs[0].lease_token;
    assert.notEqual(fToken2, fToken1);

    const staleSameWorkerFail = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-f', $2, 'STALE_ERR', 'stale token', 1) AS res;
    `, [jobEnq2.job_id, fToken1])).rows[0].res;
    assert.equal(staleSameWorkerFail.success, false);

    const fail1 = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-f', $2, 'TMP_ERR', 'retryable', 1) AS res;
    `, [jobEnq2.job_id, fToken2])).rows[0].res;
    assert.equal(fail1.success, true);
    assert.equal(fail1.status, 'failed_retryable');
    await client.query(`UPDATE public.background_job_runs SET next_attempt_at = NOW() - interval '1 second' WHERE id = $1;`, [jobEnq2.job_id]);
    const claimF3 = (await client.query(`SELECT public.claim_background_job_batch('worker-f', 5, 60) AS res;`)).rows[0].res;
    const fail2 = (await client.query(`
      SELECT public.fail_background_job($1, 'worker-f', $2, 'FATAL_ERR', 'dead letter', 1) AS res;
    `, [jobEnq2.job_id, claimF3.claimed_jobs[0].lease_token])).rows[0].res;
    assert.equal(fail2.success, true);
    assert.equal(fail2.status, 'dead_letter');
    console.log('[PASS] Calendar sync queue & fenced background job worker lifecycle (ADIM033-JOB-004) verified');

    // 7. Test 20260913 (Reporting & Analytics RPCs + ADIM033-ANA-003 Role Allowlist & Staff Branch Scoping)
    const branch2Id = 'aaaaaaaa-4444-aaaa-4444-aaaaaaaaaaaa';
    const serviceB2Id = 'bbbbbbbb-5555-bbbb-5555-bbbbbbbbbbbb';
    const staffB2Id = 'cccccccc-6666-cccc-6666-cccccccccccc';
    const customerUid = 'dddddddd-7777-dddd-7777-dddddddddddd';
    const customerB2Id = 'eeeeeeee-8888-eeee-8888-eeeeeeeeeeee';
    await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'customer-d1@example.test') ON CONFLICT DO NOTHING;`, [customerUid]);
    await client.query(`INSERT INTO public.users_profile (id, tenant_id, name, role, active) VALUES ($1, $2, 'D1 Customer', 'customer', true);`, [customerUid, tenantId]);
    await client.query(`INSERT INTO public.branches (id, tenant_id, name, slug, is_active, is_primary, timezone) VALUES ($1, $2, 'Unassigned Branch', 'unassigned-branch', true, false, 'Europe/Istanbul');`, [branch2Id, tenantId]);
    await client.query(`INSERT INTO public.services (id, tenant_id, name, name_tr, duration, price, active) VALUES ($1, $2, 'Branch 2 Only Service', 'Şube 2 Özel', 30, 800, true);`, [serviceB2Id, tenantId]);
    await client.query(`INSERT INTO public.staff (id, tenant_id, name, active) VALUES ($1, $2, 'Branch 2 Staff', true);`, [staffB2Id, tenantId]);
    await client.query(`INSERT INTO public.staff_branches (tenant_id, staff_id, branch_id) VALUES ($1, $2, $3);`, [tenantId, staffB2Id, branch2Id]);
    await client.query(`INSERT INTO public.service_branches (tenant_id, service_id, branch_id) VALUES ($1, $2, $3);`, [tenantId, serviceB2Id, branch2Id]);
    await client.query(`INSERT INTO public.staff_services (staff_id, service_id) VALUES ($1, $2);`, [staffB2Id, serviceB2Id]);
    await client.query(`INSERT INTO public.customers (id, tenant_id, name, phone) VALUES ($1, $2, 'Branch2 Cust', '+905558887766');`, [customerB2Id, tenantId]);
    await client.query(`
      INSERT INTO public.appointments (tenant_id, branch_id, customer_id, user_name, phone, service_id, staff_id, appointment_date, appointment_time, duration_minutes, status)
      VALUES ($1, $2, $3, 'Branch2 Cust', '+905558887766', $4, $5, $6::date, '11:00'::time, 30, 'confirmed');
    `, [tenantId, branch2Id, customerB2Id, serviceB2Id, staffB2Id, futureDate]);

    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    await client.query(`SET ROLE authenticated;`);
    const bookingAnalytics = (await client.query(`
      SELECT public.get_tenant_booking_analytics($1, NULL, $2::date, $2::date) AS res;
    `, [tenantId, futureDate])).rows[0].res;
    assert.equal(bookingAnalytics.metrics.total_bookings, 5);
    assert.equal(bookingAnalytics.metrics.financial_metric_classification, 'ESTIMATED_REVENUE');
    assert.equal(bookingAnalytics.attribution.acquisition_source_status, 'NOT_AVAILABLE_IN_CURRENT_SOURCE_TRUTH');

    const branchComp = (await client.query(`
      SELECT public.get_tenant_branch_comparison_analytics($1, $2::date, $2::date) AS res;
    `, [tenantId, futureDate])).rows[0].res;
    assert.equal(branchComp.branch_comparison.length, 2);
    await client.query(`RESET ROLE;`);

    // Negative ADIM033-ANA-003: customer role in same tenant must receive SQLSTATE 42501 on ALL 5 analytics RPCs
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [customerUid]);
    await client.query(`SET ROLE authenticated;`);
    const customerRpcCalls = [
      [`SELECT public.get_tenant_booking_analytics($1, $2, $3::date, $3::date);`, [tenantId, branchId, futureDate]],
      [`SELECT public.get_tenant_staff_performance_analytics($1, $2, $3::date, $3::date);`, [tenantId, branchId, futureDate]],
      [`SELECT public.get_tenant_service_performance_analytics($1, $2, $3::date, $3::date);`, [tenantId, branchId, futureDate]],
      [`SELECT public.get_tenant_branch_comparison_analytics($1, $2::date, $2::date);`, [tenantId, futureDate]],
      [`SELECT public.get_tenant_customer_retention_analytics($1, $2::date, $2::date);`, [tenantId, futureDate]],
    ];
    for (const [sqlText, params] of customerRpcCalls) {
      await assert.rejects(
        async () => client.query(sqlText, params),
        (err) => err && err.code === '42501',
        `Customer must receive 42501 for ${sqlText}`
      );
    }
    await client.query(`RESET ROLE;`);

    // Staff branch scoping: staffUid (only assigned to branchId) denied on branch2Id, scoped to branchId when branch=NULL
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [staffUid]);
    await client.query(`SET ROLE authenticated;`);
    await assert.rejects(
      async () => client.query(`SELECT public.get_tenant_booking_analytics($1, $2, $3::date, $3::date);`, [tenantId, branch2Id, futureDate]),
      (err) => err && err.code === '42501'
    );
    await assert.rejects(
      async () => client.query(`SELECT public.get_tenant_service_performance_analytics($1, $2, $3::date, $3::date);`, [tenantId, branch2Id, futureDate]),
      (err) => err && err.code === '42501'
    );
    const staffAssignedBooking = (await client.query(`
      SELECT public.get_tenant_booking_analytics($1, $2, $3::date, $3::date) AS res;
    `, [tenantId, branchId, futureDate])).rows[0].res;
    assert.equal(staffAssignedBooking.metrics.total_bookings, 4);

    const staffBranchComp = (await client.query(`
      SELECT public.get_tenant_branch_comparison_analytics($1, $2::date, $2::date) AS res;
    `, [tenantId, futureDate])).rows[0].res;
    assert.equal(staffBranchComp.branch_comparison.length, 1);
    assert.equal(staffBranchComp.branch_comparison[0].branch_id, branchId);

    const staffServices = (await client.query(`
      SELECT public.get_tenant_service_performance_analytics($1, NULL, $2::date, $2::date) AS res;
    `, [tenantId, futureDate])).rows[0].res;
    assert.equal(
      staffServices.service_performance.some((s) => s.service_id === serviceB2Id),
      false,
      'Staff must not see unassigned branch-exclusive service analytics'
    );

    const ownerRetention = await (async () => {
      await client.query(`RESET ROLE;`);
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    await client.query(`SET ROLE authenticated;`);
      return (await client.query(`SELECT public.get_tenant_customer_retention_analytics($1, $2::date, $2::date) AS res;`, [tenantId, futureDate])).rows[0].res;
    })();
    await client.query(`RESET ROLE;`);
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [staffUid]);
    await client.query(`SET ROLE authenticated;`);
    const staffRetention = (await client.query(`
      SELECT public.get_tenant_customer_retention_analytics($1, $2::date, $2::date) AS res;
    `, [tenantId, futureDate])).rows[0].res;
    assert.equal(
      staffRetention.retention_metrics.total_active_customers,
      ownerRetention.retention_metrics.total_active_customers - 1,
      'Staff retention metrics must exclude customers from unassigned branches'
    );
    await client.query(`RESET ROLE;`);
    console.log('[PASS] Reporting & analytics RPCs + role/branch scoping (ADIM033-ANA-003) verified');

    // 8. Test 20260914 (Custom Domain Verification & EXTERNAL_HOLD Non-Live Resolution)
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [ownerUid]);
    await client.query(`SET ROLE authenticated;`);
    const domReq = (await client.query(`
      SELECT public.request_custom_domain($1, 'https://booking.d1salon.com:443/') AS res;
    `, [tenantId])).rows[0].res;
    assert.equal(domReq.success, true);
    assert.equal(domReq.normalized_hostname, 'booking.d1salon.com');
    assert.equal(domReq.provider_status, 'DOMAIN_PROVIDER_READY_NOT_CONNECTED');

    const domList = (await client.query(`SELECT public.get_tenant_custom_domains($1) AS res;`, [tenantId])).rows[0].res;
    assert.equal(domList.domains.length, 1);
    await client.query(`RESET ROLE;`);

    // Simulate verification -> TEST_PROVIDER_SIMULATED_VERIFIED must NOT resolve live
    const simVerify = (await client.query(`
      SELECT public.simulate_verify_custom_domain_for_testing($1, $2, $3) AS res;
    `, [tenantId, domReq.domain_id, domReq.verification_expected_value])).rows[0].res;
    assert.equal(simVerify.provider_status, 'TEST_PROVIDER_SIMULATED_VERIFIED');

    const liveResolve = (await client.query(`
      SELECT public.resolve_tenant_by_custom_domain('booking.d1salon.com') AS res;
    `)).rows[0].res;
    assert.equal(liveResolve.resolved, false, 'Simulated domain must NOT resolve as live tenant');
    console.log('[PASS] Custom domain EXTERNAL_HOLD invariant verified');

    console.log('\nALL ADIM-033 DISPOSABLE PG17 TESTS PASSED.');
  } finally {
    if (client) {
      try { await client.end(); } catch {}
    }
    if (pgInstance) {
      try { await pgInstance.stop(); } catch {}
    }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

await runPgTests();
