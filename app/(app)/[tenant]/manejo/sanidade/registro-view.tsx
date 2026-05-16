'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Plus, X, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEventosSanidadeEmLote } from './actions'

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  categoria: string | null
  sexo: string | null
  lote_atual_id: string | null
}

export type Lote = { id: string; nome: string }
export type Medicamento = { id: string; nome: string; unidade: string | null }

type SelectedAnimal = { id: string; brinco: string | null; nome: string | null; categoria: string | null; sexo: string | null }
type SelectMode = 'individual' | 'grupo'

// ─── AnimalList ──────────────────────────────────────────────────────────────

function AnimalList({ animals, onRemove }: { animals: SelectedAnimal[]; onRemove: (id: string) => void }) {
  if (!animals.length) return (
    <div className="border border-dashed rounded-lg py-6 text-center">
      <p className="text-sm text-muted-foreground">Nenhum animal selecionado ainda.</p>
    </div>
  )
  return (
    <div className="border rounded-lg divide-y max-h-44 overflow-y-auto">
      {animals.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-3 py-2">
          <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
          <span className="text-sm text-muted-foreground flex-1 truncate">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
          <span className="text-xs text-muted-foreground shrink-0">{a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : ''}</span>
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

// ─── AnimaisSelector ─────────────────────────────────────────────────────────

function AnimaisSelector({
  animais,
  lotes,
  selected,
  onAdd,
  onRemove,
}: {
  animais: Animal[]
  lotes: Lote[]
  selected: SelectedAnimal[]
  onAdd: (animals: SelectedAnimal[]) => void
  onRemove: (id: string) => void
}) {
  const selectedIds = useMemo(() => new Set(selected.map(a => a.id)), [selected])
  const [mode, setMode] = useState<SelectMode>('individual')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen]   = useState(false)

  const [grupoQuery, setGrupoQuery]         = useState('')
  const [grupoCategoria, setGrupoCategoria] = useState('')
  const [grupoLote, setGrupoLote]           = useState('')
  const [grupoSexo, setGrupoSexo]           = useState('')

  useEffect(() => {
    setSearchQuery('')
    setSearchOpen(false)
    setGrupoQuery('')
    setGrupoCategoria('')
    setGrupoLote('')
    setGrupoSexo('')
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
          Animais{' '}
          <span className="text-muted-foreground font-normal">
            ({selected.length} selecionado{selected.length !== 1 ? 's' : ''})
          </span>
        </Label>
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
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
              ) : searchFiltered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={() => handleIndividualAdd(a)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3"
                >
                  <span className="font-mono font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{a.sexo === 'M' ? 'Macho' : 'Fêmea'}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {[a.nome, a.categoria].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'grupo' && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={grupoQuery}
                onChange={e => setGrupoQuery(e.target.value)}
                placeholder="Filtrar por brinco ou nome…"
                className="pl-9"
              />
            </div>
            {categorias.length > 0 && (
              <select value={grupoCategoria} onChange={e => setGrupoCategoria(e.target.value)} className={cn(SELECT_CLS, 'w-40 shrink-0')}>
                <option value="">Todas categorias</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {lotes.length > 0 && (
              <select value={grupoLote} onChange={e => setGrupoLote(e.target.value)} className={cn(SELECT_CLS, 'w-40 shrink-0')}>
                <option value="">Todos os lotes</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            )}
            <select value={grupoSexo} onChange={e => setGrupoSexo(e.target.value)} className={cn(SELECT_CLS, 'w-32 shrink-0')}>
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
                  <button type="button" onClick={() => onAdd(grupoFiltered.map(toSelected))} className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
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
                <div className="divide-y overflow-y-auto max-h-80">
                  {grupoFiltered.map(a => (
                    <button key={a.id} type="button" onClick={() => onAdd([toSelected(a)])}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left group">
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{a.sexo === 'M' ? 'M' : 'F'}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Selecionados ({selected.length})</span>
                {selected.length > 0 && (
                  <button type="button" onClick={() => { selected.forEach(a => onRemove(a.id)) }} className="text-xs font-semibold text-foreground hover:text-destructive transition-colors">
                    Remover todos
                  </button>
                )}
              </div>
              {selected.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <p className="text-sm text-muted-foreground">Nenhum animal selecionado.</p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto max-h-80">
                  {selected.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{a.sexo === 'M' ? 'M' : 'F'}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                      <button type="button" onClick={() => onRemove(a.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
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

      {mode !== 'grupo' && <AnimalList animals={selected} onRemove={onRemove} />}
    </div>
  )
}

// ─── SanidadeForm ─────────────────────────────────────────────────────────────

type MedItem = { medicamento_id: string; nome: string; unidade: string; quantidade: string }

const TIPO_OPTIONS = [
  { value: 'vacinacao',    label: 'Vacinação'    },
  { value: 'vermifugacao', label: 'Vermifugação' },
  { value: 'medicacao',    label: 'Medicação'    },
  { value: 'procedimento', label: 'Procedimento' },
  { value: 'exame',        label: 'Exame'        },
  { value: 'outro',        label: 'Outro'        },
]

export function SanidadeForm({
  tenantSlug,
  animais,
  lotes,
  medicamentos,
}: {
  tenantSlug: string
  animais: Animal[]
  lotes: Lote[]
  medicamentos: Medicamento[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()

  const [animals, setAnimals]         = useState<SelectedAnimal[]>([])
  const [data, setData]               = useState(today)
  const [tipo, setTipo]               = useState('vacinacao')
  const [descricao, setDescricao]     = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [obs, setObs]                 = useState('')
  const [medItems, setMedItems]       = useState<MedItem[]>([])
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  function handleAdd(batch: SelectedAnimal[]) {
    setAnimals(prev => {
      const ids = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !ids.has(a.id))]
    })
  }
  function handleRemove(id: string) { setAnimals(prev => prev.filter(a => a.id !== id)) }

  function addMedItem() { setMedItems(prev => [...prev, { medicamento_id: '', nome: '', unidade: '', quantidade: '' }]) }
  function removeMedItem(idx: number) { setMedItems(prev => prev.filter((_, i) => i !== idx)) }
  function updateMedItem(idx: number, field: keyof MedItem, value: string) {
    setMedItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      if (field === 'medicamento_id') {
        const med = medicamentos.find(m => m.id === value)
        return { ...item, medicamento_id: value, nome: med?.nome ?? '', unidade: med?.unidade ?? '' }
      }
      return { ...item, [field]: value }
    }))
  }

  function handleSubmit() {
    if (!animals.length) { setError('Adicione ao menos um animal.'); return }
    if (!data) { setError('Data é obrigatória.'); return }
    if (!descricao.trim()) { setError('Descrição é obrigatória.'); return }
    setError('')

    const medicamentosValidos = medItems.filter(m => m.medicamento_id)

    startTransition(async () => {
      const result = await createEventosSanidadeEmLote(
        tenantSlug,
        animals.map(a => a.id),
        {
          tipo,
          data,
          descricao: descricao.trim(),
          observacoes: obs || undefined,
          dados: {
            ...(medicamentosValidos.length && { medicamentos: medicamentosValidos }),
            ...(responsavel.trim() && { responsavel: responsavel.trim() }),
          },
        }
      )
      if (result?.error) { setError(result.error); return }
      setSuccess(`${result.count} registro(s) criado(s).`)
      setAnimals([])
      setDescricao('')
      setResponsavel('')
      setObs('')
      setMedItems([])
      router.refresh()
      setTimeout(() => setSuccess(''), 4000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Data + Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Data <span className="text-destructive">*</span></Label>
          <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo <span className="text-destructive">*</span></Label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={SELECT_CLS}>
            {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label>Descrição <span className="text-destructive">*</span></Label>
        <Input
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="ex: Vacinação contra Febre Aftosa, Vermifugação preventiva…"
        />
      </div>

      {/* Medicamentos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Medicamentos aplicados{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
        </div>
        {medItems.length > 0 && (
          <div className="space-y-2">
            {medItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={item.medicamento_id}
                  onChange={e => updateMedItem(idx, 'medicamento_id', e.target.value)}
                  className={cn(SELECT_CLS, 'flex-1')}
                >
                  <option value="">Selecionar medicamento…</option>
                  {medicamentos.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome}{m.unidade ? ` (${m.unidade})` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    value={item.quantidade}
                    onChange={e => updateMedItem(idx, 'quantidade', e.target.value)}
                    placeholder="Qtd."
                    className="w-24"
                  />
                  {item.unidade && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{item.unidade}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMedItem(idx)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addMedItem}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar medicamento
        </button>
      </div>

      {/* Responsável */}
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

      <AnimaisSelector
        animais={animais}
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
