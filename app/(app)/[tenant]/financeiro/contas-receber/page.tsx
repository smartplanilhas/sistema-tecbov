import { createAdminClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReceivableDialog } from './receivable-dialog'

const statusMap: Record<string, { label: string; variant: 'destructive' | 'success' | 'warning' | 'secondary' }> = {
  OPEN: { label: 'Em aberto', variant: 'warning' },
  RECEIVED: { label: 'Recebido', variant: 'success' },
  OVERDUE: { label: 'Vencido', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'secondary' },
}

export default async function ContasReceberPage({
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

  const [{ data: receivables }, { data: categories }] = await Promise.all([
    supabase
      .from('receivables')
      .select('*')
      .eq('tenant_id', tenant!.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('chart_of_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('type', 'REVENUE')
      .eq('active', true),
  ])

  const today = new Date().toISOString().split('T')[0]
  const totalOpen = (receivables ?? [])
    .filter((r) => r.status === 'OPEN')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-muted-foreground text-sm">
            Total em aberto: <span className="font-medium text-green-600">{formatCurrency(totalOpen)}</span>
          </p>
        </div>
        <ReceivableDialog tenantId={tenant!.id} categories={categories ?? []} />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimento</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {!receivables?.length ? (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma conta a receber cadastrada.
                </td>
              </tr>
            ) : (
              receivables.map((r) => {
                const isOverdue = r.status === 'OPEN' && r.due_date < today
                const status = isOverdue ? 'OVERDUE' : r.status
                const statusInfo = statusMap[status]
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{r.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.description ?? '—'}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {formatDate(r.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(r.amount)}
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
