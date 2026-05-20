import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { VendaEditView } from './venda-edit-view'

function baseDesc(d: string) {
  return d.replace(/ — Parcela \d+\/\d+$/, '').replace(/ \[(por_kg|por_cabeca)\]$/, '')
}

export default async function VendaEditPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return notFound()

  // Busca a transação raiz pelo ID
  const { data: rootTx } = await admin
    .from('transactions')
    .select('id, date, description, amount, status, person_id, account_id, people(name)')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .eq('type', 'INCOME')
    .single()

  if (!rootTx) return notFound()

  const base = baseDesc(rootTx.description ?? '')

  // Busca todas as transações do mesmo grupo (mesma base + person_id)
  const { data: allTxs } = await admin
    .from('transactions')
    .select('id, date, amount, status, description')
    .eq('tenant_id', tenant.id)
    .eq('type', 'INCOME')
    .eq('person_id', rootTx.person_id ?? '')
    .ilike('description', `${base}%`)
    .order('date', { ascending: true })

  // Filtra só as que pertencem à mesma venda (mesma base exata)
  const grupo = (allTxs ?? []).filter(tx => baseDesc(tx.description ?? '') === base)

  const [compradoresRes, accountsRes] = await Promise.all([
    admin.from('people').select('id, name').eq('tenant_id', tenant.id).eq('is_client', true).eq('active', true).order('name'),
    admin.from('financial_accounts').select('id, name').eq('tenant_id', tenant.id).eq('active', true).order('name'),
  ])

  return (
    <VendaEditView
      tenantSlug={tenantSlug}
      rootTx={{
        id:        rootTx.id,
        date:      rootTx.date,
        descricao: rootTx.description ?? '',
        base,
        compradorId:   rootTx.person_id,
        compradorNome: (rootTx as any).people?.name ?? null,
        accountId:     rootTx.account_id ?? '',
      }}
      grupo={grupo.map(tx => ({
        id:     tx.id,
        date:   tx.date,
        amount: tx.amount,
        status: tx.status as 'COMPLETED' | 'PENDING',
      }))}
      compradores={compradoresRes.data ?? []}
      accounts={accountsRes.data ?? []}
    />
  )
}
