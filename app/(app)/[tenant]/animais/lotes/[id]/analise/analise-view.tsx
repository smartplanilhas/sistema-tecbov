'use client'

import Link from 'next/link'
import { ChevronLeft, BarChart2, Activity, DollarSign } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type Lote = {
  id: string
  nome: string
  fase: string | null
  meta_peso: number | null
  data_inicio: string | null
  data_prevista_saida: string | null
  status: string
}

type Animal = {
  peso_atual: number | null
  peso_inicial: number | null
  gmd_geral: number | null
  valor_compra: number | null
}

type Custo = {
  valor_total: number
  nome_categoria: string
}

type Venda = {
  valor_unitario: number
  peso_venda: number | null
}

type Pesagem = {
  peso: number
  data: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FASE_LABEL: Record<string, string> = {
  desmama:      'Desmama',
  cria:         'Cria',
  recria:       'Recria',
  engorda:      'Engorda',
  terminacao:   'Terminação',
  matrizes:     'Matrizes',
  reprodutores: 'Reprodutores',
}

const FASE_COLOR: Record<string, string> = {
  desmama:      'bg-yellow-100 text-yellow-700',
  cria:         'bg-green-100 text-green-700',
  recria:       'bg-blue-100 text-blue-700',
  engorda:      'bg-orange-100 text-orange-700',
  terminacao:   'bg-red-100 text-red-700',
  matrizes:     'bg-pink-100 text-pink-700',
  reprodutores: 'bg-purple-100 text-purple-700',
}

function fmt(v: number | null, dec = 1) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtShortDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function arroba(kg: number) { return kg / 15 }

// ─── Pequenos componentes ─────────────────────────────────────────────────────

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border bg-card px-4 py-4 ${className}`}>
      {children}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  )
}

function FinRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${color ?? ''}`}>{value}</span>
    </div>
  )
}

// ─── Gráfico: evolução ────────────────────────────────────────────────────────

