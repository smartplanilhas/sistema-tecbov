'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

type Account = { id: string; name: string; balance: number }
type Tx = { date: string; type: string; amount: number; status: string }

type DayRow = {
  date: string        // YYYY-MM-DD
  label: string       // "01", "02", ...
  income: number
  expense: number
  incomePending: number
  expensePending: number
  balance: number     // saldo ao fim do dia
}

function buildRows(
  month: string,
  daysInMonth: number,
  openingBalance: number,
  transactions: Tx[],
  includePending: boolean,
): DayRow[] {
  const [year, monthNum] = month.split('-').map(Number)

  // Agrupar transações por data
  const byDate: Record<string, { income: number; expense: number; incomePending: number; expensePending: number }> = {}

  for (const tx of transactions) {
    if (!byDate[tx.date]) byDate[tx.date] = { income: 0, expense: 0, incomePending: 0, expensePending: 0 }
    const val = Number(tx.amount)
    if (tx.status === 'COMPLETED') {
      if (tx.type === 'INCOME') byDate[tx.date].income += val
      else byDate[tx.date].expense += val
    } else {
      if (tx.type === 'INCOME') byDate[tx.date].incomePending += val
      else byDate[tx.date].expensePending += val
    }
  }

  const rows: DayRow[] = []
  let runningBalance = openingBalance

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    const data = byDate[dateStr] ?? { income: 0, expense: 0, incomePending: 0, expensePending: 0 }

    const netCompleted = data.income - data.expense
    const netPending   = includePending ? (data.incomePending - data.expensePending) : 0
    runningBalance += netCompleted + netPending

    rows.push({
      date:           dateStr,
      label:          String(d).padStart(2, '0'),
      income:         data.income,
      expense:        data.expense,
      incomePending:  data.incomePending,
      expensePending: data.expensePending,
      balance:        runningBalance,
    })
  }

  return rows
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export function CashFlowView({
  tenantSlug,
  month,
  accounts,
  selectedAccountId,
  includePending,
  openingBalance,
  transactions,
  daysInMonth,
}: {
  tenantSlug: string
  month: string
  accounts: Account[]
  selectedAccountId: string
  includePending: boolean
  openingBalance: number
  transactions: Tx[]
  daysInMonth: number
}) {
  const router   = useRouter()
  const pathname = usePathname()

  const [year, monthNum] = month.split('-').map(Number)
  const monthName = `${MONTH_NAMES[monthNum - 1]} ${year}`

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = {
      month,
      account_id: selectedAccountId,
      pending:    includePending ? '1' : '',
      ...params,
    }
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    router.push(`${pathname}?${sp.toString()}`)
  }

  function prevMonth() {
    const d = new Date(year, monthNum - 2, 1)
    navigate({ month: d.toISOString().slice(0, 7) })
  }

  function nextMonth() {
    const d = new Date(year, monthNum, 1)
    navigate({ month: d.toISOString().slice(0, 7) })
  }

  const rows = buildRows(month, daysInMonth, openingBalance, transactions, includePending)
  const closingBalance = rows[rows.length - 1]?.balance ?? openingBalance
  const todayStr = new Date().toISOString().slice(0, 10)

  const totalIncome  = rows.reduce((s, r) => s + r.income + (includePending ? r.incomePending : 0), 0)
  const totalExpense = rows.reduce((s, r) => s + r.expense + (includePending ? r.expensePending : 0), 0)

  function handlePrintPDF() {
    const accountLabel = selectedAccountId
      ? (accounts.find(a => a.id === selectedAccountId)?.name ?? 'Conta selecionada')
      : 'Todas as contas'

    const rowsHTML = rows.map(row => {
      const isToday   = row.date === todayStr
      const inRow  = row.income  + (includePending ? row.incomePending  : 0)
      const outRow = row.expense + (includePending ? row.expensePending : 0)
      return `
        <tr${isToday ? ' class="today"' : ''}>
          <td>${row.label}/${String(monthNum).padStart(2, '0')}</td>
          <td class="right${inRow > 0 ? ' green' : ''}">${inRow > 0 ? formatCurrency(inRow) : '—'}</td>
          <td class="right${outRow > 0 ? ' red' : ''}">${outRow > 0 ? formatCurrency(outRow) : '—'}</td>
          <td class="right${row.balance < 0 ? ' red' : ''}">${formatCurrency(row.balance)}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fluxo de Caixa — ${monthName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
    h1 { font-size: 17px; margin-bottom: 3px; }
    .meta { color: #666; font-size: 11px; margin-bottom: 14px; }
    .summary { display: flex; gap: 12px; margin-bottom: 14px; }
    .card { border: 1px solid #ddd; border-radius: 5px; padding: 8px 12px; flex: 1; }
    .card-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
    .card-value { font-size: 13px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; color: #555; }
    td { border: 1px solid #e5e7eb; padding: 4px 8px; }
    .right { text-align: right; }
    .green { color: #16a34a; }
    .red   { color: #dc2626; }
    .today { background: #eff6ff; font-weight: 600; }
    .section-row td { background: #f9fafb; font-weight: 600; font-size: 10px; color: #6b7280; }
    .footer-row td { background: #f3f4f6; font-weight: bold; border-top: 2px solid #9ca3af; }
    @page { size: A4 portrait; margin: 12mm 15mm; }
  </style>
</head>
<body>
  <h1>Fluxo de Caixa — ${monthName}</h1>
  <div class="meta">${accountLabel}${includePending ? ' · Incluindo previstos' : ' · Somente pagos'}</div>
  <div class="summary">
    <div class="card">
      <div class="card-label">Saldo Inicial</div>
      <div class="card-value" style="color:${openingBalance < 0 ? '#dc2626' : '#111'}">${formatCurrency(openingBalance)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Entradas</div>
      <div class="card-value" style="color:#16a34a">${formatCurrency(totalIncome)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Saídas</div>
      <div class="card-value" style="color:#dc2626">${formatCurrency(totalExpense)}</div>
    </div>
    <div class="card">
      <div class="card-label">Resultado</div>
      <div class="card-value" style="color:${totalIncome - totalExpense >= 0 ? '#16a34a' : '#dc2626'}">${formatCurrency(totalIncome - totalExpense)}</div>
    </div>
    <div class="card">
      <div class="card-label">Saldo Final</div>
      <div class="card-value" style="color:${closingBalance < 0 ? '#dc2626' : '#111'}">${formatCurrency(closingBalance)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:80px">Data</th>
        <th style="text-align:right">Entradas</th>
        <th style="text-align:right">Saídas</th>
        <th style="text-align:right">Saldo</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-row">
        <td>Saldo Inicial</td><td></td><td></td>
        <td class="right${openingBalance < 0 ? ' red' : ''}">${formatCurrency(openingBalance)}</td>
      </tr>
      ${rowsHTML}
      <tr class="footer-row">
        <td>Saldo Final</td>
        <td class="right green">${totalIncome > 0 ? formatCurrency(totalIncome) : '—'}</td>
        <td class="right red">${totalExpense > 0 ? formatCurrency(totalExpense) : '—'}</td>
        <td class="right${closingBalance < 0 ? ' red' : ''}">${formatCurrency(closingBalance)}</td>
      </tr>
    </tbody>
  </table>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Visão diária do mês</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintPDF}>
          <Printer className="h-4 w-4" />
          PDF
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Navegação de mês */}
        <div className="flex items-center gap-1 border rounded-lg px-1 py-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-36 text-center">{monthName}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filtro de conta */}
        <Select
          value={selectedAccountId || '_all'}
          onValueChange={(v) => navigate({ account_id: v === '_all' ? '' : v })}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle pendentes */}
        <button
          onClick={() => navigate({ pending: includePending ? '' : '1' })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            includePending
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-input hover:bg-accent'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${includePending ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
          Incluir previstos
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Entradas</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Saídas</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Resultado do Mês</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Data</th>
              <th className="text-right px-4 py-3 font-medium text-green-700">Entradas</th>
              <th className="text-right px-4 py-3 font-medium text-red-700">Saídas</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {/* Saldo inicial */}
            <tr className="border-b bg-muted/20">
              <td className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Saldo Inicial
              </td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5" />
              <td className={`px-4 py-2.5 text-right font-semibold ${openingBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                {formatCurrency(openingBalance)}
              </td>
            </tr>

            {/* Dias do mês */}
            {rows.map((row) => {
              const isToday   = row.date === todayStr
              const hasMoved  = row.income > 0 || row.expense > 0
              const hasPending = row.incomePending > 0 || row.expensePending > 0
              const isEmpty   = !hasMoved && !(includePending && hasPending)

              const totalInRow  = row.income + (includePending ? row.incomePending : 0)
              const totalOutRow = row.expense + (includePending ? row.expensePending : 0)

              return (
                <tr
                  key={row.date}
                  className={`border-b last:border-0 transition-colors ${
                    isToday
                      ? 'bg-primary/5 font-medium'
                      : isEmpty
                      ? 'hover:bg-muted/10'
                      : 'hover:bg-muted/20'
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className={`${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {row.label}/{String(monthNum).padStart(2, '0')}
                    </span>
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    {totalInRow > 0 ? (
                      <span className={hasPending && !hasMoved ? 'text-green-400' : 'text-green-600'}>
                        {formatCurrency(totalInRow)}
                        {includePending && hasPending && row.incomePending > 0 && (
                          <span className="text-xs text-green-400 ml-1">
                            (+{formatCurrency(row.incomePending)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    {totalOutRow > 0 ? (
                      <span className={hasPending && !hasMoved ? 'text-red-400' : 'text-red-600'}>
                        {formatCurrency(totalOutRow)}
                        {includePending && hasPending && row.expensePending > 0 && (
                          <span className="text-xs text-red-400 ml-1">
                            (+{formatCurrency(row.expensePending)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  <td className={`px-4 py-2.5 text-right font-medium ${
                    row.balance >= 0 ? 'text-foreground' : 'text-red-600'
                  }`}>
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              )
            })}

            {/* Saldo final */}
            <tr className="border-t-2 bg-muted/20">
              <td className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Saldo Final
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                {totalIncome > 0 ? formatCurrency(totalIncome) : '—'}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                {totalExpense > 0 ? formatCurrency(totalExpense) : '—'}
              </td>
              <td className={`px-4 py-2.5 text-right font-bold text-base ${
                closingBalance >= 0 ? 'text-foreground' : 'text-red-600'
              }`}>
                {formatCurrency(closingBalance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
