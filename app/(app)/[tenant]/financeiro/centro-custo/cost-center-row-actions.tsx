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

type Center = { id: string; name: string; description: string | null; active: boolean }

export function CostCenterRowActions({ center }: { center: Center }) {
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(center.name)
  const [description, setDescription] = useState(center.description ?? '')
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
      .from('cost_centers')
      .update({ name, description: description || null })
      .eq('id', center.id)
    if (error) { setError('Erro ao salvar.'); setSaving(false); return }
    setEditOpen(false)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    setActing(true)
    const [{ count: txCount }, { count: payCount }] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('cost_center_id', center.id),
      supabase.from('payables').select('id', { count: 'exact', head: true }).eq('cost_center_id', center.id),
    ])
    const total = (txCount ?? 0) + (payCount ?? 0)

    if (total > 0) {
      if (!window.confirm(`"${center.name}" está em uso em ${total} registro(s). Deseja arquivar?`)) {
        setActing(false)
        return
      }
      await supabase.from('cost_centers').update({ active: false }).eq('id', center.id)
    } else {
      if (!window.confirm(`Excluir "${center.name}"?`)) {
        setActing(false)
        return
      }
      await supabase.from('cost_centers').delete().eq('id', center.id)
    }
    setActing(false)
    router.refresh()
  }

  async function handleRestore() {
    await supabase.from('cost_centers').update({ active: true }).eq('id', center.id)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!center.active && (
        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleRestore}
        >
          Reativar
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setName(center.name); setDescription(center.description ?? ''); setError('') } }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar centro de custo</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o centro de custo"
              />
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
