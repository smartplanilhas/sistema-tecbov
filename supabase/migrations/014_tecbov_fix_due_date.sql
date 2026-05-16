UPDATE transactions
SET due_date = date
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'tecbov')
  AND due_date IS NULL;
