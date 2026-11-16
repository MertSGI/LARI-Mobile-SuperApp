# LARİ Supabase Migration Apply Manifest

This manifest documents the active canonical migration graph, database schema ownership, and execution procedures for LARİ.

---

## 1. Active Migrations Sequence (Chronological)

All migrations in `supabase/migrations/` must be applied in the exact alphabetical/chronological order:

1. **`001_initial_schema.sql`** — Database initialization and primary core tables.
2. **`002_subscription_alignment.sql`** — Adds references between payments and subscriptions.
3. **`003_provisioning_onboarding.sql`** — Provisions onboarding tracking schemas.
4. **`004_iyzico_provider_alignment.sql`** — Adds sandbox subscription alignment structures.
5. **`005_salon_business_profile.sql`** — Provisions tenant public marketing profile tables.
6. **`20260601_lari_core_schema_alignment.sql`** — Aligns appointments, staff mapping, and templates.
7. **`20260619_lari_rls_policy_draft.sql`** — Consolidated unified RLS security rules.
8. **`20260620_paymentless_production_core_tables.sql`** — Self-service and paymentless tracking tables.
9. **`20260621_paymentless_production_repository_columns.sql`** — Manual/offline billing support columns.
10. **`20260622_paymentless_production_rls_identity_alignment.sql`** — Aligns core tables with users_profile lookup canonical RLS identity model.
11. **`20260713_communication_outbox_rls_hardening.sql`** — Drops unsafe communication_outbox broad write policy and installs scoped RLS policies.
12. **`20260714_tenants_update_rls_hardening.sql`** — Drops broad tenant UPDATE policy and legacy owner_user_id authorization on tenants.
13. **`20260715_super_admin_provisioning_rpc.sql`** — Adds atomic approve_and_publish_tenant RPC function for Super Admin.
14. **`20260716_public_booking_eligibility_rpc.sql`** — Adds public eligibility checker RPC function by slug.
15. **`20260720_public_booking_rpc.sql`** — Hardened transactional public booking RPC migration.
16. **`20260722_public_booking_search_path_fix.sql`** — Fixes search_path for SECURITY DEFINER functions to include extensions schema.
17. **`20260723_booking_lifecycle_foundation.sql`** — Stage A Database Scheduling Foundation, branches model, staff/service branch junction tables, appointments contract fields (branch_id, duration_minutes), shared evaluate_booking_slot engine, updated get_public_available_slots and create_public_booking RPCs.
18. **`20260724_admin_rls_and_read_model_fix.sql`** — Stage B.1 Fix, drops direct auth.users RLS dependency, adds current_user_owns_customer and current_user_can_access_tenant helpers, and installs server-scoped RPCs get_my_tenant_appointments and get_my_tenant_dashboard_summary.
19. **`20260725_admin_bootstrap_and_runtime_consistency.sql`** — Stage B.2 authenticated server-scoped admin bootstrap RPC. Adds get_my_admin_bootstrap() which derives tenant from auth.uid() server-side and returns tenant profile, business profile, active services, active staff, branches, and subscription summary in a single SECURITY DEFINER call. Eliminates per-tab availability fanout. REVOKE/GRANT scoped to authenticated role only.
20. **`20260726_admin_rpc_execute_acl_hardening.sql`** — Minimal forward-only EXECUTE ACL hardening for Stage B.1/B.2 admin RPCs (`get_my_admin_bootstrap`, `get_my_tenant_appointments`, `get_my_tenant_dashboard_summary`) and authorization helpers (`current_user_owns_customer`, `current_user_can_access_tenant`). Revokes EXECUTE privileges from PUBLIC and anon roles, granting EXECUTE strictly to authenticated.
21. **`20260727_admin_runtime_schema_contract_fix.sql`** — Forward-only Stage B.2 runtime repair fixing PostgreSQL 42703 errors (`website` -> `website_url` in `get_my_admin_bootstrap` and `a.user_id` -> `a.customer_id` in `get_my_tenant_appointments`). Reasserts strict SECURITY DEFINER and EXECUTE ACL contracts.
22. **`20260728_admin_rpc_live_schema_reconstruction.sql`** — Complete live-schema reconstruction of admin RPCs (`get_my_admin_bootstrap`, `get_my_tenant_appointments`, `get_my_tenant_dashboard_summary`) constructed strictly from verified database columns. Reasserts SECURITY DEFINER, search_path, and EXECUTE ACLs.
23. **`20260729_admin_bootstrap_subscription_contract_fix.sql`** — Stage B.2 Correction - Fixes PostgreSQL 42703 column reference in get_my_admin_bootstrap(): replaces non-existent sub.trial_end with canonical sub.trial_ends_at from public.subscriptions table, mapping both 'trial_end' and 'trial_ends_at' in returned JSON payload.
24. **`20260730_self_service_token_read_rpc.sql`** — Stage C1 Secure Read-Only Appointment Self-Service Contract: Provides public.get_public_appointment_by_manage_token(p_token text) RETURNS jsonb. Hashes raw token server-side, matches token_hash, checks expiration, and returns sanitized appointment, service, staff, and branch details. Returns neutral invalid_token error response for invalid/expired tokens. Preserves SECURITY DEFINER, search_path, and EXECUTE ACLs for anon and authenticated roles.
25. **`20260731_admin_appointment_status_mutation_rpc.sql`** — Stage D1 Server-Scoped Admin Appointment Mutation RPC: Creates admin_mutation_idempotency table and public.admin_update_appointment_status(UUID, TEXT, TEXT, TEXT) SECURITY DEFINER RPC. Resolves auth.uid() → users_profile for authorization, row-locks appointment FOR UPDATE, validates canonical status transitions (terminal states are immutable), writes audit_events within the same transaction, and supports 24h idempotency replay via p_idempotency_key. REVOKE FROM PUBLIC/anon, GRANT TO authenticated.
26. **`20260801_cancel_public_appointment_by_manage_token_rpc.sql`** — Stage E1 Secure Customer Appointment Cancellation via Manage Token: Provides public.cancel_public_appointment_by_manage_token(p_token text, p_reason text DEFAULT NULL) RETURNS jsonb. Hashes raw token server-side, row-locks appointment FOR UPDATE, transitions confirmed -> cancelled_by_customer, replays cancelled_by_customer -> cancelled_by_customer as no_change, returns invalid_transition for terminal states, and inserts audit_events and communication_outbox records transactionally on real mutations. REVOKE FROM PUBLIC, GRANT EXECUTE TO anon and authenticated.
27. **`20260802_cancel_public_appointment_by_manage_token_schema_fix.sql`** — Stage E1 Schema Correction: Updates cancel_public_appointment_by_manage_token RPC to set status = 'cancelled_by_customer' and updated_at = now() on public.appointments without referencing non-existent columns (cancel_reason, cancelled_at, cancelled_by). Preserves full transactional logging of cancel_reason in audit_events and communication_outbox records. REVOKE FROM PUBLIC, GRANT EXECUTE TO anon and authenticated.
28. **`20260803_cancel_public_appointment_by_manage_token_audit_outbox_fix.sql`** — Stage E1 Audit & Outbox Schema Correction: Aligns audit_events and communication_outbox column names with canonical database schema in cancel_public_appointment_by_manage_token RPC. REVOKE FROM PUBLIC, GRANT EXECUTE TO anon and authenticated.
29. **`20260804_appointments_direct_update_hardening.sql`** — Stage D2B Appointment Direct-Write Database Hardening: Revokes table and column UPDATE privileges on public.appointments from PUBLIC, anon, and authenticated roles. Removes obsolete UPDATE RLS policies. Requires all status mutations to route through SECURITY DEFINER RPCs (admin_update_appointment_status, cancel_public_appointment_by_manage_token).
30. **`20260805_request_public_appointment_reschedule_by_manage_token_rpc.sql`** — Stage F1 Secure Customer Appointment Rescheduling Request via Manage Token: Provides public.request_public_appointment_reschedule_by_manage_token(p_token text, p_requested_date date, p_requested_time text, p_reason text DEFAULT NULL, p_idempotency_key text DEFAULT NULL) RETURNS jsonb. Hashes raw token server-side, row-locks appointment FOR UPDATE, validates confirmed status eligibility, checks slot availability, and inserts a pending change-request into public.appointment_change_requests, with audit_events and communication_outbox records transactionally. REVOKE FROM PUBLIC, GRANT EXECUTE TO anon and authenticated.
31. **`20260806_request_public_appointment_reschedule_outbox_fix.sql`** — Stage F1 Outbox & Single Pending Request Correction: Updates communication_outbox metadata event_type to 'reschedule_request_created' and adds partial unique index idx_appointment_change_requests_pending_reschedule enforcing at most one active pending reschedule request per appointment at the database engine layer. Returns reason_code = 'request_already_pending' when a pending request already exists. REVOKE FROM PUBLIC, GRANT EXECUTE TO anon and authenticated.
32. **`20260807_get_public_pending_reschedule_request_by_manage_token_rpc.sql`** — Stage F2 Secure Pending Reschedule Request Read RPC: Provides public.get_public_pending_reschedule_request_by_manage_token(p_token text) RETURNS jsonb. Server-side token validation and pending reschedule request lookup for Stage F2 UI. Hashes raw token using SHA-256 against public.appointment_access_tokens, resolves appointment server-side, and returns active pending reschedule request if present. REVOKE FROM PUBLIC, GRANT EXECUTE TO anon and authenticated.
33. **`20260808_admin_reschedule_request_decision_rpc.sql`** — Stage F3 Admin Reschedule Request Decision Backend: Provides public.admin_list_pending_reschedule_requests and public.admin_decide_reschedule_request SECURITY DEFINER RPCs. Creates admin_reschedule_decision_idempotency table. Supports tenant_owner / super_admin approval and rejection of customer reschedule requests with server-side slot revalidation, atomic schedule updates, and transactional audit/outbox logging. REVOKE FROM PUBLIC, REVOKE FROM anon, GRANT EXECUTE TO authenticated.
34. **`20260809_admin_reschedule_decision_lock_and_reason_fix.sql`** — Stage F3 Advisory Lock Alignment & Customer Reason Preservation Correction: Adds resolution_reason column to public.appointment_change_requests to preserve original customer reason during admin rejection/approval. Aligns admin_decide_reschedule_request concurrency lock with create_public_booking by acquiring pg_advisory_xact_lock(hashtextextended(tenant_id:staff_id:proposed_date, 0)). REVOKE FROM PUBLIC, REVOKE FROM anon, GRANT EXECUTE TO authenticated.
35. **`20260810_h1a_commercial_catalog_and_read_contracts.sql`** — Stage H1A Canonical Commercial Schema, Immutable Catalog Versioning, and Read Contracts: Provisions commercial_feature_definitions, plans, plan_versions, plan_entitlements, subscriptions schema alignment, tenant_entitlement_overrides, append-only subscription_events, append-only billing_transactions, and usage_counters tables. Provisions resolve_effective_tenant_entitlements, get_public_commercial_plan_catalog, get_my_commercial_subscription_snapshot, super_admin_get_commercial_catalog, and super_admin_get_tenant_commercial_snapshot SECURITY DEFINER read contracts. REVOKE FROM PUBLIC, GRANT EXECUTE to anon and authenticated according to read boundary rules.
36. **`20260811_h1b_super_admin_commercial_mutations.sql`** — Stage H1B Secure Super Admin Commercial Mutation Backend: Extends subscriptions table, provisions super_admin_commercial_mutation_idempotency table, and provisions super_admin_assign_commercial_plan, super_admin_change_subscription_status, super_admin_schedule_plan_change, super_admin_cancel_scheduled_plan_change, super_admin_record_billing_transaction, and super_admin_manage_tenant_entitlement_override SECURITY DEFINER mutation contracts. REVOKE FROM PUBLIC/anon, GRANT EXECUTE to authenticated (Super Admin server-side authorized).
37. **`20260812_h1b_apply_due_scheduled_plan_change_rpc.sql`** — Stage H1B Due Scheduled Plan Change Executor RPC: Provisions super_admin_apply_due_scheduled_plan_change SECURITY DEFINER RPC with server-side target plan version re-validation, status update, row-locking, idempotency replay, and audit logging. REVOKE FROM PUBLIC/anon, GRANT EXECUTE to authenticated (Super Admin server-side authorized).
38. **`20260813_h1c_commercial_eligibility_and_quota_enforcement.sql`** — Stage H1C Server-Authoritative Commercial Eligibility & Quota Enforcement: Bootstraps canonical staging tenant subscription. Provisions resolve_tenant_commercial_eligibility, assert_tenant_commercial_action_allowed, resolve_commercial_quota, resolve_quota_period_key, consume_commercial_usage internal helpers (REVOKE FROM PUBLIC/anon/authenticated). Provisions enforce_staff_quota, enforce_service_quota, enforce_branch_quota BEFORE INSERT/UPDATE triggers. Updates create_public_booking, can_accept_public_booking, cancel_public_appointment_by_manage_token with commercial gates. Provisions get_my_commercial_enforcement_snapshot and super_admin_get_tenant_commercial_enforcement_snapshot diagnostic RPCs.
39. **`20260814_h1c_feature_gate_reason_code_fix.sql`** — Stage H1C Feature Gate Reason Code & Trigger Hardening Fix: Updates enforce_staff_quota and enforce_service_quota triggers to explicitly evaluate staff_management and service_management feature gates, raising commercial_feature_disabled when management features are disabled.
40. **`20260815_h1c_usage_counters_invariant.sql`** — Stage H1C Counter Invariant Fix: Adds strict database-level CHECK constraint (chk_usage_counters_mirror_equality) requiring usage_count = used_count on public.usage_counters. Establishes used_count as canonical consumed counter and usage_count as compatibility read mirror.
41. **`20260816_h1d_missing_commercial_admin_contracts.sql`** — Stage H1D Provisions missing super_admin commercial management contracts for fine-grained tenant plan adjustments and feature gate overrides.
42. **`20260817_h1d_contract_truth_and_idempotency_fix.sql`** — Stage H1D Migration 42 redefines super_admin_create_platform_restriction, super_admin_end_platform_restriction, and super_admin_list_tenant_commercial_directory to enforce mandatory idempotency key, structured conflict/replay envelopes, and Boolean OR directory plan filter.
43. **`20260818_h1d_idempotency_concurrency_and_filter_fix.sql`** — Stage H1D Migration 43 redefines super_admin_create_platform_restriction, super_admin_end_platform_restriction, and super_admin_list_tenant_commercial_directory to add transaction advisory locks, complete create fingerprints, and explicit 'none' directory filter semantics.
44. **`20260819_h1d_idempotency_helper_record_fix.sql`** — Stage H1D Migration 44 fixes the check_super_admin_idempotency runtime record-shape defect by selecting the complete idempotency ledger record and handling the no-row case explicitly.
45. **`20260820_h1d_audit_events_schema_alignment_fix.sql`** — Stage H1D Migration 45 aligns platform restriction create/end audit writes with canonical audit_events columns: actor_id, actor_role, and action.
46. **`20260821_h1d_future_restriction_end_fix.sql`** — Stage H1D Migration 46 allows future scheduled restrictions to be safely ended without violating the starts_at/expires_at date-range constraint.
47. **`20260822_h1e_release_control_and_eligibility_read_contracts.sql`** — Stage H1E-A Global Release Control & Eligibility Read Contracts: Provisions platform_global_release_control singleton table and super_admin_get_tenant_pilot_eligibility_snapshot read contract.
48. **`20260823_h1e_a_eligibility_runtime_contract_fix.sql`** — Stage H1E-A Eligibility Read Contract Runtime Forward Fix: Provides a forward-only CREATE OR REPLACE correction for super_admin_get_tenant_pilot_eligibility_snapshot, aligning live column names (services.active, staff.active) and eliminating unassigned RECORD dereferences.
49. **`20260824_h1e_b_pilot_authorization_history.sql`** — Stage H1E-B Pilot Authorization History & Management Contracts: Provisions tenant_pilot_authorizations table with partial unique index, super_admin_get_tenant_pilot_authorization, super_admin_approve_tenant_pilot, super_admin_revoke_tenant_pilot RPCs, and updates eligibility snapshot for H1E-B.
50. **`20260825_h1e_b_authorization_contract_hardening.sql`** — Stage H1E-B1 Authorization Contract Hardening: Revokes all direct table client access on tenant_pilot_authorizations, normalizes reason codes to uppercase, hashes raw idempotency keys in audit payloads, and provisions super_admin_get_tenant_pilot_mutation_evidence read RPC.
51. **`20260826_h1e_c_public_booking_release_gate.sql`** — Stage H1E-C Public Booking Release & Pilot Enforcement Gate: Provisions internal eligibility evaluator, integrates release control & pilot authorization into can_accept_public_booking RPC and super_admin_get_tenant_pilot_eligibility_snapshot RPC.
52. **`20260827_h1e_c_public_booking_release_gate_runtime_fix.sql`** — Stage H1E-C1 Public Booking Release Gate Runtime Forward Fix: Provisions single slug-aware 2-argument internal evaluator, drops obsolete 1-argument evaluator, corrects snapshot pilot authorization columns to approved_*, aligns restrictions query with platform_system_restrictions schema, and enforces pre_pilot unknown slug precedence without early return.
53. **`20260828_h1e_c_controlled_release_phase_transition.sql`** — Stage H1E-C3 Controlled Release Phase Transition Contract: Provisions platform_release_phase_transition_history and super_admin_release_transition_idempotency tables, super_admin_transition_release_phase mutation RPC with advisory/row locks and payment safety interlocks, and super_admin_get_release_transition_evidence read RPC.
54. **`20260829_h1e_c_controlled_transition_runtime_fix.sql`** — Stage H1E-C4 Controlled Release Transition Runtime Forward Fix: Aligns transition audit_events INSERT with canonical schema (tenant_id, actor_id, actor_role, action, resource_type, resource_id, payload), enforces actor_user_id match on idempotency replay, and updates evidence read RPC to query canonical action column.
55. **`20260830_p1c_public_branch_read_contract.sql`** — Server-authoritative public branch read RPC get_public_branches for active tenant storefront branch discovery.
56. **`20260831_p1c_public_branch_read_contract_runtime_fix.sql`** — Aligns get_public_branches RPC eligibility predicate with canonical can_accept_public_booking contract (status, onboarding_status, public_site_status).
57. **`20260901_payment_webhook_idempotency_and_replay_security.sql`** — Database-level unique constraints, idempotency table, and transactional RPCs for payment webhook idempotency, replay safety, and out-of-order transition ordering.
58. **`20260902_subscription_sync_transaction.sql`** — Atomic all-in-one transaction RPC for subscription sync operations, fail-closed enforcement across subscriptions, tenants, and audit_logs.
59. **`20260903_public_booking_ratelimit_spam_and_otp_contract.sql`** — Public booking server-side rate-limiting, burst quotas, brute-force lockout, secure OTP single-use token contract, and synthetic-only outbox queueing.
60. **`20260904_self_service_token_security_and_ratelimit.sql`** — Stage V1A-SEC-01: Self-Service Token Brute-Force Rate-Limiting, 15-Minute Lockout, SHA-256 Token Matching, Zero-PII Leak, and Tenant Isolation Contract.
61. **`20260905_p2a_atomic_tenant_provisioning_rpc.sql`** — Parallel Lane P2A (P2A.0-R2): Server-authoritative atomic and idempotent `provision_tenant_for_authenticated_owner` RPC, `tenant_provisioning_idempotency` table, dual advisory locks, `pending_onboarding` baseline subscription, and forward-hardened `tenant_business_profiles` public visibility policy.
62. **`20260906_p2a_publish_commercial_contract_alignment.sql`** — Parallel Lane P2A (P2A.0-R2): Forward-hardened `approve_and_publish_tenant(uuid)` preserving canonical selected `plan_id` / `plan_version_id` and transitioning `pending_onboarding` -> `manual_active` on Super Admin approval.
63. **`20260907_p2a_owner_onboarding_contracts.sql`** — Parallel Lane P2A (P2A.2-R2): Server-authoritative owner onboarding RPCs (`save_owner_business_profile`, `create_owner_first_branch`, `create_owner_first_service`, `create_owner_first_staff`, `get_owner_onboarding_state`, `evaluate_owner_onboarding_readiness`) and fail-closed `pending_onboarding` commercial eligibility/quota alignment (`assert_tenant_commercial_action_allowed`, `resolve_commercial_quota`).
64. **`20260908_authenticated_owner_branch_mutations_rpc.sql`** — Parallel Lane P2A / Slice 1-R2: Server-authoritative authenticated owner branch mutation RPCs (`create_tenant_branch`, `update_tenant_branch`, `set_primary_tenant_branch`, `deactivate_tenant_branch`), deterministic `generate_branch_slug` helper, and SELECT-only `branches` RLS policies.
65. **`20260909_phase2_staff_scheduling_foundation.sql`** — V2 Faz D1 (from `72911e4:20260916`): Staff time-off, breaks, asymmetric booking buffer rules, branch-aware business holidays, `evaluate_schedule_constraints`, `evaluate_booking_slot` constraint integration, and `check_staff_slot_availability` wrapper.
66. **`20260910_phase3_waitlist_foundation.sql`** — V2 Faz D1 (from `72911e4:20260917`): Waitlist lifecycle (`booking_waitlist`), idempotent anti-abuse rate limit primitive (`ht_rate_limit_buckets`, `ht_check_rate_limit`), sanitized listing (`get_sanitized_waitlist_entries`), state machine trigger, `join_booking_waitlist`, `offer_waitlist_slot` (256-bit SHA-256 claim token), `claim_waitlist_slot`, and `cancel_waitlist_slot`.
67. **`20260911_phase3_background_job_calendar_foundation.sql`** — V2 Faz D1 (from `72911e4:20260920`): Provider-neutral `calendar_sync_queue` and `background_job_runs` worker ledger (`enqueue_calendar_sync`, `claim_calendar_sync_batch`, `enqueue_background_job`, `claim_background_job_batch`, `complete_background_job`, `fail_background_job`, `cancel_background_job`) with `FOR UPDATE SKIP LOCKED` and zero live external calendar OAuth.
68. **`20260912_phase3_resource_capacity_foundation.sql`** — V2 Faz D1 (from `72911e4:20260920` reconciled with `20260903`): `resources`, `service_resource_requirements`, `resource_blocks`, `appointment_resources`, deterministic advisory locking (`evaluate_and_lock_resource_plan`), `evaluate_booking_slot` resource evaluation, canonical 15-arg `create_public_booking` preserving Pilot 4 OTP/rate-limit security + atomic resource allocation before quota, and `admin_*_resource*` RPCs.
69. **`20260913_phase3_reporting_analytics_foundation.sql`** — V2 Faz D1 (from `72911e4:20260922`): Server-authoritative tenant analytics RPCs (`get_tenant_booking_analytics`, `get_tenant_staff_performance_analytics`, `get_tenant_service_performance_analytics`, `get_tenant_branch_comparison_analytics`, `get_tenant_customer_retention_analytics`) strictly classifying `ESTIMATED_REVENUE` and `NOT_AVAILABLE_IN_CURRENT_SOURCE_TRUTH`.
70. **`20260914_phase3_custom_domain_verification_foundation.sql`** — V2 Faz D1 (from `72911e4:20260923`): `custom_domains` table, legacy domain reconciliation (`LEGACY_UNVERIFIED`), hostname normalization, `request_custom_domain`, `get_tenant_custom_domains`, `recheck_custom_domain`, `remove_custom_domain`, and `resolve_tenant_by_custom_domain` (`EXTERNAL_HOLD`: `DOMAIN_PROVIDER_READY_NOT_CONNECTED` unless `REAL_PROVIDER_VERIFIED`).
71. **`20260915_phase5_scheduling_buffer_parity_hardening.sql`** — V2 Faz D1 (from `72911e4:20260929`): Restores EV055-R3 asymmetric buffer collision logic for existing appointments in `evaluate_booking_slot` while preserving Phase 3 resource/capacity evaluation.
72. **`20260916_phase6_product_inventory_foundation.sql`** — V2 Faz D2 (from `72911e4:20260930`): Product catalog (`products`), branch inventory balances (`inventory_balances`), immutable append-only stock ledger (`inventory_movements`), advisory-locked stock RPCs (`pos_create_product`, `pos_record_stock_receipt`, `pos_decrement_stock_for_sale`, `pos_adjust_stock`, `pos_return_restock`, `pos_get_branch_inventory`) with active `staff` + `users_profile` verification and idempotency conflict guards.
73. **`20260917_phase6_node2_suppliers_po_receiving.sql`** — V2 Faz D2 (from `72911e4:20261001`): Suppliers (`suppliers`), purchase orders (`purchase_orders`), line items (`purchase_order_items`), and receiving audit/idempotency events (`purchase_order_receiving_events`), with `pos_create_supplier`, `pos_create_purchase_order`, `pos_approve_purchase_order`, `pos_cancel_purchase_order`, `pos_receive_purchase_order_items`, and `pos_get_purchase_order`.
74. **`20260918_phase6_node3_pos_mixed_cart_checkout.sql`** — V2 Faz D2 (from `72911e4:20261002`): POS mixed cart orders (`pos_orders`), line items (`pos_order_items`), and multi-tender payments (`pos_order_payments`), plus `pos_create_order`, `pos_add_cart_item` (using canonical `services.price * 100` and `to_regclass('public.service_package_definitions')` guard), `pos_checkout_order`, and `pos_get_order`.
75. **`20260919_phase6_node4_staff_commissions_tips.sql`** — V2 Faz D2 (from `72911e4:20261003`): Staff commission rules (`staff_commission_rules`), tip allocations (`pos_tip_allocations`), immutable internal earnings ledger (`staff_earnings_ledger`), `pos_set_staff_commission_rule` (`tenant_owner` only), `pos_set_tip_allocation`, hardened `pos_add_cart_item`, earnings-materializing `pos_checkout_order` (excluding tax/tip), and `pos_get_staff_earnings` (own staff or same-tenant `tenant_owner` only; no `super_admin` bypass).

