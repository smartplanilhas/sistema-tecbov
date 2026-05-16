import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { LoteForm } from '../../lote-form'

export default async function EditarLotePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [loteRes, fazendasRes] = await Promise.all([
    admin
      .from('lotes')
      .select('id, fazenda_id, nome, descricao, fase, meta_peso, data_prevista_saida, observacoes, status')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single(),
    admin.from('fazendas').select('id, nome').eq('tenant_id', tenant.id).eq('ativa', true).order('nome'),
  ])

  if (!loteRes.data) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/animais/lotes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para o lote
        </Link>
        <h1 className="text-2xl font-bold">Editar lote</h1>
        <p className="text-muted-foreground text-sm">{loteRes.data.nome}</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <LoteForm
          tenantSlug={tenantSlug}
          fazendas={fazendasRes.data ?? []}
          lote={loteRes.data as any}
        />
      </div>
    </div>
  )
}
