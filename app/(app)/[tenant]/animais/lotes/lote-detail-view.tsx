'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronLeft, Pencil, UserPlus, X, Search, Check,
  Scale, Target, Calendar, Layers,
} from 'lucide-react'
import { addAnimaisToLote, removeAnimalFromLote } from './actions'
import { cn } from '@/lib/utils'

type Lote = {
  id: string
  nome: string
  descricao: string | null
  fase: string | null
  meta_peso: number | null
  data_prevista_saida: string | null
  observacoes: string | null
  status: string
}

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  status: string
  sexo: string
  peso_atual: number | null
  categorias_animal: { nome: string } | null
  racas: { nome: string } | null
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

// ─── Drawer para adicionar animais ─────────────────────────────────────────────

function AddAnimaisDrawer({
  open,
  onClose,
  tenantSlug,
  loteId,
  available,
}: {
  open: boolean
  onClose: () => void
  tenantSlug: string
  loteId: string
  available: Animal[]
}) {
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<string[]>([])
  const [, startTransition]       = useTransition()
  const [saving, setSaving]       = useState(false)

  const filtered = available.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q)
  })

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleAdd() {
    if (!selected.length) return
    setSaving(true)
    startTransition(async () => {
      await addAnimaisToLote(tenantSlug, loteId, selected)
      setSelected([])
      setSearch('')
      setSaving(false)
      onClose()
    })
  }

  return (
    <div className={cn('fixed inset-0 z-50', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-black/30 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div className={cn(
        'absolute right-0 top-0 h-full w-[420px] bg-background shadow-2xl flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-semibold">Adicionar animais ao lote</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="px-6 py-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por brinco ou nome…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{selected.length} animal(is) selecionado(s)</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {available.length === 0 ? 'Todos os animais já estão em lotes.' : 'Nenhum animal encontrado.'}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map(a => {
                const isSel = selected.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-6 py-3 text-left transition-colors',
                      isSel ? 'bg-primary/5' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isSel ? 'bg-primary border-primary' : 'border-input'
                    )}>
                      {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-medium text-sm">{a.brinco ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[a.nome, a.categorias_animal?.nome, a.racas?.nome].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {a.peso_atual != null && (
                      <span className="text-xs text-muted-foreground shrink-0">{fmt(a.peso_atual)} kg</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1"
            disabled={!selected.length || saving}
            onClick={handleAdd}
          >
            {saving ? 'Adicionando…' : `Adicionar ${selected.length || ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function LoteDetailView({
  tenantSlug,
  lote,
  animais,
  available,
}: {
  tenantSlug: string
  lote: Lote
  animais: Animal[]
  available: Animal[]
}) {
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [removingId, setRemovingId]   = useState<string | null>(null)
  const [, startTransition]           = useTransition()

  const pesoMedio = animais.length > 0 && animais.some(a => a.peso_atual != null)
    ? animais.reduce((s, a) => s + (a.peso_atual ?? 0), 0) / animais.filter(a => a.peso_atual != null).length
    : null

  function handleRemove(animalId: string) {
    setRemovingId(animalId)
    startTransition(async () => {
      await removeAnimalFromLote(tenantSlug, animalId, lote.id)
      setRemovingId(null)
    })
  }

  return (
    <>
      <AddAnimaisDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tenantSlug={tenantSlug}
        loteId={lote.id}
        available={available}
      />

      <div className="space-y-4">
        {/* Breadcrumb */}
        <Link
          href={`/${tenantSlug}/animais/lotes`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Lotes
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{lote.nome}</h1>
              {lote.fase && (
                <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${FASE_COLOR[lote.fase] ?? 'bg-muted text-muted-foreground'}`}>
                  {FASE_LABEL[lote.fase] ?? lote.fase}
                </span>
              )}
              {lote.status === 'encerrado' && (
                <span className="text-xs rounded-full px-2.5 py-1 font-medium bg-muted text-muted-foreground">
                  Encerrado
                </span>
              )}
            </div>
            {lote.descricao && <p className="text-muted-foreground text-sm mt-1">{lote.descricao}</p>}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/${tenantSlug}/animais/lotes/${lote.id}/editar`}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Link>
            </Button>
            {lote.status === 'ativo' && (
              <Button size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Adicionar animais
              </Button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Animais</span>
            </div>
            <p className="text-2xl font-bold">{animais.length}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Scale className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Peso médio</span>
            </div>
            <p className="text-2xl font-bold">{pesoMedio != null ? `${fmt(pesoMedio)} kg` : '—'}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Meta de peso</span>
            </div>
            <p className="text-2xl font-bold">{lote.meta_peso != null ? `${fmt(lote.meta_peso)} kg` : '—'}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Prev. saída</span>
            </div>
            <p className="text-xl font-bold">{fmtDate(lote.data_prevista_saida)}</p>
          </div>
        </div>

        {lote.observacoes && (
          <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            {lote.observacoes}
          </div>
        )}

        {/* Tabela de animais */}
        {animais.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground text-sm">Nenhum animal neste lote.</p>
            {lote.status === 'ativo' && (
              <Button variant="outline" className="gap-2 mt-3" onClick={() => setDrawerOpen(true)}>
                <UserPlus className="h-4 w-4" /> Adicionar animais
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="text-sm font-medium">{animais.length} animal(is) no lote</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brinco / Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Peso atual</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">vs. meta</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {animais.map(a => {
                    const diff = lote.meta_peso != null && a.peso_atual != null
                      ? a.peso_atual - lote.meta_peso
                      : null
                    return (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/${tenantSlug}/animais/${a.id}`} className="font-mono font-medium hover:underline">
                            {a.brinco ?? '—'}
                          </Link>
                          {a.nome && <p className="text-xs text-muted-foreground">{a.nome}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span>{a.categorias_animal?.nome ?? '—'}</span>
                          {a.racas?.nome && <p className="text-xs text-muted-foreground">{a.racas.nome}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {a.peso_atual != null ? `${fmt(a.peso_atual)} kg` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {diff != null ? (
                            <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {diff >= 0 ? '+' : ''}{fmt(diff)} kg
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/${tenantSlug}/animais/${a.id}`}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
                              title="Ver animal"
                            >
                              Ver
                            </Link>
                            <button
                              onClick={() => handleRemove(a.id)}
                              disabled={removingId === a.id}
                              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                              title="Remover do lote"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
