import Link from 'next/link'
import { ChevronLeft, Tag } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { PartoForm } from '../registro-view'

export default async function PartoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [femeasRes, lotesRes, locaisRes, categoriasRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, lote_atual_id, local_atual_id, peso_atual, categoria_id, data_nascimento, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .eq('sexo', 'F')
      .order('brinco'),
    admin
      .from('lotes')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),
    admin
      .from('locais')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .order('nome'),
    admin
      .from('categorias_animal')
      .select('id, nome, sexo')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .order('ordem'),
  ])

  const femeas = (femeasRes.data ?? []).map((a: any) => ({
    id:              a.id,
    brinco:          a.brinco,
    nome:            a.nome,
    lote_atual_id:   a.lote_atual_id,
    local_atual_id:  a.local_atual_id,
    peso_atual:      a.peso_atual,
    categoria_id:    a.categoria_id,
    categoria:       a.categorias_animal?.nome ?? null,
    data_nascimento: a.data_nascimento ?? null,
  }))

  const lotes      = (lotesRes.data      ?? []) as { id: string; nome: string }[]
  const locais     = (locaisRes.data     ?? []) as { id: string; nome: string }[]
  const categorias = (categoriasRes.data ?? []) as { id: string; nome: string; sexo: string }[]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/manejo/reproducao`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para reprodução
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          Registro de Parto
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registre o parto de uma fêmea e crie o bezerro automaticamente se desejar.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <PartoForm
          tenantSlug={tenantSlug}
          femeas={femeas}
          lotes={lotes}
          locais={locais}
          categorias={categorias}
        />
      </div>
    </div>
  )
}
