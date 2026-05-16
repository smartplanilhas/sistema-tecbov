-- Corrige fn_audit_trigger: NEW::jsonb não é válido para tipos compostos.
-- A forma correta é to_jsonb(NEW).
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log(tenant_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    COALESCE(
      (CASE WHEN TG_OP <> 'DELETE' THEN (to_jsonb(NEW)->>'tenant_id')::UUID ELSE NULL END),
      (to_jsonb(OLD)->>'tenant_id')::UUID
    ),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(
      (CASE WHEN TG_OP <> 'DELETE' THEN (to_jsonb(NEW)->>'id')::UUID ELSE NULL END),
      (to_jsonb(OLD)->>'id')::UUID
    ),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
