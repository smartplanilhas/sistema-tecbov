'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Account = { id: string; name: string }

const EMPTY = {
  from_account_id: '',
  to_account_id: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  status: 'COMPLETED' as 'COMPLETED' | 'PENDING',
}

export function TransferDialog({
  open,
  onClose,
  tenantId,
  accounts,
}: {
  open: boolean
  onClose: () => void
  tenantId: string
  accounts: Account[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)

  function set<K extends keyof typeof EMPTY>(key: K, val: (typeof EMPTY)[K]) {
    setForm(f => ({ ...f, [key]: val }))
    setError('')
  }

  function handleClose() {
    setForm(EMPTY)
    setError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.from_account_id || !form.to_account_id) { setError('Selecione as duas contas.'); return }
    if (form.from_account_id === form.to_account_id) { setError('Origem e destino devem ser contas diferentes.'); return }
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!amount || amount <= 0) { setError('Informe um valor válido.'); return }

    setLoading(true)
    const supabase = createClient()
    const transfer_id = crypto.randomUUID()

    const fromName = accounts.find(a => a.id === form.from_account_id)?.name ?? ''
    const toName   = accounts.find(a => a.id === form.to_account_id)?.name ?? ''
    const desc     = form.description.trim()

    const { error: err } = await supabase.from('transactions').insert([
      {
        tenant_id:   tenantId,
        type:        'TRANSFER',
        account_id:  form.from_account_id,
        amount,
        date:        form.date,
        due_date:    form.date,
        description: desc || `Transferência para ${toName}`,
        status:      form.status,
        transfer_id,
      },
      {
        tenant_id:   tenantId,
        type:        'TRANSFER',
        account_id:  form.to_account_id,
        amount,
        date:        form.date,
        due_date:    form.date,
        description: desc || `Transferência de ${fromName}`,
        status:      form.status,
        transfer_id,
      },
    ])

    setLoading(false)
    if (err) { setError(err.message); return }
    handleClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferência entre Contas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From */}
          <div className="space-y-1.5">
            <Label>Conta de Origem</Label>
            <Select value={form.from_account_id} onValueChange={v => set('from_account_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id} disabled={a.id === form.to_account_id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arrow visual */}
          <div className="flex justify-center">
            <div className="flex items-center justify-center h-8 w-8 rounded-full border bg-muted">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <Label>Conta de Destino</Label>
            <Select value={form.to_account_id} onValueChange={v => set('to_account_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id} disabled={a.id === form.from_account_id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input
                placeholder="0,00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Ex: Reserva de caixa"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['COMPLETED', 'PENDING'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={cn(
                    'py-2 rounded-lg border text-sm font-medium transition-colors',
                    form.status === s
                      ? s === 'COMPLETED'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-yellow-500 text-white border-yellow-500'
                      : 'border-input hover:bg-accent text-muted-foreground'
                  )}
                >
                  {s === 'COMPLETED' ? 'Efetivado' : 'Previsto'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Registrar Transferência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
