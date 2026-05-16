'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Recurrence } from '@/types/database'

type SimpleItem = { id: string; name: string }

type Frequency = Recurrence['frequency']

function advanceDate(dateStr: string, freq: Frequency, interval: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  switch (freq) {
    case 'DAILY':      d.setDate(d.getDate() + interval);         break
    case 'WEEKLY':     d.setDate(d.getDate() + 7 * interval);     break
    case 'BIWEEKLY':   d.setDate(d.getDate() + 14 * interval);    break
    case 'MONTHLY':    d.setMonth(d.getMonth() + interval);       break
    case 'QUARTERLY':  d.setMonth(d.getMonth() + 3 * interval);   break
    case 'SEMIANNUAL': d.setMonth(d.getMonth() + 6 * interval);   break
    case 'YEARLY':     d.setFullYear(d.getFullYear() + interval); break
  }
  return d.toISOString().slice(0, 10)
}

function generateDates(
  startDate: string,
  freq: Frequency,
  interval: number,
  endDate: string | null,
  maxOccurrences: number | null,
): string[] {
  const hardEnd = new Date(startDate + 'T00:00:00')
  hardEnd.setFullYear(hardEnd.getFullYear() + 2)
  const limit = endDate && endDate < hardEnd.toISOString().slice(0, 10)
    ? endDate
    : hardEnd.toISOString().slice(0, 10)

  const dates: string[] = []
  let current = startDate
  while (current <= limit) {
    dates.push(current)
    if (maxOccurrences && dates.length >= maxOccurrences) break
    current = advanceDate(current, freq, interval)
  }
  return dates
}

type FormState = {
  type: 'PAYABLE' | 'RECEIVABLE'
  description: string
  amount: string
  frequency: string
  interval: string
  start_date: string
  end_date: string
  max_occurrences: string
  person_id: string
  category_id: string
  cost_center_id: string
  financial_account_id: string
  payment_method_id: string
}

const EMPTY: FormState = {
  type: 'PAYABLE',
  description: '',
  amount: '',
  frequency: 'MONTHLY',
  interval: '1',
  start_date: '',
  end_date: '',
  max_occurrences: '',
  person_id: '',
  category_id: '',
  cost_center_id: '',
  financial_account_id: '',
  payment_method_id: '',
}

const FREQUENCIES = [
  { value: 'DAILY', label: 'Diário' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quinzenal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'YEARLY', label: 'Anual' },
]

function recurrenceToForm(r: Recurrence): FormState {
  return {
    type: r.type,
    description: r.description,
    amount: String(r.amount),
    frequency: r.frequency,
    interval: String(r.interval),
    start_date: r.start_date,
    end_date: r.end_date ?? '',
    max_occurrences: r.max_occurrences ? String(r.max_occurrences) : '',
    person_id: r.person_id ?? '',
    category_id: r.category_id ?? '',
    cost_center_id: r.cost_center_id ?? '',
    financial_account_id: r.financial_account_id ?? '',
    payment_method_id: r.payment_method_id ?? '',
  }
}