---

## 2. Archived / Excluded Migrations

* **`20260526_initial_schema.sql`**: Archived to `/supabase/archive/20260526_initial_schema.sql`.
  * *Reason for exclusion*: Redundant draft initial schema that conflicts with `001_initial_schema.sql` on core table definitions.

---

## 3. Canonical Table Ownership Map

| Table Name | Created In | Altered In | RLS Policy File |
| :--- | :--- | :--- | :--- |
| `tenants` | `001_initial_schema.sql` | `003`, `20260601` | `20260619_lari_rls_policy_draft.sql` |
| `tenant_branding` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `users_profile` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `staff` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `services` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `customers` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `appointments` | `001_initial_schema.sql` | `20260601` | `20260619_lari_rls_policy_draft.sql` |
| `campaigns` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `reminders` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `whatsapp_logs` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `calendar_integrations` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `ai_recommendations` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `customer_segments` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `subscriptions` | `001_initial_schema.sql` | `002`, `004`, `20260601`, `20260621` | `20260619_lari_rls_policy_draft.sql` |
| `payments` | `001_initial_schema.sql` | `002`, `004`, `20260601` | `20260619_lari_rls_policy_draft.sql` |
| `audit_logs` | `001_initial_schema.sql` | — | `20260619_lari_rls_policy_draft.sql` |
| `tenant_onboarding_progress` | `003_provisioning_onboarding.sql` | — | `003_provisioning_onboarding.sql` |
| `tenant_business_profiles` | `005_salon_business_profile.sql` | — | `005_salon_business_profile.sql`, `20260619` |
| `staff_services` | `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `availability_rules` | `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `customer_memory` | `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `payment_events` | `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `business_verification_reviews`| `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `notification_templates` | `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `notification_logs` | `20260601_lari_core_schema_alignment.sql` | — | `20260601`, `20260619` |
| `appointment_access_tokens` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `appointment_change_requests` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `communication_outbox` | `20260620_paymentless_production_core_tables.sql`| `20260713` | `20260713_communication_outbox_rls_hardening.sql` |
| `audit_events` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `support_tickets` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `policy_acceptances` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `consent_ledger` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `data_rights_requests` | `20260620_paymentless_production_core_tables.sql`| — | `20260622_paymentless_production_rls_identity_alignment.sql` |
| `admin_mutation_idempotency` | `20260731_admin_appointment_status_mutation_rpc.sql`| — | `20260731_admin_appointment_status_mutation_rpc.sql` |
| `branches` | `20260723_booking_lifecycle_foundation.sql` | — | `20260723_booking_lifecycle_foundation.sql` |
| `staff_branches` | `20260723_booking_lifecycle_foundation.sql` | — | `20260723_booking_lifecycle_foundation.sql` |
| `service_branches` | `20260723_booking_lifecycle_foundation.sql` | — | `20260723_booking_lifecycle_foundation.sql` |
| `admin_reschedule_decision_idempotency` | `20260808_admin_reschedule_request_decision_rpc.sql` | — | `20260808_admin_reschedule_request_decision_rpc.sql` |
| `commercial_feature_definitions` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `plans` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `plan_versions` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `plan_entitlements` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `tenant_entitlement_overrides` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `subscription_events` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `billing_transactions` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `usage_counters` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | `20260815` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `platform_system_restrictions` | `20260810_h1a_commercial_catalog_and_read_contracts.sql` | — | `20260810_h1a_commercial_catalog_and_read_contracts.sql` |
| `super_admin_commercial_mutation_idempotency` | `20260811_h1b_super_admin_commercial_mutations.sql` | — | `20260811_h1b_super_admin_commercial_mutations.sql` |
| `platform_global_release_control` | `20260822_h1e_release_control_and_eligibility_read_contracts.sql` | — | `20260822_h1e_release_control_and_eligibility_read_contracts.sql` |
| `tenant_pilot_authorizations` | `20260824_h1e_b_pilot_authorization_history.sql` | — | `20260825_h1e_b_authorization_contract_hardening.sql` |
| `platform_release_phase_transition_history` | `20260828_h1e_c_controlled_release_phase_transition.sql` | — | `20260828_h1e_c_controlled_release_phase_transition.sql` |
| `super_admin_release_transition_idempotency` | `20260828_h1e_c_controlled_release_phase_transition.sql` | — | `20260828_h1e_c_controlled_release_phase_transition.sql` |
| `payment_webhook_idempotency` | `20260901_payment_webhook_idempotency_and_replay_security.sql` | — | `20260901_payment_webhook_idempotency_and_replay_security.sql` |
| `public_booking_rate_limit_events` | `20260903_public_booking_ratelimit_spam_and_otp_contract.sql` | — | `20260903_public_booking_ratelimit_spam_and_otp_contract.sql` |
| `public_booking_otp_challenges` | `20260903_public_booking_ratelimit_spam_and_otp_contract.sql` | — | `20260903_public_booking_ratelimit_spam_and_otp_contract.sql` |
| `self_service_token_rate_limits` | `20260904_self_service_token_security_and_ratelimit.sql` | — | `20260904_self_service_token_security_and_ratelimit.sql` |
| `tenant_provisioning_idempotency` | `20260905_p2a_atomic_tenant_provisioning_rpc.sql` | — | `20260905_p2a_atomic_tenant_provisioning_rpc.sql` |
| `staff_time_off` | `20260909_phase2_staff_scheduling_foundation.sql` | — | `20260909_phase2_staff_scheduling_foundation.sql` |
| `staff_breaks` | `20260909_phase2_staff_scheduling_foundation.sql` | — | `20260909_phase2_staff_scheduling_foundation.sql` |
| `booking_buffer_rules` | `20260909_phase2_staff_scheduling_foundation.sql` | — | `20260909_phase2_staff_scheduling_foundation.sql` |
| `business_holidays` | `20260909_phase2_staff_scheduling_foundation.sql` | — | `20260909_phase2_staff_scheduling_foundation.sql` |
| `ht_rate_limit_buckets` | `20260910_phase3_waitlist_foundation.sql` | — | `20260910_phase3_waitlist_foundation.sql` |
| `booking_waitlist` | `20260910_phase3_waitlist_foundation.sql` | — | `20260910_phase3_waitlist_foundation.sql` |
| `calendar_sync_queue` | `20260911_phase3_background_job_calendar_foundation.sql` | — | `20260911_phase3_background_job_calendar_foundation.sql` |
| `background_job_runs` | `20260911_phase3_background_job_calendar_foundation.sql` | — | `20260911_phase3_background_job_calendar_foundation.sql` |
| `resources` | `20260912_phase3_resource_capacity_foundation.sql` | — | `20260912_phase3_resource_capacity_foundation.sql` |
| `service_resource_requirements` | `20260912_phase3_resource_capacity_foundation.sql` | — | `20260912_phase3_resource_capacity_foundation.sql` |
| `resource_blocks` | `20260912_phase3_resource_capacity_foundation.sql` | — | `20260912_phase3_resource_capacity_foundation.sql` |
| `appointment_resources` | `20260912_phase3_resource_capacity_foundation.sql` | — | `20260912_phase3_resource_capacity_foundation.sql` |
| `custom_domains` | `20260914_phase3_custom_domain_verification_foundation.sql` | — | `20260914_phase3_custom_domain_verification_foundation.sql` |
| `products` | `20260916_phase6_product_inventory_foundation.sql` | — | `20260916_phase6_product_inventory_foundation.sql` |
| `inventory_balances` | `20260916_phase6_product_inventory_foundation.sql` | — | `20260916_phase6_product_inventory_foundation.sql` |
| `inventory_movements` | `20260916_phase6_product_inventory_foundation.sql` | — | `20260916_phase6_product_inventory_foundation.sql` |
| `suppliers` | `20260917_phase6_node2_suppliers_po_receiving.sql` | — | `20260917_phase6_node2_suppliers_po_receiving.sql` |
| `purchase_orders` | `20260917_phase6_node2_suppliers_po_receiving.sql` | — | `20260917_phase6_node2_suppliers_po_receiving.sql` |
| `purchase_order_items` | `20260917_phase6_node2_suppliers_po_receiving.sql` | — | `20260917_phase6_node2_suppliers_po_receiving.sql` |
| `purchase_order_receiving_events` | `20260917_phase6_node2_suppliers_po_receiving.sql` | — | `20260917_phase6_node2_suppliers_po_receiving.sql` |
| `pos_orders` | `20260918_phase6_node3_pos_mixed_cart_checkout.sql` | — | `20260918_phase6_node3_pos_mixed_cart_checkout.sql` |
| `pos_order_items` | `20260918_phase6_node3_pos_mixed_cart_checkout.sql` | — | `20260918_phase6_node3_pos_mixed_cart_checkout.sql` |
| `pos_order_payments` | `20260918_phase6_node3_pos_mixed_cart_checkout.sql` | — | `20260918_phase6_node3_pos_mixed_cart_checkout.sql` |
| `staff_commission_rules` | `20260919_phase6_node4_staff_commissions_tips.sql` | — | `20260919_phase6_node4_staff_commissions_tips.sql` |
| `pos_tip_allocations` | `20260919_phase6_node4_staff_commissions_tips.sql` | — | `20260919_phase6_node4_staff_commissions_tips.sql` |
| `staff_earnings_ledger` | `20260919_phase6_node4_staff_commissions_tips.sql` | — | `20260919_phase6_node4_staff_commissions_tips.sql` |

