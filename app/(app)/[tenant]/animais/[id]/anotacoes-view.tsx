'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createAnotacao, deleteAnotacao } from '../actions'

type Anotacao = {
  id: string
  data: string
  tipo: string
  texto: string
  created_at: string
}

const TIPOS = [
  { value: 'geral',       label: 'Geral' },
  { value: 'pesagem',     label: 'Pesagem' },
  { value: 'sanitario',   label: 'Sanitário' },
  { value: 'nutricao',    label: 'Nutrição' },
  { value: 'reprodutivo', label: 'Reprodutivo' },
  { value: 'outro',       label: 'Outro' },
]

const TIPO_COLOR: Record<string, string> = {
  geral:       'bg-gray-100 text-gray-700',
  pesagem:     'bg-blue-100 text-blue-700',
  sanitario:   'bg-green-100 text-green-700',
  nutricao:    'bg-yellow-100 text-yellow-700',
  reprodutivo: 'bg-pink-100 text-pink-700',
  outro:       'bg-orange-100 text-orange-700',
}

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function AnotacoesView({
  tenantSlug,
  animalId,
  anotacoes,
}: {
  tenantSlug: string
  animalId: string
  anotacoes: Anotacao[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [formKey, setFormKey]   = useState(0)
  const [error, setError]       = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      const result = await createAnotacao(tenantSlug, animalId, fd)
      if (result?.error) { setError(result.error); return }
      setFormKey(k => k + 1)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir esta anotação?')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteAnotacao(tenantSlug, id)
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Anotações</h2>
        </div>
        <span className="text-sm text-muted-foreground">{anotacoes.length} registro(s)</span>
      </div>

      {/* Form */}
      <div className="px-5 py-4 border-b bg-muted/20">
        <form key={formKey} onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1.5 w-36 shrink-0">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input type="date" name="data" defaultValue={today} required />
            </div>
            <div className="space-y-1.5 w-40 shrink-0">
              <Label>Categoria</Label>
              <select name="tipo" defaultValue="geral" className={SELECT_CLS}>
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label>Observação <span className="text-destructive">*</span></Label>
              <textarea
                name="texto"
                required
                rows={2}
                placeholder="Descreva a observação sobre o animal…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {isPending ? 'Salvando…' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </div>

      {/* List */}
      {anotacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground px-5 py-8 text-center">
          Nenhuma anotação registrada.
        </p>
      ) : (
        <div className="divide-y">
          {anotacoes.map(a => (
            <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
              <div className="w-20 shrink-0 pt-0.5">
                <p className="text-sm font-medium">{fmtDate(a.data)}</p>
              </div>
              <div className="shrink-0 pt-0.5">
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[a.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                  {TIPOS.find(t => t.value === a.tipo)?.label ?? a.tipo}
                </span>
              </div>
              <p className="flex-1 text-sm text-foreground whitespace-pre-wrap">{a.texto}</p>
              <button
                onClick={() => handleDelete(a.id)}
                disabled={deletingId === a.id}
                className="shrink-0 p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                title="Excluir anotação"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
