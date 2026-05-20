'use client'

import Link from 'next/link'
import { ChevronLeft, Download, Printer } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { downloadCsv } from '@/lib/export-utils'
import { Button } from '@/components/ui/button'

type Animal = {
  id: string
  sexo: string
  raca: string | null
  categoria: string | null
  lote: string | null
  local: string | null
}

function groupBy(arr: Animal[], key: (item: Animal) => string): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of arr) {
    const k = key(item) || 'Não informado'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return new Map([...map.entries()].sort((a, b) => b[1] - a[1]))
}

function BreakdownCard({
  title,
  items,
  total,
}: {
  title: string
  items: Map<string, number>
  total: number
}) {
  const entries = [...items.entries()]
  const mostrar = entries.slice(0, 10)
  const outros  = entries.slice(10).reduce((s, [, n]) => s + n, 0)

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="space-y-2">
        {mostrar.map(([nome, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={nome} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[70%]">{nome}</span>
                <span className="font-medium tabular-nums">
                  {count} <span className="text-muted-foreground">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
        {outros > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>Outros</span>
            <span>{outros} ({total > 0 ? Math.round((outros / total) * 100) : 0}%)</span>
          </div>
        )}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum dado</p>
        )}
      </div>
    </div>
  )
}

export function InventarioReportView({
  tenantSlug,
  animais,
}: {
  tenantSlug: string
  animais: Animal[]
}) {
  const total = animais.length
  const hoje  = formatDate(new Date().toISOString())

  const porCategoria = groupBy(animais, a => a.categoria ?? '')
  const porSexo      = groupBy(animais, a => a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : 'Não informado')
  const porRaca      = groupBy(animais, a => a.raca ?? '')
  const porLote      = groupBy(animais, a => a.lote ?? '')
  const porLocal     = groupBy(animais, a => a.local ?? '')

  function exportarCsv() {
    const header = ['Categoria', 'Sexo', 'Raça', 'Lote', 'Pasto/Local']
    const rows = animais.map(a => [
      a.categoria ?? 'Não informado',
      a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : 'Não informado',
      a.raca ?? 'Não informado',
      a.lote ?? 'Sem lote',
      a.local ?? 'Sem local',
    ])
    downloadCsv(`inventario-rebanho-${hoje.replace(/\//g, '-')}.csv`, [header, ...rows])
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href={`/${tenantSlug}/relatorios`} className="text-muted-foreground hover:text-foreground mt-1 no-print">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Inventário do Rebanho</h1>
            <p className="text-sm text-muted-foreground">Rebanho ativo em {hoje}</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={exportarCsv}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Card total */}
      <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de animais ativos</p>
          <p className="text-5xl font-bold mt-1">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Atualizado em {hoje}</p>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:border-l sm:pl-6">
          {[
            { label: 'Machos',   value: animais.filter(a => a.sexo === 'M').length },
            { label: 'Fêmeas',   value: animais.filter(a => a.sexo === 'F').length },
            { label: 'Em lote',  value: animais.filter(a => a.lote  != null).length },
            { label: 'Em pasto', value: animais.filter(a => a.local != null).length },
          ].map(item => (
            <div key={item.label}>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BreakdownCard title="Por Categoria"   items={porCategoria} total={total} />
        <BreakdownCard title="Por Sexo"        items={porSexo}      total={total} />
        <BreakdownCard title="Por Raça"        items={porRaca}      total={total} />
        <BreakdownCard title="Por Lote"        items={porLote}      total={total} />
        <BreakdownCard title="Por Pasto/Local" items={porLocal}     total={total} />
      </div>
    </div>
  )
}
