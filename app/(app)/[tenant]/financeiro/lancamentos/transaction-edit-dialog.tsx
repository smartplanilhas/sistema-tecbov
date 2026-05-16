'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Transaction = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  account_id: string
  category_id: string | null
  cost_center_id: string | null
  person_id: string | null
  amount: number
  date: string
  description: string | null
  status: string
}

type Account   = { id: string; name: string }
type Category  = { id: string; name: string; type: string; parent_id: string | null; is_group: boolean }
type CostCenter = { id: string; name: string }
type Person    = { id: string; name: string }

export function TransactionEditDialog({
  transaction,
  accounts,
  categories,
  costCenters,
  suppliers,
  customers,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null
  accounts: Account[]
  categories: Category[]
  costCenters: CostCenter[]
  suppliers: Person[]
  customers: Person[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [personId, setPersonId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('COMPLETED')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!transaction) return
    setPersonId(transaction.person_id ?? '')
    setAccountId(transaction.account_id)
    setCategoryId(transaction.category_id ?? '')
    setCostCenterId(transaction.cost_center_id ?? '')
    setAmount(String(transaction.amount))
    setDate(transaction.date)
    setDescription(transaction.description ?? '')
    setStatus(transaction.status)
    setError('')
  }, [transaction])

  if (!transaction) return null

  const isExpense = transaction.type === 'EXPENSE'
  const people    = isExpense ? suppliers : customers
  const coaType   = isExpense ? 'EXPENSE' : 'REVENUE'

  const analyticalItems = categories.filter((c) => !c.is_group && c.type === coaType)
  const parentById = Object.fromEntries(categories.filter((c) => c.is_group).map((c) => [c.id, c.name]))
  const groupedCategories = analyticalItems.reduce<Record<string, Category[]>>((acc, item) => {
    const key = item.parent_id ?? '__root__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('transactions').update({
      account_id:     accountId,
      person_id:      personId || null,
      category_id:    categoryId || null,
      cost_center_id: costCenterId || null,
      amount:         parseFloat(amount),
      date,
      description:    description || null,
      status:         status as 'PENDING' | 'COMPLETED',
    }).eq('id', transaction!.id)

    if (error) { setError('Erro ao salvar.'); setSaving(false); return }
    onOpenChange(false)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este lançamento?')) return
    setDeleting(true)

    const [{ count: payCount }, { count: recCount }] = await Promise.all([
      supabase.from('payables').select('id', { count: 'exact', head: true }).eq('transaction_id', transaction!.id),
      supabase.from('receivables').select('id', { count: 'exact', head: true }).eq('transaction_id', transaction!.id),
    ])

    if ((payCount ?? 0) + (recCount ?? 0) > 0) {
      setError('Este lançamento está vinculado a uma conta a pagar/receber e não pode ser excluído.')
      setDeleting(false)
      return
    }

    await supabase.from('transactions').delete().eq('id', transaction!.id)
    setDeleting(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isExpense ? 'Editar despesa' : 'Editar receita'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">

          <div className="space-y-1.5">
            <Label>{isExpense ? 'Pago para (opcional)' : 'Recebido de (opcional)'}</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger>
                <SelectValue placeholder={isExpense ? 'Selecione um fornecedor' : 'Selecione um cliente'} />
              </SelectTrigger>
              <SelectContent>
                {people.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {isExpense ? 'Nenhum fornecedor cadastrado' : 'Nenhum cliente cadastrado'}
                  </p>
                ) : (
                  people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label className="shrink-0">Status</Label>
            <button
              type="button"
              role="switch"
              aria-checked={status === 'COMPLETED'}
              onClick={() => setStatus(status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
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

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
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
                  {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input placeholder="Descreva o lançamento" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2">
            <Button
              type="button" variant="ghost"
              className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete} disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit" disabled={saving || !accountId}
              className={isExpense ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
