'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Recurrence = {
  id: string
  tenant_id: string
  type: 'PAYABLE' | 'RECEIVABLE'
  description: string
  amount: number
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY'
  interval: number
  start_date: string
  category_id: string | null
  financial_account_id: string | null
  cost_center_id: string | null
  person_id: string | null
  active: boolean
  created_at: string
  chart_of_accounts?: { name: string } | null
  financial_accounts?: { name: string } | null
  people?: { name: string } | null
}

export type RCategory   = { id: string; name: string; type: string; parent_id: string | null; is_group: boolean }
export type RAccount    = { id: string; name: string }
export type RCostCenter = { id: string; name: string }
export type RPerson     = { id: string; name: string }

// ─── Constants ───────────────────────────────────────────────────────────────

export const FREQUENCY_LABELS: Record<Recurrence['frequency'], string> = {
  DAILY:      'Diário',
  WEEKLY:     'Semanal',
  BIWEEKLY:   'Quinzenal',
  MONTHLY:    'Mensal',
  QUARTERLY:  'Trimestral',
  SEMIANNUAL: 'Semestral',
  YEARLY:     'Anual',
}

const FREQUENCIES = Object.entries(FREQUENCY_LABELS) as [Recurrence['frequency'], string][]

// ─── Date helpers ─────────────────────────────────────────────────────────────

function advanceDate(dateStr: string, freq: Recurrence['frequency'], interval: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  switch (freq) {
    case 'DAILY':      d.setDate(d.getDate() + interval);            break
    case 'WEEKLY':     d.setDate(d.getDate() + 7 * interval);        break
    case 'BIWEEKLY':   d.setDate(d.getDate() + 14 * interval);       break
    case 'MONTHLY':    d.setMonth(d.getMonth() + interval);          break
    case 'QUARTERLY':  d.setMonth(d.getMonth() + 3 * interval);      break
    case 'SEMIANNUAL': d.setMonth(d.getMonth() + 6 * interval);      break
    case 'YEARLY':     d.setFullYear(d.getFullYear() + interval);    break
  }
  return d.toISOString().slice(0, 10)
}

