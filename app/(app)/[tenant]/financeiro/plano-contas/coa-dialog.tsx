'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { AccountNode } from './coa-tree'

interface Props {
  tenantId: string
  open: boolean
  mode: 'create' | 'edit'
  parent: AccountNode | null
  account: AccountNode | null
  onOpenChange: (v: boolean) => void
}

export function CoaDialog({ tenantId, open, mode, parent, account, onOpenChange }: Props) {
  const isEdit = mode === 'edit'

  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setError('')
    setLoading(false)
    setName(isEdit && account ? account.name : '')
  }, [open, mode, account])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório.'); return }

    setError('')
    setLoading(true)

    if (isEdit && account) {
      const { error: err } = await supabase
        .from('chart_of_accounts')
        .update({ name: name.trim() })
        .eq('id', account.id)

      if (err) { setError('Erro ao salvar.'); setLoading(false); return }
    } else {
      const { error: err } = await supabase.rpc('create_coa_account', {
        p_tenant_id: tenantId,
        p_name:      name.trim(),
        p_type:      parent?.type ?? '',
        p_parent_id: parent?.id ?? null,
        p_is_group:  false,  // ignored by backend
      })

      if (err) { setError(err.message); setLoading(false); return }
    }

    onOpenChange(false)
    router.refresh()
  }

  function title() {
    if (isEdit) return `Renomear: ${account?.code} ${account?.name}`
    if (!parent) return 'Nova conta'
    if (parent.level === 1) return `Nova categoria de ${parent.name}`
    return `Novo subitem em ${parent.name}`
  }

  function placeholder() {
    if (!parent) return 'Nome da conta'
    if (parent.level === 1) return 'Ex: Despesa Funcionário, Marketing, Impostos...'
    return 'Ex: Salário, Vale-transporte, Google Ads...'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{title()}</DialogTitle>
          {!isEdit && parent && (
            <p className="text-xs text-muted-foreground pt-0.5">
              Código gerado automaticamente:{' '}
              <span className="font-mono font-semibold text-foreground">
                {parent.code}.N
              </span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              autoFocus
              placeholder={placeholder()}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Renomear' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
