'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FemeasView } from './femeas-view'
import { EstacoesView } from './estacoes-view'
import type { Estacao } from './estacoes-view'

export type Femea = {
  id: string
  brinco: string | null
  nome: string | null
  lote_atual_id: string | null
  local_atual_id: string | null
  peso_atual: number | null
  categoria_id: string | null
  categoria: string | null
  data_nascimento: string | null
  raca?: string | null
  status_reprodutivo?: string | null
  ultima_cobertura?: string | null
}

export type Evento = {
  id: string
  animal_id: string
  tipo: string
  data: string
  dados: Record<string, any>
  observacoes: string | null
  created_at: string
  animal: { id: string; brinco: string | null; nome: string | null; categoria: string | null } | null
}

export type Lote  = { id: string; nome: string }
export type Local = { id: string; nome: string }
export type { Estacao }

const TABS = [
  { key: 'femeas',   label: 'Fêmeas'   },
  { key: 'estacoes', label: 'Estações' },
] as const
type TabKey = typeof TABS[number]['key']

export function ReproducaoPageView({
  tenantSlug, femeas, eventos, lotes, locais, estacoes, diasLactacao,
}: {
  tenantSlug: string
  femeas: Femea[]
  eventos: Evento[]
  lotes: Lote[]
  locais: Local[]
  estacoes: Estacao[]
  diasLactacao: number
}) {
  const [tab, setTab] = useState<TabKey>('femeas')

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'femeas'   && <FemeasView   tenantSlug={tenantSlug} femeas={femeas} eventos={eventos} lotes={lotes} locais={locais} estacoes={estacoes} diasLactacao={diasLactacao} />}
      {tab === 'estacoes' && <EstacoesView tenantSlug={tenantSlug} estacoes={estacoes} />}
    </div>
  )
}
