'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils'

export type TransferTx = {
  id: string
  transfer_id: string | null
  date: string
  amount: number
  status: string
  description: string | null
  financial_accounts: { name: string } | null
}

type TransferPair = {
  transfer_id: string
  date: string
  amount: number
  status: string
  fromAccount: string
  toAccount: string
  customDescription: string
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  COMPLETED: { label: 'Efetivado', variant: 'success' },
  PENDING:   { label: 'Previsto',  variant: 'warning' },
  CANCELLED: { label: 'Cancelado', variant: 'secondary' },
}

function buildPairs(txs: TransferTx[]): TransferPair[] {
  const groups = new Map<string, TransferTx[]>()
  for (const tx of txs) {
    const key = tx.transfer_id ?? tx.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const pairs: TransferPair[] = []
  for (const [key, group] of groups.entries()) {
    const from = group.find(t => t.description?.startsWith('Transferência para')) ?? group[0]
    const to   = group.find(t => t.description?.startsWith('Transferência de'))   ?? group[1] ?? group[0]

    const isAutoDesc = from.description?.startsWith('Transferência para') || from.description?.startsWith('Transferência de')

    pairs.push({
      transfer_id:       key,
      date:              from.date,
      amount:            from.amount,
      status:            from.status,
      fromAccount:       from.financial_accounts?.name ?? '—',
      toAccount:         to.financial_accounts?.name  ?? '—',
      customDescription: isAutoDesc ? '' : (from.description ?? ''),
    })
  }

  return pairs.sort((a, b) => b.date.localeCompare(a.date))
}

export function TransferList({
  transfers,
  tenantId,
}: {
  transfers: TransferTx[]
  tenantId: string
}) {
  const router = useRouter()
  const now = new Date()
  const [monthYear, setMonthYear] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [deleting, setDeleting] = useState<string | null>(null)

  function prevMonth() {
    setMonthYear(({ year, month }) => month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 })
  }
  function nextMonth() {
    setMonthYear(({ year, month }) => month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 })
  }

  const monthPrefix = `${monthYear.year}-${String(monthYear.month).padStart(2, '0')}`
  const monthLabel = formatMonthYear(new Date(monthYear.year, monthYear.month - 1, 1))
    .replace(/^\w/, c => c.toUpperCase())

  const pairs = useMemo(() =>
    buildPairs(transfers.filter(t => t.date.startsWith(monthPrefix)))
  , [transfers, monthPrefix])

  const total = pairs.reduce((s, p) => s + p.amount, 0)

  async function handleDelete(transfer_id: string) {
    if (!confirm('Excluir esta transferência? As duas entradas serão removidas.')) return
    setDeleting(transfer_id)
    const supabase = createClient()
    await supabase.from('transactions').delete().eq('transfer_id', transfer_id)
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center gap-1 rounded-xl border bg-card px-4 py-2.5 w-fit">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Transferência</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {pairs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-10">
                  Nenhuma transferência neste mês.
                </td>
              </tr>
            ) : (
              <>
                {pairs.map(pair => {
                  const statusInfo = statusLabels[pair.status] ?? statusLabels['PENDING']
                  return (
                    <tr key={pair.transfer_id} className="border-b hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(pair.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pair.fromAccount}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">{pair.toAccount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {pair.customDescription || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(pair.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deleting === pair.transfer_id}
                          onClick={() => handleDelete(pair.transfer_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t bg-muted/20">
                  <td colSpan={3} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">
                    Total ({pairs.length} transferência{pairs.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold">
                    {formatCurrency(total)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
