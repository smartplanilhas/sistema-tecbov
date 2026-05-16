'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Account = {
  id: string
  name: string
  type: string
  bank: string | null
  is_default: boolean
  active: boolean
}

export function FinancialAccountRowActions({ account }: { account: Account }) {
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(account.name)
  const [type, setType] = useState(account.type)
  const [bank, setBank] = useState(account.bank ?? '')
  const [isDefault, setIsDefault] = useState(account.is_default)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('financial_accounts')
      .update({ name, type: type as 'CHECKING' | 'SAVINGS' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT', bank: bank || null, is_default: isDefault })
      .eq('id', account.id)
    if (error) { setError('Erro ao salvar.'); setSaving(false); return }
    setEditOpen(false)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    setActing(true)
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account.id)

    if ((count ?? 0) > 0) {
      if (!window.confirm(`"${account.name}" está em uso em ${count} lançamento(s). Deseja arquivar?`)) {
        setActing(false)
        return
      }
      await supabase.from('financial_accounts').update({ active: false }).eq('id', account.id)
    } else {
      if (!window.confirm(`Excluir "${account.name}"?`)) {
        setActing(false)
        return
      }
      await supabase.from('financial_accounts').delete().eq('id', account.id)
    }
    setActing(false)
    router.refresh()
  }

  async function handleRestore() {
    await supabase.from('financial_accounts').update({ active: true }).eq('id', account.id)
    router.refresh()
  }

  async function handleSetDefault() {
    await supabase.from('financial_accounts').update({ is_default: true }).eq('id', account.id)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {account.is_default ? (
        <Badge variant="default" className="gap-1 text-xs mr-1">
          <Star className="h-3 w-3 fill-current" />
          Padrão
        </Badge>
      ) : (
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleSetDefault}
        >
          Definir padrão
        </Button>
      )}

      {!account.active && (
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleRestore}
        >
          Reativar
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setName(account.name); setType(account.type); setBank(account.bank ?? ''); setIsDefault(account.is_default); setError('') } }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar conta bancária</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                    <SelectItem value="SAVINGS">Poupança</SelectItem>
                    <SelectItem value="CASH">Caixa</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                    <SelectItem value="INVESTMENT">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Banco (opcional)</Label>
                <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex: Banco do Brasil" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox" checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Conta padrão</span>
            </label>
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
