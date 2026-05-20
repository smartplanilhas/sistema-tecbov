import { createAdminClient } from '@/lib/supabase/server'
import { PackageOpen } from 'lucide-react'
import { ProdutoForm } from '../produto-form'

export default async function NovoProdutoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [categoriasRes, tiposRes] = await Promise.all([
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageOpen className="h-6 w-6 text-muted-foreground" />
          Novo produto
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Preencha os dados do produto. O código interno é gerado automaticamente.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <ProdutoForm
          tenantSlug={tenantSlug}
          categorias={categoriasRes.data ?? []}
          tiposUso={tiposRes.data ?? []}
        />
      </div>
    </div>
  )
}
