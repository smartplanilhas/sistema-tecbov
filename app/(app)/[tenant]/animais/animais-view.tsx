'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Scale, Zap, Check, X, Search, SlidersHorizontal, Download, Layers, ClipboardList } from 'lucide-react'
import { deleteAnimal, createAnimal, updateBrinco } from './actions'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  status: string
  sexo: string
  lote_atual_id: string | null
  local_atual_id: string | null
  proprietario_id: string | null
  data_nascimento: string | null
  peso_atual: number | null
  data_peso_atual: string | null
  gmd_ultimo: number | null
  gmd_geral: number | null
  total_pesagens: number
  categorias_animal: { nome: string } | null
  fazendas: { nome: string } | null
  racas: { nome: string } | null
}

type Fazenda      = { id: string; nome: string }
type Categoria    = { id: string; nome: string; sexo: string; ordem: number }
type Raca         = { id: string; nome: string }
type Lote         = { id: string; nome: string }
type Local        = { id: string; nome: string }
type Proprietario = { id: string; nome: string }

type FilterState = {
  catIds: string[]
  status: string
  racaId: string
  fazendaIds: string[]
  loteId: string
  localId: string
  proprietarioId: string
}

const EMPTY_FILTERS: FilterState = {
  catIds: [],
  status: '',
  racaId: '',
  fazendaIds: [],
  loteId: '',
  localId: '',
  proprietarioId: '',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  ativo:       'bg-green-100 text-green-700',
  vendido:     'bg-blue-100 text-blue-700',
  morto:       'bg-red-100 text-red-700',
  transferido: 'bg-orange-100 text-orange-700',
}

const STATUS_OPTIONS = [
  { value: 'ativo',       label: 'Ativo' },
  { value: 'vendido',     label: 'Vendido' },
  { value: 'morto',       label: 'Morto' },
  { value: 'transferido', label: 'Transferido' },
]

const SEL = 'flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function fmt(v: number | null, dec = 1) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function calcIdadeMeses(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth())
  return Math.max(0, meses)
}

function kgToArrobas(kg: number | null): number | null {
  if (kg == null) return null
  return kg / 15
}

// ─── Inline brinco editor ─────────────────────────────────────────────────────

function InlineBrinco({ animalId, brinco, tenantSlug }: {
  animalId: string
  brinco: string | null
  tenantSlug: string
}) {
  const [editing, setEditing]       = useState(false)
  const [value, setValue]           = useState('')
  const [localBrinco, setLocalBrinco] = useState(brinco)
  const [error, setError]           = useState('')
  const savingRef                   = useRef(false)
  const inputRef                    = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function startEdit() {
    setValue(localBrinco ?? '')
    setError('')
    setEditing(true)
  }

  function cancel() { setEditing(false); setError('') }

  async function save() {
    if (savingRef.current) return
    const trimmed = value.trim()
    if (trimmed === (localBrinco ?? '')) { setEditing(false); return }
    savingRef.current = true
    setError('')
    const res = await updateBrinco(tenantSlug, animalId, trimmed)
    savingRef.current = false
    if (res?.error) { setError(res.error); return }
    setLocalBrinco(trimmed || null)
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); save() }
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
          placeholder="Nº brinco"
          className="font-mono text-sm border border-input rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-ring bg-background"
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    )
  }

  if (localBrinco) {
    return (
      <Link href={`/${tenantSlug}/animais/${animalId}`} className="font-mono font-medium hover:underline">
        {localBrinco}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Clique para adicionar brinco"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary border border-dashed border-muted-foreground/25 hover:border-primary rounded px-2 py-0.5 font-mono transition-colors"
    >
      + brinco
    </button>
  )
}

// ─── Filter Drawer ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function CheckList({ items, selected, onChange }: {
  items: { id: string; nome: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!items.length) return <p className="text-xs text-muted-foreground italic">Nenhum disponível</p>
  return (
    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
      {items.map(item => (
        <label key={item.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={selected.includes(item.id)}
            onChange={() => onChange(
              selected.includes(item.id)
                ? selected.filter(x => x !== item.id)
                : [...selected, item.id]
            )}
          />
          <span className="text-sm">{item.nome}</span>
        </label>
      ))}
    </div>
  )
}

