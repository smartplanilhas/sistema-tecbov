import { createAdminClient } from '@/lib/supabase/server'
import { MovimentacoesView } from './movimentacoes-view'

export default async function MovimentacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [movsRes, lotesRes, locaisRes] = await Promise.all([
    admin.from('movimentacoes')
      .select(`
        id, tipo, data, motivo, observacoes, grupo_id, created_at,
        animals(id, brinco, nome),
        lote_anterior:lotes!lote_anterior_id(id, nome),
        lote_novo:lotes!lote_novo_id(id, nome),
        local_anterior:locais!local_anterior_id(id, nome),
        local_novo:locais!local_novo_id(id, nome)
      `)
      .eq('tenant_id', tenant.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    admin.from('lotes').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
    admin.from('locais').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
  ])

  return (
    <MovimentacoesView
      tenantSlug={tenantSlug}
      movimentacoes={(movsRes.data ?? []) as any}
      lotes={(lotesRes.data ?? []) as any}
      locais={(locaisRes.data ?? []) as any}
    />
  )
}
