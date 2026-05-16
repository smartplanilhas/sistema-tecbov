import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { LoteForm } from './lote-form'

export default async function NovoEmLotePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [fazendas, categorias, racas, lotes, locais, proprietariosRes] = await Promise.all([
    admin.from('fazendas').select('id, nome').eq('tenant_id', tenant.id).eq('ativa', true).order('nome'),
    admin.from('categorias_animal').select('id, nome, sexo, ordem')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .order('ordem'),
    admin.from('racas').select('id, nome')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .eq('ativa', true)
      .order('nome'),
    admin.from('lotes').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
    admin.from('locais').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
    admin.from('proprietarios').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
  ])

  const fazendasData = fazendas.data ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/animais`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para animais
        </Link>
        <h1 className="text-2xl font-bold">Cadastro em lote</h1>
        <p className="text-muted-foreground text-sm">
          Cadastre vários animais de uma vez com os mesmos dados. Até 100 animais por vez.
        </p>
      </div>

      <LoteForm
        tenantSlug={tenantSlug}
        fazendas={fazendasData}
        categorias={(categorias.data ?? []) as any}
        racas={racas.data ?? []}
        lotes={lotes.data ?? []}
        locais={locais.data ?? []}
        proprietarios={proprietariosRes.data ?? []}
        multiFazenda={fazendasData.length > 1}
      />
    </div>
  )
}
