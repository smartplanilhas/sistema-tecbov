'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Scale, Trash2, Plus, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPesagem, deletePesagem, updatePesagem } from '../actions'

type Pesagem = {
  id: string
  data: string
  peso: number
  tipo: string
  variacao: number | null
  gmd: number | null
}

const TIPO_LABEL: Record<string, string> = {
  entrada:  'Entrada',
  controle: 'Controle',
  saida:    'Saída',
  venda:    'Venda',
}
const TIPO_COLOR: Record<string, string> = {
  entrada:  'bg-blue-100 text-blue-700',
  controle: 'bg-gray-100 text-gray-700',
  saida:    'bg-orange-100 text-orange-700',
  venda:    'bg-green-100 text-green-700',
}

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function fmt(v: number, dec = 1) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function PesagensView({
  tenantSlug,
  animalId,
  pesagens,
}: {
  tenantSlug: string
  animalId: string
  pesagens: Pesagem[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [error, setError]       = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formKey, setFormKey]   = useState(0)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPeso, setEditPeso]   = useState('')
  const [editData, setEditData]   = useState('')
  const [editTipo, setEditTipo]   = useState('controle')
  const [editError, setEditError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      const result = await createPesagem(tenantSlug, animalId, fd)
      if (result?.error) { setError(result.error); return }
      setFormKey(k => k + 1)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir esta pesagem? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    startTransition(async () => {
      await deletePesagem(tenantSlug, id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function startEdit(p: Pesagem) {
    setEditingId(p.id)
    setEditPeso(String(p.peso))
    setEditData(p.data)
    setEditTipo(p.tipo)
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError('')
  }

  function handleSaveEdit(pesagemId: string) {
    const peso = parseFloat(editPeso)
    if (!peso || peso <= 0) { setEditError('Peso inválido.'); return }
    if (!editData) { setEditError('Data obrigatória.'); return }
    setEditError('')
    startTransition(async () => {
      const result = await updatePesagem(tenantSlug, pesagemId, { peso, data: editData, tipo: editTipo })
      if (result?.error) { setEditError(result.error); return }
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          Registrar pesagem
        </h2>
        <form key={formKey} onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input type="date" name="data" defaultValue={today} required />
            </div>
            <div className="space-y-1.5">
              <Label>Peso (kg) <span className="text-destructive">*</span></Label>
              <Input type="number" name="peso" step="0.001" min="1" placeholder="0.000" required />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select name="tipo" defaultValue="controle" className={SELECT_CLS}>
                <option value="controle">Controle</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="venda">Venda</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              {isPending ? 'Salvando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Histórico de pesagens</h2>
          <span className="text-sm text-muted-foreground">{pesagens.length} registro(s)</span>
        </div>
        {pesagens.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma pesagem registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Peso</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Variação</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">GMD</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pesagens.map(p => {
                  const isEditing = editingId === p.id
                  if (isEditing) {
                    return (
                      <>
                        <tr key={p.id} className="bg-muted/30">
                          <td className="px-4 py-2">
                            <Input
                              type="date"
                              value={editData}
                              onChange={e => setEditData(e.target.value)}
                              className="h-8 text-sm w-36"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              step="0.001"
                              min="1"
                              value={editPeso}
                              onChange={e => setEditPeso(e.target.value)}
                              className="h-8 text-sm w-28 text-right"
                            />
                          </td>
                          <td className="px-4 py-2 text-center text-muted-foreground">—</td>
                          <td className="px-4 py-2 text-center text-muted-foreground">—</td>
                          <td className="px-4 py-2">
                            <select
                              value={editTipo}
                              onChange={e => setEditTipo(e.target.value)}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="controle">Controle</option>
                              <option value="entrada">Entrada</option>
                              <option value="saida">Saída</option>
                              <option value="venda">Venda</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleSaveEdit(p.id)}
                                disabled={isPending}
                                className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors disabled:opacity-50"
                                title="Salvar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editError && (
                          <tr key={`${p.id}-err`}>
                            <td colSpan={6} className="px-4 pb-2">
                              <p className="text-xs text-destructive">{editError}</p>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  }

                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{fmtDate(p.data)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(p.peso)} kg</td>
                      <td className="px-4 py-3 text-right">
                        {p.variacao != null ? (
                          <span className={p.variacao >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {p.variacao >= 0 ? '+' : ''}{fmt(p.variacao)} kg
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.gmd != null ? (
                          <span className={p.gmd >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {fmt(p.gmd, 3)} kg/d
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[p.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                          {TIPO_LABEL[p.tipo] ?? p.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                            title="Editar pesagem"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Excluir pesagem"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
