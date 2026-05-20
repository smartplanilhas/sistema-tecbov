import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

function baseDesc(d: string) {
  return d.replace(/ — Parcela \d+\/\d+$/, '').replace(/ \[(por_kg|por_cabeca)\]$/, '')
}

function parseTipoPreco(d: string): 'por_cabeca' | 'por_kg' | null {
  if (d.includes('[por_kg]'))     return 'por_kg'
  if (d.includes('[por_cabeca]')) return 'por_cabeca'
  return null
}

function parseAnimais(d: string): number | null {
  const m = d.match(/(\d+) animal\(is\)/)
  return m ? parseInt(m[1]) : null
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function VendasPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: txs } = await admin
    .from('transactions')
    .select('id, date, description, amount, status, person_id, people(name)')
    .eq('tenant_id', tenant.id)
    .eq('type', 'INCOME')
    .ilike('description', 'Venda%')
    .order('date', { ascending: false })
    .limit(50)

  type VendaRow = {
    key: string
    firstTxId: string
    date: string
    descricao: string
    comprador: string | null
    total: number
    animais: number | null
    tipoPreco: 'por_cabeca' | 'por_kg' | null
  }

  const map = new Map<string, VendaRow>()
  for (const tx of (txs ?? [])) {
    const raw  = tx.description ?? ''
    const base = baseDesc(raw)
    const key  = `${base}||${tx.person_id ?? ''}`
    const existing = map.get(key)
    if (existing) {
      existing.total += tx.amount
      if (tx.date < existing.date) {
        existing.date      = tx.date
        existing.firstTxId = tx.id
      }
    } else {
      map.set(key, {
        key,
        firstTxId: tx.id,
        date:      tx.date,
        descricao: base,
        comprador: (tx as any).people?.name ?? null,
        total:     tx.amount,
        animais:   parseAnimais(raw),
        tipoPreco: parseTipoPreco(raw),
      })
    }
  }

  const vendas = Array.from(map.values())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Histórico de negociações registradas.</p>
        </div>
        <div className="flex items-center gap-2">
<Button asChild>
            <Link href={`/${tenantSlug}/negociacao/venda/nova`}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Venda
            </Link>
          </Button>
        </div>
      </div>

      {vendas.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma venda registrada.</p>
          <p className="text-muted-foreground text-xs mt-1">Clique em <strong>Nova Venda</strong> para começar.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Comprador</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Animais</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Precificação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {vendas.map(v => (
                <tr key={v.key} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium tabular-nums">{fmtDate(v.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.comprador ?? <span className="italic text-muted-foreground/60">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs hidden md:table-cell">
                    {v.descricao}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">R$ {fmt(v.total)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell">
                    {v.animais != null ? v.animais : <span className="italic text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {v.tipoPreco == null ? (
                      <span className="italic text-muted-foreground/50 text-xs">—</span>
                    ) : (
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        v.tipoPreco === 'por_cabeca' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-100 text-cyan-700',
                      )}>
                        {v.tipoPreco === 'por_cabeca' ? 'Por cabeça' : 'Por kg'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/${tenantSlug}/negociacao/venda/${v.firstTxId}`}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/${tenantSlug}/negociacao/venda/${v.firstTxId}/imprimir`}
                        target="_blank"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Imprimir / PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
