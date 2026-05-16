CREATE TABLE tenant_subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id                uuid        REFERENCES plans(id),
  status                 text        NOT NULL DEFAULT 'trial'
                           CHECK (status IN ('trial', 'active', 'past_due', 'blocked', 'cancelled')),
  trial_ends_at          timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  extra_users            int         NOT NULL DEFAULT 0,
  notes                  text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_addon_modules (
  tenant_id uuid REFERENCES tenants(id)  ON DELETE CASCADE,
  module_id text REFERENCES modules(id)  ON DELETE CASCADE,
  active    boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, module_id)
);

CREATE OR REPLACE FUNCTION gesmart_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION gesmart_update_updated_at();
