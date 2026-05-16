import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { SanidadeForm } from '../registro-view'

export default async function RegistrarSanidadePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()
  const db = admin as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animaisRes, lotesRes, medicamentosRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, sexo, lote_atual_id, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),
    admin.from('lotes').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
    db.from('medicamentos').select('id, nome, unidade').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
  ])

  const animais = (animaisRes.data ?? []).map((a: any) => ({
    id: a.id,
    brinco: a.brinco,
    nome: a.nome,
    sexo: a.sexo,
    lote_atual_id: a.lote_atual_id,
    categoria: a.categorias_animal?.nome ?? null,
  }))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/manejo/sanidade`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao histórico
        </Link>
        <h1 className="text-2xl font-bold">Novo manejo sanitário</h1>
        <p className="text-muted-foreground text-sm mt-1">Data, tipo, descrição e animais são obrigatórios.</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <SanidadeForm
          tenantSlug={tenantSlug}
          animais={animais}
          lotes={lotesRes.data ?? []}
          medicamentos={medicamentosRes.data ?? []}
        />
      </div>
    </div>
  )
}
