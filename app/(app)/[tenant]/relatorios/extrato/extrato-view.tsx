'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Printer, TrendingUp, TrendingDown, ArrowLeftRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Account = { id: string; name: string }
type Tx = {
  id: string
  date: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED'
  description: string | null
  transfer_id: string | null
  financial_accounts: { name: string } | null
  chart_of_accounts: { name: string } | null
  people: { name: string } | null
}

const TYPE_LABEL: Record<string, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferência',
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Efetivado',
  PENDING:   'Previsto',
  CANCELLED: 'Cancelado',
}

function txDescription(tx: Tx): string {
  if (tx.description) return tx.description
  return TYPE_LABEL[tx.type] ?? tx.type
}

export function ExtratoView({
  tenantName,
  accounts,
  transactions,
  start,
  end,
}: {
  tenantName: string
  accounts: Account[]
  transactions: Tx[]
  start: string
  end: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Date range (local, submitted via button)
  const [localStart, setLocalStart] = useState(start)
  const [localEnd,   setLocalEnd]   = useState(end)

  // Client-side filters (instant, no server round-trip)
  const [accountFilter, setAccountFilter] = useState('all')
  const [typeFilter,    setTypeFilter]    = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('all')

  function applyDateRange() {
    const params = new URLSearchParams()
    params.set('start', localStart)
    params.set('end', localEnd)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (accountFilter !== 'all' && tx.financial_accounts?.name !== accounts.find(a => a.id === accountFilter)?.name) return false
      if (typeFilter   !== 'all' && tx.type   !== typeFilter)   return false
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false
      return true
    })
  }, [transactions, accountFilter, typeFilter, statusFilter, accounts])

  // Totals (COMPLETED only for concluídos; PENDING separate)
  const totals = useMemo(() => {
    let income = 0, expense = 0, incomePending = 0, expensePending = 0, transfers = 0
    for (const tx of filtered) {
      if (tx.type === 'INCOME') {
        if (tx.status === 'COMPLETED') income += tx.amount
        else incomePending += tx.amount
      } else if (tx.type === 'EXPENSE') {
        if (tx.status === 'COMPLETED') expense += tx.amount
        else expensePending += tx.amount
      } else if (tx.type === 'TRANSFER' && tx.status === 'COMPLETED') {
        transfers += tx.amount
      }
    }
    return { income, expense, incomePending, expensePending, transfers }
  }, [filtered])

  const resultado = totals.income - totals.expense

  // Group by date for display
  const byDate = useMemo(() => {
    const map = new Map<string, Tx[]>()
    for (const tx of filtered) {
      if (!map.has(tx.date)) map.set(tx.date, [])
      map.get(tx.date)!.push(tx)
    }
    return map
  }, [filtered])

  const dates = useMemo(() => Array.from(byDate.keys()).sort(), [byDate])

  return (
    <div className="space-y-5 max-w-5xl print:max-w-none">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Extrato Financeiro</h1>
          <p className="text-sm text-muted-foreground">{tenantName}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Extrato Financeiro — {tenantName}</h1>
        <p className="text-sm text-muted-foreground">
          Período: {formatDate(start)} a {formatDate(end)}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 space-y-3 print:hidden">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
        </div>

        {/* Date range row */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={localStart}
              onChange={e => setLocalStart(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={localEnd}
              onChange={e => setLocalEnd(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8" onClick={applyDateRange}>
            Aplicar período
          </Button>
        </div>

        {/* Client filters row */}
        <div className="flex flex-wrap gap-2">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="INCOME">Receitas</SelectItem>
              <SelectItem value="EXPENSE">Despesas</SelectItem>
              <SelectItem value="TRANSFER">Transferências</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="COMPLETED">Efetivado</SelectItem>
              <SelectItem value="PENDING">Previsto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-muted-foreground">Receitas</p>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totals.income)}</p>
          {totals.incomePending > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">+ {formatCurrency(totals.incomePending)} previsto</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            <p className="text-xs text-muted-foreground">Despesas</p>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.expense)}</p>
          {totals.expensePending > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">+ {formatCurrency(totals.expensePending)} previsto</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
            <p className="text-xs text-muted-foreground">Transferências</p>
          </div>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.transfers)}</p>
        </div>

        <div className={cn('rounded-xl border bg-card p-4', resultado >= 0 ? 'bg-green-50/60 dark:bg-green-950/20' : 'bg-red-50/60 dark:bg-red-950/20')}>
          <p className="text-xs text-muted-foreground mb-1.5">Resultado</p>
          <p className={cn('text-lg font-bold', resultado >= 0 ? 'text-green-600' : 'text-red-600')}>
            {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
          </p>
          {(totals.incomePending > 0 || totals.expensePending > 0) && (
            <p className={cn('text-xs mt-0.5', (totals.incomePending - totals.expensePending) >= 0 ? 'text-green-500' : 'text-red-500')}>
              {(totals.incomePending - totals.expensePending) >= 0 ? '+' : ''}
              {formatCurrency(totals.incomePending - totals.expensePending)} previsto
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card text-center py-16 text-muted-foreground text-sm">
          Nenhum lançamento encontrado neste período.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dates.map(date => {
                const dayTxs = byDate.get(date)!

                // Day totals for completed (INCOME - EXPENSE for the day)
                const dayIncome  = dayTxs.filter(t => t.type === 'INCOME'  && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0)
                const dayExpense = dayTxs.filter(t => t.type === 'EXPENSE' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0)
                const dayNet = dayIncome - dayExpense

                return [
                  // Day separator row
                  <tr key={`sep-${date}`} className="border-b bg-muted/20 print:bg-gray-50">
                    <td colSpan={6} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                      {formatDate(date)}
                    </td>
                    <td className="px-4 py-1.5 text-right text-xs font-semibold">
                      <span className={cn(dayNet >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {dayNet >= 0 ? '+' : ''}{formatCurrency(dayNet)}
                      </span>
                    </td>
                  </tr>,
                  // Transaction rows
                  ...dayTxs.map(tx => {
                    const isIncome   = tx.type === 'INCOME'
                    const isExpense  = tx.type === 'EXPENSE'
                    const isTransfer = tx.type === 'TRANSFER'
                    const isPending  = tx.status === 'PENDING'

                    return (
                      <tr key={tx.id} className={cn('border-b last:border-0 hover:bg-muted/10', isPending && 'opacity-70')}>
                        <td className="px-4 py-3 text-muted-foreground" />
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="truncate">{txDescription(tx)}</p>
                          {tx.people && (
                            <p className="text-xs text-muted-foreground truncate">{(tx.people as { name: string }).name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {tx.financial_accounts?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {tx.chart_of_accounts?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isIncome   && <Badge variant="success"   className="text-xs font-normal">Receita</Badge>}
                          {isExpense  && <Badge variant="destructive" className="text-xs font-normal">Despesa</Badge>}
                          {isTransfer && <Badge variant="secondary" className="text-xs font-normal text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400">Transferência</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'warning'} className="text-xs font-normal">
                            {STATUS_LABEL[tx.status]}
                          </Badge>
                        </td>
                        <td className={cn(
                          'px-4 py-3 text-right font-medium whitespace-nowrap',
                          isIncome   ? 'text-green-600' : isExpense ? 'text-red-600' : 'text-blue-600',
                          isPending  && 'opacity-70'
                        )}>
                          {isIncome  ? '+' : isExpense ? '-' : ''}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    )
                  }),
                ]
              })}
            </tbody>

            {/* Footer totals */}
            <tfoot className="border-t-2 bg-muted/30">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-sm font-medium text-muted-foreground">
                  {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-right space-y-0.5">
                  <div className="text-green-600 font-semibold text-sm">+{formatCurrency(totals.income)}</div>
                  <div className="text-red-600 font-semibold text-sm">-{formatCurrency(totals.expense)}</div>
                  <div className={cn('font-bold text-sm border-t pt-0.5 mt-0.5', resultado >= 0 ? 'text-green-700' : 'text-red-700')}>
                    {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
