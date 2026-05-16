import Link from 'next/link'
import { CalendarClock, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

type UpcomingTransaction = {
  id: string
  description: string | null
  amount: number
  date: string
  due_date: string | null
}

function dueMeta(dateStr: string): { label: string; classes: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0)   return { label: `${Math.abs(diffDays)}d atraso`, classes: 'text-red-600 bg-red-50 border-red-200' }
  if (diffDays === 0) return { label: 'Vence hoje',                    classes: 'text-orange-600 bg-orange-50 border-orange-200' }
  if (diffDays <= 3)  return { label: `${diffDays}d`,                  classes: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  return                     { label: `${diffDays}d`,                  classes: 'text-muted-foreground bg-muted/40 border-border' }
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function UpcomingPayablesCard({
  transactions,
  tenantSlug,
}: {
  transactions: UpcomingTransaction[]
  tenantSlug: string
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Próximos Vencimentos</span>
        </div>
        <Link
          href={`/${tenantSlug}/financeiro/lancamentos`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* List */}
      {transactions.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Nenhum vencimento próximo.
        </div>
      ) : (
        <ul className="divide-y">
          {transactions.map(tx => {
            const refDate = tx.due_date ?? tx.date
            const { label, classes } = dueMeta(refDate)
            return (
              <li key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                {/* Due badge */}
                <span className={cn('shrink-0 text-xs font-medium border rounded px-2 py-0.5 w-20 text-center', classes)}>
                  {label}
                </span>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description ?? '—'}</p>
                </div>

                {/* Amount + date */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(tx.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(refDate)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
