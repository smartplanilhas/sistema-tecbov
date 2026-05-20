import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { SemenForm } from '../../semen-form'

export default async function EditarSemenPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: semen } = await (admin as any)
    .from('semen')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!semen) notFound()
  const semenData = semen as any

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/cadastros/semen`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para sêmen
        </Link>
        <h1 className="text-2xl font-bold">Editar sêmen</h1>
        <p className="text-muted-foreground text-sm">{semenData.nome_touro}</p>
      </div>
      <SemenForm tenantSlug={tenantSlug} semen={semenData} />
    </div>
  )
}