function EvolucaoChart({ data }: { data: { data: string; peso: number }[] }) {
  if (data.length < 2) {
    return (
      <Card>
        <h3 className="text-sm font-medium mb-2">Evolução do peso médio</h3>
        <p className="text-sm text-muted-foreground py-8 text-center">
          Dados insuficientes para o gráfico.
        </p>
      </Card>
    )
  }

  const pesos = data.map(d => d.peso)
  const minP  = Math.min(...pesos)
  const maxP  = Math.max(...pesos)
  const pad   = Math.max((maxP - minP) * 0.2, 5)

  return (
    <Card>
      <h3 className="text-sm font-medium mb-3">Evolução do peso médio</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="data"
            tickFormatter={fmtShortDate}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[Math.floor(minP - pad), Math.ceil(maxP + pad)]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={v => `${v} kg`}
          />
          <Tooltip
            formatter={(v: any) => [`${fmt(v as number)} kg`, 'Peso médio'] as any}
            labelFormatter={(l: any) => fmtShortDate(l as string) as any}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="hsl(142 71% 45%)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(142 71% 45%)', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Gráfico: despesas por categoria ─────────────────────────────────────────

function DespesasChart({ data }: { data: { nome: string; valor: number }[] }) {
  if (data.length === 0) return null

  return (
    <Card>
      <h3 className="text-sm font-medium mb-3">Despesas por categoria</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="nome"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={80}
            tickFormatter={v => fmtBRL(v)}
          />
          <Tooltip
            formatter={(v: any) => [fmtBRL(v as number), 'Valor'] as any}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="valor" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AnaliseView({
  tenantSlug, lote, animais, custos, vendas, pesagens,
}: {
  tenantSlug: string
  lote: Lote
  animais: Animal[]
  custos: Custo[]
  vendas: Venda[]
  pesagens: Pesagem[]
}) {
  const n = animais.length

  // ── Desempenho ──────────────────────────────────────────────────────────────
  const comPesoAtual   = animais.filter(a => a.peso_atual   != null)
  const comPesoInicial = animais.filter(a => a.peso_inicial != null)

  const pesoAtualTotal   = comPesoAtual.reduce((s, a) => s + a.peso_atual!, 0)
  const pesoAtualMedia   = comPesoAtual.length > 0 ? pesoAtualTotal / comPesoAtual.length : null

  const pesoInicialTotal = comPesoInicial.reduce((s, a) => s + a.peso_inicial!, 0)
  const pesoInicialMedia = comPesoInicial.length > 0 ? pesoInicialTotal / comPesoInicial.length : null

  const ganhoTotal = comPesoInicial.length > 0 ? pesoAtualTotal - pesoInicialTotal : null
  const ganhoMedio = pesoAtualMedia != null && pesoInicialMedia != null
    ? pesoAtualMedia - pesoInicialMedia : null

  const gmdValues = animais.filter(a => a.gmd_geral != null).map(a => a.gmd_geral!)
  const gmdMedio  = gmdValues.length > 0
    ? gmdValues.reduce((s, v) => s + v, 0) / gmdValues.length : null

  const avancoPct = lote.meta_peso != null && pesoInicialMedia != null && pesoAtualMedia != null
    && lote.meta_peso > pesoInicialMedia
    ? Math.min(100, Math.max(0,
        (pesoAtualMedia - pesoInicialMedia) / (lote.meta_peso - pesoInicialMedia) * 100
      ))
    : null

  const duracao = lote.data_inicio && lote.data_prevista_saida
    ? Math.round(
        (new Date(lote.data_prevista_saida + 'T12:00:00').getTime() -
         new Date(lote.data_inicio + 'T12:00:00').getTime()) / 86_400_000
      )
    : null

  // ── Financeiro ──────────────────────────────────────────────────────────────
  const compraTotal  = animais.reduce((s, a) => s + (a.valor_compra ?? 0), 0)
  const compraMedia  = n > 0 ? compraTotal / n : 0
  const custoOpTotal = custos.reduce((s, c) => s + c.valor_total, 0)
  const despesaTotal = compraTotal + custoOpTotal
  const receita      = vendas.reduce((s, v) => s + v.valor_unitario, 0)
  const lucro        = receita - despesaTotal
  const margemPct    = despesaTotal > 0 ? (lucro / despesaTotal) * 100 : null
  const roi          = despesaTotal > 0 ? (lucro / despesaTotal) * 100 : null

  const lucroAnimal   = n > 0 ? lucro / n : null
  const receitaAnimal = n > 0 ? receita / n : null

  const pesoVendaTotal = vendas.reduce((s, v) => s + (v.peso_venda ?? 0), 0)
  const lucroArroba    = pesoVendaTotal > 0 ? lucro / arroba(pesoVendaTotal) : null

  const custoOpAnimal = n > 0 && custoOpTotal > 0 ? custoOpTotal / n : null
  const custoOpKg     = ganhoTotal != null && ganhoTotal > 0 ? custoOpTotal / ganhoTotal : null
  const custoOpArroba = ganhoTotal != null && ganhoTotal > 0 ? custoOpTotal / arroba(ganhoTotal) : null

  // ── Chart data ──────────────────────────────────────────────────────────────
  const evolucaoMap = new Map<string, number[]>()
  pesagens.forEach(p => {
    if (!evolucaoMap.has(p.data)) evolucaoMap.set(p.data, [])
    evolucaoMap.get(p.data)!.push(p.peso)
  })
  const evolucaoData = Array.from(evolucaoMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, pesos]) => ({
      data,
      peso: pesos.reduce((s, v) => s + v, 0) / pesos.length,
    }))

  const categoriaMap = new Map<string, number>()
  custos.forEach(c => {
    const k = c.nome_categoria
    categoriaMap.set(k, (categoriaMap.get(k) ?? 0) + c.valor_total)
  })
  const categoriaData = Array.from(categoriaMap.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)

  return (
    <div className="space-y-6">

      {/* Breadcrumb + Título */}
      <div>
        <Link
          href={`/${tenantSlug}/animais/lotes/${lote.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {lote.nome}
        </Link>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Dashboard de Análise</h1>
          {lote.fase && (
            <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${FASE_COLOR[lote.fase] ?? 'bg-muted text-muted-foreground'}`}>
              {FASE_LABEL[lote.fase] ?? lote.fase}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{lote.nome}</p>
      </div>

      {/* Barra de metadados */}
      <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetaItem label="Plano (fase)"         value={lote.fase ? (FASE_LABEL[lote.fase] ?? lote.fase) : '—'} />
        <MetaItem label="Duração do plano"     value={duracao != null ? `${duracao} dias` : '—'} />
        <MetaItem label="Data de início"       value={fmtDate(lote.data_inicio)} />
        <MetaItem label="Previsão de término"  value={fmtDate(lote.data_prevista_saida)} />
      </Card>

      {/* ── Seção 1: Desempenho ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader icon={Activity} title="Desempenho" />

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <p className="text-xs text-muted-foreground mb-1">Animais</p>
            <p className="text-2xl font-bold">{n}</p>
            {pesoAtualTotal > 0 && (
              <>
                <p className="text-sm text-muted-foreground mt-1">{fmt(pesoAtualTotal)} kg</p>
                <p className="text-xs text-muted-foreground">{fmt(arroba(pesoAtualTotal), 2)} @</p>
              </>
            )}
          </Card>

          <Card>
            <p className="text-xs text-muted-foreground mb-1">Peso médio atual</p>
            <p className="text-2xl font-bold">{fmt(pesoAtualMedia)} kg</p>
            {pesoAtualMedia != null && (
              <p className="text-sm text-muted-foreground">{fmt(arroba(pesoAtualMedia), 2)} @</p>
            )}
            {lote.meta_peso != null && (
              <p className="text-xs text-muted-foreground mt-1">
                Meta: <strong>{fmt(lote.meta_peso)} kg</strong>
              </p>
            )}
          </Card>

          <Card>
            <p className="text-xs text-muted-foreground mb-1">GMD médio</p>
            {gmdMedio != null ? (
              <>
                <p className="text-2xl font-bold">{fmt(gmdMedio, 3)}</p>
                <p className="text-sm text-muted-foreground">kg/dia</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </Card>

          <Card>
            <p className="text-xs text-muted-foreground mb-1">Avanço para meta</p>
            {avancoPct != null ? (
              <>
                <p className="text-2xl font-bold">{fmt(avancoPct, 1)}%</p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${avancoPct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </Card>
        </div>

        {/* Tabela pesagem */}
        {(pesoAtualMedia != null || pesoInicialMedia != null) && (
          <Card>
            <h3 className="text-sm font-medium mb-3">Pesagem dos animais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-2 font-medium text-muted-foreground w-36" />
                    <th className="text-right pb-2 font-medium text-muted-foreground">Peso inicial</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Peso atual</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Ganho</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Por animal</td>
                    <td className="py-2.5 text-right">
                      {pesoInicialMedia != null ? `${fmt(pesoInicialMedia)} kg` : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {pesoAtualMedia != null ? `${fmt(pesoAtualMedia)} kg` : '—'}
                    </td>
                    <td className={`py-2.5 text-right font-semibold ${ganhoMedio != null ? (ganhoMedio >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                      {ganhoMedio != null
                        ? `${ganhoMedio >= 0 ? '+' : ''}${fmt(ganhoMedio)} kg`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Total do lote</td>
                    <td className="py-2.5 text-right">
                      {pesoInicialTotal > 0 ? `${fmt(pesoInicialTotal)} kg` : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {pesoAtualTotal > 0 ? `${fmt(pesoAtualTotal)} kg` : '—'}
                    </td>
                    <td className={`py-2.5 text-right font-semibold ${ganhoTotal != null ? (ganhoTotal >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                      {ganhoTotal != null
                        ? `${ganhoTotal >= 0 ? '+' : ''}${fmt(ganhoTotal)} kg`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <EvolucaoChart data={evolucaoData} />
      </div>

      {/* ── Seção 2: Financeiro ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader icon={DollarSign} title="Financeiro" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Compra */}
          <Card>
            <h3 className="text-sm font-medium mb-3">Compra do lote</h3>
            <div className="space-y-2">
              <FinRow label="Total" value={fmtBRL(compraTotal)} />
              <FinRow label="Por animal" value={n > 0 ? fmtBRL(compraMedia) : '—'} />
            </div>
          </Card>

          {/* Operacional */}
          <Card>
            <h3 className="text-sm font-medium mb-3">Despesas operacionais</h3>
            <div className="space-y-2">
              <FinRow label="Total"          value={fmtBRL(custoOpTotal)} />
              <FinRow label="Por animal"     value={custoOpAnimal != null ? fmtBRL(custoOpAnimal) : '—'} />
              <FinRow label="Por kg ganho"   value={custoOpKg != null ? `${fmtBRL(custoOpKg)}/kg` : '—'} />
              <FinRow label="Por @ produzido" value={custoOpArroba != null ? `${fmtBRL(custoOpArroba)}/@` : '—'} />
            </div>
          </Card>
        </div>

        <DespesasChart data={categoriaData} />

        {/* Resultado */}
        <Card>
          <h3 className="text-sm font-medium mb-4">Resultado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <FinRow label="Receita de venda" value={fmtBRL(receita)}      color="text-green-600" />
              <FinRow label="Despesa total"    value={fmtBRL(despesaTotal)} color="text-red-600" />
              <div className="border-t pt-2 mt-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium">Lucro bruto</span>
                  <span className={`font-bold text-base ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {lucro >= 0 ? '' : '-'}{fmtBRL(Math.abs(lucro))}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <FinRow
                label="Receita / animal"
                value={receitaAnimal != null ? fmtBRL(receitaAnimal) : '—'}
              />
              <FinRow
                label="Lucro / animal"
                value={lucroAnimal != null ? fmtBRL(lucroAnimal) : '—'}
                color={lucroAnimal != null ? (lucroAnimal >= 0 ? 'text-green-600' : 'text-red-600') : ''}
              />
              <FinRow
                label="Lucro / @"
                value={lucroArroba != null ? fmtBRL(lucroArroba) : '—'}
                color={lucroArroba != null ? (lucroArroba >= 0 ? 'text-green-600' : 'text-red-600') : ''}
              />
            </div>
            <div className="space-y-2">
              <FinRow
                label="Margem bruta"
                value={margemPct != null ? `${fmt(margemPct, 1)}%` : '—'}
                color={margemPct != null ? (margemPct >= 0 ? 'text-green-600' : 'text-red-600') : ''}
              />
              <FinRow
                label="ROI"
                value={roi != null ? `${fmt(roi, 1)}%` : '—'}
                color={roi != null ? (roi >= 0 ? 'text-green-600' : 'text-red-600') : ''}
              />
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
}
