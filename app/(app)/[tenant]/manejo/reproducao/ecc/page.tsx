import Link from 'next/link'
import { ChevronLeft, Activity } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { EccView } from './ecc-view'

export default async function EccPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [femeasRes, historicoRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .eq('sexo', 'F')
      .order('brinco'),
    (admin as any)
      .from('ecc_registros')
      .select('id, animal_id, data, escore, avaliador, observacoes, animals(brinco, nome)')
      .eq('tenant_id', tenant.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const femeas = (femeasRes.data ?? []).map((a: any) => ({
    id:        a.id,
    brinco:    a.brinco,
    nome:      a.nome,
    categoria: a.categorias_animal?.nome ?? null,
  }))

  const historico = (historicoRes.data ?? []).map((r: any) => ({
    id:          r.id,
    animal_id:   r.animal_id,
    data:        r.data,
    escore:      r.escore,
    avaliador:   r.avaliador ?? null,
    observacoes: r.observacoes ?? null,
    animal:      r.animals ? { brinco: r.animals.brinco, nome: r.animals.nome } : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/manejo/reproducao`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para reprodução
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Escore de Condição Corporal (ECC)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registre o ECC de fêmeas individualmente, em escala de 1,0 a 9,0.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <EccView tenantSlug={tenantSlug} femeas={femeas} historico={historico} />
      </div>
    </div>
  )
}
