'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Mov = {
  id: string
  tipo: string
  data: string
  motivo: string | null
  observacoes: string | null
  grupo_id: string | null
  created_at: string
  animals: { id: string; brinco: string | null; nome: string | null } | null
  lote_anterior: { id: string; nome: string } | null
  lote_novo: { id: string; nome: string } | null
  local_anterior: { id: string; nome: string } | null
  local_novo: { id: string; nome: string } | null
}

type Lote  = { id: string; nome: string }
type Local = { id: string; nome: string }

const TIPO_LABEL: Record<string, string> = {
  entrada:            'Entrada',
  saida:              'Saída',
  mudanca_lote:       'Mudança de lote',
  mudanca_local:      'Mudança de local',
  mudanca_lote_local: 'Mudança de lote e local',
}

const TIPO_COLOR: Record<string, string> = {
  entrada:            'bg-green-100 text-green-700',
  saida:              'bg-red-100 text-red-700',
  mudanca_lote:       'bg-blue-100 text-blue-700',
  mudanca_local:      'bg-purple-100 text-purple-700',
  mudanca_lote_local: 'bg-orange-100 text-orange-700',
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function animalLabel(a: Mov['animals']) {
  if (!a) return '—'
  return [a.brinco, a.nome].filter(Boolean).join(' – ') || a.id.slice(0, 8)
}

export function MovimentacoesView({
  tenantSlug,
  movimentacoes,
  lotes,
  locais,
}: {
  tenantSlug: string
  movimentacoes: Mov[]
  lotes: Lote[]
  locais: Local[]
}) {
  const [search, setSearch]   = useState('')
  const [tipoFilter, setTipo] = useState('')

  const filtered = useMemo(() => {
    let list = movimentacoes
    if (tipoFilter) list = list.filter(m => m.tipo === tipoFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => {
        const a = m.animals
        return (
          a?.brinco?.toLowerCase().includes(q) ||
          a?.nome?.toLowerCase().includes(q) ||
          m.lote_anterior?.nome?.toLowerCase().includes(q) ||
          m.lote_novo?.nome?.toLowerCase().includes(q) ||
          m.local_anterior?.nome?.toLowerCase().includes(q) ||
          m.local_novo?.nome?.toLowerCase().includes(q) ||
          m.motivo?.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [movimentacoes, search, tipoFilter])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Mov[]>()
    for (const m of filtered) {
      const list = map.get(m.data) ?? []
      list.push(m)
      map.set(m.data, list)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Movimentações</h1>
        <p className="text-muted-foreground text-sm mt-1">Rastreabilidade completa de animais por lote e local</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por animal, lote ou local…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={tipoFilter}
          onChange={e => setTipo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {(search || tipoFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setTipo('') }}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Results */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm">
          Nenhuma movimentação encontrada.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, movs]) => (
            <div key={date} className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/50 border-b">
                <span className="text-sm font-medium">{fmtDate(date)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{movs.length} registro{movs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y">
                {movs.map(m => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-4">
                    {/* Tipo badge */}
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[m.tipo] ?? 'bg-muted text-muted-foreground'}`}>
                      {TIPO_LABEL[m.tipo] ?? m.tipo}
                    </span>

                    {/* Animal */}
                    <Link
                      href={`/${tenantSlug}/animais/${m.animals?.id}`}
                      className="text-sm font-medium hover:underline shrink-0 min-w-24"
                    >
                      {animalLabel(m.animals)}
                    </Link>

                    {/* De → Para */}
                    <div className="flex-1 flex items-center gap-2 text-sm overflow-hidden">
                      <MovDiff mov={m} />
                    </div>

                    {/* Motivo */}
                    {m.motivo && (
                      <span className="text-xs text-muted-foreground shrink-0 max-w-40 truncate" title={m.motivo}>
                        {m.motivo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MovDiff({ mov }: { mov: Mov }) {
  const loteAnt  = mov.lote_anterior?.nome  ?? null
  const loteNov  = mov.lote_novo?.nome      ?? null
  const localAnt = mov.local_anterior?.nome ?? null
  const localNov = mov.local_novo?.nome     ?? null

  const loteChanged  = loteAnt !== loteNov
  const localChanged = localAnt !== localNov

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-0.5">
      {loteChanged && (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground text-xs">Lote</span>
          <span className="text-muted-foreground">{loteAnt ?? 'Sem lote'}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="font-medium">{loteNov ?? 'Sem lote'}</span>
        </span>
      )}
      {localChanged && (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground text-xs">Local</span>
          <span className="text-muted-foreground">{localAnt ?? 'Sem local'}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="font-medium">{localNov ?? 'Sem local'}</span>
        </span>
      )}
      {!loteChanged && !localChanged && (
        <span className="text-muted-foreground text-sm">
          {loteNov ?? localNov ?? '—'}
        </span>
      )}
    </div>
  )
}
