'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, X, Syringe, Stethoscope, Tag, Activity, AlertCircle, Milk, ChevronDown, Plus, Tractor } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { Femea, Evento, Lote, Local, Estacao } from './reproducao-page-view'

// ─── Status derivation ───────────────────────────────────────────────────────

type StatusReprodutivo = 'vazia' | 'inseminada' | 'coberta' | 'prenha' | 'lactante'

function derivarStatus(eventos: Evento[], diasLactacao = 210): StatusReprodutivo[] {
  if (!eventos.length) return ['vazia']

  const sorted = [...eventos].sort((a, b) =>
    b.data !== a.data ? b.data.localeCompare(a.data) : b.created_at.localeCompare(a.created_at)
  )

  const ultimoParto   = sorted.find(e => e.tipo === 'parto')
  const ultimoDesmame = sorted.find(e => e.tipo === 'desmame')

  // Lactante: parto dentro de 210 dias E sem desmame registrado após esse parto
  const isLactante =
    !!ultimoParto &&
    Math.round((Date.now() - new Date(ultimoParto.data + 'T12:00:00').getTime()) / 86_400_000) <= diasLactacao &&
    !(ultimoDesmame && ultimoDesmame.data >= ultimoParto.data)

  // Status base: considera apenas eventos de inseminação/diagnóstico/aborto
  // que aconteceram DEPOIS do último parto (parto reseta o ciclo)
  const partoData      = ultimoParto?.data ?? null
  const partoCreatedAt = ultimoParto?.created_at ?? null

  const posPartoEvents = partoData
    ? sorted.filter(e => {
        if (e.tipo === 'parto' || e.tipo === 'desmame') return false
        if (e.data > partoData) return true
        if (e.data === partoData && e.created_at > (partoCreatedAt ?? '')) return true
        return false
      })
    : sorted.filter(e => e.tipo !== 'parto' && e.tipo !== 'desmame')

  const baseEvent = posPartoEvents.find(e =>
    e.tipo === 'inseminacao' || e.tipo === 'monta_natural' ||
    e.tipo === 'diagnostico' || e.tipo === 'aborto'
  ) ?? null

  let baseStatus: StatusReprodutivo = 'vazia'
  if (baseEvent) {
    if (baseEvent.tipo === 'inseminacao') {
      baseStatus = 'inseminada'
    } else if (baseEvent.tipo === 'monta_natural') {
      baseStatus = 'coberta'
    } else if (baseEvent.tipo === 'diagnostico') {
      const s = baseEvent.dados?.status
      baseStatus = s === 'prenha' ? 'prenha' : 'vazia'
    }
  }

  const result: StatusReprodutivo[] = []
  if (baseStatus !== 'vazia') result.push(baseStatus)
  if (isLactante) result.push('lactante')
  return result.length ? result : ['vazia']
}

const STATUS_LABEL: Record<StatusReprodutivo, string> = {
  vazia:      'Vazia',
  inseminada: 'Inseminada',
  coberta:    'Coberta',
  prenha:     'Prenha',
  lactante:   'Lactante',
}
const STATUS_COLOR: Record<StatusReprodutivo, string> = {
  vazia:      'bg-gray-100 text-gray-700',
  inseminada: 'bg-blue-100 text-blue-700',
  coberta:    'bg-purple-100 text-purple-700',
  prenha:     'bg-green-100 text-green-700',
  lactante:   'bg-amber-100 text-amber-700',
}

