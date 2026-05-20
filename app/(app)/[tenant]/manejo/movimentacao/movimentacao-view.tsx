'use client'

import { useState, useTransition } from 'react'
import { ArrowLeftRight, Tag, Tags, Check, Search, ArrowRight, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { moverAnimais } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  lote_atual_id: string | null
  local_atual_id: string | null
  proprietario_id: string | null
  categoria: string | null
}

type Lote  = { id: string; nome: string }
type Local = { id: string; nome: string; tipo: string | null }
type Prop  = { id: string; nome: string }

type HistoricoItem = {
  id: string
  tipo: string
  data: string
  grupo_id: string | null
  created_at: string
  observacoes: string | null
  animals: { id: string; brinco: string | null; nome: string | null } | null
  lote_anterior: { nome: string } | null
  lote_novo: { nome: string } | null
  local_anterior: { nome: string } | null
  local_novo: { nome: string } | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SELECT_CLS        = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
const FILTER_SELECT_CLS = 'h-8 w-28 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0'

const TIPO_LABEL: Record<string, string> = {
  mudanca_lote:       'Mudança de lote',
  mudanca_local:      'Mudança de local',
  mudanca_lote_local: 'Mudança de lote e local',
}

const TIPO_COLOR: Record<string, string> = {
  mudanca_lote:       'bg-blue-50 text-blue-700',
  mudanca_local:      'bg-purple-50 text-purple-700',
  mudanca_lote_local: 'bg-orange-50 text-orange-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function animalLabel(a: { brinco: string | null; nome: string | null } | null) {
  if (!a) return '—'
  return [a.brinco, a.nome].filter(Boolean).join(' – ') || '—'
}

// ─── Seção de destino (lote / local / proprietário) ───────────────────────────

function DestinoFields({
  lotes, locais, proprietarios,
  novoLote, novoLocal, novoProp,
  onLote, onLocal, onProp,
}: {
  lotes: Lote[]
  locais: Local[]
  proprietarios: Prop[]
  novoLote: string
  novoLocal: string
  novoProp: string
  onLote: (v: string) => void
  onLocal: (v: string) => void
  onProp:  (v: string) => void
}) {
  return (
    <div className="space-y-3 pt-3 border-t">
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Destino</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Novo lote</Label>
          <select value={novoLote} onChange={e => onLote(e.target.value)} className={SELECT_CLS}>
            <option value="">Não alterar</option>
            <option value="_limpar">— Sem lote —</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Novo local</Label>
          <select value={novoLocal} onChange={e => onLocal(e.target.value)} className={SELECT_CLS}>
            <option value="">Não alterar</option>
            <option value="_limpar">— Sem local —</option>
            {locais.map(l => (
              <option key={l.id} value={l.id}>
                {l.nome}{l.tipo ? ` (${l.tipo})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Novo proprietário</Label>
          <select value={novoProp} onChange={e => onProp(e.target.value)} className={SELECT_CLS}>
            <option value="">Não alterar</option>
            <option value="_limpar">— Sem proprietário —</option>
            {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Modo = 'individual' | 'grupo'

export function MovimentacaoView({
  tenantSlug, animais, lotes, locais, proprietarios, historico,
}: {
  tenantSlug: string
  animais: Animal[]
  lotes: Lote[]
  locais: Local[]
  proprietarios: Prop[]
  historico: HistoricoItem[]
}) {
  const today  = new Date().toISOString().split('T')[0]

  const [isPending, startTransition] = useTransition()
  const [modo, setModo]             = useState<Modo | null>(null)

  // Individual
  const [query, setQuery]           = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [dropOpen, setDropOpen]     = useState(false)

  // Grupo
  const [grupoSearch, setGrupoSearch]       = useState('')
  const [selectedIds, setSelectedIds]       = useState<string[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroLote, setFiltroLote]           = useState('')
  const [filtroLocal, setFiltroLocal]         = useState('')
  const [filtroProp, setFiltroProp]           = useState('')

  // Shared destino + form fields
  const [novoLote, setNovoLote]     = useState('')
  const [novoLocal, setNovoLocal]   = useState('')
  const [novoProp,  setNovoProp]    = useState('')
  const [dataInput, setDataInput]   = useState(today)
  const [obsInput,  setObsInput]    = useState('')

  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const loteName  = (id: string | null) => id ? (lotes.find(l => l.id === id)?.nome ?? '?') : null
  const localName = (id: string | null) => id ? (locais.find(l => l.id === id)?.nome ?? '?') : null
  const propName  = (id: string | null) => id ? (proprietarios.find(p => p.id === id)?.nome ?? '?') : null

  const selectedAnimal = animais.find(a => a.id === selectedId)

  const filteredIndividual = animais.filter(a => {
    if (!query) return true
    const q = query.toLowerCase()
    return a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q)
  }).slice(0, 40)

  const categorias = [...new Set(animais.map(a => a.categoria).filter(Boolean))].sort() as string[]

  const filteredGrupo = animais.filter(a => {
    if (grupoSearch) {
      const q = grupoSearch.toLowerCase()
      if (!a.brinco?.toLowerCase().includes(q) && !a.nome?.toLowerCase().includes(q)) return false
    }
    if (filtroCategoria && a.categoria !== filtroCategoria) return false
    if (filtroLote      && a.lote_atual_id !== filtroLote)  return false
    if (filtroLocal     && a.local_atual_id !== filtroLocal) return false
    if (filtroProp      && a.proprietario_id !== filtroProp) return false
    return true
  })

  function resetForm() {
    setSelectedId(''); setQuery('')
    setSelectedIds([]); setGrupoSearch('')
    setFiltroCategoria(''); setFiltroLote(''); setFiltroLocal(''); setFiltroProp('')
    setNovoLote(''); setNovoLocal(''); setNovoProp('')
    setObsInput('')
    setDataInput(today)
  }

  function toggleModo(m: Modo) {
    setModo(prev => prev === m ? null : m)
    resetForm()
    setError(''); setSuccess(null)
  }

  function toggleAnimal(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedIds(filteredGrupo.map(a => a.id))
  }

  function clearAll() {
    setSelectedIds([])
  }

  function handleSubmit() {
    const ids = modo === 'individual' ? (selectedId ? [selectedId] : []) : selectedIds
    if (!ids.length) { setError('Selecione ao menos um animal.'); return }
    if (!novoLote && !novoLocal && !novoProp) {
      setError('Selecione ao menos um campo de destino para alterar.'); return
    }
    setError('')
    setSuccess(null)
    startTransition(async () => {
      const result = await moverAnimais(tenantSlug, {
        animalIds: ids,
        novoLote,
        novoLocal,
        novoProprietario: novoProp,
        data: dataInput,
        observacoes: obsInput,
      })
      if (result?.error) { setError(result.error); return }
      window.location.href = `/${tenantSlug}/manejo/movimentacao`
    })
  }

  // ── Historico agrupado ─────────────────────────────────────────────────────

  const grupoMap = new Map<string, HistoricoItem[]>()
  historico.forEach(m => {
    const key = m.grupo_id ?? m.id
    if (!grupoMap.has(key)) grupoMap.set(key, [])
    grupoMap.get(key)!.push(m)
  })
  const historicoGrupos = Array.from(grupoMap.values())
    .sort((a, b) => b[0].created_at.localeCompare(a[0].created_at))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Botões de modo */}
      <div className="flex gap-3 justify-end">
        <Button
          variant={modo === 'individual' ? 'default' : 'outline'}
          onClick={() => toggleModo('individual')}
          className="gap-2"
        >
          <Tag className="h-4 w-4" />
          Individual
        </Button>
        <Button
          variant={modo === 'grupo' ? 'default' : 'outline'}
          onClick={() => toggleModo('grupo')}
          className="gap-2"
        >
          <Tags className="h-4 w-4" />
          Em grupo
        </Button>
      </div>

      {/* Historico — oculto quando formulário está aberto */}
      {!modo && historicoGrupos.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="text-base font-semibold">Últimas movimentações</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {historicoGrupos.length} registro{historicoGrupos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y">
            {historicoGrupos.map(grupo => {
              const first    = grupo[0]
              const isGroup  = grupo.length > 1
              const loteStr  = first.lote_anterior?.nome || first.lote_novo?.nome ? true : false
              const localStr = first.local_anterior?.nome || first.local_novo?.nome ? true : false

              return (
                <div key={first.grupo_id ?? first.id} className="flex items-start gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                  {/* Animal(is) */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {isGroup
                        ? `${grupo.length} animais`
                        : animalLabel(first.animals)}
                    </p>
                    {isGroup && (
                      <p className="text-xs text-muted-foreground truncate">
                        {grupo.slice(0, 3).map(m => m.animals?.brinco ?? '—').join(', ')}
                        {grupo.length > 3 ? ` +${grupo.length - 3}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Lote antes → depois */}
                  {loteStr && (
                    <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <span>{first.lote_anterior?.nome ?? '—'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium text-foreground">{first.lote_novo?.nome ?? '—'}</span>
                    </div>
                  )}

                  {/* Local antes → depois */}
                  {localStr && (
                    <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <span>{first.local_anterior?.nome ?? '—'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium text-foreground">{first.local_novo?.nome ?? '—'}</span>
                    </div>
                  )}

                  {/* Tipo + Data */}
                  <div className="shrink-0 text-right">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[first.tipo] ?? 'bg-muted text-muted-foreground'}`}>
                      {TIPO_LABEL[first.tipo] ?? first.tipo}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{fmtDate(first.data)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Formulário individual */}
      {modo === 'individual' && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            Movimentação individual
          </h2>

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Animal typeahead */}
          <div className="space-y-1.5 relative">
            <Label>Animal <span className="text-destructive">*</span></Label>
            <Input
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedId(''); setDropOpen(true) }}
              onFocus={() => setDropOpen(true)}
              onBlur={() => setTimeout(() => setDropOpen(false), 150)}
              placeholder="Brinco ou nome…"
              autoComplete="off"
            />
            {dropOpen && (
              <div className="absolute z-20 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
                {filteredIndividual.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
                ) : filteredIndividual.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onMouseDown={() => {
                      setSelectedId(a.id)
                      setQuery([a.brinco, a.nome].filter(Boolean).join(' – '))
                      setDropOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center gap-3"
                  >
                    <span className="font-mono font-medium">{a.brinco ?? '—'}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[a.nome, a.categoria].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estado atual do animal selecionado */}
          {selectedAnimal && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm px-1">
              <span className="text-muted-foreground">
                Lote: <strong>{loteName(selectedAnimal.lote_atual_id) ?? '—'}</strong>
              </span>
              <span className="text-muted-foreground">
                Local: <strong>{localName(selectedAnimal.local_atual_id) ?? '—'}</strong>
              </span>
              <span className="text-muted-foreground">
                Proprietário: <strong>{propName(selectedAnimal.proprietario_id) ?? '—'}</strong>
              </span>
            </div>
          )}

          <DestinoFields
            lotes={lotes} locais={locais} proprietarios={proprietarios}
            novoLote={novoLote} novoLocal={novoLocal} novoProp={novoProp}
            onLote={setNovoLote} onLocal={setNovoLocal} onProp={setNovoProp}
          />

          {/* Data + Observação + Submit */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-[3] min-w-[200px]">
              <Label className="text-muted-foreground">Observação <span className="text-xs font-normal">(opcional)</span></Label>
              <Input
                value={obsInput}
                onChange={e => setObsInput(e.target.value)}
                placeholder="Motivo da movimentação…"
              />
            </div>
            <div className="space-y-1.5 shrink-0">
              <Label className="hidden lg:block invisible">.</Label>
              <Button onClick={handleSubmit} disabled={isPending} className="gap-2 h-9 whitespace-nowrap">
                <ArrowLeftRight className="h-4 w-4" />
                {isPending ? 'Salvando…' : 'Registrar'}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {/* Formulário grupo */}
      {modo === 'grupo' && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            Movimentação em grupo
          </h2>

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <DestinoFields
            lotes={lotes} locais={locais} proprietarios={proprietarios}
            novoLote={novoLote} novoLocal={novoLocal} novoProp={novoProp}
            onLote={setNovoLote} onLocal={setNovoLocal} onProp={setNovoProp}
          />

          {/* Data + Observação + Submit */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-[3] min-w-[200px]">
              <Label className="text-muted-foreground">Observação <span className="text-xs font-normal">(opcional)</span></Label>
              <Input
                value={obsInput}
                onChange={e => setObsInput(e.target.value)}
                placeholder="Motivo da movimentação…"
              />
            </div>
            <div className="space-y-1.5 shrink-0">
              <Label className="hidden lg:block invisible">.</Label>
              <Button
                onClick={handleSubmit}
                disabled={isPending || selectedIds.length === 0}
                className="gap-2 h-9 whitespace-nowrap"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {isPending ? 'Salvando…' : `Registrar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Busca + lista de animais */}
          <div className="space-y-2 pt-3 border-t">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Animais</p>

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="relative w-36 shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <Input
                  value={grupoSearch}
                  onChange={e => setGrupoSearch(e.target.value)}
                  placeholder="Brinco / nome"
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className={FILTER_SELECT_CLS}>
                <option value="">Categoria</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filtroLote} onChange={e => setFiltroLote(e.target.value)} className={FILTER_SELECT_CLS}>
                <option value="">Lote</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
              <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)} className={FILTER_SELECT_CLS}>
                <option value="">Local</option>
                {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
              <select value={filtroProp} onChange={e => setFiltroProp(e.target.value)} className={FILTER_SELECT_CLS}>
                <option value="">Proprietário</option>
                {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline whitespace-nowrap"
              >
                [Selecionar tudo]
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:underline whitespace-nowrap"
                >
                  Limpar ({selectedIds.length})
                </button>
              )}
            </div>

            <div className="border rounded-md max-h-64 overflow-y-auto">
              {filteredGrupo.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum animal encontrado.</p>
              ) : filteredGrupo.map(a => {
                const isSel = selectedIds.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAnimal(a.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b last:border-0 transition-colors ${isSel ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSel ? 'bg-primary border-primary' : 'border-input'}`}>
                      {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="font-mono font-medium text-sm">{a.brinco ?? '—'}</span>
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {[a.nome, a.categoria].filter(Boolean).join(' · ')}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {[loteName(a.lote_atual_id), localName(a.local_atual_id)].filter(Boolean).join(' • ')}
                    </span>
                  </button>
                )
              })}
            </div>

            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} animal(is) selecionado(s) de {animais.length}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
