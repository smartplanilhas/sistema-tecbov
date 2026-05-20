'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { deleteMovimentacao } from './actions'
import { cn } from '@/lib/utils'

type Movimentacao = {
  id:             string
  tipo:           string
  quantidade:     number
  valor_unitario: number | null
  data:           string
  motivo:         string | null
  produtos_estoque: { codigo: string; descricao: string; unidade: string | null } | null
  lotes:           { nome: string } | null
  animals:         { brinco: string | null; nome: string | null } | null
}

function fmtData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtNum(n: number, dec = 3) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: dec })
}

export function MovimentacoesView({
  tenantSlug,
  movimentacoes,
}: {
  tenantSlug:    string
  movimentacoes: Movimentacao[]
}) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (!confirm('Excluir esta movimentação? O saldo do produto será recalculado.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteMovimentacao(tenantSlug, id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Últimos movimentos</p>

      {movimentacoes.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground text-sm">
          Nenhuma movimentação registrada ainda.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produto</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-24">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Quantidade</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell w-28">Valor total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Motivo / vínculo</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {movimentacoes.map(m => {
                  const valorTotal = m.valor_unitario != null
                    ? m.quantidade * m.valor_unitario
                    : null
                  const vinculo = m.lotes
                    ? `Lote: ${m.lotes.nome}`
                    : m.animals
                      ? `Animal: ${m.animals.brinco ?? '—'}${m.animals.nome ? ` — ${m.animals.nome}` : ''}`
                      : m.motivo

                  return (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {fmtData(m.data)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{m.produtos_estoque?.descricao ?? '—'}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">
                          {m.produtos_estoque?.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.tipo === 'entrada' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                            <TrendingUp className="h-3 w-3" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                            <TrendingDown className="h-3 w-3" /> Saída
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {fmtNum(m.quantidade)}
                        {m.produtos_estoque?.unidade && (
                          <span className="text-xs text-muted-foreground ml-1">{m.produtos_estoque.unidade}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                        {valorTotal != null
                          ? `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-xs truncate">
                        {vinculo ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('h-8 w-8 text-muted-foreground hover:text-destructive', deletingId === m.id && 'opacity-50')}
                          disabled={deletingId === m.id}
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
