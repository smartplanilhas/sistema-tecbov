import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Building2, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  trial:     { label: 'Trial',        variant: 'warning'     },
  active:    { label: 'Ativo',        variant: 'success'     },
  past_due:  { label: 'Inadimplente', variant: 'warning'     },
  blocked:   { label: 'Bloqueado',    variant: 'destructive' },
  cancelled: { label: 'Cancelado',    variant: 'secondary'   },
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  const [{ data: subs }, { data: recentTenants }] = await Promise.all([
    admin.from('tenant_subscriptions').select('tenant_id, status'),
    admin
      .from('tenants')
      .select('id, name, slug, short_id, created_at, tenant_subscriptions(status)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const total   = subs?.length ?? 0
  const trial   = subs?.filter(s => s.status === 'trial').length ?? 0
  const active  = subs?.filter(s => s.status === 'active').length ?? 0
  const problem = subs?.filter(s => s.status === 'past_due' || s.status === 'blocked' || s.status === 'cancelled').length ?? 0

  const stats = [
    { label: 'Total clientes', value: total,   icon: Building2,    color: 'text-primary',    bg: 'bg-primary/5'         },
    { label: 'Em trial',       value: trial,   icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/30'  },
    { label: 'Ativos',         value: active,  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/30'  },
    { label: 'Com pendências', value: problem, icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-950/30'     },
  ]

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Painel administrativo Tecbov</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Cadastros recentes</h2>
          <Link href="/admin/tenants" className="text-sm text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fazenda</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cadastro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!recentTenants?.length ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum cliente.</td></tr>
              ) : recentTenants.map(t => {
                const sub = (t.tenant_subscriptions as unknown as Array<{ status: string }> | null)?.[0]
                const cfg = statusBadge[sub?.status ?? 'blocked'] ?? statusBadge.blocked
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.short_id ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/tenants/${t.id}`} className="text-sm text-primary hover:underline">Ver →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
