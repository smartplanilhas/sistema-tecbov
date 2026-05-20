import { createAdminClient } from '@/lib/supabase/server'
import { MovimentacaoView } from './movimentacao-view'

export default async function MovimentacaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animaisRes, lotesRes, locaisRes, proprietariosRes, historicoRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, lote_atual_id, local_atual_id, proprietario_id, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),

    admin
      .from('lotes')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),

    admin
      .from('locais')
      .select('id, nome, tipo')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),

    admin
      .from('proprietarios')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .order('nome'),

    admin
      .from('movimentacoes')
      .select(`
        id, tipo, data, grupo_id, created_at, observacoes,
        animals(id, brinco, nome),
        lote_anterior:lotes!lote_anterior_id(nome),
        lote_novo:lotes!lote_novo_id(nome),
        local_anterior:locais!local_anterior_id(nome),
        local_novo:locais!local_novo_id(nome)
      `)
      .eq('tenant_id', tenant.id)
      .in('tipo', ['mudanca_lote', 'mudanca_local', 'mudanca_lote_local'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const animais = (animaisRes.data ?? []).map((a: any) => ({
    id:              a.id,
    brinco:          a.brinco,
    nome:            a.nome,
    lote_atual_id:   a.lote_atual_id,
    local_atual_id:  a.local_atual_id,
    proprietario_id: a.proprietario_id,
    categoria:       a.categorias_animal?.nome ?? null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Movimentação de Animais</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Transfira animais individualmente ou em grupo entre lotes, locais e proprietários.
        </p>
      </div>

      <MovimentacaoView
        tenantSlug={tenantSlug}
        animais={animais}
        lotes={(lotesRes.data ?? []) as any}
        locais={(locaisRes.data ?? []) as any}
        proprietarios={(proprietariosRes.data ?? []) as any}
        historico={(historicoRes.data ?? []) as any}
      />
    </div>
  )
}
