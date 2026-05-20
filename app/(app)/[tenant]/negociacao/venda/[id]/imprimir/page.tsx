import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { PrintView } from './print-view'

function baseDesc(d: string) {
  return d.replace(/ — Parcela \d+\/\d+$/, '').replace(/ \[(por_kg|por_cabeca)\]$/, '')
}

function parseTipoPreco(d: string) {
  if (d.includes('[por_kg]'))     return 'Por kg (R$/kg)'
  if (d.includes('[por_cabeca]')) return 'Por cabeça (R$/cabeça)'
  return null
}

function parseAnimais(d: string) {
  const m = d.match(/(\d+) animal\(is\)/)
  return m ? parseInt(m[1]) : null
}

function parseReferencia(d: string) {
  // "Venda — REF — 3 animal(is)..." → extrai o trecho entre "Venda — " e " — N animal"
  const m = d.match(/^Venda — (.+?) — \d+ animal/)
  if (m) return m[1]
  // "Venda — REF [tag]" sem animais
  const m2 = d.match(/^Venda — (.+?)(?:\s*\[|$)/)
  if (m2 && m2[1]) return m2[1].trim()
  return null
}

export default async function ImprimirVendaPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()
  if (!tenant) return notFound()

  const { data: rootTx } = await admin
    .from('transactions')
    .select('id, date, description, amount, status, person_id, account_id, people(name), financial_accounts(name)')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .eq('type', 'INCOME')
    .single()

  if (!rootTx) return notFound()

  const base = baseDesc(rootTx.description ?? '')

  const { data: allTxs } = await admin
    .from('transactions')
    .select('id, date, amount, status, description')
    .eq('tenant_id', tenant.id)
    .eq('type', 'INCOME')
    .eq('person_id', rootTx.person_id ?? '')
    .ilike('description', `${base}%`)
    .order('date', { ascending: true })

  const grupo = (allTxs ?? []).filter(tx => baseDesc(tx.description ?? '') === base)
  const total = grupo.reduce((s, tx) => s + tx.amount, 0)

  // Busca animais vendidos linkados via movimentações se houver brincos na descrição
  const brincoMatch = base.match(/\((.+)\)$/)
  const brincosStr  = brincoMatch ? brincoMatch[1] : null

  return (
    <PrintView
      tenantNome={tenant.name}
      data={grupo[0]?.date ?? rootTx.date}
      comprador={(rootTx as any).people?.name ?? null}
      conta={(rootTx as any).financial_accounts?.name ?? null}
      referencia={parseReferencia(base)}
      tipoPreco={parseTipoPreco(rootTx.description ?? '')}
      qtdAnimais={parseAnimais(base)}
      brincos={brincosStr}
      total={total}
      parcelas={grupo.map(tx => ({
        id:     tx.id,
        date:   tx.date,
        amount: tx.amount,
        status: tx.status as 'COMPLETED' | 'PENDING',
      }))}
    />
  )
}
