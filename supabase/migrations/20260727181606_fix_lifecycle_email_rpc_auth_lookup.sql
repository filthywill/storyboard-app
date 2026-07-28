-- User validity remains enforced transactionally by the existing foreign-key constraints.
CREATE OR REPLACE FUNCTION public.sync_billing_subscription_and_enqueue_welcome(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_price_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
RETURNS TABLE (
  billing_synchronized boolean,
  outbox_inserted boolean,
  outbox_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_outbox_id uuid;
  v_outbox_inserted boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22004';
  END IF;

  IF p_stripe_customer_id IS NULL OR btrim(p_stripe_customer_id) = '' THEN
    RAISE EXCEPTION 'p_stripe_customer_id is required' USING ERRCODE = '22004';
  END IF;

  IF p_stripe_subscription_id IS NULL OR btrim(p_stripe_subscription_id) = '' THEN
    RAISE EXCEPTION 'p_stripe_subscription_id is required' USING ERRCODE = '22004';
  END IF;

  IF p_status IS NULL OR btrim(p_status) = '' THEN
    RAISE EXCEPTION 'p_status is required' USING ERRCODE = '22004';
  END IF;

  IF p_cancel_at_period_end IS NULL THEN
    RAISE EXCEPTION 'p_cancel_at_period_end is required' USING ERRCODE = '22004';
  END IF;

  INSERT INTO public.billing_subscriptions AS billing (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    price_id,
    status,
    current_period_end,
    cancel_at_period_end,
    updated_at
  )
  VALUES (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_price_id,
    p_status,
    p_current_period_end,
    p_cancel_at_period_end,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    price_id = EXCLUDED.price_id,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = EXCLUDED.updated_at;

  -- Only an active subscription represents a completed paid Pro activation.
  IF p_status = 'active' THEN
    INSERT INTO public.lifecycle_email_outbox (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      email_type
    )
    VALUES (
      p_user_id,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      'welcome_pro'
    )
    ON CONFLICT (stripe_subscription_id, email_type) DO NOTHING
    RETURNING id INTO v_outbox_id;

    v_outbox_inserted := FOUND;

    IF NOT v_outbox_inserted THEN
      SELECT id
      INTO v_outbox_id
      FROM public.lifecycle_email_outbox
      WHERE stripe_subscription_id = p_stripe_subscription_id
        AND email_type = 'welcome_pro';
    END IF;
  END IF;

  RETURN QUERY SELECT true, v_outbox_inserted, v_outbox_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_billing_subscription_and_enqueue_welcome(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sync_billing_subscription_and_enqueue_welcome(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean
) TO service_role;
