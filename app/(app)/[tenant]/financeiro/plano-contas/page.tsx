import { createAdminClient } from '@/lib/supabase/server'
import { CoaTree } from './coa-tree'

export default async function PlanoContasPage({
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

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .order('code')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plano de Contas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Estrutura hierárquica contábil — grupos e contas analíticas
        </p>
      </div>
      <CoaTree tenantId={tenant!.id} accounts={accounts ?? []} />
    </div>
  )
}
