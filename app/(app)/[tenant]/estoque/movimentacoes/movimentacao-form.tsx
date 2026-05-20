'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { createMovimentacao } from './actions'
import { cn } from '@/lib/utils'

export type ProdutoOpt = { id: string; codigo: string; descricao: string; unidade: string | null; saldo_atual: number; controla_estoque: boolean; valor_medio: number | null }
export type LoteOpt    = { id: string; nome: string; fase: string | null }
export type AnimalOpt  = { id: string; brinco: string | null; nome: string | null }

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

export function MovimentacaoForm({
  tenantSlug,
  produtos,
  lotes,
  animais,
}: {
  tenantSlug: string
  produtos:   ProdutoOpt[]
  lotes:      LoteOpt[]
  animais:    AnimalOpt[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState('')
  const [tipo, setTipo]            = useState<'entrada' | 'saida'>('entrada')
  const [vincular, setVincular]    = useState(false)
  const [vinculoTipo, setVinculoTipo] = useState<'lote' | 'animal'>('lote')
  const [valorUnitario, setValorUnitario] = useState('')

  function handleProdutoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const prod = produtos.find(p => p.id === e.target.value)
    setValorUnitario(prod?.valor_medio != null ? prod.valor_medio.toString() : '')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const produtoId  = fd.get('produto_id') as string
    const quantidade = parseFloat(fd.get('quantidade') as string)
    if (!produtoId) { setError('Selecione um produto.'); return }
    if (!quantidade || quantidade <= 0) { setError('Quantidade deve ser maior que zero.'); return }
    setError('')
    startTransition(async () => {
      const result = await createMovimentacao(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      window.location.href = `/${tenantSlug}/estoque/movimentacoes`
    })
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="tipo" value={tipo} />

        {/* Tipo */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
              tipo === 'entrada'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Entrada
          </button>
          <button
            type="button"
            onClick={() => setTipo('saida')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
              tipo === 'saida'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            )}
          >
            <TrendingDown className="h-3.5 w-3.5" /> Saída
          </button>
        </div>

        {/* Campos principais */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_120px_140px_auto] gap-3 items-end">
          <Field label="Produto" required>
            <select name="produto_id" className={SELECT_CLS} defaultValue="" onChange={handleProdutoChange}>
              <option value="" disabled>Selecione…</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descricao}
                  {p.unidade ? ` (${p.unidade})` : ''}
                  {p.controla_estoque ? ` · ${p.saldo_atual.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quantidade" required>
            <Input type="number" name="quantidade" step="0.001" min="0.001" placeholder="0" />
          </Field>

          <Field label="Valor unit. (R$)">
            <Input
              type="number"
              name="valor_unitario"
              step="0.0001"
              min="0"
              placeholder="0,00"
              value={valorUnitario}
              onChange={e => setValorUnitario(e.target.value)}
            />
          </Field>

          <Field label="Data" required>
            <Input type="date" name="data" defaultValue={new Date().toISOString().split('T')[0]} />
          </Field>

          <Button type="submit" disabled={pending} className="h-9 whitespace-nowrap">
            {pending ? 'Salvando…' : 'Registrar'}
          </Button>
        </div>

        {/* Motivo */}
        <Field label="Motivo / observação">
          <Input name="motivo" placeholder="Opcional…" />
        </Field>

        {/* Vincular — só para saída */}
        {tipo === 'saida' && (
          <div className={cn(
            'rounded-lg border p-3 space-y-3 transition-colors',
            vincular ? 'border-primary/30 bg-primary/5' : 'border-dashed'
          )}>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={vincular}
                onChange={e => setVincular(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm font-medium">Vincular a lote ou animal</span>
            </label>

            {vincular && (
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-end">
                <div className="flex gap-4 items-center pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="vinculo_tipo" value="lote" checked={vinculoTipo === 'lote'} onChange={() => setVinculoTipo('lote')} className="accent-primary" />
                    Lote
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="vinculo_tipo" value="animal" checked={vinculoTipo === 'animal'} onChange={() => setVinculoTipo('animal')} className="accent-primary" />
                    Animal
                  </label>
                </div>

                {vinculoTipo === 'lote' ? (
                  <Field label="Lote">
                    <select name="lote_id" className={SELECT_CLS} defaultValue="">
                      <option value="">Selecione…</option>
                      {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                  </Field>
                ) : (
                  <Field label="Animal">
                    <select name="animal_id" className={SELECT_CLS} defaultValue="">
                      <option value="">Selecione…</option>
                      {animais.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.brinco ?? '—'}{a.nome ? ` — ${a.nome}` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  )
}