---

## 4. Staging Commands Execution Sequence

Execute the following commands sequentially to apply this manifest onto a fresh staging project:

```bash
# 1. Initialize link with remote staging project
supabase link --project-ref <staging-supabase-project-id>

# 2. Run dry-run validation using CLI to ensure parsing passes
supabase db diff --local

# 3. Apply the canonical active migration path
supabase db push
```

---

## 5. Post-Migration Verification Sequence

After the migrations have successfully been applied:

1. **Verify Static Integrity**: Run `npm run qa:supabase-migration-integrity` to ensure zero table/index/policy duplications.
2. **Verify Repository Schema Hookup**: Run `npm run qa:supabase-priority1-core` to verify that active repositories can cleanly read/write to the database.
3. **Execute SQL Assertions**: Run the SQL-level assertions detailed in `supabase/tests/paymentless_production_rls_smoke.sql` using Supabase CLI test command or SQL editor:
   ```bash
   supabase test db
   ```
4. **App-Level Staging Smoke Test**: Run `npm run smoke:supabase-paymentless-staging` (requires valid staging credentials in `.env`).

---

## 6. Rollback and Reset Notes

* **Local Reset**: To wipe changes locally and rebuild from scratch:
  ```bash
  supabase db reset
  ```
* **Remote Wipe Warning**: Never run `db reset` on shared remote staging databases without explicit confirmation from team members.

