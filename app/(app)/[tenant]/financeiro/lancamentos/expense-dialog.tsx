'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Account  = { id: string; name: string }
type Category = { id: string; name: string; type: string; parent_id: string | null; is_group: boolean }
type CostCenter = { id: string; name: string }
type Person   = { id: string; name: string }

export function ExpenseDialog({
  tenantId,
  accounts,
  categories,
  costCenters,
  suppliers,
  defaultAccountId,
}: {
  tenantId: string
  accounts: Account[]
  categories: Category[]
  costCenters: CostCenter[]
  suppliers: Person[]
  defaultAccountId?: string
}) {
  const [open, setOpen] = useState(false)
  const [personId, setPersonId] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('COMPLETED')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.from('transactions').insert({
      tenant_id: tenantId,
      type: 'EXPENSE',
      account_id: accountId,
      person_id: personId || null,
      category_id: categoryId || null,
      cost_center_id: costCenterId || null,
      amount: parseFloat(amount),
      date,
      description: description || null,
      status: status as 'PENDING' | 'COMPLETED',
    })

    if (error) {
      setError('Erro ao salvar lançamento.')
      setLoading(false)
      return
    }

    setOpen(false)
    resetForm()
    router.refresh()
  }

  function resetForm() {
    setPersonId('')
    setAccountId(defaultAccountId ?? '')
    setCategoryId('')
    setCostCenterId('')
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setStatus('COMPLETED')
    setLoading(false)
    setError('')
  }

  const analyticalItems = categories.filter((c) => !c.is_group && c.type === 'EXPENSE')
  const parentById = Object.fromEntries(categories.filter((c) => c.is_group).map((c) => [c.id, c.name]))
  const groupedCategories = analyticalItems.reduce<Record<string, Category[]>>((acc, item) => {
    const key = item.parent_id ?? '__root__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <TrendingDown className="h-4 w-4 mr-1" />
          Nova despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="space-y-1.5">
            <Label>Pago para (opcional)</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Nenhum fornecedor cadastrado
                  </p>
                ) : (
                  suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0,00"
                value={amount} onChange={(e) => setAmount(e.target.value)} required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)} required
              />
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
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  status === 'COMPLETED' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm ${status === 'COMPLETED' ? 'text-green-700 font-medium' : 'text-amber-600 font-medium'}`}>
              {status === 'COMPLETED' ? 'Pago' : 'Pendente'}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
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
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                      Nenhuma categoria disponível
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Centro de custo (opcional)</Label>
              <Select value={costCenterId} onValueChange={setCostCenterId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Descreva a despesa"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={loading || !accountId}>
              {loading ? 'Salvando...' : 'Salvar despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