const SEL_FULL = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function FilterDrawer({
  open, onClose, filters, onChange, onClear,
  categorias, racas, fazendas, lotes, locais, proprietarios, multiFazenda,
}: {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (f: FilterState) => void
  onClear: () => void
  categorias: Categoria[]
  racas: Raca[]
  fazendas: Fazenda[]
  lotes: Lote[]
  locais: Local[]
  proprietarios: Proprietario[]
  multiFazenda: boolean
}) {
  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div className={cn('fixed inset-0 z-50', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-black/30 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div className={cn(
        'absolute right-0 top-0 h-full w-80 bg-background shadow-2xl flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-semibold">Filtros</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <Section title="Status">
            <select
              value={filters.status}
              onChange={e => set('status', e.target.value)}
              className={SEL_FULL}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Section>

          <Section title="Categoria">
            <CheckList
              items={categorias}
              selected={filters.catIds}
              onChange={ids => set('catIds', ids)}
            />
          </Section>

          <Section title="Raça">
            <select
              value={filters.racaId}
              onChange={e => set('racaId', e.target.value)}
              className={SEL_FULL}
            >
              <option value="">Todas as raças</option>
              {racas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </Section>

          <Section title="Proprietário">
            <select
              value={filters.proprietarioId}
              onChange={e => set('proprietarioId', e.target.value)}
              className={SEL_FULL}
            >
              <option value="">Todos os proprietários</option>
              {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Section>

          {multiFazenda && (
            <Section title="Fazenda">
              <CheckList
                items={fazendas}
                selected={filters.fazendaIds}
                onChange={ids => set('fazendaIds', ids)}
              />
            </Section>
          )}

          <Section title="Lote">
            <select
              value={filters.loteId}
              onChange={e => set('loteId', e.target.value)}
              className={SEL_FULL}
            >
              <option value="">Todos os lotes</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              <option value="__sem_lote__">Sem lote</option>
            </select>
          </Section>

          <Section title="Local">
            <select
              value={filters.localId}
              onChange={e => set('localId', e.target.value)}
              className={SEL_FULL}
            >
              <option value="">Todos os locais</option>
              {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              <option value="__sem_local__">Sem local</option>
            </select>
          </Section>

        </div>

        <div className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClear}>
            Limpar todos os filtros
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick Add Row ────────────────────────────────────────────────────────────

function QuickAddForm({
  tenantSlug,
  fazendas,
  categorias,
  racas,
  lotes,
  locais,
  multiFazenda,
  onSuccess,
  onCancel,
}: {
  tenantSlug: string
  fazendas: Fazenda[]
  categorias: Categoria[]
  racas: Raca[]
  lotes: Lote[]
  locais: Local[]
  multiFazenda: boolean
  onSuccess: () => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [catId, setCatId]     = useState('')
  const [sexo, setSexo]       = useState('')
  const [comPeso, setComPeso] = useState(false)
  const [error, setError]     = useState('')

  function handleCat(id: string) {
    setCatId(id)
    const cat = categorias.find(c => c.id === id)
    if (cat) setSexo(cat.sexo)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sexo) { setError('Selecione uma categoria.'); return }
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createAnimal(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      onSuccess()
    })
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="sexo" value={sexo} />
        <input type="hidden" name="status" value="ativo" />
        {!multiFazenda && fazendas[0] && (
          <input type="hidden" name="fazenda_id" value={fazendas[0].id} />
        )}

        <div className="flex flex-wrap items-end gap-3">
          {multiFazenda && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fazenda *</p>
              <select name="fazenda_id" required className={SEL} style={{ width: 140 }}>
                <option value="">Selecione</option>
                {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Brinco</p>
            <Input name="brinco" placeholder="Nº do brinco" className="h-8 text-sm w-28" />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Categoria *</p>
            <select
              name="categoria_id"
              value={catId}
              onChange={e => handleCat(e.target.value)}
              required
              className={SEL}
              style={{ width: 140 }}
            >
              <option value="">Selecione</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Lote</p>
            <select name="lote_atual_id" className={SEL} style={{ width: 130 }}>
              <option value="">Sem lote</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Local</p>
            <select name="local_atual_id" className={SEL} style={{ width: 130 }}>
              <option value="">Sem local</option>
              {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Raça</p>
            <select name="raca_id" className={SEL} style={{ width: 120 }}>
              <option value="">Sem raça</option>
              {racas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={comPeso}
                onChange={e => setComPeso(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Peso inicial
            </label>
            {comPeso ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  name="peso_inicial"
                  step="0.001"
                  min="1"
                  placeholder="kg"
                  className="h-8 text-sm w-20"
                  required
                />
                <Input
                  type="date"
                  name="data_peso_inicial"
                  defaultValue={today}
                  className="h-8 text-sm"
                  required
                />
              </div>
            ) : (
              <div className="h-8" />
            )}
          </div>

          <div className="flex gap-2 ml-auto items-end pb-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="h-8 gap-1">
              <Check className="h-3.5 w-3.5" />
              {isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </form>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function AnimaisView({
  tenantSlug,
  animals,
  multiFazenda,
  fazendas,
  categorias,
  racas,
  lotes,
  locais,
  proprietarios,
}: {
  tenantSlug: string
  animals: Animal[]
  multiFazenda: boolean
  fazendas: Fazenda[]
  categorias: Categoria[]
  racas: Raca[]
  lotes: Lote[]
  locais: Local[]
  proprietarios: Proprietario[]
}) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [drawerOpen, setDrawerOpen]     = useState(false)

  const [search, setSearch]   = useState('')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  const activeFilterCount = [
    filters.catIds.length,
    filters.status ? 1 : 0,
    filters.racaId ? 1 : 0,
    filters.fazendaIds.length,
    filters.loteId ? 1 : 0,
    filters.localId ? 1 : 0,
    filters.proprietarioId ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const hasFilters = !!(search || activeFilterCount)

  const filteredAnimals = animals.filter(a => {
    if (search) {
      const q = search.toLowerCase()
      if (!a.brinco?.toLowerCase().includes(q) && !a.nome?.toLowerCase().includes(q)) return false
    }
    if (filters.status && a.status !== filters.status) return false
    if (filters.catIds.length > 0) {
      const matchesSome = filters.catIds.some(id => {
        const cat = categorias.find(c => c.id === id)
        return cat && a.categorias_animal?.nome === cat.nome
      })
      if (!matchesSome) return false
    }
    if (filters.racaId) {
      const raca = racas.find(r => r.id === filters.racaId)
      if (!raca || a.racas?.nome !== raca.nome) return false
    }
    if (filters.proprietarioId && a.proprietario_id !== filters.proprietarioId) return false
    if (filters.fazendaIds.length > 0) {
      const matchesFazenda = filters.fazendaIds.some(id => {
        const faz = fazendas.find(f => f.id === id)
        return faz && a.fazendas?.nome === faz.nome
      })
      if (!matchesFazenda) return false
    }
    if (filters.loteId) {
      if (filters.loteId === '__sem_lote__') { if (a.lote_atual_id != null) return false }
      else if (a.lote_atual_id !== filters.loteId) return false
    }
    if (filters.localId) {
      if (filters.localId === '__sem_local__') { if (a.local_atual_id != null) return false }
      else if (a.local_atual_id !== filters.localId) return false
    }
    return true
  })

  function clearFilters() {
    setSearch('')
    setFilters(EMPTY_FILTERS)
  }

  function exportToExcel() {
    const rows = filteredAnimals.map(a => ({
      'Brinco':           a.brinco ?? '',
      'Nome':             a.nome ?? '',
      'Categoria':        a.categorias_animal?.nome ?? '',
      'Raça':             a.racas?.nome ?? '',
      'Sexo':             a.sexo === 'M' ? 'Macho' : 'Fêmea',
      'Status':           STATUS_OPTIONS.find(s => s.value === a.status)?.label ?? a.status,
      'Fazenda':          a.fazendas?.nome ?? '',
      'Lote':             lotes.find(l => l.id === a.lote_atual_id)?.nome ?? '',
      'Local':            locais.find(l => l.id === a.local_atual_id)?.nome ?? '',
      'Idade (meses)':    calcIdadeMeses(a.data_nascimento) ?? '',
      'Peso (@vivo)':     kgToArrobas(a.peso_atual) != null ? Number(kgToArrobas(a.peso_atual)!.toFixed(2)) : '',
      'Peso (kg)':        a.peso_atual ?? '',
      'Ú. pesagem':       a.data_peso_atual ? fmtDate(a.data_peso_atual) : '',
      'GMD último (kg/d)': a.gmd_ultimo ?? '',
      'GMD geral (kg/d)':  a.gmd_geral ?? '',
      'Total pesagens':    a.total_pesagens,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Animais')

    const cols = Object.keys(rows[0] ?? {}).map(k => ({ wch: Math.max(k.length, 14) }))
    ws['!cols'] = cols

    XLSX.writeFile(wb, `animais-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este animal? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteAnimal(tenantSlug, id)
      setDeletingId(null)
    })
  }

  const countLabel = hasFilters
    ? `${filteredAnimals.length} de ${animals.length} animal(is)`
    : `${animals.length} animal(is) cadastrado(s)`

  // Chips dos filtros ativos
  type Chip = { key: string; label: string; onRemove: () => void }
  const chips: Chip[] = [
    ...(search ? [{ key: 'search', label: `"${search}"`, onRemove: () => setSearch('') }] : []),
    ...(filters.status ? [{
      key: 'status',
      label: STATUS_OPTIONS.find(o => o.value === filters.status)?.label ?? filters.status,
      onRemove: () => setFilters(f => ({ ...f, status: '' })),
    }] : []),
    ...filters.catIds.map(id => ({
      key: `c-${id}`,
      label: categorias.find(c => c.id === id)?.nome ?? id,
      onRemove: () => setFilters(f => ({ ...f, catIds: f.catIds.filter(x => x !== id) })),
    })),
    ...(filters.racaId ? [{
      key: 'raca',
      label: racas.find(r => r.id === filters.racaId)?.nome ?? filters.racaId,
      onRemove: () => setFilters(f => ({ ...f, racaId: '' })),
    }] : []),
    ...(filters.proprietarioId ? [{
      key: 'proprietario',
      label: proprietarios.find(p => p.id === filters.proprietarioId)?.nome ?? filters.proprietarioId,
      onRemove: () => setFilters(f => ({ ...f, proprietarioId: '' })),
    }] : []),
    ...filters.fazendaIds.map(id => ({
      key: `f-${id}`,
      label: fazendas.find(f => f.id === id)?.nome ?? id,
      onRemove: () => setFilters(f => ({ ...f, fazendaIds: f.fazendaIds.filter(x => x !== id) })),
    })),
    ...(filters.loteId ? [{
      key: 'lote',
      label: filters.loteId === '__sem_lote__' ? 'Sem lote' : (lotes.find(l => l.id === filters.loteId)?.nome ?? 'Lote'),
      onRemove: () => setFilters(f => ({ ...f, loteId: '' })),
    }] : []),
    ...(filters.localId ? [{
      key: 'local',
      label: filters.localId === '__sem_local__' ? 'Sem local' : (locais.find(l => l.id === filters.localId)?.nome ?? 'Local'),
      onRemove: () => setFilters(f => ({ ...f, localId: '' })),
    }] : []),
  ]

  return (
    <>
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={f => setFilters(f)}
        onClear={clearFilters}
        categorias={categorias}
        racas={racas}
        fazendas={fazendas}
        lotes={lotes}
        locais={locais}
        proprietarios={proprietarios}
        multiFazenda={multiFazenda}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Animais</h1>
            <p className="text-muted-foreground text-sm">{countLabel}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowQuickAdd(v => !v)}
            >
              <Zap className="h-4 w-4" /> Cadastro rápido
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/${tenantSlug}/animais/novo-em-lote`}>
                <Layers className="h-4 w-4" /> Cadastro em lote
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href={`/${tenantSlug}/animais/novo`}>
                <Plus className="h-4 w-4" /> Novo animal
              </Link>
            </Button>
          </div>
        </div>

        {/* Cadastro rápido */}
        {showQuickAdd && (
          <QuickAddForm
            tenantSlug={tenantSlug}
            fazendas={fazendas}
            categorias={categorias}
            racas={racas}
            lotes={lotes}
            locais={locais}
            multiFazenda={multiFazenda}
            onSuccess={() => setShowQuickAdd(false)}
            onCancel={() => setShowQuickAdd(false)}
          />
        )}

        {/* Toolbar */}
        {animals.length > 0 && (
          <div className="rounded-xl border bg-card px-4 py-2.5 flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar animal…"
                className="h-8 pl-8 text-sm w-52"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className={cn('gap-1.5', activeFilterCount > 0 ? 'text-foreground border-foreground' : 'text-muted-foreground')}
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="ml-0.5 bg-primary text-primary-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground ml-auto"
              onClick={exportToExcel}
              disabled={filteredAnimals.length === 0}
              title="Exportar para Excel"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        )}

        {/* Chips de filtros ativos */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(chip => (
              <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground text-xs px-3 py-1 font-medium">
                {chip.label}
                <button onClick={chip.onRemove} className="ml-0.5 hover:text-foreground/60">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Limpar tudo
            </button>
          </div>
        )}

        {/* Conteúdo */}
        {animals.length === 0 && !showQuickAdd ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%)' }}>
            <div className="flex flex-col sm:flex-row items-center gap-6 px-8 py-8 sm:py-6">
              {/* Ilustração */}
              <div className="shrink-0 w-52 sm:w-60">
                <Image
                  src="/bovinos-ilustracao.png"
                  alt="Bovinos Nelore"
                  width={320}
                  height={220}
                  className="w-full h-auto drop-shadow-md"
                  priority
                />
              </div>

              {/* Texto + CTA */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <h2 className="text-xl font-bold text-gray-800 leading-snug">
                  Comece cadastrando seu<br className="hidden sm:block" /> primeiro animal
                </h2>
                <p className="text-sm text-gray-600 max-w-sm">
                  Cadastre um animal para começar a acompanhar GMD, lotes, reprodução e resultados financeiros.
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    onClick={() => setShowQuickAdd(true)}
                    variant="outline"
                    className="gap-2 bg-white/70 hover:bg-white border-gray-300"
                  >
                    <Zap className="h-4 w-4" /> Cadastro rápido
                  </Button>
                  <Button asChild className="gap-2">
                    <Link href={`/${tenantSlug}/animais/novo`}>
                      <Plus className="h-4 w-4" /> Cadastrar primeiro animal
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : filteredAnimals.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum animal encontrado para os filtros aplicados.{' '}
            <button onClick={clearFilters} className="underline hover:text-foreground">Limpar filtros</button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brinco / Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                    {multiFazenda && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fazenda</th>}
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lote</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Local</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Idade</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Peso</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAnimals.map(a => (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <InlineBrinco animalId={a.id} brinco={a.brinco} tenantSlug={tenantSlug} />
                        {a.nome && <p className="text-xs text-muted-foreground">{a.nome}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span>{a.categorias_animal?.nome ?? '—'}</span>
                        {a.racas?.nome && <p className="text-xs text-muted-foreground">{a.racas.nome}</p>}
                      </td>
                      {multiFazenda && (
                        <td className="px-4 py-3 text-muted-foreground">{a.fazendas?.nome ?? '—'}</td>
                      )}
                      <td className="px-4 py-3 text-muted-foreground">
                        {lotes.find(l => l.id === a.lote_atual_id)?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {locais.find(l => l.id === a.local_atual_id)?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {(() => { const m = calcIdadeMeses(a.data_nascimento); return m != null ? `${m} m` : '—' })()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {a.peso_atual != null ? (
                          <span>
                            {fmt(a.peso_atual)} kg
                            <span className="block text-xs text-muted-foreground font-normal">{fmt(kgToArrobas(a.peso_atual), 2)} @</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[a.status] ?? ''}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/${tenantSlug}/animais/${a.id}`}
                            className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                            title="Ficha do animal"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/${tenantSlug}/animais/${a.id}/editar`}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deletingId === a.id}
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
        )}
      </div>
    </>
  )
}
