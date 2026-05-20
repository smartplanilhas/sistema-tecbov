'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, Plus, X, Search, ShoppingCart, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registrarVendaAnimais } from './actions'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  peso_atual: number | null
}

type Lote      = { id: string; nome: string }
type Account   = { id: string; name: string }
type Comprador = { id: string; name: string }

type SelectMode = 'individual' | 'grupo'
type TipoPreco  = 'por_animal' | 'por_kg'
type TipoPagto  = 'avista' | 'parcelado'
type TipoComiss = 'none' | 'percent' | 'valor'

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function fmt(v: number, dec = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ n: _, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

// ─── AnimaisSelector ─────────────────────────────────────────────────────────

function AnimaisSelector({
  animais, lotes, selected, pesos, onAdd, onRemove, onPesoChange,
}: {
  animais: Animal[]
  lotes: Lote[]
  selected: SelectedAnimal[]
  pesos: Record<string, string>
  onAdd: (animals: SelectedAnimal[]) => void
  onRemove: (id: string) => void
  onPesoChange: (id: string, value: string) => void
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
    return { id: a.id, brinco: a.brinco, nome: a.nome, categoria: a.categoria, sexo: a.sexo, peso_atual: a.peso_atual }
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
                      {a.peso_atual != null && <span className="text-xs text-muted-foreground shrink-0">{a.peso_atual} kg</span>}
                    </button>
                  ))}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {selected.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="font-mono text-sm font-medium w-20 shrink-0">{a.brinco ?? '—'}</span>
                  <span className="text-sm text-muted-foreground flex-1 truncate">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                  <Input type="number" step="0.1" min="0"
                    placeholder={a.peso_atual ? `${a.peso_atual}` : 'kg saída'}
                    value={pesos[a.id] ?? ''} onChange={e => onPesoChange(a.id, e.target.value)}
                    className="h-7 w-24 text-xs text-right shrink-0"
                  />
                  <button type="button" onClick={() => onRemove(a.id)}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
                <div className="divide-y overflow-y-auto max-h-80">
                  {grupoFiltered.map(a => (
                    <button key={a.id} type="button" onClick={() => onAdd([toSelected(a)])}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/5 transition-colors text-left group">
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-mono text-sm font-medium w-16 shrink-0">{a.brinco ?? '—'}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                      {a.peso_atual != null && <span className="text-xs text-muted-foreground shrink-0">{a.peso_atual} kg</span>}
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
                <div className="divide-y overflow-y-auto max-h-80">
                  {selected.map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-2">
                      <span className="font-mono text-sm font-medium w-16 shrink-0">{a.brinco ?? '—'}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">{[a.nome, a.categoria].filter(Boolean).join(' · ') || '—'}</span>
                      <Input type="number" step="0.1" min="0"
                        placeholder={a.peso_atual ? `${a.peso_atual}` : 'kg'}
                        value={pesos[a.id] ?? ''} onChange={e => onPesoChange(a.id, e.target.value)}
                        className="h-7 w-20 text-xs text-right shrink-0"
                      />
                      <button type="button" onClick={() => onRemove(a.id)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Peso de saída é opcional — registrado como pesagem no histórico do animal.</p>
        </div>
      )}
    </div>
  )
}

// ─── VendaAnimaisView ─────────────────────────────────────────────────────────

export function VendaAnimaisView({
  tenantSlug, animais, lotes, accounts, compradores,
}: {
  tenantSlug: string
  animais: Animal[]
  lotes: Lote[]
  accounts: Account[]
  compradores: Comprador[]
}) {
  const today = new Date().toISOString().slice(0, 10)

  // ── Seção 1: Dados da venda ──────────────────────────────────────
  const [data, setData]               = useState(today)
  const [referencia, setReferencia]   = useState('')
  const [compradorId, setCompradorId] = useState('')

  // ── Seção 2: Preço ───────────────────────────────────────────────
  const [tipoPreco, setTipoPreco]     = useState<TipoPreco>('por_animal')
  const [qtdManual, setQtdManual]     = useState('')
  const [precoUnit, setPrecoUnit]     = useState('')
  const [precoKg, setPrecoKg]         = useState('')
  const [valorFrete, setValorFrete]   = useState('')
  const [tipoComiss, setTipoComiss]   = useState<TipoComiss>('none')
  const [percComiss, setPercComiss]   = useState('')
  const [valorComiss, setValorComiss] = useState('')

  // ── Seção 3: Animais ─────────────────────────────────────────────
  const [identificarAnimais, setIdentificarAnimais] = useState(false)
  const [selected, setSelected]       = useState<SelectedAnimal[]>([])
  const [pesos, setPesos]             = useState<Record<string, string>>({})

  // ── Seção 4: Pagamento ───────────────────────────────────────────
  const [comFinanceiro, setComFinanceiro] = useState(false)
  const [accountId, setAccountId]     = useState(accounts[0]?.id ?? '')
  const [tipoPagto, setTipoPagto]     = useState<TipoPagto>('avista')
  const [jaRecebido, setJaRecebido]   = useState(true)
  const [numParcelas, setNumParcelas] = useState('2')
  const [dataParcela1, setDataParcela1] = useState(today)
  const [obs, setObs]                 = useState('')

  // ── Estado de submit ─────────────────────────────────────────────
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  // ── Cálculos ─────────────────────────────────────────────────────
  const totalPesoKg = useMemo(() => selected.reduce((sum, a) => {
    const p = pesos[a.id] ? parseFloat(pesos[a.id]) : (a.peso_atual ?? 0)
    return sum + (p || 0)
  }, 0), [selected, pesos])

  const arrobas = totalPesoKg > 0 ? totalPesoKg / 15 : null

  const quantidade = tipoPreco === 'por_animal' ? (parseInt(qtdManual) || 0) : null

  const subtotal = useMemo(() => {
    if (tipoPreco === 'por_animal') {
      return (parseInt(qtdManual) || 0) * (parseFloat(precoUnit) || 0)
    } else {
      return totalPesoKg * (parseFloat(precoKg) || 0)
    }
  }, [tipoPreco, qtdManual, precoUnit, precoKg, totalPesoKg])

  const freteNum = parseFloat(valorFrete) || 0

  const comissaoNum = useMemo(() => {
    if (tipoComiss === 'percent') return subtotal * (parseFloat(percComiss) || 0) / 100
    if (tipoComiss === 'valor') return parseFloat(valorComiss) || 0
    return 0
  }, [tipoComiss, percComiss, valorComiss, subtotal])

  const total = subtotal + freteNum - comissaoNum

  // Parcelas preview
  const parcelasNum = parseInt(numParcelas) || 2
  const parcelaDates = useMemo(() => {
    if (tipoPagto !== 'parcelado' || !dataParcela1) return []
    return Array.from({ length: parcelasNum }, (_, i) => {
      const d = new Date(dataParcela1 + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [tipoPagto, parcelasNum, dataParcela1])

  // ── Handlers ─────────────────────────────────────────────────────
  function handleAdd(batch: SelectedAnimal[]) {
    setSelected(prev => {
      const ids = new Set(prev.map(a => a.id))
      return [...prev, ...batch.filter(a => !ids.has(a.id))]
    })
  }
  function handleRemove(id: string) {
    setSelected(prev => prev.filter(a => a.id !== id))
    setPesos(prev => { const n = { ...prev }; delete n[id]; return n })
  }
  function handlePesoChange(id: string, v: string) {
    setPesos(prev => ({ ...prev, [id]: v }))
  }

  function handleSubmit() {
    if (comFinanceiro && !accountId) { setError('Selecione a conta bancária.'); return }

    // Validação de divergência entre quantidade digitada e animais identificados
    if (identificarAnimais && selected.length > 0 && qtdManual) {
      const qtdDigitada = parseInt(qtdManual) || 0
      if (qtdDigitada !== selected.length) {
        const ok = window.confirm(
          `A quantidade digitada (${qtdDigitada}) é diferente dos animais identificados (${selected.length}). Deseja registrar mesmo assim?`
        )
        if (!ok) return
      }
    }

    setSaving(true); setError('')

    const pesosPorAnimal: Record<string, number> = {}
    for (const [id, p] of Object.entries(pesos)) {
      const v = parseFloat(p)
      if (v > 0) pesosPorAnimal[id] = v
    }

    startTransition(async () => {
      const res = await registrarVendaAnimais(tenantSlug, {
        animalIds:           identificarAnimais ? selected.map(a => a.id) : [],
        data,
        referencia:          referencia || null,
        compradorId:         compradorId || null,
        pesosPorAnimal:      Object.keys(pesosPorAnimal).length ? pesosPorAnimal : undefined,
        tipoPreco,
        valorTotal:          total > 0 ? total : null,
        valorFrete:          freteNum > 0 ? freteNum : null,
        valorComissao:       comissaoNum > 0 ? comissaoNum : null,
        accountId:           comFinanceiro ? accountId : undefined,
        parcelas:            comFinanceiro && tipoPagto === 'parcelado' ? parcelasNum : 1,
        dataPrimeiraParcela: comFinanceiro && tipoPagto === 'parcelado' ? dataParcela1 : data,
        statusPagamento:     comFinanceiro && tipoPagto === 'avista' && jaRecebido ? 'COMPLETED' : 'PENDING',
        observacoes:         comFinanceiro ? obs || null : null,
      })
      if (res.error) { setError(res.error); setSaving(false); return }
      window.location.href = `/${tenantSlug}/negociacao/venda`
    })
  }

  const canSubmit = !!data && (!comFinanceiro || !!accountId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link href={`/${tenantSlug}/negociacao/venda`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Vendas
        </Link>
        <h1 className="text-2xl font-bold mt-1">Nova Venda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Preencha as seções abaixo e registre a negociação.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Coluna esquerda: seções ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 1. Dados da venda */}
          <Section n={1} title="Dados da venda">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data da venda <span className="text-destructive">*</span></Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Referência <span className="text-muted-foreground font-normal text-xs">— NF, pedido, etc.</span></Label>
                <Input placeholder="Ex: NF-001, Pedido #42…" value={referencia} onChange={e => setReferencia(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Comprador <span className="text-muted-foreground font-normal text-xs">— opcional</span></Label>
              <Select value={compradorId} onValueChange={setCompradorId}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {compradores.length === 0
                    ? <p className="px-2 py-4 text-xs text-center text-muted-foreground">Nenhum cliente cadastrado</p>
                    : compradores.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* 2. Preço */}
          <Section n={2} title="Precificação">
            {/* Tipo de preço */}
            <div className="space-y-1.5">
              <Label>Tipo de preço</Label>
              <div className="flex gap-2">
                {([['por_animal', 'Por animal (R$/cabeça)'], ['por_kg', 'Por peso (R$/kg)']] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setTipoPreco(v)}
                    className={cn('flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      tipoPreco === v
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    )}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Por animal */}
            {tipoPreco === 'por_animal' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <Input type="number" min="1" placeholder="Qtd. de cabeças"
                    value={qtdManual} onChange={e => setQtdManual(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço por cabeça (R$)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="Ex: 3.200,00"
                    value={precoUnit} onChange={e => setPrecoUnit(e.target.value)} />
                </div>
              </div>
            )}

            {/* Por kg */}
            {tipoPreco === 'por_kg' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Peso total (kg)</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    {totalPesoKg > 0
                      ? <>{totalPesoKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg{arrobas ? ` · ~${fmt(arrobas, 1)} @` : ''}</>
                      : 'Informe os pesos na seção de animais'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Preço por kg (R$)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="Ex: 12,50"
                    value={precoKg} onChange={e => setPrecoKg(e.target.value)} />
                </div>
              </div>
            )}

            {/* Frete e Comissão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Frete (R$) <span className="text-muted-foreground font-normal text-xs">— opcional</span></Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00"
                  value={valorFrete} onChange={e => setValorFrete(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Comissão <span className="text-muted-foreground font-normal text-xs">— opcional</span></Label>
                <div className="flex gap-2">
                  <select value={tipoComiss} onChange={e => setTipoComiss(e.target.value as TipoComiss)}
                    className={cn(SELECT_CLS, 'w-32 shrink-0')}>
                    <option value="none">Nenhuma</option>
                    <option value="percent">Percentual (%)</option>
                    <option value="valor">Valor (R$)</option>
                  </select>
                  {tipoComiss === 'percent' && (
                    <Input type="number" step="0.01" min="0" max="100" placeholder="Ex: 3"
                      value={percComiss} onChange={e => setPercComiss(e.target.value)} />
                  )}
                  {tipoComiss === 'valor' && (
                    <Input type="number" step="0.01" min="0" placeholder="Ex: 500,00"
                      value={valorComiss} onChange={e => setValorComiss(e.target.value)} />
                  )}
                </div>
              </div>
            </div>

            {/* Mini-resumo da seção */}
            {subtotal > 0 && (
              <div className="rounded-lg bg-muted/30 border px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {fmt(subtotal)}</span>
                </div>
                {freteNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Frete</span>
                    <span>R$ {fmt(freteNum)}</span>
                  </div>
                )}
                {comissaoNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>− Comissão</span>
                    <span>R$ {fmt(comissaoNum)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Total</span>
                  <span>R$ {fmt(total)}</span>
                </div>
              </div>
            )}
          </Section>

          {/* Identificação dos animais */}
          <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="identificar_animais"
                type="checkbox"
                checked={identificarAnimais}
                onChange={e => {
                  setIdentificarAnimais(e.target.checked)
                  if (!e.target.checked) { setSelected([]); setPesos({}) }
                }}
                className="h-4 w-4 accent-primary rounded"
              />
              <label htmlFor="identificar_animais" className="text-sm font-semibold cursor-pointer">
                Identificar animais vendidos
              </label>
            </div>

            {identificarAnimais && (
              <AnimaisSelector
                animais={animais} lotes={lotes} selected={selected} pesos={pesos}
                onAdd={handleAdd} onRemove={handleRemove} onPesoChange={handlePesoChange}
              />
            )}
          </div>

          {/* 4. Pagamento */}
          <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="com_financeiro"
                type="checkbox"
                checked={comFinanceiro}
                onChange={e => setComFinanceiro(e.target.checked)}
                className="h-4 w-4 accent-primary rounded"
              />
              <label htmlFor="com_financeiro" className="text-sm font-semibold cursor-pointer">
                Registrar lançamento financeiro
              </label>
            </div>

          {comFinanceiro && <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Conta bancária <span className="text-destructive">*</span></Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Condição de pagamento</Label>
                <div className="flex gap-2">
                  {([['avista', 'À vista'], ['parcelado', 'Parcelado']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setTipoPagto(v)}
                      className={cn('flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                        tipoPagto === v
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {tipoPagto === 'avista' && (
                <div className="flex items-center gap-3">
                  <Label className="shrink-0">Status</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={jaRecebido}
                    onClick={() => setJaRecebido(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      jaRecebido ? 'bg-green-500' : 'bg-input'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                      jaRecebido ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                  <span className={`text-sm font-medium ${jaRecebido ? 'text-green-700' : 'text-amber-600'}`}>
                    {jaRecebido ? 'Recebido' : 'Pendente'}
                  </span>
                </div>
              )}

              {tipoPagto === 'parcelado' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Número de parcelas</Label>
                      <select value={numParcelas} onChange={e => setNumParcelas(e.target.value)} className={SELECT_CLS}>
                        {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data da 1ª parcela</Label>
                      <Input type="date" value={dataParcela1} onChange={e => setDataParcela1(e.target.value)} />
                    </div>
                  </div>

                  {parcelaDates.length > 0 && total > 0 && (
                    <div className="rounded-lg border bg-muted/20 divide-y text-sm">
                      {parcelaDates.map((d, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <span className="text-muted-foreground">Parcela {i + 1}/{parcelasNum}</span>
                          <span className="text-muted-foreground">{fmtDate(d)}</span>
                          <span className="font-medium">R$ {fmt(total / parcelasNum)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Observações <span className="text-muted-foreground font-normal text-xs">— opcional</span></Label>
                <Input placeholder="Condições, forma de pagamento, contato…"
                  value={obs} onChange={e => setObs(e.target.value)} />
              </div>
            </div>}
          </div>

          {error && <p className="text-sm text-destructive px-1">{error}</p>}

          <div className="flex justify-end pb-6">
            <Button size="lg" disabled={saving || !canSubmit} onClick={handleSubmit}>
              {saving ? 'Registrando…' : `Registrar venda${selected.length ? ` (${selected.length} animais)` : ''}`}
            </Button>
          </div>
        </div>

        {/* ── Resumo sticky ─────────────────────────────────────── */}
        <div className="rounded-xl border bg-card p-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Resumo da venda</h2>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Animais selecionados</span>
              <span className="font-medium">{selected.length}</span>
            </div>
            {tipoPreco === 'por_animal' && quantidade !== null && quantidade > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qtd. para preço</span>
                <span>{quantidade} cabeças</span>
              </div>
            )}
            {tipoPreco === 'por_kg' && totalPesoKg > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso total</span>
                <span>{totalPesoKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span>
              </div>
            )}
            {arrobas && arrobas > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrobas (~)</span>
                <span>{fmt(arrobas, 1)} @</span>
              </div>
            )}
          </div>

          {subtotal > 0 && (
            <div className="space-y-1.5 text-sm border-t pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>R$ {fmt(subtotal)}</span>
              </div>
              {freteNum > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>+ Frete</span>
                  <span>R$ {fmt(freteNum)}</span>
                </div>
              )}
              {comissaoNum > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>− Comissão</span>
                  <span>R$ {fmt(comissaoNum)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                <span>Total</span>
                <span>R$ {fmt(total)}</span>
              </div>
              {tipoPagto === 'parcelado' && parcelasNum > 1 && (
                <p className="text-xs text-muted-foreground text-right">
                  {parcelasNum}x de R$ {fmt(total / parcelasNum)}
                </p>
              )}
            </div>
          )}

          {subtotal === 0 && (
            <p className="text-xs text-muted-foreground">
              Preencha a seção de preço para ver o resumo financeiro.
            </p>
          )}

          {tipoPagto === 'avista' && (
            <div className={cn('flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5',
              jaRecebido ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700')}>
              {jaRecebido
                ? <><Check className="h-3 w-3" /> Marcado como recebido</>
                : 'Lançado como a receber'}
            </div>
          )}
          {tipoPagto === 'parcelado' && (
            <div className="flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 bg-blue-50 text-blue-700">
              {parcelasNum}x · Lançado como a receber
            </div>
          )}

          <Button className="w-full" disabled={saving || !canSubmit} onClick={handleSubmit}>
            {saving ? 'Registrando…' : `Registrar venda${selected.length ? ` (${selected.length})` : ''}`}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground text-center">
              {!data ? 'Informe a data da venda' : comFinanceiro && !accountId ? 'Selecione a conta bancária' : ''}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
