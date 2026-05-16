import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  trial:     { label: 'Trial',        variant: 'warning'     },
  active:    { label: 'Ativo',        variant: 'success'     },
  past_due:  { label: 'Inadimplente', variant: 'warning'     },
  blocked:   { label: 'Bloqueado',    variant: 'destructive' },
  cancelled: { label: 'Cancelado',    variant: 'secondary'   },
}

export default async function TenantsPage() {
  const admin = createAdminClient()

  const [{ data: tenants }, { data: subs }, { data: memberships }] = await Promise.all([
    admin.from('tenants').select('id, name, slug, short_id, created_at').order('created_at', { ascending: false }),
    admin.from('tenant_subscriptions').select('tenant_id, status, plans(name)'),
    admin.from('memberships').select('tenant_id'),
  ])

  const subMap = new Map((subs ?? []).map(s => [s.tenant_id, s]))
  const countMap = new Map<string, number>()
  for (const m of memberships ?? []) {
    countMap.set(m.tenant_id, (countMap.get(m.tenant_id) ?? 0) + 1)
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">{tenants?.length ?? 0} fazenda{tenants?.length !== 1 ? 's' : ''} cadastrada{tenants?.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fazenda</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plano</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Usuários</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!tenants?.length ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum cliente cadastrado.</td>
              </tr>
            ) : tenants.map(t => {
              const sub = subMap.get(t.id)
              const cfg = statusBadge[sub?.status ?? 'blocked'] ?? statusBadge.blocked
              const planName = (sub?.plans as unknown as { name: string } | null)?.name ?? '—'
              const memberCount = countMap.get(t.id) ?? 0
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.short_id ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{planName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{memberCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="text-sm text-primary hover:underline whitespace-nowrap">
                      Ver detalhes →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
