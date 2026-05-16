'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Layers, ChevronRight } from 'lucide-react'
import { deleteLote } from './actions'

type Lote = {
  id: string
  nome: string
  descricao: string | null
  fase: string | null
  meta_peso: number | null
  data_prevista_saida: string | null
  status: string
  total_animais: number
  peso_medio: number | null
}

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

export function LotesView({
  tenantSlug,
  lotes,
}: {
  tenantSlug: string
  lotes: Lote[]
}) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o lote "${nome}"? Os animais serão desvinculados mas não excluídos.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteLote(tenantSlug, id)
      setDeletingId(null)
    })
  }

  const ativos    = lotes.filter(l => l.status === 'ativo')
  const encerrados = lotes.filter(l => l.status === 'encerrado')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lotes</h1>
          <p className="text-muted-foreground text-sm">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {encerrados.length > 0 && `, ${encerrados.length} encerrado${encerrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${tenantSlug}/animais/lotes/novo`}>
            <Plus className="h-4 w-4" /> Novo lote
          </Link>
        </Button>
      </div>

      {lotes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">Nenhum lote cadastrado.</p>
          <Button asChild variant="outline" className="gap-2 mt-4">
            <Link href={`/${tenantSlug}/animais/lotes/novo`}>
              <Plus className="h-4 w-4" /> Criar primeiro lote
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {[{ label: 'Ativos', items: ativos }, { label: 'Encerrados', items: encerrados }]
            .filter(g => g.items.length > 0)
            .map(group => (
              <div key={group.label}>
                {encerrados.length > 0 && ativos.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.label}</p>
                )}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lote</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fase</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Animais</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Peso médio</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Meta (kg)</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prev. saída</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {group.items.map(lote => (
                          <tr key={lote.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <Link
                                href={`/${tenantSlug}/animais/lotes/${lote.id}`}
                                className="font-medium hover:underline flex items-center gap-1 group"
                              >
                                {lote.nome}
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              {lote.descricao && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{lote.descricao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {lote.fase ? (
                                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${FASE_COLOR[lote.fase] ?? 'bg-muted text-muted-foreground'}`}>
                                  {FASE_LABEL[lote.fase] ?? lote.fase}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{lote.total_animais}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {lote.peso_medio != null ? `${fmt(lote.peso_medio)} kg` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {lote.meta_peso != null ? `${fmt(lote.meta_peso)} kg` : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{fmtDate(lote.data_prevista_saida)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <Link
                                  href={`/${tenantSlug}/animais/lotes/${lote.id}/editar`}
                                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Link>
                                <button
                                  onClick={() => handleDelete(lote.id, lote.nome)}
                                  disabled={deletingId === lote.id}
                                  className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
