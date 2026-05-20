import { createAdminClient } from '@/lib/supabase/server'
import { ArrowLeftRight } from 'lucide-react'
import { MovimentacaoForm } from './movimentacao-form'
import { MovimentacoesView } from './movimentacoes-view'

export default async function MovimentacoesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [produtosRes, lotesRes, animaisRes, movsRes] = await Promise.all([
    admin
      .from('produtos_estoque')
      .select('id, codigo, descricao, unidade, saldo_atual, controla_estoque, valor_medio')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('codigo'),
    admin
      .from('lotes')
      .select('id, nome, fase')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),
    admin
      .from('animals')
      .select('id, brinco, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),
    admin
      .from('movimentacoes_estoque')
      .select(`
        id, tipo, quantidade, valor_unitario, data, motivo,
        produtos_estoque(codigo, descricao, unidade),
        lotes(nome),
        animals(brinco, nome)
      `)
      .eq('tenant_id', tenant.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          Movimentações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Registre entradas e saídas de estoque.</p>
      </div>

      <MovimentacaoForm
        tenantSlug={tenantSlug}
        produtos={produtosRes.data ?? []}
        lotes={lotesRes.data ?? []}
        animais={animaisRes.data ?? []}
      />

      <MovimentacoesView
        tenantSlug={tenantSlug}
        movimentacoes={movsRes.data ?? []}
      />
    </div>
  )
}