---

## 7. DO NOT CONTINUE IF:

1. **Unsafe duplicate tables remain active**: If `20260526_initial_schema.sql` was accidentally restored to the migrations folder, **STOP**.
2. **Missing Env variables**: Staging env vars are unconfigured. The app will boot safely in demo/local fallback mode, but do not push updates until credentials are set.
3. **PCI-DSS storage violations occur**: If any column definition logs credit card fields (`card_number`, `card_cvv`), immediately abort migration and correct definitions.

---

## 8. Isolated / Local Restore-Aware P0 Cutover & Direct-Write Hardening Verification (ADIM-024)

* **Isolated Test Artifact**: `supabase/tests/20261011_proposed_appointment_access_tokens_and_consent_rls_hardening.sql` captures the PR #4 (`WP-05B/C/D`, `87ab596`, `0ecb848`) P0 `appointment_access_tokens` direct-select revocation and `consent_ledger` / `policy_acceptances` tenant-scoped RLS hardening for **isolated local PostgreSQL verification only**.
* **Active Migration Chain Preserved**: The 60 active migrations in `supabase/migrations/` (`001_initial_schema.sql` through `20260904_self_service_token_security_and_ratelimit.sql`) remain untouched, with `20260901..20260904` retaining their `CANDIDATE ONLY` governance headers.
* **Governance & Production Blocker Invariants**:
  * `NO_REMOTE_DB_WRITE = TRUE` (zero remote Supabase network egress).
  * `PRODUCTION = NO_GO` (`PAID_FALLBACK = DISABLED`, `AUTO_MERGE = DISABLED`).
  * **Issue #10** remains `OPEN_PRODUCTION_BLOCKER` (`live_p0_accepted = false`, `live_status = LIVE_P0_NOT_APPLIED`).
