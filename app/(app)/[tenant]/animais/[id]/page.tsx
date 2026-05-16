import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Pencil } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PesagensView } from './pesagens-view'
import { PesoChart } from './peso-chart'
import { AnotacoesView } from './anotacoes-view'

const TIPO_LABEL: Record<string, string> = {
  entrada:            'Entrada',
  saida:              'Saída',
  mudanca_lote:       'Mudança de lote',
  mudanca_local:      'Mudança de local',
  mudanca_lote_local: 'Mudança de lote e local',
}

function MovDiff({ mov }: { mov: any }) {
  const loteAnt  = mov.lote_anterior?.nome  ?? null
  const loteNov  = mov.lote_novo?.nome      ?? null
  const localAnt = mov.local_anterior?.nome ?? null
  const localNov = mov.local_novo?.nome     ?? null

  const parts: React.ReactNode[] = []

  if (loteAnt !== loteNov) {
    parts.push(
      <span key="lote" className="text-sm">
        <span className="text-muted-foreground">Lote:</span>{' '}
        <span className="line-through text-muted-foreground">{loteAnt ?? 'Sem lote'}</span>
        {' → '}
        <span className="font-medium">{loteNov ?? 'Sem lote'}</span>
      </span>
    )
  }

  if (localAnt !== localNov) {
    parts.push(
      <span key="local" className="text-sm">
        <span className="text-muted-foreground">Local:</span>{' '}
        <span className="line-through text-muted-foreground">{localAnt ?? 'Sem local'}</span>
        {' → '}
        <span className="font-medium">{localNov ?? 'Sem local'}</span>
      </span>
    )
  }

  if (parts.length === 0) {
    if (loteNov) parts.push(<span key="entrada-lote" className="text-sm font-medium">{loteNov}</span>)
    if (localNov) parts.push(<span key="entrada-local" className="text-sm font-medium">{localNov}</span>)
  }

  return <div className="flex flex-wrap gap-x-4 gap-y-0.5">{parts}</div>
}

const STATUS_BADGE: Record<string, string> = {
  ativo:       'bg-green-100 text-green-700',
  vendido:     'bg-blue-100 text-blue-700',
  morto:       'bg-red-100 text-red-700',
  transferido: 'bg-orange-100 text-orange-700',
}

