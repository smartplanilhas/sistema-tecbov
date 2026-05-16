'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { createLote, updateLote } from './actions'

export type LoteData = {
  id: string
  fazenda_id: string | null
  nome: string
  descricao: string | null
  fase: string | null
  meta_peso: number | null
  data_prevista_saida: string | null
  observacoes: string | null
  status: string
}

type Fazenda = { id: string; nome: string }

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const FASES = [
  { value: 'desmama',      label: 'Desmama'      },
  { value: 'cria',         label: 'Cria'         },
  { value: 'recria',       label: 'Recria'       },
  { value: 'engorda',      label: 'Engorda'      },
  { value: 'terminacao',   label: 'Terminação'   },
  { value: 'matrizes',     label: 'Matrizes'     },
  { value: 'reprodutores', label: 'Reprodutores' },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

export function LoteForm({
  tenantSlug,
  fazendas,
  lote,
}: {
  tenantSlug: string
  fazendas: Fazenda[]
  lote?: LoteData
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const isEditing = !!lote

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isEditing
        ? await updateLote(tenantSlug, lote.id, fd)
        : await createLote(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      router.push(`/${tenantSlug}/animais/lotes`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fazendas.length === 1 && (
        <input type="hidden" name="fazenda_id" value={fazendas[0].id} />
      )}

      {fazendas.length > 1 && (
        <Field label="Fazenda">
          <select name="fazenda_id" defaultValue={lote?.fazenda_id ?? ''} className={SELECT_CLS}>
            <option value="">Todas as fazendas</option>
            {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </Field>
      )}

      {/* Identificação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome" required>
          <Input
            name="nome"
            defaultValue={lote?.nome ?? ''}
            placeholder="Ex: Lote Engorda 01"
            required
          />
        </Field>
        <Field label="Fase do lote">
          <select name="fase" defaultValue={lote?.fase ?? ''} className={SELECT_CLS}>
            <option value="">Não informada</option>
            {FASES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Descrição">
        <Input
          name="descricao"
          defaultValue={lote?.descricao ?? ''}
          placeholder="Descrição resumida do lote…"
        />
      </Field>

      {/* Meta */}
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide pt-1">Meta</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Meta de peso (kg)">
          <Input
            type="number"
            name="meta_peso"
            step="0.1"
            min="0"
            defaultValue={lote?.meta_peso ?? ''}
            placeholder="0,0"
          />
        </Field>
        <Field label="Data prevista de saída">
          <Input
            type="date"
            name="data_prevista_saida"
            defaultValue={lote?.data_prevista_saida ?? ''}
          />
        </Field>
      </div>

      {/* Status — somente na edição */}
      {isEditing && (
        <Field label="Status">
          <select name="status" defaultValue={lote?.status ?? 'ativo'} className={SELECT_CLS}>
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </Field>
      )}

      <Field label="Observações">
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={lote?.observacoes ?? ''}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Informações adicionais sobre o lote…"
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={() => router.push(`/${tenantSlug}/animais/lotes`)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar lote'}
        </Button>
      </div>
    </form>
  )
}