* **Local Verification Suite**:
  * `node scripts/verify-supabase-migration-integrity.mjs`
  * `node scripts/scan-frontend-secrets.mjs`
  * `node scripts/test-appointments-direct-write-hardening.mjs`
  * `node scripts/verify-lari-recovery-hard-gate.mjs`
  * `node scripts/verify-disposable-pg17-pristine-restore.mjs`

---

## 9. V2 Faz C2 — P2A Atomic Provisioning/Onboarding Migration Port (ADIM-032)

* **Conflict-Free Sequential Timestamps (`20260905..20260908`)**: Historical V2 branch (`72911e4`) used `20260901..20260904` for P2A provisioning, publish alignment, owner onboarding, and branch mutation RPCs. Because `HEAD` already uses `20260901..20260904` for Pilot 3/4/5 security hardening migrations, the P2A SQL migrations are ported cleanly as `20260905..20260908` without modifying `20260901..20260904`.
* **Disposable Test & Fixture Suites**:
  * `supabase/tests/p2a_tenant_provisioning_static_test.sql`
  * `supabase/tests/p2a_tenant_provisioning_integration_tests.sql`
  * `supabase/tests/p2a_onboarding_integration_tests.sql`
  * `supabase/tests/package_branch_server_authority_tests.sql`
  * `supabase/tests/fixtures/p2a_historical_replay_bridge_before_migration_38.sql`
  * `supabase/tests/fixtures/p2a_managed_runtime_bootstrap.sql`
