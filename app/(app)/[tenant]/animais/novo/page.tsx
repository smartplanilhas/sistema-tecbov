import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { AnimalForm } from '../animal-form'

export default async function NovoAnimalPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [fazendas, categorias, racas, lotes, locais, animalsRef, proprietariosRes] = await Promise.all([
    admin.from('fazendas').select('id, nome').eq('tenant_id', tenant.id).eq('ativa', true).order('nome'),
    admin.from('categorias_animal').select('id, nome, sexo, ordem')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .order('ordem'),
    admin.from('racas').select('id, nome').or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`).eq('ativa', true).order('nome'),
    admin.from('lotes').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
    admin.from('locais').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
    admin.from('animals')
      .select('id, brinco, nome, sexo, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),
    admin.from('proprietarios').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
  ])

  const allAnimals = (animalsRef.data ?? []).map((a: any) => ({
    id: a.id,
    brinco: a.brinco,
    nome: a.nome,
    sexo: a.sexo,
    categoria: a.categorias_animal?.nome ?? null,
  }))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/animais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para animais
        </Link>
        <h1 className="text-2xl font-bold">Novo animal</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do animal. Apenas categoria é obrigatória.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <AnimalForm
          tenantSlug={tenantSlug}
          fazendas={fazendas.data ?? []}
          categorias={categorias.data ?? []}
          racas={racas.data ?? []}
          lotes={lotes.data ?? []}
          locais={locais.data ?? []}
          proprietarios={proprietariosRes.data ?? []}
          allAnimals={allAnimals}
        />
      </div>
    </div>
  )
}
