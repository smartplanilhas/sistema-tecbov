'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEstacao, deleteEstacao } from './actions'

export type Estacao = {
  id: string
  nome: string
  descricao: string | null
  data_inicio: string
  data_fim: string
  created_at: string
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function duracao(inicio: string, fim: string) {
  const dias = Math.round(
    (new Date(fim + 'T12:00:00').getTime() - new Date(inicio + 'T12:00:00').getTime()) / 86_400_000
  )
  if (dias < 0) return '—'
  if (dias < 30) return `${dias} dias`
  const meses = Math.round(dias / 30)
  return `~${meses} mês${meses !== 1 ? 'es' : ''}`
}

export function EstacoesView({
  tenantSlug,
  estacoes,
}: {
  tenantSlug: string
  estacoes: Estacao[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(estacoes.length === 0)
  const [nome, setNome]             = useState('')
  const [descricao, setDescricao]   = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [error, setError]           = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await createEstacao(tenantSlug, {
        nome, descricao, data_inicio: dataInicio, data_fim: dataFim,
      })
      if (result?.error) { setError(result.error); return }
      setNome(''); setDescricao(''); setDataInicio(''); setDataFim('')
      setShowForm(false)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEstacao(tenantSlug, id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Estações reprodutivas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agrupe eventos por período para análise e relatórios
          </p>
        </div>
        {!showForm && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Nova estação
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nova estação</h3>

          <div className="space-y-1.5">
            <Label>Nome <span className="text-destructive">*</span></Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Estação 2026"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Observações sobre a estação (opcional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data de início <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de término <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar estação'}
            </Button>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => { setShowForm(false); setError('') }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {estacoes.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <CalendarRange className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Nenhuma estação cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Crie uma estação para organizar os eventos reprodutivos por período
          </p>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Nova estação
          </Button>
        </div>
      ) : estacoes.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {estacoes.map(est => (
              <div key={est.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{est.nome}</p>
                  {est.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{est.descricao}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(est.data_inicio)} → {fmtDate(est.data_fim)}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {duracao(est.data_inicio, est.data_fim)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(est.id)}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                  title="Excluir estação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
