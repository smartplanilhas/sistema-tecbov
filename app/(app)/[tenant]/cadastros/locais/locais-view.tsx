'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { deleteLocal } from './actions'

type Local = {
  id: string
  nome: string
  tipo: string | null
  area_ha: number | null
  sistema: string | null
  status: string
  fazendas: { nome: string } | null
  animal_count: number
}

const TIPO_LABEL: Record<string, string> = {
  pasto:        'Pasto',
  curral:       'Curral',
  confinamento: 'Confinamento',
  mangueira:    'Mangueira',
  baia:         'Baia',
  outro:        'Outro',
}

const TIPO_COLOR: Record<string, string> = {
  pasto:        'bg-green-100 text-green-700',
  curral:       'bg-orange-100 text-orange-700',
  confinamento: 'bg-blue-100 text-blue-700',
  mangueira:    'bg-cyan-100 text-cyan-700',
  baia:         'bg-purple-100 text-purple-700',
  outro:        'bg-gray-100 text-gray-700',
}

const SISTEMA_LABEL: Record<string, string> = {
  rotacionado: 'Rotacionado',
  continuo:    'Contínuo',
}

function fmt(v: number | null, dec = 2) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function lotacao(count: number, area: number | null): string {
  if (!area || area <= 0) return '—'
  const ua = count / area
  return `${ua.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} an/ha`
}

export function LocaisView({
  tenantSlug,
  locais,
  multiFazenda,
}: {
  tenantSlug: string
  locais: Local[]
  multiFazenda: boolean
}) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (!confirm('Excluir este local? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteLocal(tenantSlug, id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locais</h1>
          <p className="text-muted-foreground text-sm">{locais.length} local(is) cadastrado(s)</p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${tenantSlug}/cadastros/locais/novo`}>
            <Plus className="h-4 w-4" /> Novo local
          </Link>
        </Button>
      </div>

      {locais.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">Nenhum local cadastrado.</p>
          <Button asChild variant="outline" className="mt-4 gap-2">
            <Link href={`/${tenantSlug}/cadastros/locais/novo`}>
              <Plus className="h-4 w-4" /> Cadastrar primeiro local
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  {multiFazenda && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fazenda</th>}
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Área</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sistema</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Animais</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Lotação</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {locais.map(l => (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{l.nome}</td>
                    {multiFazenda && (
                      <td className="px-4 py-3 text-muted-foreground">{l.fazendas?.nome ?? '—'}</td>
                    )}
                    <td className="px-4 py-3">
                      {l.tipo ? (
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[l.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                          {TIPO_LABEL[l.tipo] ?? l.tipo}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {l.area_ha != null ? `${fmt(l.area_ha)} ha` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.sistema ? SISTEMA_LABEL[l.sistema] ?? l.sistema : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{l.animal_count}</td>
                    <td className="px-4 py-3 text-right">
                      {l.animal_count > 0 ? (
                        <span className={lotacao(l.animal_count, l.area_ha) === '—' ? 'text-muted-foreground' : ''}>
                          {lotacao(l.animal_count, l.area_ha)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${l.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {l.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/${tenantSlug}/cadastros/locais/${l.id}/editar`}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(l.id)}
                          disabled={deletingId === l.id}
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
