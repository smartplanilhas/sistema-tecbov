import { createAdminClient } from '@/lib/supabase/server'
import { PaymentMethodDialog } from './payment-method-dialog'
import { PaymentMethodRowActions } from './payment-method-row-actions'
import { Badge } from '@/components/ui/badge'

export default async function FormasPagamentoPage({
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

  const [{ data: methods }, { data: accounts }] = await Promise.all([
    supabase
      .from('payment_methods')
      .select('id, name, active, financial_account_id, financial_accounts(name)')
      .eq('tenant_id', tenant!.id)
      .order('name'),
    supabase
      .from('financial_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Formas de Pagamento</h1>
          <p className="text-muted-foreground text-sm">Gerencie as formas de pagamento da fazenda</p>
        </div>
        <PaymentMethodDialog tenantId={tenant!.id} accounts={accounts ?? []} />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Conta destino</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!methods?.length ? (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma forma de pagamento cadastrada.
                </td>
              </tr>
            ) : (
              methods.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(m.financial_accounts as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.active ? 'success' : 'secondary'}>
                      {m.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentMethodRowActions
                      method={{ id: m.id, name: m.name, financial_account_id: m.financial_account_id, active: m.active }}
                      accounts={accounts ?? []}
                    />
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
