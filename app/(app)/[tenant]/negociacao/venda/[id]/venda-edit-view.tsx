'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { atualizarVenda, excluirVenda } from '../actions'

type TxGrupo = {
  id: string
  date: string
  amount: number
  status: 'COMPLETED' | 'PENDING'
}

type RootTx = {
  id: string
  date: string
  descricao: string
  base: string
  compradorId: string | null
  compradorNome: string | null
  accountId: string
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function parseTipoPreco(d: string) {
  if (d.includes('[por_kg]'))     return 'Por kg'
  if (d.includes('[por_cabeca]')) return 'Por cabeça'
  return null
}

function parseAnimais(d: string) {
  const m = d.match(/(\d+) animal\(is\)/)
  return m ? parseInt(m[1]) : null
}

export function VendaEditView({
  tenantSlug,
  rootTx,
  grupo,
  compradores,
  accounts,
}: {
  tenantSlug: string
  rootTx: RootTx
  grupo: TxGrupo[]
  compradores: { id: string; name: string }[]
  accounts: { id: string; name: string }[]
}) {
  const totalVenda = grupo.reduce((s, tx) => s + tx.amount, 0)
  const tipoPreco  = parseTipoPreco(rootTx.descricao)
  const qtdAnimais = parseAnimais(rootTx.descricao)
  const isParcelas = grupo.length > 1

  const [compradorId, setCompradorId] = useState(rootTx.compradorId ?? 'none')
  const [accountId, setAccountId]     = useState(rootTx.accountId)
  const [data, setData]               = useState(grupo[0]?.date ?? rootTx.date)
  const [statusPorId, setStatusPorId] = useState<Record<string, 'COMPLETED' | 'PENDING'>>(
    Object.fromEntries(grupo.map(tx => [tx.id, tx.status]))
  )

  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')
  const [, startTransition]     = useTransition()

  function toggleStatus(id: string) {
    setStatusPorId(prev => ({
      ...prev,
      [id]: prev[id] === 'COMPLETED' ? 'PENDING' : 'COMPLETED',
    }))
  }

  function handleDelete() {
    const label = isParcelas
      ? `Excluir esta venda e suas ${grupo.length} parcelas financeiras?`
      : 'Excluir esta venda e seu lançamento financeiro?'
    if (!window.confirm(label + '\n\nEsta ação não pode ser desfeita.')) return
    setDeleting(true); setError('')
    startTransition(async () => {
      const res = await excluirVenda(tenantSlug, grupo.map(tx => tx.id))
      if (res.error) { setError(res.error); setDeleting(false); return }
      window.location.href = `/${tenantSlug}/negociacao/venda`
    })
  }

  function handleSave() {
    if (!accountId) { setError('Selecione a conta bancária.'); return }
    setSaving(true); setError('')
    startTransition(async () => {
      const res = await atualizarVenda(tenantSlug, {
        txIds:        grupo.map(tx => tx.id),
        compradorId:  compradorId === 'none' ? null : compradorId,
        accountId,
        data,
        observacoes:  null,
        statusPorId,
      })
      if (res.error) { setError(res.error); setSaving(false); return }
      window.location.href = `/${tenantSlug}/negociacao/venda`
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/negociacao/venda`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Vendas
        </Link>
        <h1 className="text-2xl font-bold">Editar Venda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Total: <strong>R$ {fmt(totalVenda)}</strong>
          {qtdAnimais != null && <> · {qtdAnimais} animal(is)</>}
          {tipoPreco && <> · {tipoPreco}</>}
          {isParcelas && <> · {grupo.length} parcelas</>}
        </p>
      </div>

      {/* Dados da venda */}
      <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data da venda</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Comprador</Label>
            <Select value={compradorId} onValueChange={setCompradorId}>
              <SelectTrigger><SelectValue placeholder="Sem comprador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem comprador</SelectItem>
                {compradores.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Conta bancária <span className="text-destructive">*</span></Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Parcelas / status */}
      <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isParcelas ? 'Parcelas' : 'Pagamento'}
        </h2>

        <div className="divide-y rounded-lg border overflow-hidden">
          {grupo.map((tx, i) => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-sm text-muted-foreground w-32 shrink-0">
                {isParcelas ? `Parcela ${i + 1}/${grupo.length}` : 'À vista'}
                <span className="block text-xs">{fmtDate(tx.date)}</span>
              </span>
              <span className="flex-1 font-medium text-sm tabular-nums">R$ {fmt(tx.amount)}</span>
              <button
                type="button"
                onClick={() => toggleStatus(tx.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusPorId[tx.id] === 'COMPLETED'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                )}
              >
                {statusPorId[tx.id] === 'COMPLETED'
                  ? <><Check className="h-3 w-3" /> Recebido</>
                  : <><Clock className="h-3 w-3" /> A receber</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3 pb-6">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${tenantSlug}/negociacao/venda`}>Cancelar</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? 'Excluindo…' : 'Excluir venda'}
          </Button>
        </div>
        <Button onClick={handleSave} disabled={saving || deleting} className="min-w-32">
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}
