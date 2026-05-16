'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingDown, TrendingUp, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Category = { id: string; name: string; type: string; parent_id: string | null; is_group: boolean }

type Transaction = {
  id: string
  type: string
  account_id: string | null
  category_id: string | null
  cost_center_id: string | null
  person_id: string | null
  payment_method_id: string | null
  reference_document: string | null
  amount: number
  date: string
  due_date: string | null
  payment_date: string | null
  description: string | null
  status: string
}

export function TransactionEditForm({
  transaction,
  tenantSlug,
  accounts,
  categories,
  costCenters,
  people,
  paymentMethods,
  returnTab,
  returnMonth,
}: {
  transaction: Transaction
  tenantSlug: string
  accounts: { id: string; name: string }[]
  categories: Category[]
  costCenters: { id: string; name: string }[]
  people: { id: string; name: string }[]
  paymentMethods: { id: string; name: string }[]
  returnTab?: string
  returnMonth?: string
}) {
  const isExpense = transaction.type === 'EXPENSE'
  const router = useRouter()
  const supabase = createClient()
  const backParams = returnTab && returnMonth ? `?tab=${returnTab}&month=${returnMonth}` : ''
  const backHref = `/${tenantSlug}/financeiro/lancamentos${backParams}`

  const [personId, setPersonId]               = useState(transaction.person_id ?? '')
  const [accountId, setAccountId]             = useState(transaction.account_id ?? '')
  const [categoryId, setCategoryId]           = useState(transaction.category_id ?? '')
  const [costCenterId, setCostCenterId]       = useState(transaction.cost_center_id ?? '')
  const [paymentMethodId, setPaymentMethodId] = useState(transaction.payment_method_id ?? '')
  const [referenceDocument, setReferenceDocument] = useState(transaction.reference_document ?? '')
  const [amount, setAmount]           = useState(String(transaction.amount))
  const [date, setDate]               = useState(transaction.date)
  const [dueDate, setDueDate]         = useState(transaction.due_date ?? transaction.date)
  const [paymentDate, setPaymentDate] = useState(transaction.payment_date ?? '')
  const [description, setDescription] = useState(transaction.description ?? '')
  const [status, setStatus]           = useState<'PENDING' | 'COMPLETED'>(
    transaction.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'
  )
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState('')

  function toggleStatus() {
    if (status === 'PENDING') {
      setStatus('COMPLETED')
      if (!paymentDate) setPaymentDate(dueDate)
    } else {
      setStatus('PENDING')
    }
  }

  const coaType = isExpense ? 'EXPENSE' : 'REVENUE'
  const analyticalItems = categories.filter((c) => !c.is_group && c.type === coaType)
  const parentById = Object.fromEntries(categories.filter((c) => c.is_group).map((c) => [c.id, c.name]))
  const groupedCategories = analyticalItems.reduce<Record<string, Category[]>>((acc, item) => {
    const key = item.parent_id ?? '__root__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId) return
    setSaving(true)
    setError('')

    const none = (v: string) => (!v || v === '__none__' ? null : v)
    const { error: err } = await supabase.from('transactions').update({
      account_id:         accountId,
      person_id:          none(personId),
      category_id:        none(categoryId),
      cost_center_id:     none(costCenterId),
      payment_method_id:  none(paymentMethodId),
      reference_document: referenceDocument || null,
      amount:             parseFloat(amount),
      date,
      due_date:           dueDate || null,
      payment_date:       status === 'COMPLETED' ? (paymentDate || null) : null,
      description:        description || null,
      status,
    }).eq('id', transaction.id)

    if (err) { setError('Erro ao salvar.'); setSaving(false); return }
    router.push(backHref)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Excluir este lançamento?')) return
    setDeleting(true)

    const [{ count: payCount }, { count: recCount }] = await Promise.all([
      supabase.from('payables').select('id', { count: 'exact', head: true }).eq('transaction_id', transaction.id),
      supabase.from('receivables').select('id', { count: 'exact', head: true }).eq('transaction_id', transaction.id),
    ])

    if ((payCount ?? 0) + (recCount ?? 0) > 0) {
      setError('Este lançamento está vinculado a uma conta a pagar/receber e não pode ser excluído.')
      setDeleting(false)
      return
    }

    await supabase.from('transactions').delete().eq('id', transaction.id)
    router.push(backHref)
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isExpense
            ? <TrendingDown className="h-5 w-5 text-destructive" />
            : <TrendingUp className="h-5 w-5 text-green-600" />}
          <h1 className="text-2xl font-bold">{isExpense ? 'Editar Despesa' : 'Editar Receita'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-6">

        <div className="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Input
            placeholder="Descreva o lançamento"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input
            type="number" step="0.01" min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoria (opcional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhuma —</SelectItem>
                {Object.entries(groupedCategories).map(([parentId, items]) => (
                  <SelectGroup key={parentId}>
                    <SelectLabel className="text-xs text-muted-foreground font-medium">
                      {parentById[parentId] ?? ''}
                    </SelectLabel>
                    {items.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="pl-6">{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                {analyticalItems.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhuma categoria disponível</p>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Centro de custo (opcional)</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{isExpense ? 'Pago para (opcional)' : 'Recebido de (opcional)'}</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger>
              <SelectValue placeholder={isExpense ? 'Selecione um fornecedor' : 'Selecione um cliente'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Nenhum —</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Forma de pagamento (opcional)</Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhuma —</SelectItem>
                {paymentMethods.map((pm) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Documento de referência (opcional)</Label>
            <Input
              placeholder="NF, pedido, contrato..."
              value={referenceDocument}
              onChange={(e) => setReferenceDocument(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Conta bancária</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Data de emissão</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Data de vencimento</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="shrink-0">Status</Label>
          <button
            type="button"
            role="switch"
            aria-checked={status === 'COMPLETED'}
            onClick={toggleStatus}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              status === 'COMPLETED' ? 'bg-green-500' : 'bg-input'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
              status === 'COMPLETED' ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
          <span className={`text-sm font-medium ${status === 'COMPLETED' ? 'text-green-700' : 'text-amber-600'}`}>
            {status === 'COMPLETED' ? (isExpense ? 'Pago' : 'Recebido') : 'Pendente'}
          </span>
        </div>

        {status === 'COMPLETED' && (
          <div className="space-y-1.5">
            <Label>Data de pagamento</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-48"
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button" variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? 'Excluindo...' : 'Excluir lançamento'}
          </Button>

          <div className="flex gap-3">
            <Link href={backHref}>
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              disabled={saving || !accountId || !amount}
              className={isExpense
                ? 'bg-destructive hover:bg-destructive/90 text-white'
                : ''}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
