import { createAdminClient } from '@/lib/supabase/server'
import { LocaisView } from './locais-view'

export default async function LocaisPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [locaisRes, fazendasRes, animaisRes] = await Promise.all([
    admin
      .from('locais')
      .select('id, nome, tipo, area_ha, sistema, status, fazendas(nome)')
      .eq('tenant_id', tenant.id)
      .order('nome'),
    admin.from('fazendas').select('id').eq('tenant_id', tenant.id).eq('ativa', true),
    admin
      .from('animals')
      .select('local_atual_id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .not('local_atual_id', 'is', null),
  ])

  // Conta animais por local
  const countMap: Record<string, number> = {}
  for (const a of (animaisRes.data ?? []) as { local_atual_id: string }[]) {
    countMap[a.local_atual_id] = (countMap[a.local_atual_id] ?? 0) + 1
  }

  const locais = (locaisRes.data ?? []).map((l: any) => ({
    ...l,
    animal_count: countMap[l.id] ?? 0,
  }))

  return (
    <LocaisView
      tenantSlug={tenantSlug}
      locais={locais}
      multiFazenda={(fazendasRes.data?.length ?? 0) > 1}
    />
  )
}
