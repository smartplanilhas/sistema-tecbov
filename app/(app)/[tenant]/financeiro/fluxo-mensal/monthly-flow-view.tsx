'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type CoaEntry = {
  id: string
  code: string
  name: string
  type: string
  parent_id: string | null
  is_group: boolean
  level: number
}

type CoaNode = CoaEntry & {
  monthly: number[]   // 12 elements, 0 = Jan
  total: number
  children: CoaNode[]
}

function buildTree(entries: CoaEntry[], sumByCategory: Record<string, number[]>): CoaNode[] {
  const nodeMap = new Map<string, CoaNode>()

  for (const e of entries) {
    const direct = sumByCategory[e.id]
    nodeMap.set(e.id, {
      ...e,
      monthly: direct ? [...direct] : Array(12).fill(0),
      total: 0,
      children: [],
    })
  }

  const roots: CoaNode[] = []
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function sort(nodes: CoaNode[]) {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    for (const n of nodes) sort(n.children)
  }
  sort(roots)

  function computeTotals(node: CoaNode): number[] {
    if (node.children.length === 0) {
      node.total = node.monthly.reduce((s, v) => s + v, 0)
      return node.monthly
    }
    const sum = Array(12).fill(0)
    for (const child of node.children) {
      const cm = computeTotals(child)
      for (let i = 0; i < 12; i++) sum[i] += cm[i]
    }
    // add any direct transactions on a group (edge case)
    for (let i = 0; i < 12; i++) sum[i] += node.monthly[i]
    node.monthly = sum
    node.total = sum.reduce((s, v) => s + v, 0)
    return sum
  }
  for (const r of roots) computeTotals(r)

  return roots
}

function flatLevel12(nodes: CoaNode[]): CoaNode[] {
  const result: CoaNode[] = []
  function walk(node: CoaNode) {
    if (node.level <= 2) result.push(node)
    if (node.level < 2) for (const c of node.children) walk(c)
  }
  for (const n of nodes) walk(n)
  return result
}

function Amt({ value, colorClass, bold }: { value: number; colorClass?: string; bold?: boolean }) {
  if (value === 0) return <span className="text-muted-foreground/30">—</span>
  return (
    <span className={`${colorClass ?? ''} ${bold ? 'font-semibold' : ''}`}>
      {formatCurrency(value)}
    </span>
  )
}

