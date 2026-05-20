import { createAdminClient } from '@/lib/supabase/server'
import { ArrowLeftRight } from 'lucide-react'
import { MovimentacaoForm } from '../movimentacao-form'

export default async function NovaMovimentacaoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [produtosRes, lotesRes, animaisRes] = await Promise.all([
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
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          Nova movimentação
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registre uma entrada ou saída de estoque.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <MovimentacaoForm
          tenantSlug={tenantSlug}
          produtos={produtosRes.data ?? []}
          lotes={lotesRes.data ?? []}
          animais={animaisRes.data ?? []}
        />
      </div>
    </div>
  )
}
