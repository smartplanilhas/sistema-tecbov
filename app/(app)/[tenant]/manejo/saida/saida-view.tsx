'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, Plus, X, Search, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registrarSaidaAnimais } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  peso_atual: number | null
  categoria: string | null
  sexo: string | null
  lote_atual_id: string | null
}

type SelectedAnimal = {
  id: string
  brinco: string | null
  nome: string | null
  categoria: string | null
  sexo: string | null
}

type Lote = { id: string; nome: string }
type SelectMode = 'individual' | 'grupo'
type TipoSaida = 'vendido' | 'abatido' | 'doado' | 'extraviado'

const TIPO_OPTS: { value: TipoSaida; label: string }[] = [
  { value: 'vendido',    label: 'Venda'      },
  { value: 'abatido',   label: 'Abate'      },
  { value: 'doado',     label: 'Doação'     },
  { value: 'extraviado', label: 'Extraviado' },
]

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── AnimaisSelector ──────────────────────────────────────────────────────────

function AnimaisSelector({
  animais, lotes, selected, onAdd, onRemove, pesos, onPesoChange,
}: {
  animais: Animal[]
  lotes: Lote[]
  selected: SelectedAnimal[]
  onAdd: (animals: SelectedAnimal[]) => void
  onRemove: (id: string) => void
  pesos: Record<string, string>
  onPesoChange: (id: string, peso: string) => void
}) {
  const selectedIds = useMemo(() => new Set(selected.map(a => a.id)), [selected])
  const [mode, setMode]               = useState<SelectMode>('individual')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen]   = useState(false)
  const [grupoQuery, setGrupoQuery]   = useState('')
  const [grupoCategoria, setGrupoCategoria] = useState('')
  const [grupoLote, setGrupoLote]     = useState('')
  const [grupoSexo, setGrupoSexo]     = useState('')

  useEffect(() => {
    setSearchQuery(''); setSearchOpen(false)
    setGrupoQuery(''); setGrupoCategoria(''); setGrupoLote(''); setGrupoSexo('')
  }, [mode])

  const categorias = useMemo(() => {
    const set = new Set(animais.map(a => a.categoria).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [animais])

  const naoSelecionados = animais.filter(a => !selectedIds.has(a.id))

  const searchFiltered = naoSelecionados.filter(a => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q)
  }).slice(0, 40)

  const grupoFiltered = naoSelecionados.filter(a => {
    if (grupoCategoria && a.categoria !== grupoCategoria) return false
    if (grupoLote && a.lote_atual_id !== grupoLote) return false
    if (grupoSexo && a.sexo !== grupoSexo) return false
    if (grupoQuery) {
      const q = grupoQuery.toLowerCase()
      if (!a.brinco?.toLowerCase().includes(q) && !a.nome?.toLowerCase().includes(q)) return false
    }
    return true
  })

  function toSelected(a: Animal): SelectedAnimal {
    return { id: a.id, brinco: a.brinco, nome: a.nome, categoria: a.categoria, sexo: a.sexo }
  }

  function handleIndividualAdd(a: Animal) {
    if (selectedIds.has(a.id)) return
    onAdd([toSelected(a)])
    setSearchQuery(''); setSearchOpen(false)
  }

  const MODES = [
    { key: 'individual' as const, label: 'Individual' },
    { key: 'grupo'      as const, label: 'Por grupo'  },
  ]

  // Lista de selecionados com campo de peso (usada em ambos os modos)
  const SelectedList = () => (
    <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
      {selected.map(a => {
        const animalData = animais.find(x => x.id === a.id)
        return (
          <div key={a.id} className="flex items-center gap-2 px-3 py-2">
            <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
            <span className="text-sm text-muted-foreground flex-1 truncate min-w-0">
              {[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}
            </span>
            <Input
              type="number" step="0.1" min="0"
              placeholder={animalData?.peso_atual ? `${animalData.peso_atual}` : 'kg'}
              value={pesos[a.id] ?? ''}
              onChange={e => onPesoChange(a.id, e.target.value)}
              className="h-7 w-24 text-xs shrink-0"
            />
            <button type="button" onClick={() => onRemove(a.id)}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          Animais{' '}
          <span className="text-muted-foreground font-normal">
            ({selected.length} selecionado{selected.length !== 1 ? 's' : ''})
          </span>
        </Label>
        <div className="flex border rounded-md overflow-hidden text-xs">
          {MODES.map(m => (
            <button key={m.key} type="button" onClick={() => setMode(m.key)}
              className={cn('px-3 py-1.5 transition-colors',
                mode === m.key ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted'
              )}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'individual' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Buscar por brinco ou nome…" autoComplete="off" className="pl-9"
            />
            {searchOpen && (
              <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
                {searchFiltered.length === 0
                  ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
                  : searchFiltered.map(a => (
                    <button key={a.id} type="button" onMouseDown={() => handleIndividualAdd(a)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3">
                      <span className="font-mono font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{a.sexo === 'M' ? 'Macho' : 'Fêmea'}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">{[a.nome, a.categoria].filter(Boolean).join(' · ')}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          {selected.length > 0 && <SelectedList />}
        </>
      )}

      {mode === 'grupo' && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input value={grupoQuery} onChange={e => setGrupoQuery(e.target.value)}
                placeholder="Filtrar por brinco ou nome…" className="pl-9" />
            </div>
            {lotes.length > 0 && (
              <select value={grupoLote} onChange={e => setGrupoLote(e.target.value)} className={cn(SELECT_CLS, 'w-40 shrink-0')}>
                <option value="">Todos os lotes</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            )}
            {categorias.length > 0 && (
              <select value={grupoCategoria} onChange={e => setGrupoCategoria(e.target.value)} className={cn(SELECT_CLS, 'w-40 shrink-0')}>
                <option value="">Todas categorias</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select value={grupoSexo} onChange={e => setGrupoSexo(e.target.value)} className={cn(SELECT_CLS, 'w-28 shrink-0')}>
              <option value="">M + F</option>
              <option value="M">Machos</option>
              <option value="F">Fêmeas</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Disponíveis ({grupoFiltered.length})</span>
                {grupoFiltered.length > 0 && (
                  <button type="button" onClick={() => onAdd(grupoFiltered.map(toSelected))}
                    className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
                    Adicionar todas
                  </button>
                )}
              </div>
              {grupoFiltered.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10 text-center px-3">
                  <p className="text-sm text-muted-foreground">
                    {naoSelecionados.length === 0 ? 'Todos os animais foram selecionados.' : 'Nenhum animal com esses filtros.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto max-h-72">
                  {grupoFiltered.map(a => (
                    <button key={a.id} type="button" onClick={() => onAdd([toSelected(a)])}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/5 transition-colors text-left group">
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-mono text-sm font-medium w-16 shrink-0">{a.brinco ?? '—'}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{a.sexo === 'M' ? 'M' : 'F'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Selecionados ({selected.length})</span>
                {selected.length > 0 && (
                  <button type="button" onClick={() => selected.forEach(a => onRemove(a.id))}
                    className="text-xs font-semibold text-foreground hover:text-destructive transition-colors">
                    Remover todos
                  </button>
                )}
              </div>
              {selected.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <p className="text-sm text-muted-foreground">Nenhum animal selecionado.</p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto max-h-72">
                  {selected.map(a => {
                    const animalData = animais.find(x => x.id === a.id)
                    return (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="font-mono text-sm font-medium w-16 shrink-0">{a.brinco ?? '—'}</span>
                        <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                        <Input
                          type="number" step="0.1" min="0"
                          placeholder={animalData?.peso_atual ? `${animalData.peso_atual}` : 'kg'}
                          value={pesos[a.id] ?? ''}
                          onChange={e => onPesoChange(a.id, e.target.value)}
                          className="h-7 w-20 text-xs shrink-0"
                        />
                        <button type="button" onClick={() => onRemove(a.id)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Peso por animal é opcional — registrado como pesagem de saída e atualiza o GMD automaticamente.
        </p>
      )}
    </div>
  )
}

// ─── SaidaAnimaisView ─────────────────────────────────────────────────────────

export function SaidaAnimaisView({
  tenantSlug, animais, lotes,
}: {
  tenantSlug: string
  animais: Animal[]
  lotes: Lote[]
}) {
  const today = new Date().toISOString().slice(0, 10)

  const [data, setData]           = useState(today)
  const [tipoSaida, setTipoSaida] = useState<TipoSaida>('abatido')
  const [observacoes, setObservacoes] = useState('')
  const [selected, setSelected]   = useState<SelectedAnimal[]>([])
  const [pesos, setPesos]         = useState<Record<string, string>>({})

  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  function handleAdd(batch: SelectedAnimal[]) {
    setSelected(prev => {
      const ids = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !ids.has(a.id))]
    })
  }
  function handleRemove(id: string) {
    setSelected(prev => prev.filter(a => a.id !== id))
    setPesos(prev => { const next = { ...prev }; delete next[id]; return next })
  }
  function handlePesoChange(id: string, peso: string) {
    setPesos(prev => ({ ...prev, [id]: peso }))
  }

  function handleSubmit() {
    if (!selected.length) { setError('Selecione ao menos um animal.'); return }
    if (!data) { setError('Informe a data da saída.'); return }

    setSaving(true); setError('')

    const pesosPorAnimal: Record<string, number> = {}
    for (const [id, p] of Object.entries(pesos)) {
      const v = parseFloat(p)
      if (v > 0) pesosPorAnimal[id] = v
    }

    startTransition(async () => {
      const res = await registrarSaidaAnimais(tenantSlug, {
        animalIds:      selected.map(a => a.id),
        data,
        tipo:           tipoSaida,
        pesosPorAnimal: Object.keys(pesosPorAnimal).length ? pesosPorAnimal : undefined,
        observacoes:    observacoes || null,
      })
      if (res.error) { setError(res.error); setSaving(false); return }
      window.location.href = `/${tenantSlug}/animais`
    })
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div>
        <Link href={`/${tenantSlug}/animais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Animais
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <LogOut className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Saída de Animais</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Registre a saída do rebanho por venda, abate, doação ou extravio.</p>
      </div>

      {/* 1. Dados da saída */}
      <Section n={1} title="Dados da saída">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de saída</Label>
            <Select value={tipoSaida} onValueChange={v => setTipoSaida(v as TipoSaida)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data <span className="text-destructive">*</span></Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Observações <span className="text-muted-foreground font-normal text-xs">— opcional</span></Label>
          <Input placeholder="Destino, motivo, detalhes adicionais…"
            value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </div>
      </Section>

      {/* 2. Animais */}
      <Section n={2} title="Animais">
        <AnimaisSelector
          animais={animais}
          lotes={lotes}
          selected={selected}
          onAdd={handleAdd}
          onRemove={handleRemove}
          pesos={pesos}
          onPesoChange={handlePesoChange}
        />
      </Section>

      {error && <p className="text-sm text-destructive px-1">{error}</p>}

      <div className="flex justify-end pb-6">
        <Button
          className="gap-2"
          disabled={saving || !selected.length || !data}
          onClick={handleSubmit}
        >
          <LogOut className="h-4 w-4" />
          {saving
            ? 'Registrando…'
            : `Registrar saída${selected.length ? ` (${selected.length})` : ''}`
          }
        </Button>
      </div>
    </div>
  )
}
