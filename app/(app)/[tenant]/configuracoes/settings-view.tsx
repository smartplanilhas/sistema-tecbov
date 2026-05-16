'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Building2, CheckCircle2, Clock, AlertTriangle, XCircle, MessageCircle, Pencil, Trash2, Plus, X } from 'lucide-react'
import { createProprietario, updateProprietario, deleteProprietario } from './proprietarios-actions'
import { saveReproducaoConfig } from './reproducao-config-actions'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { TabNav } from '@/components/ui/tab-nav'
import { FinancialAccountDialog } from './financial-account-dialog'
import { FinancialAccountRowActions } from './financial-account-row-actions'
import { FilialDialog } from './filial-dialog'
import { CoaTree } from '../financeiro/plano-contas/coa-tree'
import { CostCenterDialog } from '../financeiro/centro-custo/cost-center-dialog'
import { CostCenterRowActions } from '../financeiro/centro-custo/cost-center-row-actions'
import { PaymentMethodDialog } from '../cadastros/formas-pagamento/payment-method-dialog'
import { PaymentMethodRowActions } from '../cadastros/formas-pagamento/payment-method-row-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tenant = { id: string; name: string; slug: string; parent_id: string | null }
type FinancialAccount = { id: string; name: string; type: string; bank: string | null; balance: number; active: boolean; is_default: boolean }
type Member = { role: string; user_id: string }
type Filial = { id: string; name: string; slug: string }
type CostCenter = { id: string; name: string; description: string | null; active: boolean }
type PaymentMethod = { id: string; name: string; active: boolean; financial_account_id: string | null; financial_accounts: { name: string } | null }
type Proprietario = { id: string; nome: string }
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled'
type Subscription = {
  id: string; status: SubscriptionStatus
  trial_ends_at: string | null; current_period_end: string | null
  extra_users: number; notes: string | null; plan_id: string | null
  plans: { id: string; name: string; slug: string; max_users: number } | null
} | null

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Poupança',
  CASH: 'Caixa',
  CREDIT_CARD: 'Cartão de Crédito',
  INVESTMENT: 'Investimento',
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'geral',            label: 'Geral' },
  { id: 'proprietarios',    label: 'Proprietários' },
  { id: 'contas',           label: 'Contas' },
  { id: 'plano-contas',     label: 'Plano de Contas' },
  { id: 'centro-custo',     label: 'Centro de Custo' },
  { id: 'forma-pagamento',  label: 'Forma de Pagamento' },
  { id: 'reproducao',       label: 'Reprodução' },
  { id: 'assinatura',       label: 'Assinatura' },
]

type TabId = typeof TABS[number]['id']

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsView({
  tenant,
  accounts,
  members,
  filiais,
  coa,
  costCenters,
  paymentMethods,
  subscription,
  proprietarios,
  reproducaoConfig,
}: {
  tenant: Tenant
  accounts: FinancialAccount[]
  members: Member[]
  filiais: Filial[]
  coa: Parameters<typeof CoaTree>[0]['accounts']
  costCenters: CostCenter[]
  paymentMethods: PaymentMethod[]
  subscription: Subscription
  proprietarios: Proprietario[]
  reproducaoConfig: { dias_lactacao: number }
}) {
  const [tab, setTab] = useState<TabId>('geral')

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie a fazenda e seus cadastros de suporte</p>
      </div>

      {/* Tab bar — scrollável em telas menores */}
      <div className="overflow-x-auto pb-1">
        <TabNav tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div>
        {tab === 'geral'            && <GeralTab tenant={tenant} members={members} filiais={filiais} />}
        {tab === 'proprietarios'   && <ProprietariosTab tenantSlug={tenant.slug} proprietarios={proprietarios} />}
        {tab === 'contas'          && <ContasTab tenantId={tenant.id} accounts={accounts} />}
        {tab === 'plano-contas'    && <CoaTree tenantId={tenant.id} accounts={coa} />}
        {tab === 'centro-custo'    && <CentroCustoTab tenantId={tenant.id} centers={costCenters} />}
        {tab === 'forma-pagamento' && <FormaPagamentoTab tenantId={tenant.id} methods={paymentMethods} accounts={accounts} />}
        {tab === 'reproducao'      && <ReproducaoTab tenantSlug={tenant.slug} config={reproducaoConfig} />}
        {tab === 'assinatura'      && <AssinaturaTab tenantId={tenant.id} subscription={subscription} tenantName={tenant.name} memberCount={members.length} />}
      </div>
    </div>
  )
}

// ─── Proprietários ────────────────────────────────────────────────────────────

