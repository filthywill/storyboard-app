-- Migration: Add writer leases for project_data
-- Purpose: Enforce project-scoped single-writer lease
-- Date: February 2026

ALTER TABLE project_data
  ADD COLUMN IF NOT EXISTS writer_id TEXT;

ALTER TABLE project_data
  ADD COLUMN IF NOT EXISTS writer_expires_at TIMESTAMPTZ;

-- Claim writer lease
CREATE OR REPLACE FUNCTION public.claim_writer_lease(
  p_project_id uuid,
  p_writer_id text,
  p_force boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_is_deleted boolean;
  v_writer_id text;
  v_writer_expires_at timestamptz;
  v_now timestamptz := now();
  v_new_expires_at timestamptz := now() + interval '60 seconds';
BEGIN
  SELECT user_id, is_deleted
    INTO v_owner_id, v_is_deleted
  FROM projects
  WHERE id = p_project_id;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() OR v_is_deleted IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found_or_forbidden');
  END IF;

  SELECT writer_id, writer_expires_at
    INTO v_writer_id, v_writer_expires_at
  FROM project_data
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'project_data_missing');
  END IF;

  IF p_force
     OR v_writer_id IS NULL
     OR v_writer_expires_at IS NULL
     OR v_writer_expires_at < v_now
     OR v_writer_id = p_writer_id THEN
    UPDATE project_data
      SET writer_id = p_writer_id,
          writer_expires_at = v_new_expires_at
      WHERE project_id = p_project_id;

    RETURN jsonb_build_object('ok', true, 'expires_at', v_new_expires_at);
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'lease_held',
    'holder', v_writer_id,
    'expires_at', v_writer_expires_at
  );
END;
$$;

-- Release writer lease
CREATE OR REPLACE FUNCTION public.release_writer_lease(
  p_project_id uuid,
  p_writer_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_is_deleted boolean;
  v_writer_id text;
  v_writer_expires_at timestamptz;
BEGIN
  SELECT user_id, is_deleted
    INTO v_owner_id, v_is_deleted
  FROM projects
  WHERE id = p_project_id;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() OR v_is_deleted IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found_or_forbidden');
  END IF;

  SELECT writer_id, writer_expires_at
    INTO v_writer_id, v_writer_expires_at
  FROM project_data
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'project_data_missing');
  END IF;

  IF v_writer_id = p_writer_id THEN
    UPDATE project_data
      SET writer_id = NULL,
          writer_expires_at = NULL
      WHERE project_id = p_project_id;

    RETURN jsonb_build_object('ok', true, 'released', true);
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'reason', 'not_holder',
    'holder', v_writer_id,
    'expires_at', v_writer_expires_at
  );
END;
$$;

-- Ensure new signature is used for defaults
DROP FUNCTION IF EXISTS public.save_project_if_unchanged(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz);
DROP FUNCTION IF EXISTS public.save_project_if_unchanged(uuid, json, json, json, json, json, timestamptz);

-- Save project with optimistic concurrency + optional writer lease
CREATE OR REPLACE FUNCTION public.save_project_if_unchanged(
  p_project_id uuid,
  p_pages jsonb,
  p_shots jsonb,
  p_shot_order jsonb,
  p_project_settings jsonb,
  p_ui_settings jsonb,
  p_expected_updated_at timestamptz,
  p_writer_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_is_deleted boolean;
  v_current_updated_at timestamptz;
  v_writer_id text;
  v_writer_expires_at timestamptz;
  v_new_updated_at timestamptz;
  v_new_writer_expires_at timestamptz;
BEGIN
  SELECT user_id, is_deleted
    INTO v_owner_id, v_is_deleted
  FROM projects
  WHERE id = p_project_id;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() OR v_is_deleted IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found_or_forbidden');
  END IF;

  SELECT updated_at, writer_id, writer_expires_at
    INTO v_current_updated_at, v_writer_id, v_writer_expires_at
  FROM project_data
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'project_data_missing');
  END IF;

  IF p_writer_id IS NOT NULL THEN
    IF v_writer_id IS DISTINCT FROM p_writer_id
       OR v_writer_expires_at IS NULL
       OR v_writer_expires_at < now() THEN
      RETURN jsonb_build_object(
        'ok', false,
        'lease_rejected', true,
        'holder', v_writer_id,
        'out_updated_at', v_current_updated_at
      );
    END IF;
  END IF;

  IF p_expected_updated_at IS NOT NULL AND v_current_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object(
      'ok', false,
      'conflict', true,
      'out_updated_at', v_current_updated_at
    );
  END IF;

  v_new_updated_at := now();
  IF p_writer_id IS NOT NULL THEN
    v_new_writer_expires_at := v_new_updated_at + interval '60 seconds';
  END IF;

  UPDATE project_data
    SET pages = p_pages,
        shots = p_shots,
        shot_order = p_shot_order,
        project_settings = p_project_settings,
        ui_settings = p_ui_settings,
        updated_at = v_new_updated_at,
        writer_expires_at = CASE WHEN p_writer_id IS NOT NULL THEN v_new_writer_expires_at ELSE writer_expires_at END
    WHERE project_id = p_project_id
    RETURNING updated_at INTO v_new_updated_at;

  RETURN jsonb_build_object('ok', true, 'updated_at', v_new_updated_at);
END;
$$;
