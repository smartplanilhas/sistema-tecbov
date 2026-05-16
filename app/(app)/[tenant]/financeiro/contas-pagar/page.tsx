import { createAdminClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PayableDialog } from './payable-dialog'

const statusMap: Record<string, { label: string; variant: 'destructive' | 'success' | 'warning' | 'secondary' }> = {
  OPEN: { label: 'Em aberto', variant: 'warning' },
  PAID: { label: 'Pago', variant: 'success' },
  OVERDUE: { label: 'Vencido', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'secondary' },
}

export default async function ContasPagarPage({
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

  const [{ data: payables }, { data: costCenters }, { data: categories }] = await Promise.all([
    supabase
      .from('payables')
      .select('*')
      .eq('tenant_id', tenant!.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('cost_centers')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true),
    supabase
      .from('chart_of_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('type', 'EXPENSE')
      .eq('active', true),
  ])

  const today = new Date().toISOString().split('T')[0]
  const totalOpen = (payables ?? [])
    .filter((p) => p.status === 'OPEN')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm">
            Total em aberto: <span className="font-medium text-red-600">{formatCurrency(totalOpen)}</span>
          </p>
        </div>
        <PayableDialog tenantId={tenant!.id} costCenters={costCenters ?? []} categories={categories ?? []} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fornecedor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimento</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {!payables?.length ? (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma conta a pagar cadastrada.
                </td>
              </tr>
            ) : (
              payables.map((p) => {
                const isOverdue = p.status === 'OPEN' && p.due_date < today
                const status = isOverdue ? 'OVERDUE' : p.status
                const statusInfo = statusMap[status]
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.supplier}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.description ?? '—'}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {formatDate(p.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