function ProprietariosTab({
  tenantSlug,
  proprietarios,
}: {
  tenantSlug: string
  proprietarios: Proprietario[]
}) {
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Proprietario | null>(null)
  const [nome, setNome] = useState('')
  const [err, setErr] = useState('')

  function openNew() {
    setEditing(null)
    setNome('')
    setErr('')
    setDialogOpen(true)
  }

  function openEdit(p: Proprietario) {
    setEditing(p)
    setNome(p.nome)
    setErr('')
    setDialogOpen(true)
  }

  function handleSave() {
    const fd = new FormData()
    fd.set('nome', nome)
    startTransition(async () => {
      const res = editing
        ? await updateProprietario(tenantSlug, editing.id, fd)
        : await createProprietario(tenantSlug, fd)
      if (res.error) { setErr(res.error); return }
      setDialogOpen(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProprietario(tenantSlug, id)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Proprietários</h2>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Novo proprietário
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {proprietarios.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhum proprietário cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {proprietarios.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />
          <div className="relative z-10 bg-card rounded-xl border shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editing ? 'Editar proprietário' : 'Novo proprietário'}</h3>
              <button type="button" onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <input
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Nome do proprietário"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {err && <p className="text-xs text-destructive">{err}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-3 py-1.5 rounded-md border border-input text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !nome.trim()}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Geral ────────────────────────────────────────────────────────────────────

function GeralTab({ tenant, members, filiais }: { tenant: Tenant; members: Member[]; filiais: Filial[] }) {
  return (
    <div className="space-y-8">
      {/* Company info */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Fazenda</h2>
        <div className="rounded-xl border bg-card p-5 space-y-3 max-w-md">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Nome</p>
            <p className="font-medium">{tenant.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Identificador (slug)</p>
            <p className="font-mono text-sm">{tenant.slug}</p>
          </div>
        </div>
      </section>

      {/* Filiais */}
      {!tenant.parent_id && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Fazendas Filiais</h2>
            <FilialDialog parentId={tenant.id} parentSlug={tenant.slug} />
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {!filiais.length ? (
                  <tr><td colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma filial cadastrada.</td></tr>
                ) : filiais.map(f => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{f.name}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{f.slug}</td>
                    <td className="px-4 py-3">
                      <Link href={`/${f.slug}/dashboard`} className="text-sm text-primary hover:underline">Acessar →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Membros</h2>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Papel</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.user_id}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>
                      {m.role === 'admin' ? 'Admin' : 'Membro'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ─── Contas ───────────────────────────────────────────────────────────────────

function ContasTab({ tenantId, accounts }: { tenantId: string; accounts: FinancialAccount[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Contas Bancárias</h2>
        <FinancialAccountDialog tenantId={tenantId} />
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Banco</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!accounts.length ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma conta cadastrada.</td></tr>
            ) : accounts.map(acc => (
              <tr key={acc.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{acc.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{acc.bank ?? '—'}</td>
                <td className={`px-4 py-3 text-right font-medium ${acc.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(acc.balance)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={acc.active ? 'success' : 'secondary'}>{acc.active ? 'Ativa' : 'Inativa'}</Badge>
                </td>
                <td className="px-4 py-3"><FinancialAccountRowActions account={acc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Centro de Custo ──────────────────────────────────────────────────────────

function CentroCustoTab({ tenantId, centers }: { tenantId: string; centers: CostCenter[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Centro de Custo</h2>
        <CostCenterDialog tenantId={tenantId} />
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!centers.length ? (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-8">Nenhum centro de custo cadastrado.</td></tr>
            ) : centers.map(cc => (
              <tr key={cc.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{cc.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{cc.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={cc.active ? 'success' : 'secondary'}>{cc.active ? 'Ativo' : 'Inativo'}</Badge>
                </td>
                <td className="px-4 py-3"><CostCenterRowActions center={cc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Reprodução ───────────────────────────────────────────────────────────────

function ReproducaoTab({ tenantSlug, config }: { tenantSlug: string; config: { dias_lactacao: number } }) {
  const [isPending, startTransition] = useTransition()
  const [dias, setDias] = useState(String(config.dias_lactacao))
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  function handleSave() {
    const n = parseInt(dias, 10)
    if (!n || n < 1 || n > 365) { setErr('Informe um valor entre 1 e 365 dias.'); return }
    setErr('')
    startTransition(async () => {
      const res = await saveReproducaoConfig(tenantSlug, n)
      if (res.error) { setErr(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Parâmetros reprodutivos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ajuste os parâmetros usados para calcular o status das fêmeas automaticamente.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Duração da lactação (dias)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={e => setDias(e.target.value)}
              className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">dias após o parto</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Padrão: 210 dias (~7 meses). Após esse período sem desmame registrado, o badge Lactante some automaticamente.
          </p>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? 'Salvando…' : 'Salvar'}
          </Button>
          {saved && <span className="text-sm text-green-600">Salvo com sucesso.</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Forma de Pagamento ───────────────────────────────────────────────────────

// ─── Assinatura ───────────────────────────────────────────────────────────────

const statusConfig: Record<SubscriptionStatus, { label: string; icon: React.ElementType; color: string }> = {
  trial:     { label: 'Período de teste',  icon: Clock,         color: 'text-blue-600'   },
  active:    { label: 'Ativa',             icon: CheckCircle2,  color: 'text-green-600'  },
  past_due:  { label: 'Pagamento pendente',icon: AlertTriangle, color: 'text-amber-600'  },
  blocked:   { label: 'Suspensa',          icon: XCircle,       color: 'text-red-600'    },
  cancelled: { label: 'Cancelada',         icon: XCircle,       color: 'text-red-600'    },
}

function daysRemaining(date: string | null) {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

const WA_NUMBER = '5515997612670'

function waLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

function AssinaturaTab({
  subscription,
  tenantName,
  memberCount,
}: {
  tenantId: string
  subscription: Subscription
  tenantName: string
  memberCount: number
}) {
  const status = subscription?.status ?? 'blocked'
  const cfg = statusConfig[status]
  const StatusIcon = cfg.icon
  const hasPlan = !!subscription?.plan_id
  const planName = subscription?.plans?.name ?? ''

  const maxUsers = (subscription?.plans?.max_users ?? 0) + (subscription?.extra_users ?? 0)
  const trialDays = daysRemaining(subscription?.trial_ends_at ?? null)
  const periodDays = daysRemaining(subscription?.current_period_end ?? null)

  return (
    <div className="space-y-6 max-w-xl">
      {/* Status card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Status da assinatura</h2>
          <span className={cn('flex items-center gap-1.5 text-sm font-medium', cfg.color)}>
            <StatusIcon className="h-4 w-4" />
            {cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-0.5">Plano</p>
            <p className="font-medium">{planName || '—'}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-0.5">Usuários</p>
            <p className="font-medium">{memberCount} / {maxUsers > 0 ? maxUsers : '—'}</p>
          </div>
          {status === 'trial' && trialDays !== null && (
            <div className="col-span-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                {trialDays > 0
                  ? `${trialDays} dia${trialDays !== 1 ? 's' : ''} restante${trialDays !== 1 ? 's' : ''} no período de teste`
                  : 'Período de teste encerrado'}
              </p>
            </div>
          )}
          {status === 'active' && periodDays !== null && (
            <div className="col-span-2 bg-muted/40 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-0.5">Válida até</p>
              <p className="font-medium">
                {formatDate(subscription!.current_period_end!)}
                {periodDays <= 7 && (
                  <span className="ml-2 text-amber-600 text-xs">({periodDays}d restantes)</span>
                )}
              </p>
            </div>
          )}
          {(subscription?.extra_users ?? 0) > 0 && (
            <div className="col-span-2 bg-muted/40 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-0.5">Usuários adicionais</p>
              <p className="font-medium">+{subscription!.extra_users} usuário{subscription!.extra_users !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          {hasPlan
            ? 'Para alterar ou cancelar sua assinatura, entre em contato com nossa equipe pelo WhatsApp.'
            : 'Assine um plano e tenha acesso completo ao GeSmart. Fale com nossa equipe pelo WhatsApp.'}
        </p>

        {hasPlan ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default" className="gap-2">
              <a
                href={waLink(`Olá! Gostaria de mudar meu plano no GeSmart.\nEmpresa: ${tenantName}\nPlano atual: ${planName}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Mudar de plano
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
              <a
                href={waLink(`Olá! Gostaria de cancelar minha assinatura do GeSmart.\nEmpresa: ${tenantName}\nPlano atual: ${planName}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Cancelar assinatura
              </a>
            </Button>
          </div>
        ) : (
          <Button asChild className="gap-2">
            <a
              href={waLink(`Olá! Tenho interesse em assinar o GeSmart.\nEmpresa: ${tenantName}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              Assinar agora
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Forma de Pagamento ───────────────────────────────────────────────────────

function FormaPagamentoTab({
  tenantId,
  methods,
  accounts,
}: {
  tenantId: string
  methods: PaymentMethod[]
  accounts: FinancialAccount[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Formas de Pagamento</h2>
        <PaymentMethodDialog tenantId={tenantId} accounts={accounts} />
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Conta destino</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!methods.length ? (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma forma de pagamento cadastrada.</td></tr>
            ) : methods.map(m => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.financial_accounts?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={m.active ? 'success' : 'secondary'}>{m.active ? 'Ativa' : 'Inativa'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <PaymentMethodRowActions
                    method={{ id: m.id, name: m.name, financial_account_id: m.financial_account_id, active: m.active }}
                    accounts={accounts}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