* **Governance & Safety Preserved**: `NO_REMOTE_DB_WRITE = TRUE`, `PRODUCTION = NO_GO`, `PAID_FALLBACK = DISABLED`, `AUTO_MERGE = DISABLED`, Issue #10 remains `OPEN_PRODUCTION_BLOCKER`.

---

## 10. V2 Faz D1 — Scheduling, Waitlist, Resource Capacity, Analytics & Custom Domain Port (ADIM-033)

* **Conflict-Free Sequential Timestamps (`20260909..20260915`)**: Ported from historical V2 branch (`72911e4`: `20260916`, `20260917`, `20260920`, `20260922`, `20260923`, `20260929`) without touching `20260901..20260904` or `20260905..20260908`.
* **Security Reconciliation (`20260912`)**: Preserves `HEAD`'s canonical 15-parameter `create_public_booking` signature from `20260903` (single overload in `pg_proc`, E.164 phone normalization, server-side rate-limiting, idempotency conflict fingerprints, and single-use OTP verification) while enforcing deterministic resource locking and atomic `appointment_resources` allocation prior to commercial quota consumption.
* **`EXTERNAL_HOLD` Classification**:
  * External live calendar sync (Google Calendar OAuth, Apple CalDAV, Microsoft Graph) is classified `EXTERNAL_HOLD` (`EXTERNAL_CALENDAR_CREDENTIALS_REQUIRED`); only deterministic local/test adapters (`DeterministicTestCalendarProvider`, `google_intent`/`ics` client intent) are active.
  * Live custom domain DNS/SSL verification is classified `EXTERNAL_HOLD` (`DOMAIN_PROVIDER_READY_NOT_CONNECTED`); `resolve_tenant_by_custom_domain` strictly requires `REAL_PROVIDER_VERIFIED` and never promotes simulated or legacy unverified domains to live routing.

