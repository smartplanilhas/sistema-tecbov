import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Pencil, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteProduto } from './actions'

export default async function ProdutosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: produtos } = await admin
    .from('produtos_estoque')
    .select(`
      id, codigo, descricao, unidade, valor_medio,
      controla_estoque, saldo_atual, estoque_minimo, ativo,
      categorias_estoque(nome),
      tipos_uso_estoque(nome)
    `)
    .eq('tenant_id', tenant.id)
    .order('codigo')

  const lista = (produtos ?? []) as any[]

  async function excluir(id: string) {
    'use server'
    await deleteProduto(tenantSlug, id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-muted-foreground" />
            Produtos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie o cadastro de produtos do estoque.
          </p>
        </div>
        <Link href={`/${tenantSlug}/estoque/produtos/novo`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">
          <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo produto" para começar.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Código</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Tipo de uso</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Saldo</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Valor médio</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-10">Ativo</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map((p: any) => {
                const abaixoMinimo = p.controla_estoque && p.estoque_minimo != null && p.saldo_atual < p.estoque_minimo
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                    <td className="px-4 py-3 font-medium">
                      {p.descricao}
                      {p.unidade && <span className="text-xs text-muted-foreground ml-1.5">({p.unidade})</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {p.categorias_estoque?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {p.tipos_uso_estoque?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {p.controla_estoque ? (
                        <span className={abaixoMinimo ? 'text-red-600 font-semibold' : ''}>
                          {p.saldo_atual.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                          {abaixoMinimo && <span className="ml-1 text-xs">⚠</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">
                      {p.valor_medio != null
                        ? `R$ ${p.valor_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${p.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/${tenantSlug}/estoque/produtos/${p.id}/editar`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