export function RecurrenceDialog({
  tenantId,
  recurrence,
  open,
  onOpenChange,
  defaultType,
  people,
  expenseCategories,
  revenueCategories,
  costCenters,
  financialAccounts,
  paymentMethods,
}: {
  tenantId: string
  recurrence?: Recurrence
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultType: 'PAYABLE' | 'RECEIVABLE'
  people: SimpleItem[]
  expenseCategories: SimpleItem[]
  revenueCategories: SimpleItem[]
  costCenters: SimpleItem[]
  financialAccounts: SimpleItem[]
  paymentMethods: SimpleItem[]
}) {
  const isEdit = !!recurrence
  const [form, setForm] = useState<FormState>({ ...EMPTY, type: defaultType })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setForm(recurrence ? recurrenceToForm(recurrence as Recurrence) : { ...EMPTY, type: defaultType })
      setError('')
    }
  }, [open, recurrence, defaultType])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const categories = form.type === 'PAYABLE' ? expenseCategories : revenueCategories

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) { setError('Informe a descrição.'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Informe um valor válido.'); return }
    if (!form.start_date) { setError('Informe a data de início.'); return }

    setError('')
    setLoading(true)

    const payload = {
      tenant_id: tenantId,
      type: form.type,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      frequency: form.frequency as Recurrence['frequency'],
      interval: parseInt(form.interval) || 1,
      start_date: form.start_date,
      end_date: form.end_date || null,
      max_occurrences: form.max_occurrences ? parseInt(form.max_occurrences) : null,
      person_id: form.person_id || null,
      category_id: form.category_id || null,
      cost_center_id: form.cost_center_id || null,
      financial_account_id: form.financial_account_id || null,
      payment_method_id: form.payment_method_id || null,
    }

    if (isEdit && recurrence) {
      const { error: dbError } = await supabase
        .from('recurrences')
        .update(payload)
        .eq('id', recurrence.id)
      if (dbError) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }

      // Gera lançamentos se ainda não foram gerados e conta foi definida
      if (recurrence.total_generated === 0 && form.financial_account_id) {
        const freq = form.frequency as Frequency
        const interval = parseInt(form.interval) || 1
        const dates = generateDates(
          form.start_date, freq, interval,
          form.end_date || null,
          form.max_occurrences ? parseInt(form.max_occurrences) : null,
        )
        const txType = form.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME'
        await supabase.from('transactions').insert(
          dates.map((date) => ({
            tenant_id:         tenantId,
            type:              txType as 'EXPENSE' | 'INCOME',
            description:       form.description.trim(),
            amount:            parseFloat(form.amount),
            date,
            due_date:          date,
            account_id:        form.financial_account_id || null,
            category_id:       form.category_id || null,
            cost_center_id:    form.cost_center_id || null,
            person_id:         form.person_id || null,
            payment_method_id: form.payment_method_id || null,
            status:            'PENDING' as const,
            recurrence_id:     recurrence.id,
          }))
        )
        await supabase
          .from('recurrences')
          .update({ total_generated: dates.length, last_generated_date: dates[dates.length - 1] })
          .eq('id', recurrence.id)
      }
    } else {
      const { data: rec, error: dbError } = await supabase
        .from('recurrences')
        .insert(payload)
        .select('id')
        .single()

      if (dbError || !rec) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }

      const freq = form.frequency as Frequency
      const interval = parseInt(form.interval) || 1
      const dates = generateDates(
        form.start_date,
        freq,
        interval,
        form.end_date || null,
        form.max_occurrences ? parseInt(form.max_occurrences) : null,
      )

      const txType = form.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME'

      await supabase.from('transactions').insert(
        dates.map((date) => ({
          tenant_id:        tenantId,
          type:             txType as 'EXPENSE' | 'INCOME',
          description:      form.description.trim(),
          amount:           parseFloat(form.amount),
          date,
          due_date:         date,
          account_id:       form.financial_account_id,
          category_id:      form.category_id || null,
          cost_center_id:   form.cost_center_id || null,
          person_id:        form.person_id || null,
          payment_method_id: form.payment_method_id || null,
          status:           'PENDING' as const,
          recurrence_id:    rec.id,
        }))
      )

      await supabase
        .from('recurrences')
        .update({
          total_generated:     dates.length,
          last_generated_date: dates[dates.length - 1],
        })
        .eq('id', rec.id)
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar recorrência' : 'Nova recorrência'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['PAYABLE', 'RECEIVABLE'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { set('type', t); set('category_id', '') }}
                  className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                    form.type === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:bg-accent'
                  }`}
                >
                  {t === 'PAYABLE' ? 'A Pagar' : 'A Receber'}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Aluguel, Mensalidade, Parcela..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              required
            />
          </div>

          {/* Valor + Frequência */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => set('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Intervalo + Início */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Repetir a cada</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={form.interval}
                  onChange={(e) => set('interval', e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {FREQUENCIES.find((f) => f.value === form.frequency)?.label.toLowerCase() ?? 'unidade(s)'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Fim + Máx. ocorrências */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data de término (opcional)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. de parcelas (opcional)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ilimitado"
                value={form.max_occurrences}
                onChange={(e) => set('max_occurrences', e.target.value)}
              />
            </div>
          </div>

          {/* Pessoa */}
          <div className="space-y-1.5">
            <Label>{form.type === 'PAYABLE' ? 'Fornecedor (opcional)' : 'Cliente (opcional)'}</Label>
            <Select value={form.person_id} onValueChange={(v) => set('person_id', v === '_' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Nenhum</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoria + Centro de custo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria (opcional)</Label>
              <Select value={form.category_id} onValueChange={(v) => set('category_id', v === '_' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Nenhuma</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Centro de custo (opcional)</Label>
              <Select value={form.cost_center_id} onValueChange={(v) => set('cost_center_id', v === '_' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Nenhum</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conta financeira + Forma de pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Conta bancária (opcional)</Label>
              <Select value={form.financial_account_id} onValueChange={(v) => set('financial_account_id', v === '_' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Nenhuma</SelectItem>
                  {financialAccounts.map((fa) => (
                    <SelectItem key={fa.id} value={fa.id}>{fa.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento (opcional)</Label>
              <Select value={form.payment_method_id} onValueChange={(v) => set('payment_method_id', v === '_' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Nenhuma</SelectItem>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar recorrência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
