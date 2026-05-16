'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Plus, X, Check, Search, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEvento, createEventosEmLote, createEventosDesmameEmLote } from './actions'
import type { Femea, Lote, Local } from './reproducao-page-view'

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const STATUS_REP_CLS: Record<string, string> = {
  Prenha:     'bg-green-100 text-green-700',
  Inseminada: 'bg-blue-100 text-blue-700',
  Lactante:   'bg-amber-100 text-amber-700',
  Vazia:      'bg-gray-100 text-gray-600',
}
function StatusBadge({ status }: { status?: string | null }) {
  const cls = STATUS_REP_CLS[status ?? 'Vazia'] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`shrink-0 inline-flex items-center justify-center w-24 text-xs py-0.5 rounded-full font-medium ${cls}`}>
      {status ?? 'Vazia'}
    </span>
  )
}

type SelectedAnimal = { id: string; brinco: string | null; nome: string | null; categoria: string | null; status_reprodutivo?: string | null }

// ─── AnimalList (resultado da seleção) ──────────────────────────────────────

function AnimalList({ animals, onRemove }: { animals: SelectedAnimal[]; onRemove: (id: string) => void }) {
  if (!animals.length) return (
    <div className="border border-dashed rounded-lg py-6 text-center">
      <p className="text-sm text-muted-foreground">Nenhuma fêmea selecionada ainda.</p>
    </div>
  )
  return (
    <div className="border rounded-lg divide-y max-h-44 overflow-y-auto">
      {animals.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-3 py-2">
          <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
          <span className="text-sm text-muted-foreground flex-1 truncate">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── FemeasSelector ──────────────────────────────────────────────────────────

type SelectMode = 'individual' | 'grupo'

function FemeasSelector({
  femeas,
  lotes,
  selected,
  onAdd,
  onRemove,
}: {
  femeas: Femea[]
  lotes: Lote[]
  selected: SelectedAnimal[]
  onAdd: (animals: SelectedAnimal[]) => void
  onRemove: (id: string) => void
}) {
  const selectedIds = useMemo(() => new Set(selected.map(a => a.id)), [selected])
  const [mode, setMode] = useState<SelectMode>('individual')

  // ── Individual state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen]   = useState(false)

  // ── Grupo state ──
  const [grupoQuery, setGrupoQuery]         = useState('')
  const [grupoCategoria, setGrupoCategoria] = useState('')
  const [grupoLote, setGrupoLote]           = useState('')
  const [grupoStatus, setGrupoStatus]       = useState('')

  // Limpa estado intermediário ao trocar de modo (a lista consolidada não é afetada)
  useEffect(() => {
    setSearchQuery('')
    setSearchOpen(false)
    setGrupoQuery('')
    setGrupoCategoria('')
    setGrupoLote('')
    setGrupoStatus('')
  }, [mode])

  // ── Derived ──

  const categorias = useMemo(() => {
    const set = new Set(femeas.map(f => f.categoria).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [femeas])

  const femeasNaoSelecionadas = femeas.filter(f => !selectedIds.has(f.id))

  const searchFiltered = femeasNaoSelecionadas.filter(a => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q)
  }).slice(0, 40)

  const grupoFiltered = femeasNaoSelecionadas.filter(f => {
    if (grupoCategoria && f.categoria !== grupoCategoria) return false
    if (grupoLote && f.lote_atual_id !== grupoLote) return false
    if (grupoStatus && f.status_reprodutivo !== grupoStatus) return false
    if (grupoQuery) {
      const q = grupoQuery.toLowerCase()
      if (!f.brinco?.toLowerCase().includes(q) && !f.nome?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Handlers ──

  function handleIndividualAdd(a: Femea) {
    if (selectedIds.has(a.id)) return
    onAdd([{ id: a.id, brinco: a.brinco, nome: a.nome, categoria: a.categoria, status_reprodutivo: a.status_reprodutivo }])
    setSearchQuery('')
    setSearchOpen(false)
  }

  const MODES: { key: SelectMode; label: string }[] = [
    { key: 'individual', label: 'Individual' },
    { key: 'grupo',      label: 'Por grupo'  },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          Fêmeas{' '}
          <span className="text-muted-foreground font-normal">
            ({selected.length} selecionada{selected.length !== 1 ? 's' : ''})
          </span>
        </Label>
        {/* Mode switcher */}
        <div className="flex border rounded-md overflow-hidden text-xs">
          {MODES.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                mode === m.key
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Individual ── */}
      {mode === 'individual' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Buscar por brinco ou nome…"
            autoComplete="off"
            className="pl-9"
          />
          {searchOpen && (
            <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {searchFiltered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma fêmea encontrada.</p>
              ) : searchFiltered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={() => handleIndividualAdd(a)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3"
                >
                  <span className="font-mono font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                  <StatusBadge status={a.status_reprodutivo} />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {[a.nome, a.categoria].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Por Grupo — lado a lado ── */}
      {mode === 'grupo' && (
        <div className="space-y-2">
          {/* Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={grupoQuery}
                onChange={e => setGrupoQuery(e.target.value)}
                placeholder="Filtrar por brinco ou nome…"
                className="pl-9"
              />
            </div>
            {categorias.length > 0 && (
              <select
                value={grupoCategoria}
                onChange={e => setGrupoCategoria(e.target.value)}
                className={cn(SELECT_CLS, 'w-40 shrink-0')}
              >
                <option value="">Todas categorias</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {lotes.length > 0 && (
              <select
                value={grupoLote}
                onChange={e => setGrupoLote(e.target.value)}
                className={cn(SELECT_CLS, 'w-40 shrink-0')}
              >
                <option value="">Todos os lotes</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            )}
            <select
              value={grupoStatus}
              onChange={e => setGrupoStatus(e.target.value)}
              className={cn(SELECT_CLS, 'w-36 shrink-0')}
            >
              <option value="">Todos os status</option>
              <option value="Vazia">Vazia</option>
              <option value="Inseminada">Inseminada</option>
              <option value="Coberta">Coberta</option>
              <option value="Prenha">Prenha</option>
              <option value="Lactante">Lactante</option>
            </select>
          </div>

          {/* Painéis lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            {/* Esquerda — Disponíveis */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  Disponíveis ({grupoFiltered.length})
                </span>
                {grupoFiltered.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onAdd(grupoFiltered.map(f => ({ id: f.id, brinco: f.brinco, nome: f.nome, categoria: f.categoria, status_reprodutivo: f.status_reprodutivo })))}
                    className="text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    Adicionar todas
                  </button>
                )}
              </div>
              {grupoFiltered.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10 text-center px-3">
                  <p className="text-sm text-muted-foreground">
                    {femeasNaoSelecionadas.length === 0
                      ? 'Todas as fêmeas foram selecionadas.'
                      : 'Nenhuma fêmea com esses filtros.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto max-h-80">
                  {grupoFiltered.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onAdd([{ id: f.id, brinco: f.brinco, nome: f.nome, categoria: f.categoria, status_reprodutivo: f.status_reprodutivo }])}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left group"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-mono text-sm font-medium w-20 shrink-0">{f.brinco ?? '—'}</span>
                      <StatusBadge status={f.status_reprodutivo} />
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {[f.nome, f.categoria].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direita — Selecionadas */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  Selecionadas ({selected.length})
                </span>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { selected.forEach(a => onRemove(a.id)) }}
                    className="text-xs font-semibold text-foreground hover:text-destructive transition-colors"
                  >
                    Remover todas
                  </button>
                )}
              </div>
              {selected.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <p className="text-sm text-muted-foreground">Nenhuma fêmea selecionada.</p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto max-h-80">
                  {selected.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                      <StatusBadge status={a.status_reprodutivo} />
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(a.id)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista consolidada — só nos modos individual e lote */}
      {mode !== 'grupo' && <AnimalList animals={selected} onRemove={onRemove} />}
    </div>
  )
}

// ─── Inseminação form ────────────────────────────────────────────────────────

type Semen = {
  id: string
  nome_touro: string
  raca: string | null
  tipo: string
  apelido_codigo: string | null
}

type TouroAnimal = { id: string; brinco: string | null; nome: string | null }

export function InseminacaoForm({
  tenantSlug, femeas, lotes, semens, touros = [],
}: {
  tenantSlug: string
  femeas: Femea[]
  lotes: Lote[]
  semens: Semen[]
  touros?: TouroAnimal[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [animals, setAnimals]           = useState<SelectedAnimal[]>([])
  const [data, setData]                 = useState(today)
  const [tipo, setTipo]                 = useState('inseminacao')
  const [semenId, setSemenId]           = useState('')
  const [touroBusca, setTouroBusca]     = useState('')
  const [touroAnimalId, setTouroAnimalId] = useState('')
  const [touroDropOpen, setTouroDropOpen] = useState(false)
  const [responsavel, setResponsavel]   = useState('')
  const [protocolo, setProtocolo]       = useState('')
  const [obs, setObs]                   = useState('')
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  function handleAdd(batch: SelectedAnimal[]) {
    setAnimals(prev => {
      const existingIds = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !existingIds.has(a.id))]
    })
  }
  function handleRemove(id: string) { setAnimals(prev => prev.filter(a => a.id !== id)) }

  function handleTipoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setTipo(e.target.value)
    setSemenId('')
    setTouroBusca('')
    setTouroAnimalId('')
  }

  function handleSemenChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    setSemenId(id)
    const s = semens.find(s => s.id === id)
    setTouroBusca(s ? s.nome_touro : '')
    setTouroAnimalId('')
  }

  function selectTouroAnimal(t: TouroAnimal) {
    setTouroAnimalId(t.id)
    setTouroBusca([t.brinco, t.nome].filter(Boolean).join(' – '))
    setTouroDropOpen(false)
  }

  const tourosFiltrados = touros.filter(t => {
    if (!touroBusca || touroAnimalId) return true
    const q = touroBusca.toLowerCase()
    return t.brinco?.toLowerCase().includes(q) || t.nome?.toLowerCase().includes(q)
  }).slice(0, 10)

  function handleSubmit() {
    if (!animals.length) { setError('Adicione ao menos uma fêmea.'); return }
    if (!data) { setError('Data é obrigatória.'); return }
    setError('')
    startTransition(async () => {
      const result = await createEventosEmLote(
        tenantSlug,
        animals.map(a => a.id),
        {
          tipo,
          data,
          dados: {
            tipo_ia: tipo,
            ...(semenId           && { semen_id:       semenId }),
            ...(touroAnimalId     && { touro_animal_id: touroAnimalId }),
            ...(touroBusca.trim() && { nome_touro:      touroBusca.trim() }),
            ...(responsavel.trim() && { responsavel:    responsavel.trim() }),
            ...(protocolo.trim()   && { protocolo:      protocolo.trim() }),
          },
          observacoes: obs || undefined,
        }
      )
      if (result?.error) { setError(result.error); return }
      setSuccess(`${result.count} registro(s) criado(s).`)
      setAnimals([])
      setSemenId('')
      setTouroBusca('')
      setTouroAnimalId('')
      setObs('')
      router.refresh()
      setTimeout(() => setSuccess(''), 4000)
    })
  }

  const hasSemens = semens.length > 0
  // Campo de busca de touro (animal da fazenda ou texto livre)
  const touroField = (
    <div className="space-y-1.5 relative">
      <Label>
        {tipo === 'inseminacao' ? 'Nome do touro' : 'Touro'}{' '}
        <span className="text-muted-foreground font-normal">(opcional)</span>
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={touroBusca}
          onChange={e => { setTouroBusca(e.target.value); setTouroAnimalId(''); setTouroDropOpen(true) }}
          onFocus={() => setTouroDropOpen(true)}
          onBlur={() => setTimeout(() => setTouroDropOpen(false), 150)}
          placeholder={hasSemens && tipo === 'inseminacao' ? 'Buscar animal ou digitar nome…' : 'Buscar animal ou digitar nome…'}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {touroDropOpen && touros.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {tourosFiltrados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum macho encontrado.</p>
          ) : tourosFiltrados.map(t => (
            <button
              key={t.id}
              type="button"
              onMouseDown={() => selectTouroAnimal(t)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3"
            >
              <span className="font-mono font-medium w-20 shrink-0">{t.brinco ?? '—'}</span>
              <span className="text-xs text-muted-foreground truncate">{t.nome ?? '—'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Data + Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Data <span className="text-destructive">*</span></Label>
          <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <select value={tipo} onChange={handleTipoChange} className={SELECT_CLS}>
            <option value="inseminacao">Inseminação Artificial (IA)</option>
            <option value="monta_natural">Monta Natural</option>
          </select>
        </div>
      </div>

      {/* Sêmen + Touro (IA) ou apenas Touro (monta) */}
      {tipo === 'inseminacao' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>
              Sêmen{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <select value={semenId} onChange={handleSemenChange} className={SELECT_CLS} disabled={!hasSemens}>
              <option value="">{hasSemens ? 'Selecionar do cadastro…' : 'Nenhum sêmen cadastrado'}</option>
              {semens.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome_touro}
                  {s.apelido_codigo ? ` (${s.apelido_codigo})` : ''}
                  {s.raca ? ` · ${s.raca}` : ''}
                </option>
              ))}
            </select>
          </div>
          {touroField}
        </div>
      ) : (
        touroField
      )}

      {/* Responsável técnico + Protocolo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>
            Responsável técnico{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            value={responsavel}
            onChange={e => setResponsavel(e.target.value)}
            placeholder="Nome do veterinário ou técnico"
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Protocolo{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            value={protocolo}
            onChange={e => setProtocolo(e.target.value)}
            placeholder="ex: IATF 7 dias, GPE-CIDR…"
          />
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={2}
          placeholder="Observações adicionais…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <FemeasSelector
        femeas={femeas}
        lotes={lotes}
        selected={animals}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><Check className="h-4 w-4" />{success}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending || !animals.length} className="gap-2">
          <Plus className="h-4 w-4" />
          {isPending ? 'Salvando…' : `Registrar${animals.length > 0 ? ` (${animals.length})` : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Diagnóstico form ────────────────────────────────────────────────────────

function addDias(dateStr: string, dias: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function DiagnosticoForm({ tenantSlug, femeas, lotes }: { tenantSlug: string; femeas: Femea[]; lotes: Lote[] }) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [animals, setAnimals]           = useState<SelectedAnimal[]>([])
  const [data, setData]                 = useState(today)
  const [status, setStatus]             = useState('prenha')
  const [metodo, setMetodo]             = useState('ultrassom')
  const [diagClin, setDiagClin]         = useState('')
  const [dataCobertura, setDataCobertura] = useState('')
  const [previsaoParto, setPrevisaoParto] = useState('')
  const [obs, setObs]                   = useState('')
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  // Auto-suggest data_cobertura when a single prenha animal is selected
  useEffect(() => {
    if (status !== 'prenha' || animals.length !== 1) {
      setDataCobertura('')
      setPrevisaoParto('')
      return
    }
    const femea = femeas.find(f => f.id === animals[0].id)
    const sugerida = femea?.ultima_cobertura ?? ''
    if (sugerida) {
      setDataCobertura(sugerida)
      setPrevisaoParto(addDias(sugerida, 283))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, animals])

  function handleAdd(batch: SelectedAnimal[]) {
    setAnimals(prev => {
      const existingIds = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !existingIds.has(a.id))]
    })
  }
  function handleRemove(id: string) { setAnimals(prev => prev.filter(a => a.id !== id)) }

  function handleDataCoberturaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setDataCobertura(val)
    setPrevisaoParto(val ? addDias(val, 283) : '')
  }

  function handleSubmit() {
    if (!animals.length) { setError('Adicione ao menos uma fêmea.'); return }
    if (!data) { setError('Data é obrigatória.'); return }
    setError('')
    startTransition(async () => {
      const result = await createEventosEmLote(
        tenantSlug,
        animals.map(a => a.id),
        {
          tipo: 'diagnostico',
          data,
          dados: {
            status,
            metodo,
            diagnostico_clinico: diagClin || undefined,
            ...(dataCobertura && { data_cobertura: dataCobertura }),
            ...(previsaoParto  && { previsao_parto: previsaoParto }),
          },
          observacoes: obs || undefined,
        }
      )
      if (result?.error) { setError(result.error); return }
      setSuccess(`${result.count} diagnóstico(s) registrado(s).`)
      setAnimals([])
      setDiagClin('')
      setDataCobertura('')
      setPrevisaoParto('')
      setObs('')
      router.refresh()
      setTimeout(() => setSuccess(''), 4000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Data <span className="text-destructive">*</span></Label>
          <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Método</Label>
          <select value={metodo} onChange={e => setMetodo(e.target.value)} className={SELECT_CLS}>
            <option value="ultrassom">Ultrassom</option>
            <option value="toque">Toque</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Resultado <span className="text-destructive">*</span></Label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={SELECT_CLS}>
            <option value="prenha">Prenha</option>
            <option value="vazia">Vazia</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Diagnóstico clínico</Label>
          <Input
            value={diagClin}
            onChange={e => setDiagClin(e.target.value)}
            placeholder="ex: cisto, anestro, aborto…"
          />
        </div>
      </div>

      {status === 'prenha' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>
              Data da cobertura{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input type="date" value={dataCobertura} onChange={handleDataCoberturaChange} />
          </div>
          <div className="space-y-1.5">
            <Label>
              Previsão de parto{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input type="date" value={previsaoParto} onChange={e => setPrevisaoParto(e.target.value)} />
            <p className="text-xs text-muted-foreground">Calculada com base em 283 dias após a data de cobertura (9 meses e 10 dias).</p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={2}
          placeholder="Observações adicionais…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <FemeasSelector
        femeas={femeas}
        lotes={lotes}
        selected={animals}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><Check className="h-4 w-4" />{success}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending || !animals.length} className="gap-2">
          <Plus className="h-4 w-4" />
          {isPending ? 'Salvando…' : `Registrar${animals.length > 0 ? ` (${animals.length})` : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Parto form ──────────────────────────────────────────────────────────────

type Categoria = { id: string; nome: string; sexo: string }

export function PartoForm({
  tenantSlug, femeas, lotes = [], locais = [], categorias = [],
}: {
  tenantSlug: string
  femeas: Femea[]
  lotes?: Lote[]
  locais?: Local[]
  categorias?: Categoria[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery]           = useState('')
  const [dropOpen, setDropOpen]     = useState(false)
  const [data, setData]             = useState(today)
  const [tipoParto, setTipoParto]   = useState('unico')
  const [situacao, setSituacao]     = useState('vivo')
  const [sexo, setSexo]             = useState('M')
  const [criarBezerro, setCriarBezerro] = useState(false)
  const [obs, setObs]               = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  // Bezerro fields
  const [bezBrinco,      setBezBrinco]      = useState('')
  const [bezCategoriaId, setBezCategoriaId] = useState('')
  const [bezLoteId,      setBezLoteId]      = useState('')
  const [bezLocalId,     setBezLocalId]     = useState('')
  const [bezRaca,        setBezRaca]        = useState('')
  const [bezPesoNasc,    setBezPesoNasc]    = useState('')
  const [bezPesoData,    setBezPesoData]    = useState(today)

  const filtered = femeas.filter(a => {
    if (!query) return true
    const q = query.toLowerCase()
    return a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q)
  }).slice(0, 40)

  function selectFemea(a: Femea) {
    setSelectedId(a.id)
    setQuery([a.brinco, a.nome].filter(Boolean).join(' – '))
    setDropOpen(false)
    // Auto-suggest bezerro fields
    const year = data.slice(0, 4)
    setBezBrinco(a.brinco ? `${year}/${a.brinco}` : '')
    setBezLocalId(a.local_atual_id ?? '')
    setBezRaca(a.raca ?? '')
    setBezPesoData(data)
  }

  // Auto-select category when sexo changes
  useEffect(() => {
    const cat = categorias.find(c => c.sexo === sexo)
    setBezCategoriaId(cat?.id ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sexo])

  function handleSubmit() {
    if (!selectedId) { setError('Selecione a fêmea.'); return }
    if (!data) { setError('Data é obrigatória.'); return }
    setError('')
    startTransition(async () => {
      const pesoNum = bezPesoNasc ? parseFloat(bezPesoNasc.replace(',', '.')) : undefined
      const result = await createEvento(tenantSlug, {
        animal_id: selectedId,
        tipo: 'parto',
        data,
        dados: { tipo_parto: tipoParto, situacao, sexo_bezerro: sexo },
        observacoes: obs || undefined,
        criar_bezerro: criarBezerro,
        bezerro_sexo:        sexo,
        bezerro_brinco:      bezBrinco      || undefined,
        bezerro_categoria_id: bezCategoriaId || undefined,
        bezerro_lote_id:     bezLoteId      || undefined,
        bezerro_local_id:    bezLocalId     || undefined,
        bezerro_raca:        bezRaca        || undefined,
        bezerro_peso_nasc:   pesoNum,
        bezerro_peso_data:   bezPesoData    || undefined,
      })
      if (result?.error) { setError(result.error); return }
      setSuccess(criarBezerro ? 'Parto registrado e bezerro criado.' : 'Parto registrado.')
      setSelectedId('')
      setQuery('')
      setObs('')
      setCriarBezerro(false)
      setBezBrinco('')
      setBezCategoriaId('')
      setBezLoteId('')
      setBezLocalId('')
      setBezRaca('')
      setBezPesoNasc('')
      setBezPesoData(today)
      router.refresh()
      setTimeout(() => setSuccess(''), 4000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Fêmea (mãe) <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedId(''); setDropOpen(true) }}
            onFocus={() => setDropOpen(true)}
            onBlur={() => setTimeout(() => setDropOpen(false), 150)}
            placeholder="Buscar por brinco ou nome…"
            autoComplete="off"
            className="pl-9"
          />
          {dropOpen && (
            <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma fêmea encontrada.</p>
                : filtered.map(a => (
                  <button key={a.id} type="button" onMouseDown={() => selectFemea(a)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3">
                    <span className="font-mono font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                    <span className="text-xs text-muted-foreground truncate">{[a.nome, a.categoria].filter(Boolean).join(' · ')}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Data parto <span className="text-destructive">*</span></Label>
          <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <select value={tipoParto} onChange={e => setTipoParto(e.target.value)} className={SELECT_CLS}>
            <option value="unico">Único</option>
            <option value="gemeos">Gêmeos</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Situação</Label>
          <select value={situacao} onChange={e => setSituacao(e.target.value)} className={SELECT_CLS}>
            <option value="vivo">Vivo</option>
            <option value="morto">Morto</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Sexo do bezerro</Label>
          <select value={sexo} onChange={e => setSexo(e.target.value)} className={SELECT_CLS}>
            <option value="M">Macho</option>
            <option value="F">Fêmea</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="criar_bezerro"
          checked={criarBezerro}
          onChange={e => setCriarBezerro(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <label htmlFor="criar_bezerro" className="text-sm text-muted-foreground cursor-pointer">
          Criar bezerro automaticamente no sistema
        </label>
      </div>

      {criarBezerro && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do bezerro</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Brinco{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                value={bezBrinco}
                onChange={e => setBezBrinco(e.target.value)}
                placeholder={selectedId && femeas.find(f=>f.id===selectedId)?.brinco
                  ? `ex: ${data.slice(0,4)}/${femeas.find(f=>f.id===selectedId)?.brinco}`
                  : 'ex: 2026/1234'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select value={bezCategoriaId} onChange={e => setBezCategoriaId(e.target.value)} className={SELECT_CLS}>
                <option value="">Sem categoria</option>
                {categorias.filter(c => c.sexo === sexo).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Raça{' '}
                <span className="text-muted-foreground font-normal">(herdada da mãe)</span>
              </Label>
              <Input
                value={bezRaca}
                onChange={e => setBezRaca(e.target.value)}
                placeholder="ex: Nelore, Angus…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Local{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <select value={bezLocalId} onChange={e => setBezLocalId(e.target.value)} className={SELECT_CLS}>
                <option value="">Sem local</option>
                {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Lote{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <select value={bezLoteId} onChange={e => setBezLoteId(e.target.value)} className={SELECT_CLS}>
                <option value="">Sem lote</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Peso de nascimento (kg){' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={bezPesoNasc}
                onChange={e => setBezPesoNasc(e.target.value)}
                placeholder="ex: 32.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data da pesagem</Label>
              <Input
                type="date"
                value={bezPesoData}
                onChange={e => setBezPesoData(e.target.value)}
                disabled={!bezPesoNasc}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={2}
          placeholder="Observações sobre o parto…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><Check className="h-4 w-4" />{success}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending || !selectedId} className="gap-2">
          <Plus className="h-4 w-4" />
          {isPending ? 'Salvando…' : 'Registrar parto'}
        </Button>
      </div>
    </div>
  )
}

// ─── Aborto form ─────────────────────────────────────────────────────────────

export function AbortarForm({ tenantSlug, femeas, lotes }: { tenantSlug: string; femeas: Femea[]; lotes: Lote[] }) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [animals, setAnimals] = useState<SelectedAnimal[]>([])
  const [data, setData]       = useState(today)
  const [semanas, setSemanas] = useState('')
  const [causa, setCausa]     = useState('')
  const [obs, setObs]         = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  function handleAdd(batch: SelectedAnimal[]) {
    setAnimals(prev => {
      const ids = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !ids.has(a.id))]
    })
  }
  function handleRemove(id: string) { setAnimals(prev => prev.filter(a => a.id !== id)) }

  function handleSubmit() {
    if (!animals.length) { setError('Adicione ao menos uma fêmea.'); return }
    if (!data) { setError('Data é obrigatória.'); return }
    setError('')
    startTransition(async () => {
      const result = await createEventosEmLote(
        tenantSlug,
        animals.map(a => a.id),
        {
          tipo: 'aborto',
          data,
          dados: {
            ...(semanas && { semanas_gestacao: Number(semanas) }),
            ...(causa.trim() && { causa: causa.trim() }),
          },
          observacoes: obs || undefined,
        }
      )
      if (result?.error) { setError(result.error); return }
      setSuccess(`${result.count} aborto(s) registrado(s).`)
      setAnimals([])
      setSemanas('')
      setCausa('')
      setObs('')
      router.refresh()
      setTimeout(() => setSuccess(''), 4000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Data <span className="text-destructive">*</span></Label>
          <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>
            Semanas de gestação{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            type="number"
            min="1"
            max="42"
            value={semanas}
            onChange={e => setSemanas(e.target.value)}
            placeholder="ex: 12"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          Causa{' '}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          value={causa}
          onChange={e => setCausa(e.target.value)}
          placeholder="ex: brucelose, estresse, trauma, desconhecida…"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={2}
          placeholder="Observações adicionais…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <FemeasSelector
        femeas={femeas}
        lotes={lotes}
        selected={animals}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><Check className="h-4 w-4" />{success}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending || !animals.length} className="gap-2">
          <Plus className="h-4 w-4" />
          {isPending ? 'Salvando…' : `Registrar${animals.length > 0 ? ` (${animals.length})` : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Desmame form ────────────────────────────────────────────────────────────

export function DesmameForm({ tenantSlug, femeas, lotes }: { tenantSlug: string; femeas: Femea[]; lotes: Lote[] }) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [animals, setAnimals] = useState<SelectedAnimal[]>([])
  const [data, setData]       = useState(today)
  const [obs, setObs]         = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  function handleAdd(batch: SelectedAnimal[]) {
    setAnimals(prev => {
      const ids = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !ids.has(a.id))]
    })
  }
  function handleRemove(id: string) { setAnimals(prev => prev.filter(a => a.id !== id)) }

  function handleSubmit() {
    if (!animals.length) { setError('Adicione ao menos uma fêmea.'); return }
    if (!data) { setError('Data é obrigatória.'); return }
    setError('')
    startTransition(async () => {
      const result = await createEventosDesmameEmLote(
        tenantSlug,
        animals.map(a => a.id),
        { data, observacoes: obs || undefined }
      )
      if (result?.error) { setError(result.error); return }
      setSuccess(`${result.count} desmame(s) registrado(s). Redirecionando…`)
      setAnimals([])
      setObs('')
      setTimeout(() => { window.location.href = `/${tenantSlug}/manejo/reproducao` }, 1500)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Data <span className="text-destructive">*</span></Label>
        <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={2}
          placeholder="Observações adicionais…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      <FemeasSelector
        femeas={femeas}
        lotes={lotes}
        selected={animals}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><Check className="h-4 w-4" />{success}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending || !animals.length} className="gap-2">
          <Plus className="h-4 w-4" />
          {isPending ? 'Salvando…' : `Registrar${animals.length > 0 ? ` (${animals.length})` : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

const SUB_TABS = [
  { key: 'inseminacao', label: 'Inseminação / Monta' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'parto',       label: 'Parto' },
  { key: 'aborto',      label: 'Aborto' },
] as const
type SubTab = typeof SUB_TABS[number]['key']

export function RegistroView({ tenantSlug, femeas, lotes }: { tenantSlug: string; femeas: Femea[]; lotes: Lote[] }) {
  const [sub, setSub] = useState<SubTab>('inseminacao')

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      <div className="flex gap-1 border-b -mx-5 px-5">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              sub === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'inseminacao' && <InseminacaoForm tenantSlug={tenantSlug} femeas={femeas} lotes={lotes} semens={[]} />}
      {sub === 'diagnostico' && <DiagnosticoForm tenantSlug={tenantSlug} femeas={femeas} lotes={lotes} />}
      {sub === 'parto'       && <PartoForm       tenantSlug={tenantSlug} femeas={femeas} />}
      {sub === 'aborto'      && <AbortarForm     tenantSlug={tenantSlug} femeas={femeas} lotes={lotes} />}
    </div>
  )
}
