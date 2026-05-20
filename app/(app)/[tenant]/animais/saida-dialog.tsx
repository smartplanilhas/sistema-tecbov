'use client'

import { useState, useTransition } from 'react'
import { LogOut, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { registrarSaida, registrarSaidaLote } from './saida-actions'

type Tipo = 'vendido' | 'abatido' | 'doado' | 'extraviado'

const TIPO_OPTS: { value: Tipo; label: string }[] = [
  { value: 'vendido',   label: 'Venda'     },
  { value: 'abatido',   label: 'Abate'     },
  { value: 'doado',     label: 'Doação'    },
  { value: 'extraviado', label: 'Extraviado' },
]

type Account  = { id: string; name: string }
type Comprador = { id: string; name: string }

// ─── Individual ────────────────────────────────────────────────────────────────

export function SaidaAnimalButton({
  tenantSlug,
  animal,
  accounts,
  compradores,
}: {
  tenantSlug: string
  animal: { id: string; brinco: string | null; nome: string | null }
  accounts: Account[]
  compradores: Comprador[]
}) {
  const [open, setOpen]         = useState(false)
  const [tipo, setTipo]         = useState<Tipo>('vendido')
  const [data, setData]         = useState(new Date().toISOString().slice(0, 10))
  const [peso, setPeso]         = useState('')
  const [valor, setValor]       = useState('')
  const [compradorId, setCompradorId] = useState('')
  const [accountId, setAccountId]     = useState(accounts[0]?.id ?? '')
  const [obs, setObs]           = useState('')
  const [error, setError]       = useState('')
  const [, startTransition]     = useTransition()
  const [saving, setSaving]     = useState(false)

  const label = [animal.brinco, animal.nome].filter(Boolean).join(' – ') || 'Animal'

  function handleSubmit() {
    setSaving(true)
    setError('')
    startTransition(async () => {
      const res = await registrarSaida(tenantSlug, {
        animalId:    animal.id,
        tipo,
        data,
        pesoFinal:   peso ? parseFloat(peso) : null,
        valorVenda:  valor ? parseFloat(valor) : null,
        compradorId: compradorId || null,
        accountId:   accountId || null,
        observacoes: obs || null,
      })
      if (res.error) {
        setError(res.error)
        setSaving(false)
        return
      }
      setOpen(false)
      window.location.href = `/${tenantSlug}/animais/${animal.id}`
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 shrink-0 border-red-200 text-red-700 hover:bg-red-50" onClick={() => setOpen(true)}>
        <LogOut className="h-3.5 w-3.5" /> Dar Saída
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Saída — {label}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Tipo + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de saída</Label>
                <Select value={tipo} onValueChange={v => setTipo(v as Tipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de saída</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
            </div>

            {/* Peso final */}
            <div className="space-y-1.5">
              <Label>Peso na saída (kg) <span className="text-muted-foreground font-normal">— opcional</span></Label>
              <Input
                type="number" step="0.1" min="0"
                placeholder="Ex: 480"
                value={peso}
                onChange={e => setPeso(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Registrado como pesagem de saída; atualiza GMD automaticamente.</p>
            </div>

            {/* Financeiro — só para venda */}
            {tipo === 'vendido' && (
              <div className="space-y-3 rounded-lg border border-blue-200/60 bg-blue-50/40 p-3">
                <p className="text-xs font-medium text-blue-800">Lançamento financeiro <span className="font-normal text-muted-foreground">— opcional</span></p>

                <div className="space-y-1.5">
                  <Label className="text-sm">Valor de venda (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    placeholder="Ex: 3200,00"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Comprador</Label>
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

                <div className="space-y-1.5">
                  <Label className="text-sm">Conta bancária</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações <span className="text-muted-foreground font-normal">— opcional</span></Label>
              <Input placeholder="Motivo, destino…" value={obs} onChange={e => setObs(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !data}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? 'Registrando…' : 'Confirmar saída'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Lote (batch) ──────────────────────────────────────────────────────────────

type AnimalLote = {
  id: string
  brinco: string | null
  nome: string | null
  peso_atual: number | null
}

export function SaidaLoteButton({
  tenantSlug,
  lote,
  animais,
  accounts,
  compradores,
}: {
  tenantSlug: string
  lote: { id: string; nome: string; status: string }
  animais: AnimalLote[]
  accounts: Account[]
  compradores: Comprador[]
}) {
  const ativos = animais.filter(a => (a as any).status === 'ativo')

  const [open, setOpen]         = useState(false)
  const [tipo, setTipo]         = useState<Tipo>('vendido')
  const [data, setData]         = useState(new Date().toISOString().slice(0, 10))
  const [selected, setSelected] = useState<Set<string>>(() => new Set(ativos.map(a => a.id)))
  const [pesos, setPesos]       = useState<Record<string, string>>({})
  const [valor, setValor]       = useState('')
  const [compradorId, setCompradorId]   = useState('')
  const [accountId, setAccountId]       = useState(accounts[0]?.id ?? '')
  const [encerrarLote, setEncerrarLote] = useState(true)
  const [obs, setObs]           = useState('')
  const [error, setError]       = useState('')
  const [, startTransition]     = useTransition()
  const [saving, setSaving]     = useState(false)

  if (lote.status === 'encerrado' || ativos.length === 0) return null

  function toggleAll() {
    if (selected.size === ativos.length) setSelected(new Set())
    else setSelected(new Set(ativos.map(a => a.id)))
  }

  function toggleAnimal(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSubmit() {
    if (!selected.size) return
    setSaving(true)
    setError('')
    startTransition(async () => {
      const pesosPorAnimal: Record<string, number> = {}
      for (const [id, p] of Object.entries(pesos)) {
        const v = parseFloat(p)
        if (v > 0) pesosPorAnimal[id] = v
      }
      const res = await registrarSaidaLote(tenantSlug, {
        loteId:      lote.id,
        animalIds:   [...selected],
        tipo,
        data,
        pesosPorAnimal: Object.keys(pesosPorAnimal).length ? pesosPorAnimal : undefined,
        valorTotal:  valor ? parseFloat(valor) : null,
        compradorId: compradorId || null,
        accountId:   accountId || null,
        encerrarLote,
        observacoes: obs || null,
      })
      if (res.error) {
        setError(res.error)
        setSaving(false)
        return
      }
      setOpen(false)
      window.location.href = `/${tenantSlug}/animais/lotes/${lote.id}`
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-3.5 w-3.5" /> Dar Saída ao Lote
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Saída — {lote.nome}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1">
            {/* Tipo + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de saída</Label>
                <Select value={tipo} onValueChange={v => setTipo(v as Tipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de saída</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
            </div>

            {/* Animais */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Animais ({selected.size}/{ativos.length})</Label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline"
                >
                  {selected.size === ativos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {ativos.map(a => {
                  const isSel = selected.has(a.id)
                  return (
                    <div key={a.id} className={cn('flex items-center gap-2 px-3 py-2', isSel ? 'bg-muted/30' : '')}>
                      <button
                        type="button"
                        onClick={() => toggleAnimal(a.id)}
                        className={cn(
                          'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                          isSel ? 'bg-primary border-primary' : 'border-input'
                        )}
                      >
                        {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>
                      <span className="font-mono text-sm flex-1">{a.brinco ?? '—'}</span>
                      {a.nome && <span className="text-xs text-muted-foreground truncate max-w-24">{a.nome}</span>}
                      <Input
                        type="number" step="0.1" min="0"
                        placeholder={a.peso_atual ? `${a.peso_atual} kg` : 'Peso kg'}
                        value={pesos[a.id] ?? ''}
                        onChange={e => setPesos(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="h-7 w-24 text-xs"
                        disabled={!isSel}
                      />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Peso por animal é opcional — registrado como pesagem de saída e atualiza o GMD automaticamente.</p>
            </div>

            {/* Financeiro — só venda */}
            {tipo === 'vendido' && (
              <div className="space-y-3 rounded-lg border border-blue-200/60 bg-blue-50/40 p-3">
                <p className="text-xs font-medium text-blue-800">Lançamento financeiro <span className="font-normal text-muted-foreground">— opcional</span></p>

                <div className="space-y-1.5">
                  <Label className="text-sm">Valor total da venda (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    placeholder="Ex: 96000,00"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Comprador</Label>
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

                <div className="space-y-1.5">
                  <Label className="text-sm">Conta bancária</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Encerrar lote */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={encerrarLote}
                onChange={e => setEncerrarLote(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Encerrar lote após a saída</span>
            </label>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações <span className="text-muted-foreground font-normal">— opcional</span></Label>
              <Input placeholder="Motivo, destino…" value={obs} onChange={e => setObs(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !selected.size || !data}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? 'Registrando…' : `Confirmar saída (${selected.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
