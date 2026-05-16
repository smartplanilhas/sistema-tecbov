'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteEventoSanidade } from './actions'

type MedItem = { medicamento_id: string; nome: string; unidade: string; quantidade: string }

export type EventoSanidade = {
  id: string
  tipo: string
  data: string
  descricao: string
  dados: { medicamentos?: MedItem[]; responsavel?: string }
  observacoes: string | null
  animal: { brinco: string | null; nome: string | null } | null
}

const TIPO_LABEL: Record<string, string> = {
  vacinacao:    'Vacinação',
  vermifugacao: 'Vermifugação',
  medicacao:    'Medicação',
  procedimento: 'Procedimento',
  exame:        'Exame',
  outro:        'Outro',
}

const TIPO_CLS: Record<string, string> = {
  vacinacao:    'bg-blue-100 text-blue-700',
  vermifugacao: 'bg-purple-100 text-purple-700',
  medicacao:    'bg-amber-100 text-amber-700',
  procedimento: 'bg-gray-100 text-gray-600',
  exame:        'bg-green-100 text-green-700',
  outro:        'bg-gray-100 text-gray-600',
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={cn('inline-flex items-center text-xs rounded-full px-2 py-0.5 font-medium whitespace-nowrap', TIPO_CLS[tipo] ?? 'bg-gray-100 text-gray-600')}>
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  )
}

function DeleteButton({ tenantSlug, eventoId }: { tenantSlug: string; eventoId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Excluir este evento sanitário?')) return
    startTransition(async () => {
      await deleteEventoSanidade(tenantSlug, eventoId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMeds(meds?: MedItem[]) {
  if (!meds?.length) return null
  return meds.map(m => {
    const qtdUnit = [m.quantidade, m.unidade].filter(Boolean).join(' ')
    return [m.nome, qtdUnit].filter(Boolean).join(' · ')
  }).join(', ')
}

export function HistoricoView({
  tenantSlug,
  eventos,
}: {
  tenantSlug: string
  eventos: EventoSanidade[]
}) {
  const [busca, setBusca]       = useState('')
  const [filtroTipo, setFiltro] = useState('')

  const filtrados = useMemo(() => {
    return eventos.filter(ev => {
      if (filtroTipo && ev.tipo !== filtroTipo) return false
      if (busca) {
        const q = busca.toLowerCase()
        const animal = ev.animal
        const brinco = animal?.brinco?.toLowerCase() ?? ''
        const nome   = animal?.nome?.toLowerCase() ?? ''
        const desc   = ev.descricao.toLowerCase()
        if (!brinco.includes(q) && !nome.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [eventos, busca, filtroTipo])

  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhum evento sanitário registrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar animal ou descrição…"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring flex-1 min-w-48"
        />
        <select
          value={filtroTipo}
          onChange={e => setFiltro(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-40 shrink-0"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <span className="text-sm font-medium text-muted-foreground">
            {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''}
            {(busca || filtroTipo) && ' (filtrado' + (filtrados.length !== 1 ? 's' : '') + ')'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Animal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Medicamentos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map(ev => {
                const animalLabel = [ev.animal?.brinco, ev.animal?.nome].filter(Boolean).join(' – ') || '—'
                const meds = fmtMeds(ev.dados?.medicamentos)
                return (
                  <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{fmtDate(ev.data)}</td>
                    <td className="px-4 py-3 font-mono text-sm">{animalLabel}</td>
                    <td className="px-4 py-3"><TipoBadge tipo={ev.tipo} /></td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="line-clamp-2">{ev.descricao}</span>
                      {ev.dados?.responsavel && (
                        <span className="block text-xs text-muted-foreground mt-0.5">{ev.dados.responsavel}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                      {meds ?? <span>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DeleteButton tenantSlug={tenantSlug} eventoId={ev.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
