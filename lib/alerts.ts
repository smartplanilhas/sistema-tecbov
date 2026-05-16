import type { SupabaseClient } from '@supabase/supabase-js'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface CreateAlertParams {
  tenantId: string
  module: string
  severity?: AlertSeverity
  title: string
  message?: string
  link?: string
}

/**
 * Cria um alerta do sistema. Pode ser chamado de qualquer server action ou page.
 * Usa o cliente Supabase passado como argumento para reutilizar sessão/contexto.
 */
export async function createAlert(
  supabase: SupabaseClient,
  params: CreateAlertParams,
) {
  const { error } = await supabase.from('system_alerts').insert({
    tenant_id: params.tenantId,
    module: params.module,
    severity: params.severity ?? 'info',
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
  })
  if (error) console.error('[createAlert]', error.message)
}
