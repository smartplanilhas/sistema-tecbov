import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { LocalForm } from '../../local-form'

export default async function EditarLocalPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [localRes, fazendasRes] = await Promise.all([
    admin.from('locais').select('id, fazenda_id, nome, tipo, area_ha, sistema, status, observacoes')
      .eq('id', id).eq('tenant_id', tenant.id).single(),
    admin.from('fazendas').select('id, nome').eq('tenant_id', tenant.id).eq('ativa', true).order('nome'),
  ])

  if (!localRes.data) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/cadastros/locais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para locais
        </Link>
        <h1 className="text-2xl font-bold">Editar local</h1>
        <p className="text-muted-foreground text-sm">{localRes.data.nome}</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <LocalForm
          tenantSlug={tenantSlug}
          fazendas={fazendasRes.data ?? []}
          local={localRes.data as any}
        />
      </div>
    </div>
  )
}
