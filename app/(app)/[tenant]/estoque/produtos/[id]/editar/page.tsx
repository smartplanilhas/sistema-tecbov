import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PackageOpen } from 'lucide-react'
import { ProdutoForm } from '../../produto-form'

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [produtoRes, categoriasRes, tiposRes] = await Promise.all([
    admin
      .from('produtos_estoque')
      .select('id, codigo, descricao, unidade, valor_medio, controla_estoque, saldo_atual, estoque_minimo, categoria_id, tipo_uso_id, observacao, ativo')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single(),
    admin
      .from('categorias_estoque')
      .select('id, nome')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .eq('ativa', true)
      .order('nome'),
    admin
      .from('tipos_uso_estoque')
      .select('id, nome, ordem')
      .order('ordem'),
  ])

  if (!produtoRes.data) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageOpen className="h-6 w-6 text-muted-foreground" />
          Editar produto
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Código {produtoRes.data.codigo} — {produtoRes.data.descricao}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <ProdutoForm
          tenantSlug={tenantSlug}
          categorias={categoriasRes.data ?? []}
          tiposUso={tiposRes.data ?? []}
          produto={produtoRes.data}
        />
      </div>
    </div>
  )
}
