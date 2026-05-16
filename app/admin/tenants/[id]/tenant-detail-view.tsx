'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, CheckCheck, UserPlus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { adminUpdateSubscription, adminAddMember, adminRemoveMember } from '../../actions'

type Plan = { id: string; name: string; max_users: number; price_monthly: number | null }
type Member = { user_id: string; role: string; email: string }
type Subscription = {
  status: string
  plan_id: string | null
  extra_users: number
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  notes: string | null
  plans: { id: string; name: string; max_users: number } | null
} | null

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  trial:     { label: 'Trial',        variant: 'warning'     },
  active:    { label: 'Ativo',        variant: 'success'     },
  past_due:  { label: 'Inadimplente', variant: 'warning'     },
  blocked:   { label: 'Bloqueado',    variant: 'destructive' },
  cancelled: { label: 'Cancelado',    variant: 'secondary'   },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function TenantDetailView({
  tenant,
  members,
  subscription,
  plans,
}: {
  tenant: { id: string; name: string; slug: string; short_id: string | null; created_at: string }
  members: Member[]
  subscription: Subscription
  plans: Plan[]
}) {
  const router = useRouter()
  const [saving, setSaving]         = useState(false)
  const [addEmail, setAddEmail]     = useState('')
  const [addError, setAddError]     = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [removing, setRemoving]     = useState<string | null>(null)

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    const result = await adminAddMember(tenant.id, addEmail)
    setAddLoading(false)
    if (result?.error) { setAddError(result.error); return }
    setAddEmail('')
    router.refresh()
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remover este usuário da fazenda?')) return
    setRemoving(userId)
    await adminRemoveMember(tenant.id, userId)
    setRemoving(null)
    router.refresh()
  }

  const subStatus = subscription?.status ?? 'blocked'
  const cfg = statusBadge[subStatus] ?? statusBadge.blocked

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const planIdRaw = fd.get('planId') as string
    await adminUpdateSubscription(tenant.id, {
      planId: planIdRaw === 'none' ? null : planIdRaw || null,
      status: fd.get('status') as string,
      extraUsers: parseInt(fd.get('extraUsers') as string) || 0,
      trialEndsAt: (fd.get('trialEndsAt') as string) || null,
      currentPeriodEnd: (fd.get('currentPeriodEnd') as string) || null,
      notes: (fd.get('notes') as string) || null,
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para clientes
        </Link>
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              {tenant.short_id && (
                <span className="inline-flex items-center font-mono text-sm bg-muted border px-2 py-0.5 rounded font-medium">
                  #{tenant.short_id}
                  <CopyButton text={tenant.short_id} />
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              slug: <span className="font-mono">{tenant.slug}</span>
              {' · '}
              cadastro: {formatDate(tenant.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membros */}
        <div className="space-y-3">
          <h2 className="font-semibold">Usuários</h2>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Papel</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {!members.length ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Nenhum membro.</td></tr>
                ) : members.map(m => (
                  <tr key={m.user_id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-xs">{m.email || '—'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{m.user_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>
                        {m.role === 'admin' ? 'Admin' : 'Membro'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={removing === m.user_id}
                        onClick={() => handleRemoveMember(m.user_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Adicionar membro */}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <Input
              type="email"
              placeholder="email@dominio.com"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              required
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" className="h-8 gap-1.5 shrink-0" disabled={addLoading}>
              <UserPlus className="h-3.5 w-3.5" />
              {addLoading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </form>
          {addError && <p className="text-xs text-destructive">{addError}</p>}
        </div>

        {/* Assinatura atual */}
        <div className="space-y-3">
          <h2 className="font-semibold">Assinatura atual</h2>
          <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{subscription?.plans?.name ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Usuários no plano</span>
              <span className="font-medium">
                {subscription?.plans?.max_users
                  ? `${subscription.plans.max_users} + ${subscription.extra_users ?? 0} extra`
                  : '—'}
              </span>
            </div>
            {subscription?.trial_ends_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trial até</span>
                <span className="font-medium">{formatDate(subscription.trial_ends_at)}</span>
              </div>
            )}
            {subscription?.current_period_end && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Válida até</span>
                <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
              </div>
            )}
            {subscription?.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Observações</p>
                <p className="text-xs">{subscription.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edição da assinatura */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Gerenciar assinatura</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Plano</label>
              <Select name="planId" defaultValue={subscription?.plan_id ?? 'none'}>
                <SelectTrigger><SelectValue placeholder="Sem plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.max_users} usuário{p.max_users !== 1 ? 's' : ''})
                      {p.price_monthly ? ` — R$ ${p.price_monthly}/mês` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select name="status" defaultValue={subStatus !== 'blocked' || subscription ? subStatus : 'trial'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="past_due">Inadimplente</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Usuários extras</label>
              <Input
                name="extraUsers"
                type="number"
                min={0}
                defaultValue={subscription?.extra_users ?? 0}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Trial até</label>
              <Input
                name="trialEndsAt"
                type="date"
                defaultValue={subscription?.trial_ends_at?.split('T')[0] ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Válida até</label>
              <Input
                name="currentPeriodEnd"
                type="date"
                defaultValue={subscription?.current_period_end?.split('T')[0] ?? ''}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Observações internas</label>
            <Input
              name="notes"
              defaultValue={subscription?.notes ?? ''}
              placeholder="Ex: pago via Pix em 01/06, aguardando NF"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </div>
    </div>
  )
}
