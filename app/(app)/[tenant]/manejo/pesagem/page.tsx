import { createAdminClient } from '@/lib/supabase/server'
import { Scale } from 'lucide-react'
import { PesagemPageView } from './pesagem-page-view'

export default async function ManejoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animalsRes, lotesRes, historicoRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, peso_atual, data_peso_atual, lote_atual_id, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),
    admin
      .from('lotes')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),
    admin
      .from('pesagens')
      .select('id, peso, data, tipo, created_at, animals(id, brinco, nome, categorias_animal(nome))')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const animals = (animalsRes.data ?? []).map((a: any) => ({
    id:              a.id,
    brinco:          a.brinco,
    nome:            a.nome,
    peso_atual:      a.peso_atual,
    data_peso_atual: a.data_peso_atual,
    lote_atual_id:   a.lote_atual_id,
    categoria:       a.categorias_animal?.nome ?? null,
  }))

  const lotes = (lotesRes.data ?? []) as { id: string; nome: string }[]

  const historico = (historicoRes.data ?? []).map((p: any) => ({
    id:         p.id,
    peso:       p.peso,
    data:       p.data,
    tipo:       p.tipo,
    created_at: p.created_at,
    animal: p.animals ? {
      id:        p.animals.id,
      brinco:    p.animals.brinco,
      nome:      p.animals.nome,
      categoria: p.animals.categorias_animal?.nome ?? null,
    } : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6 text-muted-foreground" />
          Pesagem
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registre pesagens rapidamente por animal ou em grupo.
        </p>
      </div>

      <PesagemPageView
        tenantSlug={tenantSlug}
        animals={animals}
        lotes={lotes}
        historico={historico}
      />
    </div>
  )
}