---

## 11. V2 Faz D2 — POS, Product Inventory, Suppliers/PO & Staff Commissions-Tips Port (ADIM-034)

* **Conflict-Free Sequential Timestamps (`20260916..20260919`)**: Ported from historical V2 branch (`72911e4`: `20260930`..`20261003`) without modifying `20260901..20260915`.
* **Schema & Dependency Alignment**:
  * `pos_order_items.package_id` is provisioned as `UUID NULL` without an immediate FK to `service_package_definitions`, and `pos_add_cart_item` guards `p_item_type = 'package'` via `to_regclass('public.service_package_definitions')` until Faz D3 (`ADIM-035`) creates the packages catalog.
  * `pos_add_cart_item` resolves service prices from canonical `public.services.price` (integer major currency units) via `COALESCE(v_service.price, 0) * 100` rather than non-existent `services.price_minor_units`.
* **Trust Boundary & `EXTERNAL_HOLD` Classification**:
  * All 13 Phase 6 tables revoke direct `INSERT/UPDATE/DELETE` from `PUBLIC`, `anon`, and `authenticated`, routing mutations through `SECURITY DEFINER` RPCs enforcing active `staff` + `users_profile` (`role IN ('tenant_owner', 'staff')`) and `tenant_owner`-only commission rule authority.
  * Live physical POS terminal PSP capture (`card_terminal_adapter`), deferred customer wallet debit (`customer_wallet` until Faz D3), and automated bank/payroll payouts (`staff_earnings_ledger` is internal accounting only) are classified `EXTERNAL_HOLD`.

