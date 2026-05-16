-- Renomeia tabela e função de gesmart para tecbov
ALTER TABLE IF EXISTS gesmart_admins RENAME TO tecbov_admins;

CREATE OR REPLACE FUNCTION tecbov_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON tenant_subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION tecbov_update_updated_at();
