import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { AnimalForm } from '../../animal-form'

export default async function EditarAnimalPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animalRes, fazendas, categorias, racas, lotes, locais, animalsRef, proprietariosRes] = await Promise.all([
    admin.from('animals')
      .select(`
        id, fazenda_id, categoria_id, sexo, brinco, identificador, sisbov,
        registro, rfid, nome, raca_id, origem, status, lote_atual_id, local_atual_id,
        data_nascimento, data_compra, data_entrada, data_saida, data_desmama,
        pai_id, mae_id, proprietario_id, pelagem, observacoes
      `)
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single(),
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

  if (!animalRes.data) notFound()

  const allAnimals = (animalsRef.data ?? []).map((a: any) => ({
    id: a.id,
    brinco: a.brinco,
    nome: a.nome,
    sexo: a.sexo,
    categoria: a.categorias_animal?.nome ?? null,
  }))

  const label = animalRes.data.brinco ?? animalRes.data.nome ?? 'Animal'

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/animais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para animais
        </Link>
        <h1 className="text-2xl font-bold">Editar animal</h1>
        <p className="text-muted-foreground text-sm">{label}</p>
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
          animal={animalRes.data as any}
        />
      </div>
    </div>
  )
}