function fmt(v: number | null, dec = 1) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const db = admin as any
  const [animalRes, pesagensRes, movsRes, anotacoesRes, sanidadeRes] = await Promise.all([
    admin
      .from('animals')
      .select(`
        id, brinco, nome, sexo, status, observacoes,
        peso_atual, data_peso_atual, gmd_ultimo, gmd_geral, total_pesagens,
        categorias_animal(nome),
        fazendas(nome),
        racas(nome)
      `)
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single(),
    admin
      .from('pesagens')
      .select('id, data, peso, tipo')
      .eq('animal_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    admin.from('movimentacoes')
      .select(`
        id, tipo, data, motivo, observacoes, created_at,
        lote_anterior:lotes!lote_anterior_id(nome),
        lote_novo:lotes!lote_novo_id(nome),
        local_anterior:locais!local_anterior_id(nome),
        local_novo:locais!local_novo_id(nome)
      `)
      .eq('animal_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('anotacoes_animal')
      .select('id, data, tipo, texto, created_at')
      .eq('animal_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('sanidade_eventos')
      .select('id, tipo, data, descricao, dados, observacoes')
      .eq('animal_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!animalRes.data) notFound()

  const animal = animalRes.data as any

  // Enrich pesagens with variação and GMD between consecutive weighings
  const raw = (pesagensRes.data ?? []) as { id: string; data: string; peso: number; tipo: string }[]
  const pesagens = raw.map((p, idx) => {
    const prev = raw[idx + 1] // older entry (desc order)
    let variacao: number | null = null
    let gmd: number | null = null
    if (prev) {
      variacao = p.peso - prev.peso
      const days = Math.round(
        (new Date(p.data).getTime() - new Date(prev.data).getTime()) / 86_400_000
      )
      if (days > 0) gmd = variacao / days
    }
    return { ...p, variacao, gmd }
  })

  const movimentacoes = (movsRes.data ?? []) as any[]
  const anotacoes = (anotacoesRes.data ?? []) as { id: string; data: string; tipo: string; texto: string; created_at: string }[]
  const sanidadeEventos = (sanidadeRes.data ?? []) as { id: string; tipo: string; data: string; descricao: string; dados: any; observacoes: string | null }[]
  const label = [animal.brinco, animal.nome].filter(Boolean).join(' – ') || 'Animal'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href={`/${tenantSlug}/animais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" /> Animais
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{label}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {animal.categorias_animal?.nome && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {animal.categorias_animal.nome}
                </span>
              )}
              {animal.racas?.nome && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {animal.racas.nome}
                </span>
              )}
              {animal.fazendas?.nome && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {animal.fazendas.nome}
                </span>
              )}
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[animal.status] ?? ''}`}>
                {animal.status}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Link href={`/${tenantSlug}/animais/${id}/editar`}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Peso atual</p>
          <p className="text-xl font-bold mt-0.5">
            {animal.peso_atual != null ? `${fmt(animal.peso_atual)} kg` : '—'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Última pesagem</p>
          <p className="text-xl font-bold mt-0.5">{fmtDate(animal.data_peso_atual)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">GMD último</p>
          <p className={`text-xl font-bold mt-0.5 ${
            animal.gmd_ultimo != null
              ? animal.gmd_ultimo >= 0 ? 'text-green-600' : 'text-red-600'
              : ''
          }`}>
            {animal.gmd_ultimo != null ? `${fmt(animal.gmd_ultimo, 3)} kg/d` : '—'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">GMD geral</p>
          <p className={`text-xl font-bold mt-0.5 ${
            animal.gmd_geral != null
              ? animal.gmd_geral >= 0 ? 'text-green-600' : 'text-red-600'
              : ''
          }`}>
            {animal.gmd_geral != null ? `${fmt(animal.gmd_geral, 3)} kg/d` : '—'}
          </p>
        </div>
      </div>

      {/* Gráfico de evolução do peso */}
      <PesoChart pesagens={pesagens} />

      {/* Pesagens */}
      <PesagensView
        tenantSlug={tenantSlug}
        animalId={id}
        pesagens={pesagens}
      />

      {/* Anotações */}
      <AnotacoesView tenantSlug={tenantSlug} animalId={id} anotacoes={anotacoes} />

      {/* Histórico sanitário */}
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Histórico sanitário</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Vacinações, medicações e procedimentos</p>
        </div>
        {sanidadeEventos.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-8 text-center">Nenhum evento sanitário registrado.</p>
        ) : (
          <div className="divide-y">
            {sanidadeEventos.map(ev => {
              const TIPO_LABEL: Record<string, string> = {
                vacinacao: 'Vacinação', vermifugacao: 'Vermifugação', medicacao: 'Medicação',
                procedimento: 'Procedimento', exame: 'Exame', outro: 'Outro',
              }
              const TIPO_CLS: Record<string, string> = {
                vacinacao: 'bg-blue-100 text-blue-700', vermifugacao: 'bg-purple-100 text-purple-700',
                medicacao: 'bg-amber-100 text-amber-700', procedimento: 'bg-gray-100 text-gray-600',
                exame: 'bg-green-100 text-green-700', outro: 'bg-gray-100 text-gray-600',
              }
              const meds = (ev.dados?.medicamentos ?? []) as { nome: string; unidade: string; quantidade: string }[]
              const medsStr = meds.length ? meds.map(m => {
                const qtdUnit = [m.quantidade, m.unidade].filter(Boolean).join(' ')
                return [m.nome, qtdUnit].filter(Boolean).join(' · ')
              }).join(', ') : null
              return (
                <div key={ev.id} className="px-6 py-3 flex items-start gap-4">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium">{fmtDate(ev.data)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_CLS[ev.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                      </span>
                      <span className="text-sm">{ev.descricao}</span>
                    </div>
                    {medsStr && <p className="text-xs text-muted-foreground mt-0.5">{medsStr}</p>}
                    {ev.dados?.responsavel && <p className="text-xs text-muted-foreground mt-0.5">{ev.dados.responsavel}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Histórico de movimentações */}
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Histórico de movimentações</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Rastreabilidade de lote e local ao longo do tempo</p>
        </div>
        {movimentacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-8 text-center">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="divide-y">
            {movimentacoes.map((m) => (
              <div key={m.id} className="px-6 py-3 flex items-start gap-4">
                <div className="w-24 shrink-0">
                  <p className="text-sm font-medium">{fmtDate(m.data)}</p>
                  <p className="text-xs text-muted-foreground">{TIPO_LABEL[m.tipo] ?? m.tipo}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <MovDiff mov={m} />
                  {m.motivo && <p className="text-xs text-muted-foreground mt-1">{m.motivo}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
