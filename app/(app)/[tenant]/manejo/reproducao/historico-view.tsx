'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { deleteEvento } from './actions'
import type { Evento } from './reproducao-page-view'

const TIPO_LABEL: Record<string, string> = {
  inseminacao:   'Inseminação IA',
  monta_natural: 'Monta Natural',
  diagnostico:   'Diagnóstico',
  parto:         'Parto',
}

const TIPO_COLOR: Record<string, string> = {
  inseminacao:   'bg-blue-100 text-blue-700',
  monta_natural: 'bg-indigo-100 text-indigo-700',
  diagnostico:   'bg-purple-100 text-purple-700',
  parto:         'bg-green-100 text-green-700',
}

const DIAG_COLOR: Record<string, string> = {
  prenha:  'text-green-600 font-semibold',
  vazia:   'text-orange-600 font-semibold',
  retoque: 'text-blue-600 font-semibold',
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function EventoDetalhe({ tipo, dados }: { tipo: string; dados: Record<string, any> }) {
  if (tipo === 'diagnostico') {
    const labels: Record<string, string> = { prenha: 'Prenha', vazia: 'Vazia', retoque: 'Retoque' }
    return (
      <span className={DIAG_COLOR[dados.status] ?? ''}>
        {labels[dados.status] ?? dados.status}
        {dados.diagnostico_clinico && <span className="font-normal text-muted-foreground"> · {dados.diagnostico_clinico}</span>}
      </span>
    )
  }
  if (tipo === 'parto') {
    const sit = dados.situacao === 'vivo' ? 'Vivo' : 'Morto'
    const tip = dados.tipo_parto === 'gemeos' ? 'Gêmeos' : 'Único'
    const sx  = dados.sexo_bezerro === 'M' ? 'Macho' : 'Fêmea'
    return <span className="text-muted-foreground">{tip} · {sx} · {sit}</span>
  }
  return null
}

export function HistoricoView({ tenantSlug, eventos }: { tenantSlug: string; eventos: Evento[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (!confirm('Excluir este evento? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteEvento(tenantSlug, id)
      setDeletingId(null)
      router.refresh()
    })
  }

  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhum evento reprodutivo registrado ainda.
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <h2 className="text-base font-semibold">Histórico de eventos</h2>
        <span className="text-sm text-muted-foreground">{eventos.length} registro(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Animal</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Detalhes</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Observações</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {eventos.map(ev => (
              <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{fmtDate(ev.data)}</td>
                <td className="px-4 py-3">
                  {ev.animal ? (
                    <Link
                      href={`/${tenantSlug}/animais/${ev.animal.id}`}
                      className="font-mono font-medium hover:underline"
                    >
                      {ev.animal.brinco ?? '—'}
                    </Link>
                  ) : <span className="text-muted-foreground">—</span>}
                  {ev.animal?.nome && (
                    <p className="text-xs text-muted-foreground">{ev.animal.nome}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[ev.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                    {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <EventoDetalhe tipo={ev.tipo} dados={ev.dados} />
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                  {ev.observacoes ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(ev.id)}
                    disabled={deletingId === ev.id}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                    title="Excluir evento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
