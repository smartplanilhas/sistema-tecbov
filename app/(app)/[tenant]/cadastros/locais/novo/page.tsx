import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { LocalForm } from '../local-form'

export default async function NovoLocalPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: fazendas } = await admin
    .from('fazendas')
    .select('id, nome')
    .eq('tenant_id', tenant.id)
    .eq('ativa', true)
    .order('nome')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/cadastros/locais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para locais
        </Link>
        <h1 className="text-2xl font-bold">Novo local</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do local. Nome é obrigatório.</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <LocalForm tenantSlug={tenantSlug} fazendas={fazendas ?? []} />
      </div>
    </div>
  )
}
