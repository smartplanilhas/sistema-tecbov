import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function LeadsPage() {
  const admin = createAdminClient()
  const { data: leads } = await admin
    .from('leads')
    .select('id, name, email, whatsapp, plan, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground">{leads?.length ?? 0} lead{leads?.length !== 1 ? 's' : ''} capturado{leads?.length !== 1 ? 's' : ''} pela landing page</p>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">WhatsApp</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plano interesse</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {!leads?.length ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum lead ainda.</td>
              </tr>
            ) : leads.map(l => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{l.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.whatsapp ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.plan ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
