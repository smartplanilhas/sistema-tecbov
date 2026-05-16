'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Droplets } from 'lucide-react'
import { deleteSemen } from './actions'

type Semen = {
  id: string
  nome_touro: string
  registro_rgd: string | null
  raca: string | null
  apelido_codigo: string | null
  central_coleta: string | null
  tipo: string
  qtd_doses: number | null
  status: string
}

const TIPO_LABEL: Record<string, string> = {
  convencional:  'Convencional',
  sexado_macho:  'Sexado M',
  sexado_femea:  'Sexado F',
}

const TIPO_COLOR: Record<string, string> = {
  convencional: 'bg-blue-100 text-blue-700',
  sexado_macho: 'bg-indigo-100 text-indigo-700',
  sexado_femea: 'bg-pink-100 text-pink-700',
}

export function SemenView({
  tenantSlug,
  semens,
}: {
  tenantSlug: string
  semens: Semen[]
}) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (!confirm('Excluir este registro de sêmen? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteSemen(tenantSlug, id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sêmen</h1>
          <p className="text-muted-foreground text-sm">{semens.length} touro(s) cadastrado(s)</p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${tenantSlug}/cadastros/semen/novo`}>
            <Plus className="h-4 w-4" /> Novo sêmen
          </Link>
        </Button>
      </div>

      {semens.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Droplets className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">Nenhum sêmen cadastrado.</p>
          <Button asChild variant="outline" className="mt-4 gap-2">
            <Link href={`/${tenantSlug}/cadastros/semen/novo`}>
              <Plus className="h-4 w-4" /> Cadastrar primeiro sêmen
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Touro</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">RGD</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Raça</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Central</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Doses</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {semens.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.nome_touro}</p>
                      {s.apelido_codigo && (
                        <p className="text-xs text-muted-foreground">{s.apelido_codigo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.registro_rgd ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.raca ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.central_coleta ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[s.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                        {TIPO_LABEL[s.tipo] ?? s.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {s.qtd_doses != null ? s.qtd_doses : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${s.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/${tenantSlug}/cadastros/semen/${s.id}/editar`}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
