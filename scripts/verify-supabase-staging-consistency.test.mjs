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
    assert.equal(migrationFiles.length, 82, `Expected 82 total migrations, got ${migrationFiles.length}`);

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

    // 9. Test ADIM-034 Phase 6 (20260916..20260919): POS, Product Inventory, Suppliers/PO & Staff Commissions/Tips
    const posOverloads = (await client.query(`
      SELECT p.proname, count(*)::int AS cnt
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN ('pos_add_cart_item', 'pos_checkout_order')
      GROUP BY p.proname;
    `)).rows;
    assert.equal(posOverloads.length, 2);
    assert.ok(posOverloads.every((r) => r.cnt === 1), 'pos_add_cart_item and pos_checkout_order must each have 1 overload');

    // Setup owner staff record + second staff + tenant B staff for Phase 6 tests
    const ownerStaffId = '11111111-2222-3333-4444-555555555551';
    const tenantBStaffUid = 'bbbbbbbb-9999-bbbb-9999-bbbbbbbbbbbb';
    const tenantBStaffId = 'bbbbbbbb-9999-bbbb-9999-bbbbbbbbbbb2';
    const superAdminUid = '99999999-9999-9999-9999-999999999991';
    const inactiveStaffUid = '88888888-8888-8888-8888-888888888881';
    const inactiveStaffId = '88888888-8888-8888-8888-888888888882';

    await client.query(`
      INSERT INTO auth.users (id, email)
      VALUES ($1, 'staff-b@example.test'), ($2, 'super@example.test'), ($3, 'inactive-up@example.test')
      ON CONFLICT DO NOTHING;
    `, [tenantBStaffUid, superAdminUid, inactiveStaffUid]);
    await client.query(`
      INSERT INTO public.subscriptions (tenant_id, plan_id, plan_version_id, status, billing_mode, current_period_start, current_period_end)
      SELECT $1, p.code, pv.id, 'active', 'manual', now(), now() + interval '1 year'
      FROM public.plan_versions pv
      JOIN public.plans p ON p.id = pv.plan_id
      WHERE p.code = 'kurumsal' AND pv.lifecycle_status = 'published'
      LIMIT 1;
    `, [tenantBId]);
    await client.query(`
      INSERT INTO public.users_profile (id, tenant_id, name, role, active)
      VALUES
        ($1, $4, 'Tenant B Staff', 'staff', true),
        ($2, NULL, 'Super Admin', 'super_admin', true),
        ($3, $5, 'Deactivated Profile Staff', 'staff', false);
    `, [tenantBStaffUid, superAdminUid, inactiveStaffUid, tenantBId, tenantId]);
    await client.query(`
      INSERT INTO public.staff (id, tenant_id, user_profile_id, name, active, is_owner)
      VALUES
        ($1, $4, $5, 'Owner Staff', true, true),
        ($2, $6, $7, 'Tenant B Staff', true, false),
        ($3, $4, $8, 'Inactive Profile Staff', true, false);
    `, [ownerStaffId, tenantBStaffId, inactiveStaffId, tenantId, ownerUid, tenantBId, tenantBStaffUid, inactiveStaffUid]);

    const setAuthUid = async (uid) => {
      await client.query(`RESET ROLE;`);
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [uid || '']);
      if (uid) {
        await client.query(`SET ROLE authenticated;`);
      }
    };

    // 9a. Direct DML must be blocked on Phase 6 tables
    await setAuthUid(staffUid);
    await assert.rejects(
      async () => client.query(`INSERT INTO public.products (tenant_id, name, sku, price_minor_units, currency) VALUES ($1, 'Hack', 'HACK', 100, 'TRY');`, [tenantId]),
      (err) => err && err.code === '42501'
    );
    await assert.rejects(
      async () => client.query(`INSERT INTO public.pos_orders (tenant_id, branch_id, order_number, staff_id, currency) VALUES ($1, $2, 'ORD-HACK', $3, 'TRY');`, [tenantId, branchId, staffId]),
      (err) => err && err.code === '42501'
    );
    await assert.rejects(
      async () => client.query(`INSERT INTO public.staff_commission_rules (tenant_id, staff_id, item_type, commission_basis_points, created_by_user_id) VALUES ($1, $2, 'product', 1000, $3);`, [tenantId, staffId, staffUid]),
      (err) => err && err.code === '42501'
    );

    // 9b. Deactivated users_profile (even with staff.active = true) & customer role blocked from pos_* RPCs
    await setAuthUid(inactiveStaffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_create_product('Blocked', 'BLK-1', 1000, 'TRY');`),
      (err) => err && err.message.includes('FORBIDDEN')
    );

    await setAuthUid(customerUid);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_create_product('Cust Blocked', 'BLK-2', 1000, 'TRY');`),
      (err) => err && err.message.includes('FORBIDDEN')
    );

    // 9c. Node 1: Product catalog, stock receipt, idempotency + conflict, adjustment & return
    await setAuthUid(staffUid);
    const prodRes = (await client.query(`
      SELECT public.pos_create_product('Botanical Serum', 'SKU-D2-01', 25000, 'TRY', 'haircare', NULL, NULL, NULL, 'bottle', 10000, 2000) AS res;
    `)).rows[0].res;
    assert.equal(prodRes.success, true);
    const productId = prodRes.product_id;

    const rec1 = (await client.query(`
      SELECT public.pos_record_stock_receipt($1, $2, 5, 10000, 'INIT-1', 'd2-rec-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(rec1.success, true);
    assert.equal(rec1.new_balance, 5);

    const recReplay = (await client.query(`
      SELECT public.pos_record_stock_receipt($1, $2, 5, 10000, 'INIT-1', 'd2-rec-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(recReplay.idempotent_replay, true);
    assert.equal(recReplay.new_balance, 5);

    await assert.rejects(
      async () => client.query(`SELECT public.pos_record_stock_receipt($1, $2, 99, 10000, 'INIT-2', 'd2-rec-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    // ADIM034-INV-006: Cost & reference & reason idempotency conflict across all 4 inventory ledger RPCs
    await assert.rejects(
      async () => client.query(`SELECT public.pos_record_stock_receipt($1, $2, 5, 1, 'INIT-1', 'd2-rec-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_record_stock_receipt($1, $2, 5, 10000, 'INIT-OTHER', 'd2-rec-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    const saleDec = (await client.query(`
      SELECT public.pos_decrement_stock_for_sale($1, $2, 1, 'SALE-REF-1', 'd2-sale-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(saleDec.new_balance, 4);
    const saleDecReplay = (await client.query(`
      SELECT public.pos_decrement_stock_for_sale($1, $2, 1, ' SALE-REF-1 ', 'd2-sale-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(saleDecReplay.idempotent_replay, true);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_decrement_stock_for_sale($1, $2, 1, 'SALE-REF-2', 'd2-sale-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    const adjDec = (await client.query(`
      SELECT public.pos_adjust_stock($1, $2, -1, 'Damaged bottle', 'd2-adj-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(adjDec.new_balance, 3);
    const adjReplay = (await client.query(`
      SELECT public.pos_adjust_stock($1, $2, -1, ' Damaged bottle ', 'd2-adj-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(adjReplay.idempotent_replay, true);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_adjust_stock($1, $2, -1, 'Lost in transit', 'd2-adj-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    const retInc = (await client.query(`
      SELECT public.pos_return_restock($1, $2, 2, 'Customer return', 'SALE-REF-1', 'd2-ret-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(retInc.new_balance, 5);
    const retReplay = (await client.query(`
      SELECT public.pos_return_restock($1, $2, 2, 'Customer return', 'SALE-REF-1', 'd2-ret-1') AS res;
    `, [branchId, productId])).rows[0].res;
    assert.equal(retReplay.idempotent_replay, true);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_return_restock($1, $2, 2, 'Different reason', 'SALE-REF-1', 'd2-ret-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_return_restock($1, $2, 2, 'Customer return', 'SALE-REF-OTHER', 'd2-ret-1') AS res;`, [branchId, productId]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    // 9d. Node 2: Suppliers, PO lifecycle, partial + full receiving, over-receipt rejection
    const suppRes = (await client.query(`
      SELECT public.pos_create_supplier('Derma Supply Co', 'Ayşe', 'sup@example.test', '+905550001122') AS res;
    `)).rows[0].res;
    assert.equal(suppRes.success, true);

    const poRes = (await client.query(`
      SELECT public.pos_create_purchase_order($1, $2, 'TRY', $3::jsonb, 'Restock') AS res;
    `, [suppRes.supplier_id, branchId, JSON.stringify([{ product_id: productId, quantity: 10, unit_cost_minor_units: 10000 }])])).rows[0].res;
    assert.equal(poRes.status, 'draft');
    assert.equal(poRes.total_amount_minor_units, 100000);

    const poDetails = (await client.query(`SELECT public.pos_get_purchase_order($1) AS res;`, [poRes.purchase_order_id])).rows[0].res;
    const poItemId = poDetails.items[0].item_id;

    // Draft receiving blocked
    await assert.rejects(
      async () => client.query(`SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-rec-draft');`, [poRes.purchase_order_id, JSON.stringify([{ po_item_id: poItemId, quantity_received: 5 }])]),
      (err) => err && err.message.includes('INVALID_STATE')
    );

    await client.query(`SELECT public.pos_approve_purchase_order($1);`, [poRes.purchase_order_id]);
    const recvPart = (await client.query(`
      SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-rec-1') AS res;
    `, [poRes.purchase_order_id, JSON.stringify([{ po_item_id: poItemId, quantity_received: 5 }])])).rows[0].res;
    assert.equal(recvPart.status, 'partially_received');

    // Over-receipt blocked
    await assert.rejects(
      async () => client.query(`SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-rec-over');`, [poRes.purchase_order_id, JSON.stringify([{ po_item_id: poItemId, quantity_received: 6 }])]),
      (err) => err && err.message.includes('OVER_RECEIPT')
    );

    const invAfterRecv = (await client.query(`SELECT public.pos_get_branch_inventory($1) AS res;`, [branchId])).rows[0].res;
    assert.equal(invAfterRecv.items[0].on_hand_quantity, 10); // 5 initial + 5 received

    // 9e. Node 3 + Node 4: Commission rules (owner-only), mixed cart (product + service price*100 + custom), tips, checkout & earnings ACL
    // Ordinary staff cannot set commission rule
    await assert.rejects(
      async () => client.query(`SELECT public.pos_set_staff_commission_rule($1, 'product', 1000, true);`, [staffId]),
      (err) => err && err.message.includes('FORBIDDEN')
    );

    await setAuthUid(ownerUid);
    const ruleProd = (await client.query(`SELECT public.pos_set_staff_commission_rule($1, 'product', 1000, true) AS res;`, [staffId])).rows[0].res;
    assert.equal(ruleProd.success, true);
    const ruleSvc = (await client.query(`SELECT public.pos_set_staff_commission_rule($1, 'service', 2000, true) AS res;`, [staffId])).rows[0].res;
    assert.equal(ruleSvc.success, true);

    await setAuthUid(staffUid);
    const ord = (await client.query(`SELECT public.pos_create_order($1, 'TRY', NULL, 'Mixed cart') AS res;`, [branchId])).rows[0].res;
    assert.equal(ord.success, true);

    // Unknown/foreign package cleanly fails with CROSS_TENANT_VIOLATION after Faz D3 provisioned service_package_definitions
    await assert.rejects(
      async () => client.query(`SELECT public.pos_add_cart_item($1, 'package', 1, NULL, NULL, $2);`, [ord.order_id, crypto.randomUUID()]),
      (err) => err && err.message.includes('CROSS_TENANT_VIOLATION')
    );

    // Foreign performing_staff_id rejected
    await assert.rejects(
      async () => client.query(`SELECT public.pos_add_cart_item($1, 'custom', 1, NULL, NULL, NULL, NULL, $2, 'Cross', 5000);`, [ord.order_id, tenantBStaffId]),
      (err) => err && err.message.includes('CROSS_TENANT_VIOLATION')
    );

    // Add 2x product (2 * 25000 = 50000, tax 20% = 10000 -> line 60000) + 1x service (price 1200 -> 120000 minor units!)
    const addProd = (await client.query(`
      SELECT public.pos_add_cart_item($1, 'product', 2, $2, NULL, NULL, NULL, $3) AS res;
    `, [ord.order_id, productId, staffId])).rows[0].res;
    assert.equal(addProd.line_total_minor_units, 60000);

    const addSvc = (await client.query(`
      SELECT public.pos_add_cart_item($1, 'service', 1, NULL, $2, NULL, NULL, $3) AS res;
    `, [ord.order_id, serviceId, staffId])).rows[0].res;
    assert.equal(addSvc.line_total_minor_units, 120000);

    // Allocate tip 5000 minor units
    const tipRes = (await client.query(`
      SELECT public.pos_set_tip_allocation($1, $2, 5000) AS res;
    `, [ord.order_id, staffId])).rows[0].res;
    assert.equal(tipRes.tip_minor_units, 5000);
    assert.equal(tipRes.total_minor_units, 185000);

    // Underpayment fails closed
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'cash', 1000, NULL, 'chk-fail-1');`, [ord.order_id]),
      (err) => err && err.message.includes('INSUFFICIENT_PAYMENT')
    );

    // Atomic checkout succeeds
    const chkOk = (await client.query(`
      SELECT public.pos_checkout_order($1, 'cash', 185000, 'CASH-001', 'chk-ok-1') AS res;
    `, [ord.order_id])).rows[0].res;
    assert.equal(chkOk.status, 'completed');
    assert.equal(chkOk.products_decremented, 1);

    // Idempotent replay produces zero extra stock burn & zero extra earnings
    const chkReplay = (await client.query(`
      SELECT public.pos_checkout_order($1, 'cash', 185000, 'CASH-001', 'chk-ok-1') AS res;
    `, [ord.order_id])).rows[0].res;
    assert.equal(chkReplay.idempotent_replay, true);

    // ADIM034-POS-005: Checkout idempotency rejects altered method, amount, or reference; accepts whitespace-normalized identical reference
    const chkReplayTrimRef = (await client.query(`
      SELECT public.pos_checkout_order($1, 'cash', 185000, ' CASH-001 ', 'chk-ok-1') AS res;
    `, [ord.order_id])).rows[0].res;
    assert.equal(chkReplayTrimRef.idempotent_replay, true);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'external', 185000, 'CASH-001', 'chk-ok-1');`, [ord.order_id]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'cash', 999999, 'CASH-001', 'chk-ok-1');`, [ord.order_id]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'cash', 185000, 'CASH-999', 'chk-ok-1');`, [ord.order_id]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'cash', 185000, NULL, 'chk-ok-1');`, [ord.order_id]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    // Cross-order idempotency key reuse rejected
    const ord2 = (await client.query(`SELECT public.pos_create_order($1, 'TRY') AS res;`, [branchId])).rows[0].res;
    await client.query(`SELECT public.pos_add_cart_item($1, 'custom', 1, NULL, NULL, NULL, NULL, NULL, 'Item', 1000);`, [ord2.order_id]);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'cash', 1000, NULL, 'chk-ok-1');`, [ord2.order_id]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    // Verify stock is now 8 (10 - 2)
    const invAfterSale = (await client.query(`SELECT public.pos_get_branch_inventory($1) AS res;`, [branchId])).rows[0].res;
    assert.equal(invAfterSale.items[0].on_hand_quantity, 8);

    // Verify staff earnings: product commission 10% of 50000 (tax excluded) = 5000; service commission 20% of 120000 = 24000; tip = 5000 -> total 34000
    const ownEarnings = (await client.query(`SELECT public.pos_get_staff_earnings($1) AS res;`, [staffId])).rows[0].res;
    assert.equal(ownEarnings.commission_minor_units, 29000);
    assert.equal(ownEarnings.tip_minor_units, 5000);
    assert.equal(ownEarnings.total_earnings_minor_units, 34000);

    // Another staff in same tenant & super_admin cannot read staffId's earnings
    await setAuthUid(staff2Uid);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_get_staff_earnings($1);`, [staffId]),
      (err) => err && err.message.includes('FORBIDDEN')
    );

    await setAuthUid(superAdminUid);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_get_staff_earnings($1);`, [staffId]),
      (err) => err && err.message.includes('FORBIDDEN')
    );

    // Same-tenant owner CAN read staffId's earnings
    await setAuthUid(ownerUid);
    const ownerReadEarnings = (await client.query(`SELECT public.pos_get_staff_earnings($1) AS res;`, [staffId])).rows[0].res;
    assert.equal(ownerReadEarnings.total_earnings_minor_units, 34000);

    // 9f. ADIM034-PO-004: Canonical PO receiving idempotency (reordered equivalent passes, different qty or item conflicts)
    await setAuthUid(staffUid);
    const prod2Res = (await client.query(`
      SELECT public.pos_create_product('Keratin Mask', 'SKU-D2-02', 15000, 'TRY', 'haircare', NULL, NULL, NULL, 'jar', 5000, 2000) AS res;
    `)).rows[0].res;
    assert.equal(prod2Res.success, true);
    const product2Id = prod2Res.product_id;

    const poCanonRes = (await client.query(`
      SELECT public.pos_create_purchase_order($1, $2, 'TRY', $3::jsonb, 'Canonical PO test') AS res;
    `, [
      suppRes.supplier_id,
      branchId,
      JSON.stringify([
        { product_id: productId, quantity: 10, unit_cost_minor_units: 10000 },
        { product_id: product2Id, quantity: 10, unit_cost_minor_units: 5000 },
      ]),
    ])).rows[0].res;
    await client.query(`SELECT public.pos_approve_purchase_order($1);`, [poCanonRes.purchase_order_id]);
    const poCanonDetails = (await client.query(`SELECT public.pos_get_purchase_order($1) AS res;`, [poCanonRes.purchase_order_id])).rows[0].res;
    const itemA = poCanonDetails.items.find((i) => i.product_id === productId).item_id;
    const itemB = poCanonDetails.items.find((i) => i.product_id === product2Id).item_id;

    const canonRecv1 = (await client.query(`
      SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-canon-1') AS res;
    `, [poCanonRes.purchase_order_id, JSON.stringify([{ po_item_id: itemA, quantity_received: 3 }, { po_item_id: itemB, quantity_received: 4 }])])).rows[0].res;
    assert.equal(canonRecv1.idempotent_replay, false);

    // Reordered equivalent payload replays cleanly
    const canonRecvReordered = (await client.query(`
      SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-canon-1') AS res;
    `, [poCanonRes.purchase_order_id, JSON.stringify([{ po_item_id: itemB, quantity_received: 4 }, { po_item_id: itemA, quantity_received: 3 }])])).rows[0].res;
    assert.equal(canonRecvReordered.idempotent_replay, true);

    // Altered quantity or altered item subset conflicts
    await assert.rejects(
      async () => client.query(`SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-canon-1');`, [poCanonRes.purchase_order_id, JSON.stringify([{ po_item_id: itemA, quantity_received: 2 }, { po_item_id: itemB, quantity_received: 4 }])]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_receive_purchase_order_items($1, $2::jsonb, 'po-canon-1');`, [poCanonRes.purchase_order_id, JSON.stringify([{ po_item_id: itemA, quantity_received: 3 }])]),
      (err) => err && err.message.includes('IDEMPOTENCY_CONFLICT')
    );

    // 9g. ADIM034-POS-003: Currency mismatch rejection (TRY product cannot be added to USD order)
    const ordUsd = (await client.query(`SELECT public.pos_create_order($1, 'USD') AS res;`, [branchId])).rows[0].res;
    await assert.rejects(
      async () => client.query(`SELECT public.pos_add_cart_item($1, 'product', 1, $2);`, [ordUsd.order_id, productId]),
      (err) => err && err.message.includes('CURRENCY_MISMATCH')
    );
    await setAuthUid(null);
    const usdItemCount = (await client.query(`SELECT count(*)::int AS cnt FROM public.pos_order_items WHERE order_id = $1;`, [ordUsd.order_id])).rows[0].cnt;
    const usdOrderTotal = (await client.query(`SELECT total_minor_units FROM public.pos_orders WHERE id = $1;`, [ordUsd.order_id])).rows[0].total_minor_units;
    assert.equal(usdItemCount, 0);
    assert.equal(usdOrderTotal, 0);

    // 9h. ADIM034-POS-002: Direct DB RPC rejection of EXTERNAL_HOLD payment methods with zero mutation
    await setAuthUid(staffUid);
    const ordHold = (await client.query(`SELECT public.pos_create_order($1, 'TRY') AS res;`, [branchId])).rows[0].res;
    await client.query(`SELECT public.pos_add_cart_item($1, 'product', 1, $2, NULL, NULL, NULL, $3);`, [ordHold.order_id, productId, staffId]);
    await setAuthUid(null);
    const stockBeforeHold = (await client.query(`SELECT on_hand_quantity FROM public.inventory_balances WHERE branch_id = $1 AND product_id = $2;`, [branchId, productId])).rows[0].on_hand_quantity;

    await setAuthUid(staffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'card_terminal_adapter', 30000, 'TERM-1', 'hold-term-1');`, [ordHold.order_id]),
      (err) => err && err.message.includes('LIVE_POS_TERMINAL_CREDENTIALS_REQUIRED')
    );
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'customer_wallet', 30000, 'WAL-1', 'hold-wal-1');`, [ordHold.order_id]),
      (err) => err && err.message.includes('WALLET_LEDGER_DEFERRED_TO_FAZ_D3')
    );

    await setAuthUid(null);
    const holdOrderRow = (await client.query(`SELECT status, idempotency_key FROM public.pos_orders WHERE id = $1;`, [ordHold.order_id])).rows[0];
    const stockAfterHold = (await client.query(`SELECT on_hand_quantity FROM public.inventory_balances WHERE branch_id = $1 AND product_id = $2;`, [branchId, productId])).rows[0].on_hand_quantity;
    const holdPayCount = (await client.query(`SELECT count(*)::int AS cnt FROM public.pos_order_payments WHERE order_id = $1;`, [ordHold.order_id])).rows[0].cnt;
    const holdEarnCount = (await client.query(`SELECT count(*)::int AS cnt FROM public.staff_earnings_ledger WHERE order_id = $1;`, [ordHold.order_id])).rows[0].cnt;
    assert.equal(holdOrderRow.status, 'open');
    assert.equal(holdOrderRow.idempotency_key, null);
    assert.equal(stockAfterHold, stockBeforeHold);
    assert.equal(holdPayCount, 0);
    assert.equal(holdEarnCount, 0);

    // 9i. ADIM034-POS-001: Concurrent pos_add_cart_item from two independent PG connections serializes atomically
    await setAuthUid(staffUid);
    const ordConc = (await client.query(`SELECT public.pos_create_order($1, 'TRY') AS res;`, [branchId])).rows[0].res;
    await setAuthUid(null);

    const c1 = pgInstance.getPgClient('postgres', '127.0.0.1');
    const c2 = pgInstance.getPgClient('postgres', '127.0.0.1');
    try {
      await c1.connect();
      await c2.connect();

      await c1.query(`BEGIN;`);
      await c1.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [staffUid]);
      await c1.query(`SET LOCAL ROLE authenticated;`);
      await c1.query(`SELECT public.pos_add_cart_item($1, 'custom', 1, NULL, NULL, NULL, NULL, NULL, 'Conc A', 10000);`, [ordConc.order_id]);

      await c2.query(`BEGIN;`);
      await c2.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [staffUid]);
      await c2.query(`SET LOCAL ROLE authenticated;`);
      const c2AddPromise = c2.query(
        `SELECT public.pos_add_cart_item($1, 'custom', 1, NULL, NULL, NULL, NULL, NULL, 'Conc B', 10000) AS res;`,
        [ordConc.order_id]
      );

      // Give c2 a moment to block on the pos_order advisory lock held by c1
      await new Promise((r) => setTimeout(r, 80));
      await c1.query(`COMMIT;`);
      const c2AddRes = await c2AddPromise;
      await c2.query(`COMMIT;`);
      assert.equal(c2AddRes.rows[0].res.order_total_minor_units, 20000);
    } finally {
      try { await c1.end(); } catch {}
      try { await c2.end(); } catch {}
    }

    const concSums = (await client.query(`
      SELECT o.total_minor_units, COALESCE(SUM(i.line_total_minor_units), 0)::int AS items_sum
      FROM public.pos_orders o
      JOIN public.pos_order_items i ON i.order_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, o.total_minor_units;
    `, [ordConc.order_id])).rows[0];
    assert.equal(concSums.items_sum, 20000);
    assert.equal(concSums.total_minor_units, 20000);

    await setAuthUid(staffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.pos_checkout_order($1, 'cash', 10000, NULL, 'conc-underpay');`, [ordConc.order_id]),
      (err) => err && err.message.includes('INSUFFICIENT_PAYMENT')
    );
    const concChk = (await client.query(`
      SELECT public.pos_checkout_order($1, 'cash', 20000, 'CASH-CONC', 'conc-ok') AS res;
    `, [ordConc.order_id])).rows[0].res;
    assert.equal(concChk.status, 'completed');
    await setAuthUid(null);
    console.log('[PASS] Phase 6 POS, Inventory, Suppliers/PO & Staff Commissions-Tips verified on PG17');

    // 10. Test ADIM-035 / Faz D3: 20260920..20260926 (Comms Outbox, Payment Intents, Customer 360, Deposit/No-Show, Loyalty, Packages, Wallet/Gift Cards)
    const setServiceRole = async () => {
      await client.query(`RESET ROLE;`);
      await client.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
      await client.query(`SELECT set_config('request.jwt.claim.role', 'service_role', false);`);
      await client.query(`SET ROLE service_role;`);
    };
    const setAuthenticatedRole = async (uid) => {
      await client.query(`RESET ROLE;`);
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [uid || '']);
      await client.query(`SELECT set_config('request.jwt.claim.role', $1, false);`, [uid ? 'authenticated' : '']);
      if (uid) {
        await client.query(`SET ROLE authenticated;`);
      }
    };
    const setAuthenticatedNullRoleClaim = async (uid) => {
      await client.query(`RESET ROLE;`);
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [uid || '']);
      await client.query(`SELECT set_config('request.jwt.claim.role', '', false);`);
      if (uid) {
        await client.query(`SET ROLE authenticated;`);
      }
    };

    // Seed dedicated Faz D3 customer + completed appointment (>65 days ago for 60d reactivation cohort)
    await setAuthUid(null);
    const d3CustConsentedId = 'd3000001-0000-4000-8000-000000000001';
    const d3CustNoConsentId = 'd3000002-0000-4000-8000-000000000002';
    const d3ApptDoneId = 'd3000003-0000-4000-8000-000000000003';
    const d3ApptPendingId = 'd3000004-0000-4000-8000-000000000004';
    const d3ApptNoConsentId = 'd3000005-0000-4000-8000-000000000005';
    await client.query(`
      INSERT INTO public.customers (id, tenant_id, name, email, phone)
      VALUES
        ($1, $3, 'D3 VIP Customer', 'd3vip@example.test', '+905559990001'),
        ($2, $3, 'D3 Silent Customer', 'd3silent@example.test', '+905559990002');
    `, [d3CustConsentedId, d3CustNoConsentId, tenantId]);
    await client.query(`
      INSERT INTO public.consent_ledger (tenant_id, customer_id, consent_type, is_granted, created_at)
      VALUES ($1, $2, 'marketing', true, now() - interval '70 days');
    `, [tenantId.toString(), d3CustConsentedId.toString()]);
    await client.query(`
      INSERT INTO public.appointments (id, tenant_id, branch_id, customer_id, user_name, phone, service_id, staff_id, appointment_date, appointment_time, duration_minutes, status)
      VALUES
        ($1, $4, $5, $6, 'D3 VIP Customer', '+905559990001', $8, $9, (CURRENT_DATE - 68), '11:00', 60, 'completed'),
        ($2, $4, $5, $6, 'D3 VIP Customer', '+905559990001', $8, $9, (CURRENT_DATE + 5), '14:00', 60, 'confirmed'),
        ($3, $4, $5, $7, 'D3 Silent Customer', '+905559990002', $8, $9, (CURRENT_DATE - 75), '12:00', 60, 'completed');
    `, [d3ApptDoneId, d3ApptPendingId, d3ApptNoConsentId, tenantId, branchId, d3CustConsentedId, d3CustNoConsentId, serviceId, staffId]);

    // 10a. 20260920: Communications outbox RPCs
    await setAuthUid(staffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.enqueue_communication_outbox($1, 'email', 'd3vip@example.test', 'tpl_1', '{"body":"hi"}'::jsonb, 'outbox-auth-deny');`, [tenantId]),
      (err) => err && err.code === '42501'
    );
    await setServiceRole();
    const obx1 = (await client.query(`SELECT public.enqueue_communication_outbox($1, 'email', 'd3vip@example.test', 'tpl_1', '{"body":"hello"}'::jsonb, 'outbox-key-1') AS res;`, [tenantId])).rows[0].res;
    assert.equal(obx1.success, true);
    assert.equal(obx1.status, 'queued');
    const obxReplay = (await client.query(`SELECT public.enqueue_communication_outbox($1, 'email', 'd3vip@example.test', 'tpl_1', '{"body":"hello"}'::jsonb, 'outbox-key-1') AS res;`, [tenantId])).rows[0].res;
    assert.equal(obxReplay.idempotent_duplicate, true);
    const obxConflict = (await client.query(`SELECT public.enqueue_communication_outbox($1, 'email', 'd3vip@example.test', 'tpl_1', '{"body":"tampered"}'::jsonb, 'outbox-key-1') AS res;`, [tenantId])).rows[0].res;
    assert.equal(obxConflict.success, false);
    assert.equal(obxConflict.error, 'IDEMPOTENCY_CONFLICT');
    const cbUnmatched = (await client.query(`SELECT public.record_delivery_callback('mock_sms', 'msg-unmatched-1', 'delivered', now(), 'cb-replay-1', '{"ok":true}') AS res;`)).rows[0].res;
    assert.equal(cbUnmatched.success, false);
    assert.equal(cbUnmatched.classification, 'UNMATCHED_PROVIDER_REFERENCE');
    const cbDup = (await client.query(`SELECT public.record_delivery_callback('mock_sms', 'msg-unmatched-1', 'delivered', now(), 'cb-replay-1', '{"ok":true}') AS res;`)).rows[0].res;
    assert.equal(cbDup.success, true);
    assert.equal(cbDup.duplicate, true);
    assert.equal(cbDup.classification, 'DUPLICATE_EXACT');

    // 10b. 20260921: Payment intents + verified event binding
    const pi1 = (await client.query(`SELECT public.create_payment_intent($1, 'appointment_deposit', 25000, 'TRY', 'pi-d3-key-001', $2::text, '{}'::jsonb) AS res;`, [tenantId, d3ApptPendingId])).rows[0].res;
    assert.equal(pi1.success, true);
    const piConflict = (await client.query(`SELECT public.create_payment_intent($1, 'appointment_deposit', 99999, 'TRY', 'pi-d3-key-001', $2::text, '{}'::jsonb) AS res;`, [tenantId, d3ApptPendingId])).rows[0].res;
    assert.equal(piConflict.success, false);
    assert.equal(piConflict.error, 'IDEMPOTENCY_CONFLICT');
    const bindPi = (await client.query(`SELECT public.bind_payment_intent_provider($1, 'mock_psp', 'MOCK-REF-1') AS res;`, [pi1.intent_id])).rows[0].res;
    assert.equal(bindPi.success, true);
    const pve = (await client.query(`SELECT public.process_verified_payment_event('mock_psp', 'evt-d3-1', 'payment.succeeded', now(), 'hash-abc', $1, 'MOCK-REF-1', 'succeeded') AS res;`, [pi1.intent_id])).rows[0].res;
    assert.equal(pve.success, true);
    const pveNoIntent = (await client.query(`SELECT public.process_verified_payment_event('mock_psp', 'evt-d3-null-intent', 'payment.succeeded', now(), 'hash-null', NULL, 'MOCK-REF-NONE', 'succeeded') AS res;`)).rows[0].res;
    assert.equal(pveNoIntent.success, true);
    const pveNoIntentDup = (await client.query(`SELECT public.process_verified_payment_event('mock_psp', 'evt-d3-null-intent', 'payment.succeeded', now(), 'hash-null', NULL, 'MOCK-REF-NONE', 'succeeded') AS res;`)).rows[0].res;
    assert.equal(pveNoIntentDup.success, true);
    assert.equal(pveNoIntentDup.duplicate, true);
    assert.equal(pveNoIntentDup.classification, 'IDEMPOTENT_SUCCESS');

    // 10c. 20260922: Customer 360 + Segmentation ACL + NULL role bypass defense
    await setAuthUid(null);
    const segId = 'd3000006-0000-4000-8000-000000000006';
    await client.query(`INSERT INTO public.customer_segments (id, tenant_id, name, segment_type) VALUES ($1, $2, 'VIP Lazer', 'manual');`, [segId, tenantId]);

    // Deactivated users_profile and non-staff customer with NULL claim role must all fail
    await setAuthenticatedNullRoleClaim(inactiveStaffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.get_customer_360_view($1, $2);`, [tenantId, d3CustConsentedId]),
      (err) => err && err.code === '42501'
    );
    await setAuthenticatedNullRoleClaim(customerUid);
    await assert.rejects(
      async () => client.query(`SELECT public.assign_customer_to_segment($1, $2, $3, 'cust');`, [tenantId, segId, d3CustConsentedId]),
      (err) => err && err.code === '42501'
    );
    await setAuthenticatedNullRoleClaim(staffUid);
    const assignedSeg = (await client.query(`SELECT public.assign_customer_to_segment($1, $2, $3, 'staff-d3') AS ok;`, [tenantId, segId, d3CustConsentedId])).rows[0].ok;
    assert.equal(assignedSeg, true);
    const c360 = (await client.query(`SELECT public.get_customer_360_view($1, $2) AS res;`, [tenantId, d3CustConsentedId])).rows[0].res;
    assert.equal(c360.name, 'D3 VIP Customer');
    assert.equal(c360.segments.length, 1);
    const c360Missing = (await client.query(`SELECT public.get_customer_360_view($1, 'd3000099-0000-4000-8000-000000000099') AS res;`, [tenantId])).rows[0].res;
    assert.equal(c360Missing, null);
    const listedSegs = (await client.query(`SELECT * FROM public.list_tenant_customer_segments($1);`, [tenantId])).rows;
    assert.equal(listedSegs.length, 1);
    assert.equal(listedSegs[0].name, 'VIP Lazer');
    assert.equal(Number(listedSegs[0].member_count), 1);
    const dynSeg = (await client.query(`SELECT public.evaluate_dynamic_customer_segments($1, $2) AS res;`, [tenantId, segId])).rows[0].res;
    assert.equal(dynSeg.status, 'DYNAMIC_RULE_EVALUATION_NOT_IMPLEMENTED');

    // Cross-tenant staff isolation on Customer 360
    await setAuthenticatedRole(tenantBStaffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.get_customer_360_view($1, $2);`, [tenantId, d3CustConsentedId]),
      (err) => err && err.code === '42501'
    );

    // 10d. 20260923: Deposit & No-Show Policies (default empty policy + percentage fail-closed + fixed_amount)
    await setAuthenticatedRole(staffUid);
    const evalEmptyDep = (await client.query(`SELECT public.evaluate_booking_confirmation_deposit_policy($1, $2) AS res;`, [tenantId, serviceId])).rows[0].res;
    assert.equal(evalEmptyDep.success, true);
    assert.equal(evalEmptyDep.deposit_required, false);
    assert.equal(evalEmptyDep.deposit_amount_minor_units, 0);
    await assert.rejects(
      async () => client.query(`SELECT public.admin_set_deposit_policy($1, $2, 'fixed_amount', 30000, 'TRY', true);`, [tenantId, serviceId]),
      (err) => err && err.code === '42501'
    );
    await setAuthenticatedRole(ownerUid);
    const depSetFixed = (await client.query(`SELECT public.admin_set_deposit_policy($1, $2, 'fixed_amount', 30000, 'TRY', true) AS res;`, [tenantId, serviceId])).rows[0].res;
    assert.equal(depSetFixed.success, true);
    const nsSet = (await client.query(`SELECT public.admin_set_no_show_policy($1, 12, 'forfeit_deposit', 15000, 24, true) AS res;`, [tenantId])).rows[0].res;
    assert.equal(nsSet.success, true);

    const evalFixed = (await client.query(`SELECT public.evaluate_booking_confirmation_deposit_policy($1, $2) AS res;`, [tenantId, serviceId])).rows[0].res;
    assert.equal(evalFixed.success, true);
    assert.equal(evalFixed.deposit_required, true);
    assert.equal(evalFixed.deposit_amount_minor_units, 30000);
    assert.equal(evalFixed.price_units_source_truth, 'CATALOG_PRICE_UNIT_UNRESOLVED');

    // Percentage deposit policy fails closed explicitly
    await client.query(`SELECT public.admin_set_deposit_policy($1, $2, 'percentage', 20, 'TRY', true);`, [tenantId, serviceId]);
    const evalPct = (await client.query(`SELECT public.evaluate_booking_confirmation_deposit_policy($1, $2) AS res;`, [tenantId, serviceId])).rows[0].res;
    assert.equal(evalPct.success, false);
    assert.equal(evalPct.reason_code, 'PERCENTAGE_DEPOSIT_CALCULATION_UNAVAILABLE');

    // 10e. 20260924: Loyalty & Reactivation (service_role earn, concurrent redeem race, ledger immutability, reactivation consent/60d)
    await setAuthenticatedRole(ownerUid);
    const unconfiguredLoyProf = (await client.query(`SELECT public.get_customer_loyalty_profile($1, $2) AS res;`, [tenantId, d3CustNoConsentId])).rows[0].res;
    assert.equal(unconfiguredLoyProf.is_active, false);
    assert.equal(unconfiguredLoyProf.current_balance, 0);

    await setAuthenticatedRole(null);
    await client.query(`
      INSERT INTO public.tenant_loyalty_configs (tenant_id, is_active, points_per_completed_appointment, minimum_points_redemption)
      VALUES ($1, true, 120, 50);
    `, [tenantId]);

    await setAuthenticatedRole(ownerUid);
    const emptyLoyProf = (await client.query(`SELECT public.get_customer_loyalty_profile($1, $2) AS res;`, [tenantId, d3CustNoConsentId])).rows[0].res;
    assert.equal(emptyLoyProf.is_active, true);
    assert.equal(emptyLoyProf.current_balance, 0);
    await assert.rejects(
      async () => client.query(`SELECT public.earn_loyalty_points_for_appointment($1, $2, $3, NULL, 'earn-owner-deny');`, [tenantId, d3CustConsentedId, d3ApptDoneId]),
      (err) => err && err.code === '42501'
    );

    await setServiceRole();
    const earnPending = (await client.query(`SELECT public.earn_loyalty_points_for_appointment($1, $2, $3, NULL, 'earn-pending') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
    assert.equal(earnPending.success, false);
    assert.equal(earnPending.reason, 'APPOINTMENT_NOT_COMPLETED');

    const earnOk = (await client.query(`SELECT public.earn_loyalty_points_for_appointment($1, $2, $3, NULL, 'earn-done-1') AS res;`, [tenantId, d3CustConsentedId, d3ApptDoneId])).rows[0].res;
    assert.equal(earnOk.success, true);
    assert.equal(earnOk.points_awarded, 120);
    assert.equal(earnOk.current_balance, 120);

    const earnConflict = (await client.query(`SELECT public.earn_loyalty_points_for_appointment($1, $2, $3, NULL, 'earn-done-1') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
    assert.equal(earnConflict.success, false);
    assert.equal(earnConflict.reason, 'APPOINTMENT_NOT_COMPLETED');

    // Concurrent two-connection loyalty redeem race (balance 120, both try 80 -> one succeeds, one fails INSUFFICIENT_LOYALTY_BALANCE)
    const loyC1 = pgInstance.getPgClient('postgres', '127.0.0.1');
    const loyC2 = pgInstance.getPgClient('postgres', '127.0.0.1');
    try {
      await loyC1.connect();
      await loyC2.connect();
      await loyC1.query(`BEGIN; SELECT set_config('request.jwt.claim.role', 'service_role', true); SET LOCAL ROLE service_role;`);
      const l1Res = (await loyC1.query(`SELECT public.redeem_loyalty_points_for_appointment($1, $2, $3, 80, 'loy-race-1') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
      assert.equal(l1Res.success, true);

      await loyC2.query(`BEGIN; SELECT set_config('request.jwt.claim.role', 'service_role', true); SET LOCAL ROLE service_role;`);
      const l2Promise = loyC2.query(`SELECT public.redeem_loyalty_points_for_appointment($1, $2, $3, 80, 'loy-race-2') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId]);
      await new Promise((r) => setTimeout(r, 80));
      await loyC1.query(`COMMIT;`);
      const l2Res = (await l2Promise).rows[0].res;
      await loyC2.query(`COMMIT;`);
      assert.equal(l2Res.success, false);
      assert.equal(l2Res.reason, 'INSUFFICIENT_LOYALTY_BALANCE');
    } finally {
      try { await loyC1.end(); } catch {}
      try { await loyC2.end(); } catch {}
    }

    await setAuthUid(null);
    await assert.rejects(
      async () => client.query(`DELETE FROM public.customer_loyalty_ledger WHERE tenant_id = $1;`, [tenantId]),
      (err) => err && err.message.includes('LOYALTY_LEDGER_IMMUTABLE')
    );

    // Reactivation scan: rejects invalid 45d boundary; queues consented 60d & suppresses unconsented; idempotent second run
    await setAuthenticatedRole(staffUid);
    const badCohort = (await client.query(`SELECT public.scan_customer_reactivation_cohorts($1, 45) AS res;`, [tenantId])).rows[0].res;
    assert.equal(badCohort.success, false);
    assert.equal(badCohort.error, 'INVALID_COHORT_INACTIVITY_BOUNDARY');
    const scan1 = (await client.query(`SELECT public.scan_customer_reactivation_cohorts($1, 60) AS res;`, [tenantId])).rows[0].res;
    assert.equal(scan1.success, true);
    assert.equal(scan1.queued_outbox_count, 1);
    assert.equal(scan1.suppressed_count, 1);
    const scan2 = (await client.query(`SELECT public.scan_customer_reactivation_cohorts($1, 60) AS res;`, [tenantId])).rows[0].res;
    assert.equal(scan2.detected_customers, 0);

    // 10f. 20260925: Service packages + POS package cart integration + concurrent credit race
    await setAuthUid(null);
    const pkgDefId = 'd3000007-0000-4000-8000-000000000007';
    await client.query(`
      INSERT INTO public.service_package_definitions (id, tenant_id, name, price_minor_units, currency, total_credits, validity_days, is_active)
      VALUES ($1, $2, 'Lazer 2 Seans Paketi', 200000, 'TRY', 2, 90, true);
    `, [pkgDefId, tenantId]);
    await client.query(`
      INSERT INTO public.service_package_eligibility (tenant_id, package_definition_id, service_id)
      VALUES ($1, $2, $3);
    `, [tenantId, pkgDefId, serviceId]);

    // POS integration: valid package now adds to open TRY order
    await setAuthenticatedRole(staffUid);
    const ordPkg = (await client.query(`SELECT public.pos_create_order($1, 'TRY') AS res;`, [branchId])).rows[0].res;
    const addPkgItem = (await client.query(`SELECT public.pos_add_cart_item($1, 'package', 1, NULL, NULL, $2) AS res;`, [ordPkg.order_id, pkgDefId])).rows[0].res;
    assert.equal(addPkgItem.order_total_minor_units, 200000);

    await setAuthenticatedRole(ownerUid);
    const badGrant = (await client.query(`SELECT public.admin_grant_customer_package($1, $2, $3, 0) AS res;`, [tenantId, d3CustConsentedId, pkgDefId])).rows[0].res;
    assert.equal(badGrant.success, false);
    assert.equal(badGrant.reason_code, 'invalid_validity_days');
    const pkgGrant = (await client.query(`SELECT public.admin_grant_customer_package($1, $2, $3, 30) AS res;`, [tenantId, d3CustConsentedId, pkgDefId])).rows[0].res;
    assert.equal(pkgGrant.success, true);

    const beginAsAuthenticated = async (conn, uid) => {
      await conn.query('BEGIN');
      await conn.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
      await conn.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
      await conn.query('SET LOCAL ROLE authenticated');
    };

    const pkgC1 = pgInstance.getPgClient('postgres', '127.0.0.1');
    const pkgC2 = pgInstance.getPgClient('postgres', '127.0.0.1');
    try {
      await pkgC1.connect();
      await pkgC2.connect();
      await beginAsAuthenticated(pkgC1, staffUid);
      const p1Res = (await pkgC1.query(`SELECT public.redeem_customer_package_credits($1, $2, $3, 2, $4, 'pkg-race-1') AS res;`, [tenantId, pkgGrant.customer_package_id, serviceId, d3ApptPendingId])).rows[0].res;
      assert.equal(p1Res.success, true);
      assert.equal(p1Res.remaining_credits, 0);
      assert.equal(p1Res.package_status, 'exhausted');

      await beginAsAuthenticated(pkgC2, staffUid);
      const p2Promise = pkgC2.query(`SELECT public.redeem_customer_package_credits($1, $2, $3, 1, $4, 'pkg-race-2') AS res;`, [tenantId, pkgGrant.customer_package_id, serviceId, d3ApptPendingId]);
      await new Promise((r) => setTimeout(r, 80));
      await pkgC1.query(`COMMIT;`);
      const p2Res = (await p2Promise).rows[0].res;
      await pkgC2.query(`COMMIT;`);
      assert.equal(p2Res.success, false);
    } finally {
      try { await pkgC1.end(); } catch {}
      try { await pkgC2.end(); } catch {}
    }

    await setAuthUid(null);
    await assert.rejects(
      async () => client.query(`DELETE FROM public.customer_package_redemption_ledger WHERE tenant_id = $1;`, [tenantId]),
      (err) => err && err.message.includes('REDEMPTION_LEDGER_IMMUTABLE')
    );

    // 10g. 20260926: Client Wallet & Gift Cards (owner-only stored value, concurrent debit race, SHA-256 gift card, immutable ledgers)
    await setAuthenticatedRole(staffUid);
    await assert.rejects(
      async () => client.query(`SELECT public.transact_wallet_balance($1, $2, 5000, 'credit', 'TRY', NULL, 'wal-staff-deny');`, [tenantId, d3CustConsentedId]),
      (err) => err && err.code === '42501'
    );

    await setAuthenticatedRole(ownerUid);
    const walCredit = (await client.query(`SELECT public.transact_wallet_balance($1, $2, 10000, 'credit', 'TRY', NULL, 'wal-credit-1', 'Initial credit') AS res;`, [tenantId, d3CustConsentedId])).rows[0].res;
    assert.equal(walCredit.success, true);
    assert.equal(walCredit.balance_after_minor_units, 10000);

    const walC1 = pgInstance.getPgClient('postgres', '127.0.0.1');
    const walC2 = pgInstance.getPgClient('postgres', '127.0.0.1');
    try {
      await walC1.connect();
      await walC2.connect();
      await beginAsAuthenticated(walC1, ownerUid);
      const w1Res = (await walC1.query(`SELECT public.transact_wallet_balance($1, $2, 6000, 'debit', 'TRY', $3, 'wal-debit-race-1') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
      assert.equal(w1Res.success, true);
      assert.equal(w1Res.balance_after_minor_units, 4000);

      await beginAsAuthenticated(walC2, ownerUid);
      const w2Promise = walC2.query(`SELECT public.transact_wallet_balance($1, $2, 6000, 'debit', 'TRY', $3, 'wal-debit-race-2') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId]);
      await new Promise((r) => setTimeout(r, 80));
      await walC1.query(`COMMIT;`);
      const w2Res = (await w2Promise).rows[0].res;
      await walC2.query(`COMMIT;`);
      assert.equal(w2Res.success, false);
      assert.equal(w2Res.reason_code, 'insufficient_funds');
    } finally {
      try { await walC1.end(); } catch {}
      try { await walC2.end(); } catch {}
    }

    const walReplay = (await client.query(`SELECT public.transact_wallet_balance($1, $2, 6000, 'debit', 'TRY', $3, 'wal-debit-race-1') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
    assert.equal(walReplay.is_idempotent_replay, true);
    const walConflict = (await client.query(`SELECT public.transact_wallet_balance($1, $2, 7000, 'debit', 'TRY', $3, 'wal-debit-race-1') AS res;`, [tenantId, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
    assert.equal(walConflict.success, false);
    assert.equal(walConflict.reason_code, 'IDEMPOTENCY_CONFLICT');

    await setAuthUid(null);
    const gcHash = crypto.createHash('sha256').update('LARI-GIFT-2026').digest('hex');
    await client.query(`
      INSERT INTO public.gift_cards (tenant_id, code_hash, code_last_four, initial_balance_minor_units, current_balance_minor_units, currency, expires_at, status)
      VALUES ($1, $2, '2026', 15000, 15000, 'TRY', now() + interval '30 days', 'active');
    `, [tenantId, gcHash]);

    await setAuthUid(staffUid);
    const gcMissing = (await client.query(`SELECT public.redeem_gift_card($1, 'deadbeef', 1000, $2, NULL, 'gc-missing-1') AS res;`, [tenantId, d3CustConsentedId])).rows[0].res;
    assert.equal(gcMissing.success, false);
    assert.equal(gcMissing.reason_code, 'gift_card_not_found');

    const gcOk = (await client.query(`SELECT public.redeem_gift_card($1, $2, 5000, $3, $4, 'gc-ok-1') AS res;`, [tenantId, gcHash, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
    assert.equal(gcOk.success, true);
    assert.equal(gcOk.remaining_balance_minor_units, 10000);
    const gcConflict = (await client.query(`SELECT public.redeem_gift_card($1, $2, 6000, $3, $4, 'gc-ok-1') AS res;`, [tenantId, gcHash, d3CustConsentedId, d3ApptPendingId])).rows[0].res;
    assert.equal(gcConflict.success, false);
    assert.equal(gcConflict.reason_code, 'IDEMPOTENCY_CONFLICT');

    await setAuthUid(null);
    await assert.rejects(
      async () => client.query(`UPDATE public.client_wallet_ledger SET amount_minor_units = 1 WHERE tenant_id = $1;`, [tenantId]),
      (err) => err && err.message.includes('WALLET_LEDGER_IMMUTABLE')
    );
    await assert.rejects(
      async () => client.query(`UPDATE public.gift_card_redemptions SET redeemed_minor_units = 1 WHERE tenant_id = $1;`, [tenantId]),
      (err) => err && err.message.includes('GIFT_CARD_REDEMPTIONS_IMMUTABLE')
    );
    console.log('[PASS] Phase 3/4 Customer 360, Comms, Payments, Deposit/No-Show, Loyalty, Packages & Wallet/Gift Cards verified on PG17');

    console.log('\nALL ADIM-033 + ADIM-034 + ADIM-035 DISPOSABLE PG17 TESTS PASSED.');
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
