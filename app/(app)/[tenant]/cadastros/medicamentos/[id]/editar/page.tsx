import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { MedicamentoForm } from '../../medicamentos-form'

export default async function EditarMedicamentoPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const db = (await import('@/lib/supabase/server')).createAdminClient() as any

  const { data: tenant } = await db.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: medicamento } = await db
    .from('medicamentos')
    .select('id, nome, unidade, dias_carencia, instrucoes_uso, status')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!medicamento) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/cadastros/medicamentos`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para medicamentos
        </Link>
        <h1 className="text-2xl font-bold">Editar medicamento</h1>
        <p className="text-muted-foreground text-sm mt-1">{medicamento.nome}</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <MedicamentoForm tenantSlug={tenantSlug} medicamento={medicamento} />
      </div>
    </div>
  )
}
