'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Scale, Plus, X, Check, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createPesagensEmGrupo } from '../../animais/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  peso_atual: number | null
  data_peso_atual: string | null
  lote_atual_id: string | null
  categoria: string | null
}

type Lote = { id: string; nome: string }

type RowItem = { animal: Animal; peso: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEL = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function fmt(v: number | null, dec = 1) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

// ─── Animal search dropdown ───────────────────────────────────────────────────

function AnimalSearch({ animals, onSelect, placeholder = 'Buscar por brinco ou nome…' }: {
  animals: Animal[]
  onSelect: (a: Animal) => void
  placeholder?: string
}) {
  const [q, setQ]         = useState('')
  const [open, setOpen]   = useState(false)

  const filtered = animals.filter(a => {
    if (!q) return true
    const lq = q.toLowerCase()
    return a.brinco?.toLowerCase().includes(lq) || a.nome?.toLowerCase().includes(lq)
  }).slice(0, 30)

  return (
    <div className="relative">
      <Input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-9"
      />
      {open && q.length > 0 && (
        <div className="absolute z-30 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
          ) : filtered.map(a => (
            <button
              key={a.id}
              type="button"
              onMouseDown={() => { onSelect(a); setQ(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center gap-3"
            >
              <span className="font-mono font-medium">{a.brinco ?? '—'}</span>
              <span className="text-xs text-muted-foreground truncate">
                {[a.nome, a.categoria].filter(Boolean).join(' · ')}
                {a.peso_atual != null && ` · ${fmt(a.peso_atual)} kg`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared header fields ────────────────────────────────────────────────────

function CamposComuns({ today }: { today: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="space-y-1.5 flex-1 min-w-[130px]">
        <Label>Data <span className="text-destructive">*</span></Label>
        <Input type="date" name="data" defaultValue={today} required />
      </div>
      <div className="space-y-1.5 flex-1 min-w-[130px]">
        <Label>Tipo</Label>
        <select name="tipo" defaultValue="controle" className={SEL}>
          <option value="controle">Controle</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="venda">Venda</option>
        </select>
      </div>
    </div>
  )
}

// ─── Modo 1: Peso médio por grupo ────────────────────────────────────────────

function ModoPesoMedio({ tenantSlug, animals, lotes }: {
  tenantSlug: string
  animals: Animal[]
  lotes: Lote[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [selecionados, setSelecionados] = useState<Animal[]>([])
  const [filterQuery, setFilterQuery]       = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterLote, setFilterLote]         = useState('')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const selectedIds = useMemo(() => new Set(selecionados.map(a => a.id)), [selecionados])

  const categorias = useMemo(() => {
    const set = new Set(animals.map(a => a.categoria).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [animals])

  const disponiveis = useMemo(() => animals.filter(a => {
    if (selectedIds.has(a.id)) return false
    if (filterCategoria && a.categoria !== filterCategoria) return false
    if (filterLote && a.lote_atual_id !== filterLote) return false
    if (filterQuery) {
      const q = filterQuery.toLowerCase()
      if (!a.brinco?.toLowerCase().includes(q) && !a.nome?.toLowerCase().includes(q)) return false
    }
    return true
  }), [animals, selectedIds, filterCategoria, filterLote, filterQuery])

  function addAnimal(a: Animal) {
    setSelecionados(prev => selectedIds.has(a.id) ? prev : [...prev, a])
  }
  function addAll() {
    setSelecionados(prev => {
      const existing = new Set(prev.map(a => a.id))
      return [...prev, ...disponiveis.filter(a => !existing.has(a.id))]
    })
  }
  function removeAnimal(id: string) {
    setSelecionados(prev => prev.filter(a => a.id !== id))
  }
  function removeAll() { setSelecionados([]) }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selecionados.length) { setError('Selecione ao menos um animal.'); return }
    const fd   = new FormData(e.currentTarget)
    const data = fd.get('data') as string
    const tipo = fd.get('tipo') as string
    const peso = parseFloat(fd.get('peso_medio') as string)
    if (!peso || isNaN(peso) || peso <= 0) { setError('Informe um peso válido.'); return }
    setError('')
    const items = selecionados.map(a => ({ animal_id: a.id, peso }))
    startTransition(async () => {
      const res = await createPesagensEmGrupo(tenantSlug, items, data, tipo)
      if (res.error) { setError(res.error); return }
      setSuccess(`${res.count} pesagem(ns) registrada(s) com sucesso.`)
      setSelecionados([])
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <CamposComuns today={today} />

      {/* Peso médio */}
      <div className="space-y-1.5">
        <Label>Peso médio (kg) <span className="text-destructive">*</span></Label>
        <Input type="number" name="peso_medio" step="0.001" min="1" placeholder="0.000" required className="max-w-xs" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filtrar por brinco ou nome…"
            className="pl-9"
          />
        </div>
        {categorias.length > 0 && (
          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} className={cn(SEL, 'w-40 shrink-0')}>
            <option value="">Todas categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {lotes.length > 0 && (
          <select value={filterLote} onChange={e => setFilterLote(e.target.value)} className={cn(SEL, 'w-40 shrink-0')}>
            <option value="">Todos os lotes</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        )}
      </div>

      {/* Painéis lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        {/* Esquerda — Disponíveis */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              Disponíveis ({disponiveis.length})
            </span>
            {disponiveis.length > 0 && (
              <button type="button" onClick={addAll}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
                Adicionar todos
              </button>
            )}
          </div>
          {disponiveis.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10 text-center px-3">
              <p className="text-sm text-muted-foreground">
                {animals.length === selecionados.length
                  ? 'Todos os animais foram selecionados.'
                  : 'Nenhum animal com esses filtros.'}
              </p>
            </div>
          ) : (
            <div className="divide-y overflow-y-auto max-h-80">
              {disponiveis.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => addAnimal(a)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left group"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}
                  </span>
                  {a.peso_atual != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{fmt(a.peso_atual)} kg</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direita — Selecionados */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              Selecionados ({selecionados.length})
            </span>
            {selecionados.length > 0 && (
              <button type="button" onClick={removeAll}
                className="text-xs font-semibold text-foreground hover:text-destructive transition-colors">
                Remover todos
              </button>
            )}
          </div>
          {selecionados.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">Nenhum animal selecionado.</p>
            </div>
          ) : (
            <div className="divide-y overflow-y-auto max-h-80">
              {selecionados.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}
                  </span>
                  {a.peso_atual != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{fmt(a.peso_atual)} kg</span>
                  )}
                  <button type="button" onClick={() => removeAnimal(a.id)}
                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !selecionados.length} className="gap-2">
          <Scale className="h-4 w-4" />
          {isPending ? 'Registrando…' : `Registrar ${selecionados.length || ''} pesagem(ns)`}
        </Button>
      </div>
    </form>
  )
}

// ─── Modo 2: Por animal com peso individual ───────────────────────────────────

function ModoPorAnimal({ tenantSlug, animals }: {
  tenantSlug: string
  animals: Animal[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [rows, setRows]       = useState<RowItem[]>([])
  const [dataInput, setDataInput] = useState(today)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  function addAnimal(a: Animal) {
    if (rows.find(r => r.animal.id === a.id)) return
    setRows(prev => [...prev, { animal: a, peso: '' }])
  }

  function updatePeso(id: string, peso: string) {
    setRows(prev => prev.map(r => r.animal.id === id ? { ...r, peso } : r))
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.animal.id !== id))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd   = new FormData(e.currentTarget)
    const data = fd.get('data') as string
    const tipo = fd.get('tipo') as string

    const items = rows
      .map(r => ({ animal_id: r.animal.id, peso: parseFloat(r.peso) }))
      .filter(i => i.peso > 0)

    if (!items.length) { setError('Informe ao menos um peso válido.'); return }
    const sem = rows.filter(r => !parseFloat(r.peso))
    if (sem.length) { setError(`${sem.length} animal(is) sem peso preenchido.`); return }

    setError('')
    startTransition(async () => {
      const res = await createPesagensEmGrupo(tenantSlug, items, data, tipo)
      if (res.error) { setError(res.error); return }
      setSuccess(`${res.count} pesagem(ns) registrada(s) com sucesso.`)
      setRows([])
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Campos comuns com data controlada para cálculo de GMD */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1.5 flex-1 min-w-[130px]">
          <Label>Data <span className="text-destructive">*</span></Label>
          <Input
            type="date"
            name="data"
            value={dataInput}
            onChange={e => setDataInput(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[130px]">
          <Label>Tipo</Label>
          <select name="tipo" defaultValue="controle" className={SEL}>
            <option value="controle">Controle</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="venda">Venda</option>
          </select>
        </div>
      </div>

      {/* Busca de animal */}
      <div className="space-y-1.5">
        <Label>Adicionar animal</Label>
        <AnimalSearch
          animals={animals.filter(a => !rows.find(r => r.animal.id === a.id))}
          onSelect={addAnimal}
          placeholder="Buscar por brinco ou nome…"
        />
      </div>

      {/* Tabela de animais + pesos */}
      {rows.length > 0 ? (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Brinco</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Animal</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Últ. peso</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Novo peso (kg) *</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Ganho</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">GMD</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => {
                // Sempre usa dados frescos da prop animals (atualizada após router.refresh)
                const current  = animals.find(a => a.id === r.animal.id) ?? r.animal
                const novoPeso = parseFloat(r.peso)
                const ganho    = current.peso_atual != null && novoPeso > 0
                  ? novoPeso - current.peso_atual : null
                const dias     = current.data_peso_atual && dataInput
                  ? Math.round((new Date(dataInput + 'T12:00:00').getTime() - new Date(current.data_peso_atual + 'T12:00:00').getTime()) / 86_400_000)
                  : null
                const gmd      = ganho != null && dias != null && dias > 0
                  ? ganho / dias : null
                const cor      = ganho != null ? (ganho >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'
                return (
                  <tr key={r.animal.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono font-medium">{current.brinco ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {[current.nome, current.categoria].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {current.peso_atual != null ? `${fmt(current.peso_atual)} kg` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        step="0.001"
                        min="1"
                        placeholder="0.000"
                        value={r.peso}
                        onChange={e => updatePeso(r.animal.id, e.target.value)}
                        className="h-8 w-28 text-sm"
                      />
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-semibold tabular-nums', cor)}>
                      {ganho != null ? `${ganho >= 0 ? '+' : ''}${fmt(ganho)} kg` : '—'}
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap', cor)}>
                      {gmd != null && dias != null
                        ? <>{gmd >= 0 ? '+' : ''}{fmt(gmd, 3)} <span className="text-xs font-normal text-muted-foreground">kg/d ({dias}d)</span></>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => removeRow(r.animal.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Busque animais acima para adicionar à lista.
        </div>
      )}

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !rows.length} className="gap-2">
          <Scale className="h-4 w-4" />
          {isPending ? 'Registrando…' : `Registrar ${rows.length || ''} pesagem(ns)`}
        </Button>
      </div>
    </form>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

const MODOS = [
  { key: 'medio',  label: 'Peso médio' },
  { key: 'individual', label: 'Por animal' },
] as const
type ModoKey = typeof MODOS[number]['key']

export function PesagemGrupoView({ tenantSlug, animals, lotes }: {
  tenantSlug: string
  animals: Animal[]
  lotes: Lote[]
}) {
  const [modo, setModo] = useState<ModoKey>('medio')

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-4 border-b pb-4">
        {MODOS.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setModo(m.key)}
            className={cn(
              'text-sm font-medium pb-1 border-b-2 -mb-[17px] transition-colors',
              modo === m.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {modo === 'medio'      && <ModoPesoMedio   tenantSlug={tenantSlug} animals={animals} lotes={lotes} />}
      {modo === 'individual' && <ModoPorAnimal    tenantSlug={tenantSlug} animals={animals} />}
    </div>
  )
}
