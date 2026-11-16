-- Migration: 20261020_mobile_device_push_tokens_and_notification_routing.sql
-- Purpose: Multi-vertical mobile push notification tokens & vertical event routing (Faz M9 / ADIM-054)
-- Security: RLS enabled, direct table DML revoked, SECURITY DEFINER RPCs enforce SET search_path = public, pg_temp

CREATE TABLE IF NOT EXISTS public.mobile_device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web_push')),
  device_token TEXT NOT NULL,
  app_bundle_id TEXT NOT NULL DEFAULT 'com.randevulari.app',
  app_mode TEXT NOT NULL DEFAULT 'b2c_customer' CHECK (app_mode IN ('b2c_customer', 'b2b_partner')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_mobile_device_push_token UNIQUE (tenant_id, user_id, platform, device_token)
);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_tenant_user_active
  ON public.mobile_device_push_tokens (tenant_id, user_id)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.mobile_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  booking_and_waitlist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  clinic_encounter_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  health_tourism_itinerary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  pos_and_loyalty_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_campaigns_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_mobile_notification_prefs UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.mobile_device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mobile_device_push_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mobile_notification_preferences FROM PUBLIC, anon, authenticated;

-- Fail-closed tenant-isolated SELECT policies for authenticated users on their own rows only
DROP POLICY IF EXISTS mobile_push_tokens_self_select ON public.mobile_device_push_tokens;
CREATE POLICY mobile_push_tokens_self_select
  ON public.mobile_device_push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mobile_notification_prefs_self_select ON public.mobile_notification_preferences;
CREATE POLICY mobile_notification_prefs_self_select
  ON public.mobile_notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.register_mobile_push_token(
  p_tenant_id UUID,
  p_platform TEXT,
  p_device_token TEXT,
  p_app_mode TEXT DEFAULT 'b2c_customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_token_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'reason_code', 'UNAUTHENTICATED');
  END IF;

  IF p_tenant_id IS NULL OR p_device_token IS NULL OR length(trim(p_device_token)) < 16 THEN
    RETURN jsonb_build_object('success', FALSE, 'reason_code', 'INVALID_INPUT');
  END IF;

  IF p_platform NOT IN ('ios', 'android', 'web_push') THEN
    RETURN jsonb_build_object('success', FALSE, 'reason_code', 'INVALID_PLATFORM');
  END IF;

  INSERT INTO public.mobile_device_push_tokens (
    tenant_id,
    user_id,
    platform,
    device_token,
    app_mode,
    is_active,
    last_registered_at,
    revoked_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    v_uid,
    p_platform,
    trim(p_device_token),
    COALESCE(NULLIF(p_app_mode, ''), 'b2c_customer'),
    TRUE,
    now(),
    NULL,
    now()
  )
  ON CONFLICT (tenant_id, user_id, platform, device_token)
  DO UPDATE SET
    app_mode = EXCLUDED.app_mode,
    is_active = TRUE,
    last_registered_at = now(),
    revoked_at = NULL,
    updated_at = now()
  RETURNING id INTO v_token_id;

  INSERT INTO public.mobile_notification_preferences (tenant_id, user_id)
  VALUES (p_tenant_id, v_uid)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', TRUE,
    'token_id', v_token_id,
    'tenant_id', p_tenant_id,
    'platform', p_platform
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_mobile_push_token(
  p_tenant_id UUID,
  p_device_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'reason_code', 'UNAUTHENTICATED');
  END IF;

  UPDATE public.mobile_device_push_tokens
  SET is_active = FALSE,
      revoked_at = now(),
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND user_id = v_uid
    AND device_token = trim(p_device_token)
    AND is_active = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'revoked_count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_mobile_push_token(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_mobile_push_token(UUID, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_mobile_push_token(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_mobile_push_token(UUID, TEXT) TO authenticated;
