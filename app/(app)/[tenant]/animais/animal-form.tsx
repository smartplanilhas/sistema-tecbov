'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { createAnimal, updateAnimal } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Fazenda   = { id: string; nome: string }
export type Categoria = { id: string; nome: string; sexo: string | null; ordem: number }
export type Raca      = { id: string; nome: string }
export type Lote          = { id: string; nome: string }
export type Local         = { id: string; nome: string }
export type Proprietario  = { id: string; nome: string }
export type AnimalRef = { id: string; brinco: string | null; nome: string | null; categoria: string | null; sexo: string }
export type AnimalData = {
  id: string
  fazenda_id: string
  categoria_id: string | null
  sexo: string
  brinco: string | null
  identificador: string | null
  sisbov: string | null
  registro: string | null
  rfid: string | null
  nome: string | null
  raca_id: string | null
  origem: string | null
  status: string
  lote_atual_id: string | null
  local_atual_id: string | null
  data_nascimento: string | null
  data_compra: string | null
  data_entrada: string | null
  data_saida: string | null
  data_desmama: string | null
  pai_id: string | null
  mae_id: string | null
  proprietario_id: string | null
  pelagem: string | null
  observacoes: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Geral', 'Registro', 'Genealogia'] as const
type Tab = typeof TABS[number]

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ─── Animal search combobox (for pai/mãe) ─────────────────────────────────────

function AnimalSearch({
  label,
  name,
  animals,
  sexoFilter,
  defaultId,
  defaultLabel,
}: {
  label: string
  name: string
  animals: AnimalRef[]
  sexoFilter: 'M' | 'F'
  defaultId?: string | null
  defaultLabel?: string | null
}) {
  const pool = animals.filter(a => a.sexo === sexoFilter)
  const [query, setQuery]       = useState(defaultLabel ?? '')
  const [selectedId, setSelectedId] = useState(defaultId ?? '')
  const [open, setOpen]         = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = pool.filter(a =>
    !query || a.brinco?.toLowerCase().includes(query.toLowerCase()) || a.nome?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 30)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(a: AnimalRef) {
    setSelectedId(a.id)
    setQuery([a.brinco, a.nome].filter(Boolean).join(' – '))
    setOpen(false)
  }

  function clear() { setSelectedId(''); setQuery('') }

  return (
    <div className="space-y-1.5" ref={ref}>
      <Label>{label}</Label>
      <input type="hidden" name={name} value={selectedId} />
      <div className="relative">
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedId(''); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={`Buscar por brinco ou nome (${sexoFilter === 'M' ? 'macho' : 'fêmea'})…`}
          autoComplete="off"
        />
        {selectedId && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
            {filtered.map(a => (
              <button
                key={a.id}
                type="button"
                onMouseDown={() => select(a)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center gap-3"
              >
                <span className="font-mono font-medium">{a.brinco ?? '—'}</span>
                <span className="text-xs text-muted-foreground truncate">{[a.nome, a.categoria].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}
        {open && !filtered.length && query.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-background border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
            Nenhum animal encontrado.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function AnimalForm({
  tenantSlug,
  fazendas,
  categorias,
  racas,
  lotes,
  locais,
  proprietarios,
  allAnimals,
  animal,
}: {
  tenantSlug: string
  fazendas: Fazenda[]
  categorias: Categoria[]
  racas: Raca[]
  lotes: Lote[]
  locais: Local[]
  proprietarios: Proprietario[]
  allAnimals: AnimalRef[]
  animal?: AnimalData
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError]   = useState('')
  const [tab, setTab]       = useState<Tab>('Geral')
  const [sexo, setSexo]     = useState(animal?.sexo ?? '')
  const [catId, setCatId]   = useState(animal?.categoria_id ?? '')
  const [comPeso, setComPeso] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const tabIndex = TABS.indexOf(tab)
  const isEditing = !!animal

  // Derive pai/mae labels for genealogy tab defaults
  const paiLabel = animal?.pai_id ? allAnimals.find(a => a.id === animal.pai_id) : null
  const maeLabel = animal?.mae_id ? allAnimals.find(a => a.id === animal.mae_id) : null

  function handleCatChange(id: string) {
    setCatId(id)
    const cat = categorias.find(c => c.id === id)
    if (cat?.sexo) setSexo(cat.sexo)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sexo) { setError('Selecione uma categoria para definir o sexo.'); return }
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isEditing
        ? await updateAnimal(tenantSlug, animal.id, fd)
        : await createAnimal(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      router.push(`/${tenantSlug}/animais`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="sexo" value={sexo} />
      {fazendas.length === 1 && <input type="hidden" name="fazenda_id" value={fazendas[0].id} />}

      {/* Tab headers */}
      <div className="flex rounded-lg border overflow-hidden text-sm w-fit">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-2 font-medium transition-colors ${
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Geral ── */}
      <div className={tab === 'Geral' ? 'space-y-5' : 'hidden'}>
          {fazendas.length > 1 && (
            <Field label="Fazenda" required>
              <select name="fazenda_id" required defaultValue={animal?.fazenda_id ?? ''} className={SELECT_CLS}>
                <option value="">Selecione</option>
                {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Brinco">
              <Input name="brinco" defaultValue={animal?.brinco ?? ''} placeholder="Número do brinco" />
            </Field>
            <Field label="Identificador">
              <Input name="identificador" defaultValue={animal?.identificador ?? ''} placeholder="Código interno" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria" required>
              <select
                name="categoria_id"
                value={catId}
                onChange={e => handleCatChange(e.target.value)}
                required
                className={SELECT_CLS}
              >
                <option value="">Selecione</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Raça">
              <select name="raca_id" defaultValue={animal?.raca_id ?? ''} className={SELECT_CLS}>
                <option value="">Sem raça</option>
                {racas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <select name="status" defaultValue={animal?.status ?? 'ativo'} className={SELECT_CLS}>
                <option value="ativo">Ativo</option>
                <option value="vendido">Vendido</option>
                <option value="morto">Morto</option>
                <option value="transferido">Transferido</option>
              </select>
            </Field>
            <Field label="Nome do animal">
              <Input name="nome" defaultValue={animal?.nome ?? ''} placeholder="Apelido ou nome" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lote">
              <select name="lote_atual_id" defaultValue={animal?.lote_atual_id ?? ''} className={SELECT_CLS}>
                <option value="">Sem lote</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </Field>
            <Field label="Local">
              <select name="local_atual_id" defaultValue={animal?.local_atual_id ?? ''} className={SELECT_CLS}>
                <option value="">Sem local</option>
                {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Proprietário">
            <select name="proprietario_id" defaultValue={animal?.proprietario_id ?? ''} className={SELECT_CLS}>
              <option value="">Sem proprietário</option>
              {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>

          <Field label="Observações">
            <textarea
              name="observacoes"
              rows={3}
              defaultValue={animal?.observacoes ?? ''}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Informações adicionais…"
            />
          </Field>

          {/* Peso inicial — apenas no cadastro */}
          {!isEditing && (
            <div className={`rounded-lg border p-4 space-y-3 transition-colors ${comPeso ? 'border-primary/30 bg-primary/5' : 'border-dashed'}`}>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={comPeso}
                  onChange={e => setComPeso(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-primary"
                />
                <span className="text-sm font-medium">Informar peso inicial</span>
              </label>
              {comPeso && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Field label="Peso (kg)" required>
                    <Input
                      type="number"
                      name="peso_inicial"
                      step="0.001"
                      min="1"
                      placeholder="0.000"
                      required
                    />
                  </Field>
                  <Field label="Data da pesagem" required>
                    <Input
                      type="date"
                      name="data_peso_inicial"
                      defaultValue={today}
                      required
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
      </div>

      {/* ── Tab: Registro ── */}
      <div className={tab === 'Registro' ? 'space-y-5' : 'hidden'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="SISBOV">
              <Input name="sisbov" defaultValue={animal?.sisbov ?? ''} placeholder="Código SISBOV" />
            </Field>
            <Field label="Registro">
              <Input name="registro" defaultValue={animal?.registro ?? ''} placeholder="Registro oficial" />
            </Field>
            <Field label="RFID">
              <Input name="rfid" defaultValue={animal?.rfid ?? ''} placeholder="Chip eletrônico" />
            </Field>
            <Field label="Origem">
              <select name="origem" defaultValue={animal?.origem ?? ''} className={SELECT_CLS}>
                <option value="">Não informado</option>
                <option value="compra">Compra</option>
                <option value="nascimento">Nascimento</option>
                <option value="transferencia">Transferência</option>
              </select>
            </Field>
          </div>

          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide pt-1">Datas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nascimento">
              <Input type="date" name="data_nascimento" defaultValue={animal?.data_nascimento ?? ''} />
            </Field>
            <Field label="Compra">
              <Input type="date" name="data_compra" defaultValue={animal?.data_compra ?? ''} />
            </Field>
            <Field label="Entrada na fazenda">
              <Input type="date" name="data_entrada" defaultValue={animal?.data_entrada ?? ''} />
            </Field>
            <Field label="Saída">
              <Input type="date" name="data_saida" defaultValue={animal?.data_saida ?? ''} />
            </Field>
            <Field label="Desmama">
              <Input type="date" name="data_desmama" defaultValue={animal?.data_desmama ?? ''} />
            </Field>
          </div>
      </div>

      {/* ── Tab: Genealogia ── */}
      <div className={tab === 'Genealogia' ? 'space-y-6' : 'hidden'}>
          <p className="text-sm text-muted-foreground">
            Selecione os pais deste animal pesquisando pelo brinco ou nome.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AnimalSearch
              label="Pai"
              name="pai_id"
              animals={allAnimals.filter(a => a.id !== animal?.id)}
              sexoFilter="M"
              defaultId={animal?.pai_id}
              defaultLabel={paiLabel ? [paiLabel.brinco, paiLabel.nome].filter(Boolean).join(' – ') : null}
            />
            <AnimalSearch
              label="Mãe"
              name="mae_id"
              animals={allAnimals.filter(a => a.id !== animal?.id)}
              sexoFilter="F"
              defaultId={animal?.mae_id}
              defaultLabel={maeLabel ? [maeLabel.brinco, maeLabel.nome].filter(Boolean).join(' – ') : null}
            />
          </div>
          <Field label="Pelagem">
            <Input name="pelagem" defaultValue={animal?.pelagem ?? ''} placeholder="Ex: Vermelho, Preto…" />
          </Field>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Footer navigation */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex gap-2">
          {tabIndex > 0 && (
            <Button type="button" variant="outline" onClick={() => setTab(TABS[tabIndex - 1])} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> {TABS[tabIndex - 1]}
            </Button>
          )}
          {tabIndex < TABS.length - 1 && (
            <Button type="button" variant="outline" onClick={() => setTab(TABS[tabIndex + 1])} className="gap-1">
              {TABS[tabIndex + 1]} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/${tenantSlug}/animais`)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="gap-2">
            <Save className="h-4 w-4" />
            {pending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar animal'}
          </Button>
        </div>
      </div>
    </form>
  )
}