export function MonthlyFlowView({
  year,
  selectedAccountId,
  includePending,
  accounts,
  coa,
  sumByCategory,
}: {
  year: number
  selectedAccountId: string
  includePending: boolean
  accounts: { id: string; name: string }[]
  coa: CoaEntry[]
  sumByCategory: Record<string, number[]>
}) {
  const router   = useRouter()
  const pathname = usePathname()

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = {
      year: String(year),
      account_id: selectedAccountId,
      pending: includePending ? '1' : '',
      ...params,
    }
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    router.push(`${pathname}?${sp.toString()}`)
  }

  const revenueCoa = coa.filter(e => e.type === 'REVENUE')
  const expenseCoa = coa.filter(e => e.type === 'EXPENSE')

  const revenueTree = buildTree(revenueCoa, sumByCategory)
  const expenseTree = buildTree(expenseCoa, sumByCategory)

  const revenueRows = flatLevel12(revenueTree)
  const expenseRows = flatLevel12(expenseTree)

  // Monthly totals
  const totalRevenue = Array(12).fill(0)
  const totalExpense = Array(12).fill(0)
  for (const n of revenueTree) for (let i = 0; i < 12; i++) totalRevenue[i] += n.monthly[i]
  for (const n of expenseTree) for (let i = 0; i < 12; i++) totalExpense[i] += n.monthly[i]
  const resultado = totalRevenue.map((r, i) => r - totalExpense[i])

  const annualRevenue = totalRevenue.reduce((s, v) => s + v, 0)
  const annualExpense = totalExpense.reduce((s, v) => s + v, 0)
  const annualResult  = annualRevenue - annualExpense

  function handlePrintPDF() {
    const accountLabel = selectedAccountId
      ? (accounts.find(a => a.id === selectedAccountId)?.name ?? 'Conta selecionada')
      : 'Todas as contas'

    function sectionRowsHTML(nodes: CoaNode[], cls: 'green' | 'red'): string {
      return nodes.map(node => {
        const pl = 8 + (node.level - 1) * 14
        const vals = node.monthly.map(v =>
          `<td class="r">${v > 0 ? `<span class="${cls}">${formatCurrency(v)}</span>` : '<span class="dash">—</span>'}</td>`
        ).join('')
        return `<tr class="${node.level === 1 ? 'g1' : 'g2'}">
          <td style="padding-left:${pl}px"><span class="code">${node.code}</span> ${node.name}</td>
          ${vals}
          <td class="r">${node.total > 0 ? `<span class="${cls}">${formatCurrency(node.total)}</span>` : '<span class="dash">—</span>'}</td>
        </tr>`
      }).join('')
    }

    const monthTH = MONTHS.map(m => `<th class="r">${m}</th>`).join('')

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Fluxo de Caixa Mensal — ${year}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:9px;color:#111;padding:16px}
    h1{font-size:15px;margin-bottom:2px}
    .meta{color:#666;font-size:9px;margin-bottom:12px}
    .cards{display:flex;gap:10px;margin-bottom:12px}
    .card{border:1px solid #ddd;border-radius:4px;padding:7px 10px;flex:1}
    .cl{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px}
    .cv{font-size:12px;font-weight:bold}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;border:1px solid #e5e7eb;padding:4px 6px;font-size:8px;text-transform:uppercase;letter-spacing:.3px;color:#555;text-align:left;white-space:nowrap}
    td{border:1px solid #e5e7eb;padding:3px 6px;white-space:nowrap}
    .r{text-align:right}
    .green{color:#15803d}.red{color:#b91c1c}.dash{color:#ccc}
    .sec-rev td{background:#f0fdf4;font-weight:bold;font-size:8px;text-transform:uppercase;letter-spacing:.3px;color:#15803d}
    .sec-exp td{background:#fff1f2;font-weight:bold;font-size:8px;text-transform:uppercase;letter-spacing:.3px;color:#b91c1c;border-top:2px solid #9ca3af}
    .g1 td{background:#fafafa;font-weight:600}
    .g2 td{color:#444}
    .code{color:#bbb;font-size:8px;margin-right:3px}
    .result-row td{background:#f3f4f6;font-weight:bold;border-top:2px solid #9ca3af}
    @page{size:A4 landscape;margin:10mm 12mm}
  </style>
</head>
<body>
  <h1>Fluxo de Caixa Mensal — ${year}</h1>
  <div class="meta">${accountLabel}${includePending ? ' · Incluindo previstos' : ' · Somente pagos'}</div>
  <div class="cards">
    <div class="card"><div class="cl">Total Receitas</div><div class="cv" style="color:#15803d">${formatCurrency(annualRevenue)}</div></div>
    <div class="card"><div class="cl">Total Despesas</div><div class="cv" style="color:#b91c1c">${formatCurrency(annualExpense)}</div></div>
    <div class="card"><div class="cl">Resultado do Ano</div><div class="cv" style="color:${annualResult >= 0 ? '#15803d' : '#b91c1c'}">${formatCurrency(annualResult)}</div></div>
  </div>
  <table>
    <thead><tr><th style="min-width:160px">Categoria</th>${monthTH}<th class="r">Total</th></tr></thead>
    <tbody>
      <tr class="sec-rev">
        <td>Receitas</td>
        ${totalRevenue.map(v => `<td class="r">${v > 0 ? formatCurrency(v) : '—'}</td>`).join('')}
        <td class="r">${annualRevenue > 0 ? formatCurrency(annualRevenue) : '—'}</td>
      </tr>
      ${sectionRowsHTML(revenueRows, 'green')}
      <tr class="sec-exp">
        <td>Despesas</td>
        ${totalExpense.map(v => `<td class="r">${v > 0 ? formatCurrency(v) : '—'}</td>`).join('')}
        <td class="r">${annualExpense > 0 ? formatCurrency(annualExpense) : '—'}</td>
      </tr>
      ${sectionRowsHTML(expenseRows, 'red')}
      <tr class="result-row">
        <td>Resultado</td>
        ${resultado.map(v => `<td class="r" style="color:${v > 0 ? '#15803d' : v < 0 ? '#b91c1c' : '#ccc'}">${v !== 0 ? formatCurrency(v) : '—'}</td>`).join('')}
        <td class="r" style="color:${annualResult >= 0 ? '#15803d' : '#b91c1c'}">${formatCurrency(annualResult)}</td>
      </tr>
    </tbody>
  </table>
  <script>window.onload=function(){window.print()}</script>
</body></html>`

    const win = window.open('', '_blank', 'width=1100,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa Mensal</h1>
          <p className="text-sm text-muted-foreground">Visão anual por categoria — lançamentos pagos</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintPDF}>
          <Printer className="h-4 w-4" />
          PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year navigation */}
        <div className="flex items-center gap-1 border rounded-lg px-1 py-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate({ year: String(year - 1) })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold px-3 min-w-20 text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate({ year: String(year + 1) })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Account filter */}
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

        {/* Pending toggle */}
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Receitas</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(annualRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Despesas</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(annualExpense)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Resultado do Ano</p>
          <p className={`text-xl font-bold ${annualResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(annualResult)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/40 min-w-52">
                Categoria
              </th>
              {MONTHS.map(m => (
                <th key={m} className="text-right px-3 py-3 font-medium text-muted-foreground w-24">{m}</th>
              ))}
              <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Total</th>
            </tr>
          </thead>
          <tbody>

            {/* ── RECEITAS ── */}
            <tr className="border-b bg-green-50/60 dark:bg-green-950/20">
              <td className="px-4 py-2.5 font-bold text-green-700 text-xs uppercase tracking-wider sticky left-0 bg-green-50/60 dark:bg-green-950/20">
                Receitas
              </td>
              {totalRevenue.map((v, i) => (
                <td key={i} className="px-3 py-2.5 text-right font-bold text-green-700">
                  <Amt value={v} colorClass="text-green-700" bold />
                </td>
              ))}
              <td className="px-4 py-2.5 text-right font-bold text-green-700">
                <Amt value={annualRevenue} colorClass="text-green-700" bold />
              </td>
            </tr>

            {revenueRows.map(node => (
              <tr key={node.id} className={`border-b hover:bg-muted/10 transition-colors ${node.level === 1 ? 'bg-muted/5' : ''}`}>
                <td
                  className={`px-4 py-2 sticky left-0 bg-card ${node.level === 1 ? 'bg-muted/5' : ''}`}
                  style={{ paddingLeft: node.level === 1 ? '1rem' : '2rem' }}
                >
                  <span className={node.level === 1 ? 'font-semibold' : 'text-muted-foreground'}>
                    <span className="text-muted-foreground/40 mr-1.5">{node.code}</span>
                    {node.name}
                  </span>
                </td>
                {node.monthly.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    <Amt value={v} colorClass={node.level === 1 ? 'text-green-700' : ''} bold={node.level === 1} />
                  </td>
                ))}
                <td className={`px-4 py-2 text-right ${node.level === 1 ? 'font-semibold text-green-700' : ''}`}>
                  <Amt value={node.total} colorClass={node.level === 1 ? 'text-green-700' : ''} bold={node.level === 1} />
                </td>
              </tr>
            ))}

            {/* ── DESPESAS ── */}
            <tr className="border-b border-t-2 bg-red-50/60 dark:bg-red-950/20">
              <td className="px-4 py-2.5 font-bold text-red-700 text-xs uppercase tracking-wider sticky left-0 bg-red-50/60 dark:bg-red-950/20">
                Despesas
              </td>
              {totalExpense.map((v, i) => (
                <td key={i} className="px-3 py-2.5 text-right font-bold text-red-700">
                  <Amt value={v} colorClass="text-red-700" bold />
                </td>
              ))}
              <td className="px-4 py-2.5 text-right font-bold text-red-700">
                <Amt value={annualExpense} colorClass="text-red-700" bold />
              </td>
            </tr>

            {expenseRows.map(node => (
              <tr key={node.id} className={`border-b hover:bg-muted/10 transition-colors ${node.level === 1 ? 'bg-muted/5' : ''}`}>
                <td
                  className={`px-4 py-2 sticky left-0 bg-card ${node.level === 1 ? 'bg-muted/5' : ''}`}
                  style={{ paddingLeft: node.level === 1 ? '1rem' : '2rem' }}
                >
                  <span className={node.level === 1 ? 'font-semibold' : 'text-muted-foreground'}>
                    <span className="text-muted-foreground/40 mr-1.5">{node.code}</span>
                    {node.name}
                  </span>
                </td>
                {node.monthly.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    <Amt value={v} colorClass={node.level === 1 ? 'text-red-700' : ''} bold={node.level === 1} />
                  </td>
                ))}
                <td className={`px-4 py-2 text-right ${node.level === 1 ? 'font-semibold text-red-700' : ''}`}>
                  <Amt value={node.total} colorClass={node.level === 1 ? 'text-red-700' : ''} bold={node.level === 1} />
                </td>
              </tr>
            ))}

            {/* ── RESULTADO ── */}
            <tr className="border-t-2 bg-muted/20">
              <td className="px-4 py-3 font-bold text-sm sticky left-0 bg-muted/20">
                Resultado
              </td>
              {resultado.map((v, i) => (
                <td key={i} className={`px-3 py-3 text-right font-semibold ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {v !== 0 ? formatCurrency(v) : <span className="text-muted-foreground/30">—</span>}
                </td>
              ))}
              <td className={`px-4 py-3 text-right font-bold text-sm ${annualResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(annualResult)}
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}
