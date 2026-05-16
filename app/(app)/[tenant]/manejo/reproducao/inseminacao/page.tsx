import Link from 'next/link'
import { ChevronLeft, Syringe } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { InseminacaoForm } from '../registro-view'

function derivarStatusSimples(ev: { tipo: string; data: string; dados: any } | null): string {
  if (!ev) return 'Vazia'
  if (ev.tipo === 'parto') {
    const dias = Math.round((Date.now() - new Date(ev.data + 'T12:00:00').getTime()) / 86_400_000)
    return dias <= 210 ? 'Lactante' : 'Vazia'
  }
  if (ev.tipo === 'inseminacao') return 'Inseminada'
  if (ev.tipo === 'monta_natural') return 'Coberta'
  if (ev.tipo === 'diagnostico') {
    const s = ev.dados?.status
    if (s === 'prenha') return 'Prenha'
    if (s === 'retoque') return 'Vazia'
    return 'Vazia'
  }
  return 'Vazia'
}

export default async function InseminacaoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [femeasRes, lotesRes, semensRes, tourosRes, eventosRes] = await Promise.all([
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
    (admin as any)
      .from('semen')
      .select('id, nome_touro, raca, tipo, apelido_codigo')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome_touro'),
    admin
      .from('animals')
      .select('id, brinco, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .eq('sexo', 'M')
      .order('brinco'),
    (admin as any)
      .from('reproducao_eventos')
      .select('animal_id, tipo, data, dados')
      .eq('tenant_id', tenant.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000),
  ])

  const ultimoEventoPorAnimal = new Map<string, { tipo: string; data: string; dados: any }>()
  for (const ev of (eventosRes.data ?? [])) {
    if (!ultimoEventoPorAnimal.has(ev.animal_id)) ultimoEventoPorAnimal.set(ev.animal_id, ev)
  }

  const femeas = (femeasRes.data ?? []).map((a: any) => ({
    id:                  a.id,
    brinco:              a.brinco,
    nome:                a.nome,
    lote_atual_id:       a.lote_atual_id,
    local_atual_id:      a.local_atual_id,
    peso_atual:          a.peso_atual,
    categoria_id:        a.categoria_id,
    categoria:           a.categorias_animal?.nome ?? null,
    data_nascimento:     a.data_nascimento ?? null,
    status_reprodutivo:  derivarStatusSimples(ultimoEventoPorAnimal.get(a.id) ?? null),
  }))

  const lotes = (lotesRes.data ?? []) as { id: string; nome: string }[]

  const semens = (semensRes.data ?? []).map((s: any) => ({
    id:             s.id,
    nome_touro:     s.nome_touro,
    raca:           s.raca ?? null,
    tipo:           s.tipo,
    apelido_codigo: s.apelido_codigo ?? null,
  }))

  const touros = (tourosRes.data ?? []).map((a: any) => ({
    id:     a.id,
    brinco: a.brinco,
    nome:   a.nome,
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
          <Syringe className="h-5 w-5 text-muted-foreground" />
          Inseminação / Monta
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registre inseminações artificiais ou montas naturais em uma ou mais fêmeas.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <InseminacaoForm tenantSlug={tenantSlug} femeas={femeas} lotes={lotes} semens={semens} touros={touros} />
      </div>
    </div>
  )
}
