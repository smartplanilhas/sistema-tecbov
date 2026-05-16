import { createAdminClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { CostCenterDialog } from './cost-center-dialog'
import { CostCenterRowActions } from './cost-center-row-actions'

export default async function CentroCustoPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  const { data: centers } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Centro de Custo</h1>
          <p className="text-muted-foreground text-sm">
            Agrupamento de lançamentos por área ou projeto
          </p>
        </div>
        <CostCenterDialog tenantId={tenant!.id} />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!centers?.length ? (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum centro de custo cadastrado.
                </td>
              </tr>
            ) : (
              centers.map((cc) => (
                <tr key={cc.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{cc.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cc.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={cc.active ? 'success' : 'secondary'}>
                      {cc.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <CostCenterRowActions center={cc} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
