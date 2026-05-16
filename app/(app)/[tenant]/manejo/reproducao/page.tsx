import { Heart } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { ReproducaoPageView } from './reproducao-page-view'

export default async function ReproducaoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const db = admin as any
  const [femeasRes, eventosRes, lotesRes, locaisRes, estacoesRes, configRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, lote_atual_id, local_atual_id, peso_atual, categoria_id, data_nascimento, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .eq('sexo', 'F')
      .order('brinco'),
    db
      .from('reproducao_eventos')
      .select('id, animal_id, tipo, data, dados, observacoes, created_at, animals(id, brinco, nome, categorias_animal(nome))')
      .eq('tenant_id', tenant.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
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
    db
      .from('reproducao_estacoes')
      .select('id, nome, descricao, data_inicio, data_fim, created_at')
      .eq('tenant_id', tenant.id)
      .order('data_inicio', { ascending: false }),
    db
      .from('reproducao_config')
      .select('dias_lactacao')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
  ])

  const diasLactacao: number = (configRes.data as any)?.dias_lactacao ?? 210

  const femeas = (femeasRes.data ?? []).map((a: any) => ({
    id:            a.id,
    brinco:        a.brinco,
    nome:          a.nome,
    lote_atual_id: a.lote_atual_id,
    local_atual_id: a.local_atual_id,
    peso_atual:    a.peso_atual,
    categoria_id:    a.categoria_id,
    categoria:       a.categorias_animal?.nome ?? null,
    data_nascimento: a.data_nascimento ?? null,
  }))

  const eventos = (eventosRes.data ?? []).map((e: any) => ({
    id:          e.id,
    animal_id:   e.animal_id,
    tipo:        e.tipo,
    data:        e.data,
    dados:       e.dados ?? {},
    observacoes: e.observacoes,
    created_at:  e.created_at,
    animal: e.animals ? {
      id:        e.animals.id,
      brinco:    e.animals.brinco,
      nome:      e.animals.nome,
      categoria: e.animals.categorias_animal?.nome ?? null,
    } : null,
  }))

  const lotes    = (lotesRes.data    ?? []) as { id: string; nome: string }[]
  const locais   = (locaisRes.data   ?? []) as { id: string; nome: string }[]
  const estacoes = (estacoesRes.data ?? []) as any[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-muted-foreground" />
          Reprodução
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Controle reprodutivo: inseminações, diagnósticos, partos e indicadores.
        </p>
      </div>
      <ReproducaoPageView
        tenantSlug={tenantSlug}
        femeas={femeas}
        eventos={eventos}
        lotes={lotes}
        locais={locais}
        estacoes={estacoes}
        diasLactacao={diasLactacao}
      />
    </div>
  )
}
