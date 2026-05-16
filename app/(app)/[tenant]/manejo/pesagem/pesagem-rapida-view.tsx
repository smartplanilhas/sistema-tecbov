'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Scale, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPesagem, deletePesagem, createAnotacao } from '../../animais/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  peso_atual: number | null
  data_peso_atual: string | null
  categoria: string | null
}

type HistoricoItem = {
  id: string
  peso: number
  data: string
  tipo: string
  created_at: string
  animal: {
    id: string
    brinco: string | null
    nome: string | null
    categoria: string | null
  } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const TIPO_LABEL: Record<string, string> = {
  controle:  'Controle',
  entrada:   'Entrada',
  saida:     'Saída',
  venda:     'Venda',
}

const TIPO_COLOR: Record<string, string> = {
  controle:  'bg-blue-50 text-blue-700',
  entrada:   'bg-green-50 text-green-700',
  saida:     'bg-orange-50 text-orange-700',
  venda:     'bg-purple-50 text-purple-700',
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

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PesagemRapidaView({
  tenantSlug,
  animals,
  historico,
}: {
  tenantSlug: string
  animals: Animal[]
  historico: HistoricoItem[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]

  const [isPending, startTransition] = useTransition()
  const [query, setQuery]           = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [dropOpen, setDropOpen]     = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState<{ label: string; peso: string } | null>(null)
  const [formKey, setFormKey]       = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pesoInput, setPesoInput]   = useState('')
  const [dataInput, setDataInput]   = useState(today)
  const [obsInput, setObsInput]     = useState('')

  const selected = animals.find(a => a.id === selectedId)

  const filtered = animals.filter(a => {
    if (!query) return true
    const q = query.toLowerCase()
    return a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q)
  }).slice(0, 40)

  // Cálculo live: ganho e GMD em relação à última pesagem
  const novoPeso = parseFloat(pesoInput)
  const gain = selected?.peso_atual != null && novoPeso > 0
    ? novoPeso - selected.peso_atual
    : null
  const diasGain = selected?.data_peso_atual && dataInput
    ? Math.round((new Date(dataInput).getTime() - new Date(selected.data_peso_atual + 'T12:00:00').getTime()) / 86_400_000)
    : null
  const gmd = gain != null && diasGain != null && diasGain > 0
    ? gain / diasGain
    : null

  function selectAnimal(a: Animal) {
    setSelectedId(a.id)
    setQuery([a.brinco, a.nome].filter(Boolean).join(' – '))
    setDropOpen(false)
    setSuccess(null)
    setPesoInput('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedId) { setError('Selecione um animal.'); return }
    const fd = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      const result = await createPesagem(tenantSlug, selectedId, fd)
      if (result?.error) { setError(result.error); return }

      if (obsInput.trim()) {
        const anotFd = new FormData()
        anotFd.set('texto', obsInput.trim())
        anotFd.set('data', fd.get('data') as string)
        anotFd.set('tipo', 'pesagem')
        await createAnotacao(tenantSlug, selectedId, anotFd)
      }

      const pesoVal = fd.get('peso') as string
      setSuccess({ label: query, peso: `${pesoVal} kg` })
      setFormKey(k => k + 1)
      setSelectedId('')
      setQuery('')
      setPesoInput('')
      setDataInput(today)
      setObsInput('')
      router.refresh()
    })
  }

  function handleDelete(pesagemId: string) {
    if (!confirm('Excluir esta pesagem?')) return
    setDeletingId(pesagemId)
    startTransition(async () => {
      await deletePesagem(tenantSlug, pesagemId)
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Formulário ── */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          Registrar pesagem
        </h2>

        {success && (
          <div className="mb-3 flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            <span><strong>{success.label}</strong> — {success.peso} registrado.</span>
          </div>
        )}

        <form key={formKey} onSubmit={handleSubmit} className="space-y-3">
          {/* Linha única em desktop, empilha em mobile */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Animal — full width em mobile, proporcional em desktop */}
            <div className="space-y-1.5 w-full lg:flex-[3] lg:w-auto lg:min-w-0 relative">
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
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum animal encontrado.</p>
                  ) : filtered.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onMouseDown={() => selectAnimal(a)}
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

            {/* Data + Peso — lado a lado em mobile, proporcionais em desktop */}
            <div className="space-y-1.5 flex-1 min-w-[130px] lg:flex-[2] lg:min-w-0">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                name="data"
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 flex-1 min-w-[110px] lg:flex-[2] lg:min-w-0">
              <Label>Peso (kg) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                name="peso"
                step="0.001"
                min="1"
                placeholder="0.000"
                value={pesoInput}
                onChange={e => setPesoInput(e.target.value)}
                required
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5 flex-1 min-w-[120px] lg:flex-[2] lg:min-w-0">
              <Label>Tipo</Label>
              <select name="tipo" defaultValue="controle" className={SELECT_CLS}>
                <option value="controle">Controle</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="venda">Venda</option>
              </select>
            </div>

            {/* Submit */}
            <div className="space-y-1.5 w-full lg:w-auto lg:shrink-0">
              <Label className="hidden lg:block invisible">.</Label>
              <Button type="submit" disabled={isPending} className="gap-2 h-9 w-full lg:w-auto whitespace-nowrap">
                <Scale className="h-4 w-4" />
                {isPending ? 'Salvando…' : 'Registrar'}
              </Button>
            </div>
          </div>

          {/* Observação opcional */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Observação <span className="text-xs font-normal">(opcional)</span></Label>
            <textarea
              value={obsInput}
              onChange={e => setObsInput(e.target.value)}
              rows={2}
              placeholder="Anote algo sobre o animal durante esta pesagem…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Info linha: último peso + comparação */}
          {selected && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm px-1">
              <span className="text-muted-foreground">
                Último peso: <strong>{fmt(selected.peso_atual)} kg</strong> em {fmtDate(selected.data_peso_atual)}
              </span>
              {gain != null && (
                <>
                  <span className={`font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {gain >= 0 ? '+' : ''}{fmt(gain)} kg
                  </span>
                  {gmd != null && diasGain != null && (
                    <span className={`font-semibold ${gmd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      GMD {gmd >= 0 ? '+' : ''}{fmt(gmd, 3)} kg/d ({diasGain}d)
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </div>

      {/* ── Histórico ── */}
      {historico.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="text-base font-semibold">Últimas pesagens</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {historico.length} registro{historico.length !== 1 ? 's' : ''} mais recentes
            </p>
          </div>
          <div className="divide-y">
            {historico.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                {/* Animal */}
                <div className="flex-1 min-w-0">
                  {p.animal ? (
                    <Link
                      href={`/${tenantSlug}/animais/${p.animal.id}`}
                      className="font-mono font-medium text-sm hover:underline"
                    >
                      {p.animal.brinco ?? '—'}
                    </Link>
                  ) : (
                    <span className="font-mono font-medium text-sm text-muted-foreground">—</span>
                  )}
                  {p.animal?.nome && (
                    <p className="text-xs text-muted-foreground truncate">{p.animal.nome}</p>
                  )}
                  {p.animal?.categoria && (
                    <p className="text-xs text-muted-foreground">{p.animal.categoria}</p>
                  )}
                </div>

                {/* Peso */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{fmt(p.peso)} kg</p>
                  <p className="text-xs text-muted-foreground">{(p.peso / 15).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @</p>
                </div>

                {/* Data */}
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm text-muted-foreground">{fmtDate(p.data)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(p.created_at).split(', ')[1]}</p>
                </div>

                {/* Tipo */}
                <div className="shrink-0">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[p.tipo] ?? 'bg-muted text-muted-foreground'}`}>
                    {TIPO_LABEL[p.tipo] ?? p.tipo}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="shrink-0 p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                  title="Excluir pesagem"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
