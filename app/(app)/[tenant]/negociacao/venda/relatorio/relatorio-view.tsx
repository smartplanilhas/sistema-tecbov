'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type SaleItem = {
  id: string
  data: string
  peso_venda: number | null
  tipo_preco: 'por_animal' | 'por_kg' | null
  valor_unitario: number
  custo_total_snapshot: number
  animal: { id: string; brinco: string | null; nome: string | null } | null
  lote: { id: string; nome: string } | null
  tx: { id: string; people: { name: string } | null } | null
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function margem(receita: number, custo: number) {
  return receita - custo
}

function margemPct(receita: number, custo: number) {
  if (custo === 0) return receita > 0 ? 100 : 0
  return ((receita - custo) / custo) * 100
}

export function RelatorioView({
  tenantSlug,
  items,
  lotesFiltro,
  compradoresFiltro,
}: {
  tenantSlug: string
  items: SaleItem[]
  lotesFiltro: { id: string; nome: string }[]
  compradoresFiltro: string[]
}) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [loteId, setLoteId]         = useState('all')
  const [comprador, setComprador]   = useState('all')

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (dataInicio && item.data < dataInicio) return false
      if (dataFim   && item.data > dataFim)     return false
      if (loteId !== 'all' && item.lote?.id !== loteId) return false
      if (comprador !== 'all' && item.tx?.people?.name !== comprador) return false
      return true
    })
  }, [items, dataInicio, dataFim, loteId, comprador])

  const totais = useMemo(() => ({
    receita: filtered.reduce((s, i) => s + i.valor_unitario, 0),
    custo:   filtered.reduce((s, i) => s + i.custo_total_snapshot, 0),
    peso:    filtered.reduce((s, i) => s + (i.peso_venda ?? 0), 0),
  }), [filtered])

  const margemTotal = totais.receita - totais.custo
  const margemTotalPct = totais.custo > 0
    ? ((totais.receita - totais.custo) / totais.custo) * 100
    : totais.receita > 0 ? 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/negociacao/venda`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Vendas
        </Link>
        <h1 className="text-2xl font-bold">Relatório de Custo vs Venda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Resultado por animal vendido.
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border bg-card px-6 py-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Filtros</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lote de saída</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {lotesFiltro.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comprador</Label>
            <Select value={comprador} onValueChange={setComprador}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {compradoresFiltro.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground mb-1">Animais</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground mb-1">Receita total</p>
          <p className="text-2xl font-bold tabular-nums">R$ {fmt(totais.receita)}</p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground mb-1">Custo total</p>
          <p className="text-2xl font-bold tabular-nums">R$ {fmt(totais.custo)}</p>
        </div>
        <div className={cn('rounded-xl border px-5 py-4', margemTotal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
          <p className="text-xs text-muted-foreground mb-1">Margem</p>
          <p className={cn('text-2xl font-bold tabular-nums', margemTotal >= 0 ? 'text-green-700' : 'text-red-700')}>
            R$ {fmt(margemTotal)}
          </p>
          <p className={cn('text-xs mt-0.5', margemTotal >= 0 ? 'text-green-600' : 'text-red-600')}>
            {margemTotalPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum resultado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Brinco</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Lote</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Comprador</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Peso (kg)</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Precif.</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Custo (R$)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Receita (R$)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Margem (R$)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(item => {
                const mg    = margem(item.valor_unitario, item.custo_total_snapshot)
                const mgPct = margemPct(item.valor_unitario, item.custo_total_snapshot)
                const positivo = mg >= 0
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtDate(item.data)}</td>
                    <td className="px-4 py-3 font-medium">
                      {item.animal?.brinco ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {item.animal?.nome ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {item.lote?.nome ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {item.tx?.people?.name ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {item.peso_venda != null ? item.peso_venda.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {item.tipo_preco == null ? (
                        <span className="italic text-muted-foreground/50 text-xs">—</span>
                      ) : (
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          (item.tipo_preco as string) === 'por_cabeca' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700',
                        )}>
                          {(item.tipo_preco as string) === 'por_cabeca' ? 'Por cabeça' : 'Por kg'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(item.custo_total_snapshot)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(item.valor_unitario)}</td>
                    <td className={cn(
                      'px-4 py-3 text-right tabular-nums font-semibold',
                      positivo ? 'text-green-700' : 'text-red-700',
                    )}>
                      {positivo ? '+' : ''}{fmt(mg)}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right tabular-nums text-xs hidden sm:table-cell',
                      positivo ? 'text-green-600' : 'text-red-600',
                    )}>
                      {positivo ? '+' : ''}{mgPct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/20 font-semibold">
                <td colSpan={7} className="px-4 py-3 text-xs text-muted-foreground">
                  Total ({filtered.length} animais)
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totais.custo)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totais.receita)}</td>
                <td className={cn(
                  'px-4 py-3 text-right tabular-nums',
                  margemTotal >= 0 ? 'text-green-700' : 'text-red-700',
                )}>
                  {margemTotal >= 0 ? '+' : ''}{fmt(margemTotal)}
                </td>
                <td className={cn(
                  'px-4 py-3 text-right tabular-nums text-xs hidden sm:table-cell',
                  margemTotal >= 0 ? 'text-green-600' : 'text-red-600',
                )}>
                  {margemTotal >= 0 ? '+' : ''}{margemTotalPct.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
