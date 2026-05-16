'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PesagemRapidaView } from './pesagem-rapida-view'
import { PesagemGrupoView } from './pesagem-grupo-view'

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  peso_atual: number | null
  data_peso_atual: string | null
  lote_atual_id: string | null
  categoria: string | null
}

type Lote = { id: string; nome: string }

type HistoricoItem = {
  id: string
  peso: number
  data: string
  tipo: string
  created_at: string
  animal: { id: string; brinco: string | null; nome: string | null; categoria: string | null } | null
}

const TABS = [
  { key: 'rapida', label: 'Pesagem rápida' },
  { key: 'grupo',  label: 'Pesagem em grupo' },
] as const
type TabKey = typeof TABS[number]['key']

export function PesagemPageView({
  tenantSlug, animals, lotes, historico,
}: {
  tenantSlug: string
  animals: Animal[]
  lotes: Lote[]
  historico: HistoricoItem[]
}) {
  const [tab, setTab] = useState<TabKey>('rapida')

  return (
    <div className="space-y-6">
      {/* Tab bar */}
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

      {tab === 'rapida' && (
        <PesagemRapidaView tenantSlug={tenantSlug} animals={animals} historico={historico} />
      )}
      {tab === 'grupo' && (
        <PesagemGrupoView tenantSlug={tenantSlug} animals={animals} lotes={lotes} />
      )}
    </div>
  )
}
