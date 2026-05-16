'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pill, Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteMedicamento } from './actions'

type Medicamento = {
  id: string
  nome: string
  unidade: string | null
  dias_carencia: number | null
  instrucoes_uso: string | null
  status: string
}

function DeleteButton({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Excluir este medicamento?')) return
    startTransition(async () => {
      await deleteMedicamento(tenantSlug, id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export function MedicamentosView({
  tenantSlug,
  medicamentos,
}: {
  tenantSlug: string
  medicamentos: Medicamento[]
}) {
  const ativos   = medicamentos.filter(m => m.status === 'ativo')
  const inativos = medicamentos.filter(m => m.status === 'inativo')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="h-5 w-5 text-muted-foreground" />
            Medicamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {medicamentos.length} medicamento{medicamentos.length !== 1 ? 's' : ''} cadastrado{medicamentos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${tenantSlug}/cadastros/medicamentos/novo`}>
            <Plus className="h-4 w-4" />
            Novo medicamento
          </Link>
        </Button>
      </div>

      {medicamentos.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Pill className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum medicamento cadastrado ainda.</p>
          <Button asChild className="mt-4 gap-2">
            <Link href={`/${tenantSlug}/cadastros/medicamentos/novo`}>
              <Plus className="h-4 w-4" /> Cadastrar primeiro medicamento
            </Link>
          </Button>
        </div>
      ) : (
        <MedicamentosTabela
          tenantSlug={tenantSlug}
          rows={ativos}
          titulo="Ativos"
        />
      )}

      {inativos.length > 0 && (
        <MedicamentosTabela
          tenantSlug={tenantSlug}
          rows={inativos}
          titulo="Inativos"
        />
      )}
    </div>
  )
}

function MedicamentosTabela({
  tenantSlug,
  rows,
  titulo,
}: {
  tenantSlug: string
  rows: Medicamento[]
  titulo: string
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30">
        <span className="text-sm font-medium text-muted-foreground">{titulo} ({rows.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unidade</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Carência</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Instruções de uso</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(m => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{m.nome}</td>
                <td className="px-4 py-3">
                  {m.unidade
                    ? <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{m.unidade}</span>
                    : <span className="text-muted-foreground text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {m.dias_carencia != null ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                      <Clock className="h-3 w-3" />
                      {m.dias_carencia} dia{m.dias_carencia !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sem carência</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs">
                  {m.instrucoes_uso
                    ? <span className="line-clamp-2 text-xs">{m.instrucoes_uso}</span>
                    : <span className="text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Link
                      href={`/${tenantSlug}/cadastros/medicamentos/${m.id}/editar`}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <DeleteButton tenantSlug={tenantSlug} id={m.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
