'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

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
  amount: number
  children: CoaNode[]
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function buildTree(entries: CoaEntry[], sumByCategory: Record<string, number>): CoaNode[] {
  const nodeMap = new Map<string, CoaNode>()

  for (const e of entries) {
    nodeMap.set(e.id, { ...e, amount: 0, children: [] })
  }

  for (const [id, amount] of Object.entries(sumByCategory)) {
    const node = nodeMap.get(id)
    if (node && !node.is_group) {
      node.amount = amount
    }
  }

  const roots: CoaNode[] = []
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function sortNodes(nodes: CoaNode[]) {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    for (const n of nodes) sortNodes(n.children)
  }
  sortNodes(roots)

  function computeTotals(node: CoaNode): number {
    if (!node.is_group) return node.amount
    node.amount = node.children.reduce((s, c) => s + computeTotals(c), 0)
    return node.amount
  }
  for (const r of roots) computeTotals(r)

  return roots
}

function flattenTree(nodes: CoaNode[]): CoaNode[] {
  const result: CoaNode[] = []
  function walk(node: CoaNode) {
    result.push(node)
    for (const c of node.children) walk(c)
  }
  for (const n of nodes) walk(n)
  return result
}

function DRERow({ node, colorClass }: { node: CoaNode; colorClass: string }) {
  const indent = (node.level - 1) * 20 + 16
  return (
    <tr className={`border-b last:border-0 hover:bg-muted/10 transition-colors ${node.is_group ? 'bg-muted/5' : ''}`}>
      <td className="py-2 pr-4" style={{ paddingLeft: `${indent}px` }}>
        <span className={node.is_group ? 'font-semibold' : ''}>
          <span className="text-xs text-muted-foreground/50 mr-2">{node.code}</span>
          <span className={node.is_group ? '' : 'text-muted-foreground'}>{node.name}</span>
        </span>
      </td>
      <td className={`px-4 py-2 text-right ${node.is_group ? `font-semibold ${colorClass}` : ''}`}>
        {node.amount > 0 ? (
          formatCurrency(node.amount)
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </td>
    </tr>
  )
}

export function DREView({
  month,
  coa,
  sumByCategory,
}: {
  month: string
  coa: CoaEntry[]
  sumByCategory: Record<string, number>
}) {
  const router   = useRouter()
  const pathname = usePathname()

  const [year, monthNum] = month.split('-').map(Number)
  const monthName = `${MONTH_NAMES[monthNum - 1]} ${year}`

  function prevMonth() {
    const d = new Date(year, monthNum - 2, 1)
    router.push(`${pathname}?month=${d.toISOString().slice(0, 7)}`)
  }

  function nextMonth() {
    const d = new Date(year, monthNum, 1)
    router.push(`${pathname}?month=${d.toISOString().slice(0, 7)}`)
  }

  const revenueCoa = coa.filter((e) => e.type === 'REVENUE')
  const expenseCoa = coa.filter((e) => e.type === 'EXPENSE')

  const revenueTree = buildTree(revenueCoa, sumByCategory)
  const expenseTree = buildTree(expenseCoa, sumByCategory)

  const revenueFlat = flattenTree(revenueTree)
  const expenseFlat = flattenTree(expenseTree)

  const totalRevenue = revenueTree.reduce((s, n) => s + n.amount, 0)
  const totalExpense = expenseTree.reduce((s, n) => s + n.amount, 0)
  const result = totalRevenue - totalExpense

  function handlePrintPDF() {
    function sectionRowsHTML(nodes: CoaNode[], cls: 'green' | 'red'): string {
      return nodes.map(node => {
        const pl = 10 + (node.level - 1) * 16
        return `<tr class="${node.is_group ? 'grp' : 'leaf'}">
          <td style="padding-left:${pl}px"><span class="code">${node.code}</span> ${node.name}</td>
          <td class="r">${node.amount > 0 ? `<span class="${cls}">${formatCurrency(node.amount)}</span>` : '<span class="dash">—</span>'}</td>
        </tr>`
      }).join('')
    }

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>DRE — ${monthName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px}
    h1{font-size:16px;margin-bottom:2px}
    .meta{color:#666;font-size:10px;margin-bottom:14px}
    .cards{display:flex;gap:12px;margin-bottom:14px}
    .card{border:1px solid #ddd;border-radius:4px;padding:8px 12px;flex:1}
    .cl{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}
    .cv{font-size:13px;font-weight:bold}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;border:1px solid #e5e7eb;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.3px;color:#555;text-align:left}
    td{border:1px solid #e5e7eb;padding:4px 8px}
    .r{text-align:right;width:140px}
    .green{color:#15803d}.red{color:#b91c1c}.dash{color:#ccc}
    .sec-rev td{background:#f0fdf4;font-weight:bold;font-size:9px;text-transform:uppercase;letter-spacing:.3px;color:#15803d}
    .sec-exp td{background:#fff1f2;font-weight:bold;font-size:9px;text-transform:uppercase;letter-spacing:.3px;color:#b91c1c;border-top:2px solid #9ca3af}
    .grp td{background:#fafafa;font-weight:600}
    .leaf td{color:#555}
    .code{color:#bbb;font-size:8px;margin-right:4px}
    .result-row td{background:#f3f4f6;font-weight:bold;font-size:11px;border-top:2px solid #9ca3af}
    @page{size:A4 portrait;margin:12mm 15mm}
  </style>
</head>
<body>
  <h1>DRE — ${monthName}</h1>
  <div class="meta">Demonstração do Resultado do Exercício · Somente pagos</div>
  <div class="cards">
    <div class="card"><div class="cl">Total Receitas</div><div class="cv" style="color:#15803d">${formatCurrency(totalRevenue)}</div></div>
    <div class="card"><div class="cl">Total Despesas</div><div class="cv" style="color:#b91c1c">${formatCurrency(totalExpense)}</div></div>
    <div class="card"><div class="cl">Resultado do Período</div><div class="cv" style="color:${result >= 0 ? '#15803d' : '#b91c1c'}">${formatCurrency(result)}</div></div>
  </div>
  <table>
    <thead><tr><th>Conta</th><th class="r">Valor</th></tr></thead>
    <tbody>
      <tr class="sec-rev">
        <td>Receitas</td><td class="r">${formatCurrency(totalRevenue)}</td>
      </tr>
      ${sectionRowsHTML(revenueFlat, 'green')}
      <tr class="sec-exp">
        <td>Despesas</td><td class="r">${formatCurrency(totalExpense)}</td>
      </tr>
      ${sectionRowsHTML(expenseFlat, 'red')}
      <tr class="result-row">
        <td>Resultado do Período</td>
        <td class="r" style="color:${result >= 0 ? '#15803d' : '#b91c1c'}">${formatCurrency(result)}</td>
      </tr>
    </tbody>
  </table>
  <script>window.onload=function(){window.print()}</script>
</body></html>`

    const win = window.open('', '_blank', 'width=800,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DRE</h1>
          <p className="text-sm text-muted-foreground">Demonstração do Resultado do Exercício</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintPDF}>
          <Printer className="h-4 w-4" />
          PDF
        </Button>
      </div>

      <div className="flex items-center gap-1 border rounded-lg px-1 py-0.5 w-fit">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium px-2 min-w-36 text-center">{monthName}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Receitas</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Despesas</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Resultado do Período</p>
          <p className={`text-xl font-bold ${result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(result)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Conta</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground w-44">Valor</th>
            </tr>
          </thead>
          <tbody>
            {/* Receitas section */}
            <tr className="border-b bg-green-50/60 dark:bg-green-950/20">
              <td className="px-4 py-2.5 font-bold text-green-700 text-xs uppercase tracking-wider">
                Receitas
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-green-700">
                {formatCurrency(totalRevenue)}
              </td>
            </tr>
            {revenueFlat.map((node) => (
              <DRERow key={node.id} node={node} colorClass="text-green-700" />
            ))}

            {/* Despesas section */}
            <tr className="border-b border-t-2 bg-red-50/60 dark:bg-red-950/20">
              <td className="px-4 py-2.5 font-bold text-red-700 text-xs uppercase tracking-wider">
                Despesas
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-red-700">
                {formatCurrency(totalExpense)}
              </td>
            </tr>
            {expenseFlat.map((node) => (
              <DRERow key={node.id} node={node} colorClass="text-red-700" />
            ))}

            {/* Resultado */}
            <tr className="border-t-2 bg-muted/20">
              <td className="px-4 py-3 font-bold text-base">Resultado do Período</td>
              <td className={`px-4 py-3 text-right font-bold text-base ${result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(result)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