const TIPO_LABEL: Record<string, string> = {
  inseminacao:   'Inseminação IA',
  monta_natural: 'Monta Natural',
  diagnostico:   'Diagnóstico',
  parto:         'Parto',
  aborto:        'Aborto',
  desmame:       'Desmame',
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmt(v: number | null, dec = 1) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function idadeMeses(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const nasc = new Date(dataNasc + 'T12:00:00')
  const hoje = new Date()
  return (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth())
}

// ─── Weight range slider ─────────────────────────────────────────────────────

function PesoSlicer({
  min, max, valueMin, valueMax,
  onChangeMin, onChangeMax,
}: {
  min: number; max: number
  valueMin: number; valueMax: number
  onChangeMin: (v: number) => void
  onChangeMax: (v: number) => void
}) {
  if (min === max) return null
  const pct = (v: number) => ((v - min) / (max - min)) * 100

  return (
    <div className="space-y-3">
      {/* Shared visual track */}
      <div className="relative h-1.5 mx-1 rounded-full bg-muted">
        <div
          className="absolute h-1.5 bg-primary rounded-full"
          style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
        />
      </div>

      {/* Mín slider */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">Mín</span>
          <input
            type="range" min={min} max={max} step={1} value={valueMin}
            onChange={e => onChangeMin(Math.min(+e.target.value, valueMax - 1))}
            className="flex-1 accent-primary cursor-pointer"
          />
          <span className="text-xs font-medium w-14 text-right">{valueMin} kg</span>
        </div>
      </div>

      {/* Máx slider */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">Máx</span>
          <input
            type="range" min={min} max={max} step={1} value={valueMax}
            onChange={e => onChangeMax(Math.max(+e.target.value, valueMin + 1))}
            className="flex-1 accent-primary cursor-pointer"
          />
          <span className="text-xs font-medium w-14 text-right">{valueMax} kg</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function FemeasView({
  tenantSlug, femeas, eventos, lotes, locais, estacoes, diasLactacao,
}: {
  tenantSlug: string
  femeas: Femea[]
  eventos: Evento[]
  lotes: Lote[]
  locais: Local[]
  estacoes: Estacao[]
  diasLactacao: number
}) {
  const [query, setQuery]         = useState('')
  const [campoOpen, setCampoOpen]  = useState(false)
  const [lancDropOpen, setLancDropOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [catFilter, setCatFilter]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loteFilter, setLoteFilter]  = useState('')
  const [localFilter, setLocalFilter] = useState('')
  const [estacaoFilter, setEstacaoFilter] = useState('')

  // Derive peso bounds from actual data
  const pesoBounds = useMemo(() => {
    const pesos = femeas.map(f => f.peso_atual).filter((p): p is number => p != null)
    if (!pesos.length) return { min: 0, max: 1000 }
    return { min: Math.floor(Math.min(...pesos)), max: Math.ceil(Math.max(...pesos)) }
  }, [femeas])

  const [pesoMin, setPesoMin] = useState<number>(() => {
    const pesos = femeas.map(f => f.peso_atual).filter((p): p is number => p != null)
    return pesos.length ? Math.floor(Math.min(...pesos)) : 0
  })
  const [pesoMax, setPesoMax] = useState<number>(() => {
    const pesos = femeas.map(f => f.peso_atual).filter((p): p is number => p != null)
    return pesos.length ? Math.ceil(Math.max(...pesos)) : 1000
  })

  // Group events by animal_id
  const eventosByAnimal = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const ev of eventos) {
      const list = map.get(ev.animal_id) ?? []
      list.push(ev)
      map.set(ev.animal_id, list)
    }
    return map
  }, [eventos])

  // Enrich each female with computed fields
  const femeasEnriquecidas = useMemo(() => {
    return femeas.map(f => {
      const evs = eventosByAnimal.get(f.id) ?? []
      const sorted = [...evs].sort((a, b) =>
        b.data !== a.data ? b.data.localeCompare(a.data) : b.created_at.localeCompare(a.created_at)
      )
      const status      = derivarStatus(evs, diasLactacao)
      const ultimoManejo = sorted[0] ?? null
      const ultimoParto  = sorted.find(e => e.tipo === 'parto') ?? null
      const ultimoDiagnPrenha = sorted.find(e => e.tipo === 'diagnostico' && e.dados?.status === 'prenha') ?? null
      const previsaoParto = (ultimoDiagnPrenha?.dados?.previsao_parto as string | undefined) ?? null
      return { ...f, status, ultimoManejo, ultimoParto, previsaoParto }
    })
  }, [femeas, eventosByAnimal])

  // KPI indicators — filtered by selected estação
  const indicadores = useMemo(() => {
    const estacao = estacoes.find(e => e.id === estacaoFilter) ?? null
    const eventosKpi = estacao
      ? eventos.filter(e => e.data >= estacao.data_inicio && e.data <= estacao.data_fim)
      : eventos

    // Re-derive status using only events within the season window
    const byAnimalKpi = new Map<string, Evento[]>()
    for (const ev of eventosKpi) {
      const list = byAnimalKpi.get(ev.animal_id) ?? []
      list.push(ev)
      byAnimalKpi.set(ev.animal_id, list)
    }
    const femeasKpi = femeas.map(f => ({
      ...f,
      status: derivarStatus(byAnimalKpi.get(f.id) ?? [], diasLactacao),
    }))

    const prenhas    = femeasKpi.filter(f => f.status.includes('prenha')).length
    const inseminadas= femeasKpi.filter(f => f.status.includes('inseminada') || f.status.includes('coberta')).length
    const vazias     = femeasKpi.filter(f => f.status.includes('vazia') && !f.status.includes('lactante')).length
    const lactantes  = femeasKpi.filter(f => f.status.includes('lactante')).length

    const diagAnimalIds = new Set(eventosKpi.filter(e => e.tipo === 'diagnostico').map(e => e.animal_id))
    const diagnosticadas = femeasKpi.filter(f => diagAnimalIds.has(f.id)).length
    const taxaPrenhez = diagnosticadas > 0 ? Math.round((prenhas / diagnosticadas) * 100) : null

    const partosKpi = eventosKpi.filter(e => e.tipo === 'parto')
    const partosAno = estacao ? partosKpi.length : (() => {
      const um_ano_atras = new Date()
      um_ano_atras.setFullYear(um_ano_atras.getFullYear() - 1)
      return eventos.filter(e => e.tipo === 'parto' && new Date(e.data + 'T12:00:00') >= um_ano_atras).length
    })()

    const intervals: number[] = []
    for (const [, evs] of byAnimalKpi) {
      const partos = evs.filter(e => e.tipo === 'parto').sort((a, b) => a.data.localeCompare(b.data))
      for (let i = 1; i < partos.length; i++) {
        const dias = Math.round(
          (new Date(partos[i].data + 'T12:00:00').getTime() - new Date(partos[i - 1].data + 'T12:00:00').getTime()) / 86_400_000
        )
        if (dias > 0) intervals.push(dias)
      }
    }
    const intervaloParto = intervals.length
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null

    return { prenhas, inseminadas, vazias, lactantes, taxaPrenhez, partosAno, intervaloParto }
  }, [femeas, eventos, estacaoFilter, estacoes])

  // Unique categories from data
  const categorias = useMemo(() => {
    const set = new Set(femeas.map(f => f.categoria).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [femeas])

  // Active filter count
  const activeFilters = [catFilter, statusFilter, loteFilter, localFilter].filter(Boolean).length
    + (pesoMin > pesoBounds.min || pesoMax < pesoBounds.max ? 1 : 0)

  // Filtered list
  const filtered = useMemo(() => {
    return femeasEnriquecidas.filter(f => {
      if (query) {
        const q = query.toLowerCase()
        if (!f.brinco?.toLowerCase().includes(q) && !f.nome?.toLowerCase().includes(q)) return false
      }
      if (catFilter && f.categoria !== catFilter) return false
      if (statusFilter && !f.status.includes(statusFilter as StatusReprodutivo)) return false
      if (loteFilter && f.lote_atual_id !== loteFilter) return false
      if (localFilter && f.local_atual_id !== localFilter) return false
      if (f.peso_atual != null) {
        if (f.peso_atual < pesoMin || f.peso_atual > pesoMax) return false
      }
      return true
    })
  }, [femeasEnriquecidas, query, catFilter, statusFilter, loteFilter, localFilter, pesoMin, pesoMax])

  function clearFilters() {
    setCatFilter('')
    setStatusFilter('')
    setLoteFilter('')
    setLocalFilter('')
    setPesoMin(pesoBounds.min)
    setPesoMax(pesoBounds.max)
  }

  const SELECT = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="flex gap-4 items-start">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Estação filter */}
        {estacoes.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Estação:</label>
            <select
              value={estacaoFilter}
              onChange={e => setEstacaoFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos os períodos</option>
              {estacoes.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Prenhas</p>
            <p className="text-2xl font-bold mt-0.5">{indicadores.prenhas}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {indicadores.taxaPrenhez != null ? `${indicadores.taxaPrenhez}% de prenhez` : 'sem diagnósticos'}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">IA / Cobertas</p>
            <p className="text-2xl font-bold mt-0.5">{indicadores.inseminadas}</p>
            <p className="text-xs text-muted-foreground mt-0.5">aguardando diagnóstico</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Vazias</p>
            <p className="text-2xl font-bold mt-0.5">{indicadores.vazias}</p>
            <p className="text-xs text-muted-foreground mt-0.5">sem prenhez confirmada</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Lactantes</p>
            <p className="text-2xl font-bold mt-0.5">{indicadores.lactantes}</p>
            <p className="text-xs text-muted-foreground mt-0.5">até 210 dias pós-parto</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Partos (12 meses)</p>
            <p className="text-2xl font-bold mt-0.5">{indicadores.partosAno}</p>
            <p className="text-xs text-muted-foreground mt-0.5">nos últimos 12 meses</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Interv. médio parto</p>
            <p className="text-2xl font-bold mt-0.5">
              {indicadores.intervaloParto != null ? `${indicadores.intervaloParto}d` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">dias entre partos</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setCampoOpen(true)}>
            <Tractor className="h-4 w-4" />
            Manejo no Campo
          </Button>
          <div className="relative">
            <Button onClick={() => setLancDropOpen(p => !p)} className="gap-2">
              <Plus className="h-4 w-4" />
              Lançamento
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {lancDropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLancDropOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-background border rounded-md shadow-lg py-1">
                  {([
                    { href: 'inseminacao', label: 'Inseminação / Monta', icon: Syringe },
                    { href: 'diagnostico', label: 'Diagnóstico',          icon: Stethoscope },
                    { href: 'parto',       label: 'Parto',                icon: Tag },
                    { href: 'ecc',         label: 'ECC',                  icon: Activity },
                    { href: 'aborto',      label: 'Aborto',               icon: AlertCircle },
                    { href: 'desmame',     label: 'Desmame',              icon: Milk },
                  ] as const).map(item => (
                    <Link
                      key={item.href}
                      href={`/${tenantSlug}/manejo/reproducao/${item.href}`}
                      onClick={() => setLancDropOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search + filter button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por brinco ou nome…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setFilterOpen(o => !o)}
            className="gap-2 shrink-0 relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filtered.length} de {femeas.length} fêmea{femeas.length !== 1 ? 's' : ''}
            </span>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-10 text-center">
              Nenhuma fêmea encontrada com os filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brinco / Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último manejo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prev. Parto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último parto</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Idade</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(f => (
                    <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/${tenantSlug}/animais/${f.id}`}
                          className="font-mono font-medium hover:underline"
                        >
                          {f.brinco ?? '—'}
                        </Link>
                        {f.nome && <p className="text-xs text-muted-foreground">{f.nome}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.categoria ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {f.status.map(s => (
                            <span key={s} className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLOR[s]}`}>
                              {STATUS_LABEL[s]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {f.ultimoManejo ? (
                          <div>
                            <p className="text-xs font-medium">{TIPO_LABEL[f.ultimoManejo.tipo] ?? f.ultimoManejo.tipo}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(f.ultimoManejo.data)}</p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          if (!f.status.includes('prenha') || !f.previsaoParto) {
                            return <span className="text-muted-foreground">—</span>
                          }
                          const hoje = new Date().toISOString().slice(0, 10)
                          const dias = Math.round(
                            (new Date(f.previsaoParto + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime()) / 86_400_000
                          )
                          const cls = dias < 0 ? 'text-red-600 font-medium'
                            : dias <= 30 ? 'text-amber-600 font-medium'
                            : 'text-foreground'
                          return <span className={cls}>{fmtDate(f.previsaoParto)}</span>
                        })()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {f.ultimoParto ? fmtDate(f.ultimoParto.data) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {(() => {
                          const m = idadeMeses(f.data_nascimento)
                          if (m == null) return '—'
                          if (m < 24) return `${m} m`
                          return `${Math.floor(m / 12)} a ${m % 12 > 0 ? `${m % 12} m` : ''}`.trim()
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {f.peso_atual != null ? (
                          <span>
                            {fmt(f.peso_atual)} kg
                            <span className="block text-xs text-muted-foreground font-normal">
                              {fmt(f.peso_atual / 15, 2)} @
                            </span>
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side filter panel */}
      {filterOpen && (
        <div className="w-64 shrink-0 rounded-xl border bg-card p-4 space-y-5 sticky top-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filtros</h3>
            <button onClick={() => setFilterOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={SELECT}>
              <option value="">Todas</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status reprodutivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status reprodutivo</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={SELECT}>
              <option value="">Todos</option>
              <option value="vazia">Vazia</option>
              <option value="inseminada">Inseminada</option>
              <option value="coberta">Coberta</option>
              <option value="prenha">Prenha</option>
              <option value="lactante">Lactante</option>
            </select>
          </div>

          {/* Lote */}
          {lotes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lote</label>
              <select value={loteFilter} onChange={e => setLoteFilter(e.target.value)} className={SELECT}>
                <option value="">Todos</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
          )}

          {/* Local */}
          {locais.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Local</label>
              <select value={localFilter} onChange={e => setLocalFilter(e.target.value)} className={SELECT}>
                <option value="">Todos</option>
                {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
          )}

          {/* Peso slicer */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Peso (kg)</label>
            <PesoSlicer
              min={pesoBounds.min}
              max={pesoBounds.max}
              valueMin={pesoMin}
              valueMax={pesoMax}
              onChangeMin={setPesoMin}
              onChangeMax={setPesoMax}
            />
          </div>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="w-full text-sm text-muted-foreground hover:text-foreground border rounded-md py-1.5 transition-colors hover:bg-muted/50"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Manejo no Campo confirmation dialog */}
      <Dialog open={campoOpen} onOpenChange={setCampoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tractor className="h-5 w-5" />
              Manejo no Campo
            </DialogTitle>
            <DialogDescription>
              A tela de manejo ocupa o ecrã inteiro e é otimizada para uso no curral — fontes grandes,
              campos simples e processamento animal por animal pelo brinco ou RFID.
              Configure o protocolo (pesagem, sanitário, reprodutivo, movimentação) uma vez e processe
              quantos animais precisar sem perder a configuração.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCampoOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => { window.location.href = `/${tenantSlug}/manejo-campo` }}
              className="gap-2"
            >
              <Tractor className="h-4 w-4" />
              Entrar no Modo Campo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
