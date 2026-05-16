'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Method  = { id: string; name: string; financial_account_id: string | null; active: boolean }
type Account = { id: string; name: string }

const NO_ACCOUNT = '__none__'

export function PaymentMethodRowActions({
  method,
  accounts,
}: {
  method: Method
  accounts: Account[]
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(method.name)
  const [accountId, setAccountId] = useState(method.financial_account_id ?? NO_ACCOUNT)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function resetEdit() {
    setName(method.name)
    setAccountId(method.financial_account_id ?? NO_ACCOUNT)
    setError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('payment_methods')
      .update({ name, financial_account_id: accountId === NO_ACCOUNT ? null : accountId })
      .eq('id', method.id)
    if (error) { setError('Erro ao salvar.'); setSaving(false); return }
    setEditOpen(false)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir "${method.name}"?`)) return
    setActing(true)
    await supabase.from('payment_methods').delete().eq('id', method.id)
    setActing(false)
    router.refresh()
  }

  async function handleRestore() {
    await supabase.from('payment_methods').update({ active: true }).eq('id', method.id)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!method.active && (
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleRestore}
        >
          Reativar
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetEdit() }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar forma de pagamento</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome da forma</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Conta destino (opcional)</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCOUNT}>Nenhuma</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost" size="sm"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDelete} disabled={acting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