function generateDates(startDate: string, freq: Recurrence['frequency'], interval: number): string[] {
  const end = new Date(startDate + 'T00:00:00')
  end.setFullYear(end.getFullYear() + 1)
  const endStr = end.toISOString().slice(0, 10)
  const dates: string[] = []
  let current = startDate
  while (current <= endStr) {
    dates.push(current)
    current = advanceDate(current, freq, interval)
  }
  return dates
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecurrenceDialog({
  tenantId,
  categories,
  accounts,
  costCenters,
  people,
  recurrence,
  open,
  onClose,
}: {
  tenantId: string
  categories: RCategory[]
  accounts: RAccount[]
  costCenters: RCostCenter[]
  people: RPerson[]
  recurrence?: Recurrence
  open: boolean
  onClose: () => void
}) {
  const isEdit = !!recurrence

  const [type, setType]             = useState<'PAYABLE' | 'RECEIVABLE'>(recurrence?.type ?? 'PAYABLE')
  const [description, setDescription] = useState(recurrence?.description ?? '')
  const [categoryId, setCategoryId] = useState(recurrence?.category_id ?? '')
  const [amount, setAmount]         = useState(recurrence?.amount?.toString() ?? '')
  const [startDate, setStartDate]   = useState(recurrence?.start_date ?? new Date().toISOString().slice(0, 10))
  const [frequency, setFrequency]   = useState<Recurrence['frequency']>(recurrence?.frequency ?? 'MONTHLY')
  const [interval, setInterval]     = useState(recurrence?.interval?.toString() ?? '1')
  const [accountId, setAccountId]   = useState(recurrence?.financial_account_id ?? '')
  const [costCenterId, setCostCenterId] = useState(recurrence?.cost_center_id ?? '')
  const [personId, setPersonId]     = useState(recurrence?.person_id ?? '')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const router   = useRouter()
  const supabase = createClient()

  const coaType = type === 'PAYABLE' ? 'EXPENSE' : 'REVENUE'
  const analyticalItems = categories.filter(c => !c.is_group && c.type === coaType)
  const parentById = Object.fromEntries(
    categories.filter(c => c.is_group).map(c => [c.id, c.name])
  )
  const groupedCategories = analyticalItems.reduce<Record<string, RCategory[]>>((acc, item) => {
    const key = item.parent_id ?? '__root__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const parsedInterval = parseInt(interval) || 1

    const payload = {
      tenant_id:           tenantId,
      type,
      description:         description.trim(),
      amount:              parseFloat(amount),
      frequency,
      interval:            parsedInterval,
      start_date:          startDate,
      category_id:         categoryId  || null,
      financial_account_id: accountId || null,
      cost_center_id:      costCenterId || null,
      person_id:           personId    || null,
    }

    if (isEdit) {
      const { error: err } = await supabase
        .from('recurrences')
        .update(payload)
        .eq('id', recurrence!.id)
      if (err) { setError('Erro ao salvar recorrência.'); setLoading(false); return }
    } else {
      const { data: rec, error: err } = await supabase
        .from('recurrences')
        .insert(payload)
        .select('id')
        .single()

      if (err || !rec) { setError('Erro ao criar recorrência.'); setLoading(false); return }

      if (accountId) {
        const txType = type === 'PAYABLE' ? 'EXPENSE' : 'INCOME'
        const dates = generateDates(startDate, frequency, parsedInterval)
        await supabase.from('transactions').insert(
          dates.map(date => ({
            tenant_id:      tenantId,
            type:           txType as 'EXPENSE' | 'INCOME',
            description:    description.trim(),
            amount:         parseFloat(amount),
            category_id:    categoryId   || null,
            account_id:     accountId,
            cost_center_id: costCenterId || null,
            person_id:      personId     || null,
            date,
            due_date:       date,
            status:         'PENDING' as const,
            recurrence_id:  rec.id,
          }))
        )
      }
    }

    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar recorrência' : 'Nova recorrência'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Recorrência de</Label>
            <div className="inline-flex rounded-lg border bg-card p-1 w-full">
              {(['PAYABLE', 'RECEIVABLE'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => { setType(t); setCategoryId('') }}
                  className={cn(
                    'flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                    type === t
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  {t === 'PAYABLE' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Salário..."
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Categoria (opcional)</Label>
            <Select
              value={categoryId || '__none__'}
              onValueChange={v => setCategoryId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {Object.entries(groupedCategories).map(([parentId, items]) => (
                  <SelectGroup key={parentId}>
                    <SelectLabel className="text-xs text-muted-foreground font-medium">
                      {parentById[parentId] ?? ''}
                    </SelectLabel>
                    {items.map(c => (
                      <SelectItem key={c.id} value={c.id} className="pl-6">{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Start date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0,00"
                value={amount} onChange={e => setAmount(e.target.value)} required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de início *</Label>
              <Input
                type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)} required
              />
            </div>
          </div>

          {/* Frequency + Interval */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as Recurrence['frequency'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Repetir a cada</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="1" max="99"
                  value={interval} onChange={e => setInterval(e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {FREQUENCY_LABELS[frequency].toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label>Conta bancária (opcional)</Label>
            <Select
              value={accountId || '__none__'}
              onValueChange={v => setAccountId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cost center */}
          {costCenters.length > 0 && (
            <div className="space-y-1.5">
              <Label>Centro de custo (opcional)</Label>
              <Select
                value={costCenterId || '__none__'}
                onValueChange={v => setCostCenterId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Person */}
          <div className="space-y-1.5">
            <Label>{type === 'PAYABLE' ? 'Fornecedor (opcional)' : 'Cliente (opcional)'}</Label>
            <Select
              value={personId || '__none__'}
              onValueChange={v => setPersonId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!accountId && !isEdit && (
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              Sem conta bancária, os lançamentos não serão gerados automaticamente.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar recorrência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
