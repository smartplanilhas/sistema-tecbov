'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HistoricoView, type EventoSanidade } from './historico-view'

export function SanidadePageView({
  tenantSlug,
  eventos,
}: {
  tenantSlug: string
  eventos: EventoSanidade[]
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manejo Sanitário</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {eventos.length} evento{eventos.length !== 1 ? 's' : ''} registrado{eventos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${tenantSlug}/manejo/sanidade/registrar`}>
            <Plus className="h-4 w-4" />
            Novo manejo
          </Link>
        </Button>
      </div>

      <HistoricoView tenantSlug={tenantSlug} eventos={eventos} />
    </div>
  )
}
