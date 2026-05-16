-- Extensões necessárias para cron + chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Executa diariamente às 6h UTC
-- Gera novos lançamentos para recorrências cujo buffer vence em 45 dias
SELECT cron.schedule(
  'process-recurrences',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://hdcxogkgzzkgvveqfenm.supabase.co/functions/v1/process-recurrences',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
