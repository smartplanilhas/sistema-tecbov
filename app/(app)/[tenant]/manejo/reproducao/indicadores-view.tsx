'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { Femea, Evento } from './reproducao-page-view'

// ─── Status derivation ───────────────────────────────────────────────────────

type StatusReprodutivo = 'vazia' | 'inseminada' | 'coberta' | 'prenha' | 'lactante'

function derivarStatus(eventos: Evento[]): StatusReprodutivo[] {
  if (!eventos.length) return ['vazia']

  const sorted = [...eventos].sort((a, b) =>
    b.data !== a.data ? b.data.localeCompare(a.data) : b.created_at.localeCompare(a.created_at)
  )

  const now = new Date()
  const ultimoParto = sorted.find(e => e.tipo === 'parto')
  const isLactante  = ultimoParto
    ? Math.round((now.getTime() - new Date(ultimoParto.data + 'T12:00:00').getTime()) / 86_400_000) <= 210
    : false

  const mostRecent = sorted[0]

  if (mostRecent.tipo === 'parto') {
    return isLactante ? ['lactante'] : ['vazia']
  }

  const status: StatusReprodutivo[] = []

  if (mostRecent.tipo === 'inseminacao') {
    status.push('inseminada')
  } else if (mostRecent.tipo === 'monta_natural') {
    status.push('coberta')
  } else if (mostRecent.tipo === 'diagnostico') {
    const s = mostRecent.dados?.status
    if (s === 'prenha') status.push('prenha')
    else status.push('vazia')
  }

  if (isLactante) status.push('lactante')
  return status.length ? status : ['vazia']
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StatusReprodutivo, string> = {
  vazia:     'Vazia',
  inseminada:'Inseminada',
  coberta:   'Coberta',
  prenha:    'Prenha',
  lactante:  'Lactante',
}

const STATUS_COLOR: Record<StatusReprodutivo, string> = {
  vazia:     'bg-gray-100 text-gray-700',
  inseminada:'bg-blue-100 text-blue-700',
  coberta:   'bg-purple-100 text-purple-700',
  prenha:    'bg-green-100 text-green-700',
  lactante:  'bg-amber-100 text-amber-700',
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IndicadoresView({ femeas, eventos }: { femeas: Femea[]; eventos: Evento[] }) {
  const stats = useMemo(() => {
    // Group events by animal_id
    const byAnimal = new Map<string, Evento[]>()
    for (const ev of eventos) {
      const list = byAnimal.get(ev.animal_id) ?? []
      list.push(ev)
      byAnimal.set(ev.animal_id, list)
    }

    // Derive status for every female
    const femeasStatus = femeas.map(f => {
      const evs = byAnimal.get(f.id) ?? []
      const status = derivarStatus(evs)
      const lastEv = evs.length
        ? [...evs].sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at))[0]
        : null
      return { ...f, status, lastEv }
    })

    // Counts
    const total      = femeas.length
    const prenhas    = femeasStatus.filter(f => f.status.includes('prenha')).length
    const inseminadas= femeasStatus.filter(f => f.status.includes('inseminada') || f.status.includes('coberta')).length
    const vazias     = femeasStatus.filter(f => f.status.includes('vazia') && !f.status.includes('lactante')).length
    const lactantes  = femeasStatus.filter(f => f.status.includes('lactante')).length

    // Taxa de prenhez: prenhas / (prenhas + vazias com diagnóstico)
    const diagEvents = eventos.filter(e => e.tipo === 'diagnostico')
    const diagAnimalIds = new Set(diagEvents.map(e => e.animal_id))
    const diagnosticadas = femeasStatus.filter(f => diagAnimalIds.has(f.id)).length
    const taxaPrenhez = diagnosticadas > 0 ? Math.round((prenhas / diagnosticadas) * 100) : null

    // Partos nos últimos 12 meses
    const um_ano_atras = new Date()
    um_ano_atras.setFullYear(um_ano_atras.getFullYear() - 1)
    const partosAno = eventos.filter(e =>
      e.tipo === 'parto' && new Date(e.data + 'T12:00:00') >= um_ano_atras
    ).length

    // Interval between partos (average)
    let intervaloParto: number | null = null
    const intervals: number[] = []
    for (const [, evs] of byAnimal) {
      const partos = evs
        .filter(e => e.tipo === 'parto')
        .sort((a, b) => a.data.localeCompare(b.data))
      for (let i = 1; i < partos.length; i++) {
        const dias = Math.round(
          (new Date(partos[i].data + 'T12:00:00').getTime() - new Date(partos[i - 1].data + 'T12:00:00').getTime()) / 86_400_000
        )
        if (dias > 0) intervals.push(dias)
      }
    }
    if (intervals.length) {
      intervaloParto = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    }

    return { total, prenhas, inseminadas, vazias, lactantes, taxaPrenhez, partosAno, intervaloParto, femeasStatus }
  }, [femeas, eventos])

  const cards = [
    { label: 'Fêmeas ativas',    value: stats.total,                        sub: 'total no sistema' },
    { label: 'Prenhas',          value: stats.prenhas,                       sub: `${stats.taxaPrenhez != null ? stats.taxaPrenhez + '% de prenhez' : 'sem diagnósticos'}` },
    { label: 'IA / Cobertas',    value: stats.inseminadas,                   sub: 'aguardando diagnóstico' },
    { label: 'Vazias',           value: stats.vazias,                        sub: 'sem prenhez confirmada' },
    { label: 'Lactantes',        value: stats.lactantes,                     sub: 'até 210 dias pós-parto' },
    { label: 'Partos (12 meses)',value: stats.partosAno,                     sub: 'nos últimos 12 meses' },
    { label: 'Interv. médio parto', value: stats.intervaloParto != null ? `${stats.intervaloParto}d` : '—', sub: 'dias entre partos' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold mt-0.5">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Status table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="text-base font-semibold">Status reprodutivo das fêmeas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Derivado automaticamente dos eventos mais recentes</p>
        </div>
        {stats.femeasStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">Nenhuma fêmea cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Animal</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último evento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.femeasStatus.map(f => (
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium">{f.brinco ?? '—'}</span>
                      {f.nome && <p className="text-xs text-muted-foreground">{f.nome}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {f.status.map(s => (
                          <span key={s} className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLOR[s]}`}>
                            {STATUS_LABEL[s]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.lastEv
                        ? (f.lastEv.tipo === 'diagnostico'
                          ? `Diagnóstico: ${f.lastEv.dados?.status ?? ''}`
                          : { inseminacao: 'Inseminação IA', monta_natural: 'Monta Natural', parto: 'Parto' }[f.lastEv.tipo] ?? f.lastEv.tipo)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.lastEv ? fmtDate(f.lastEv.data) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
