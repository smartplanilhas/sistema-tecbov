'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { createLocal, updateLocal } from './actions'

export type LocalData = {
  id: string
  fazenda_id: string | null
  nome: string
  tipo: string | null
  area_ha: number | null
  sistema: string | null
  status: string
  observacoes: string | null
}

type Fazenda = { id: string; nome: string }

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const TIPOS = [
  { value: 'pasto',        label: 'Pasto'        },
  { value: 'curral',       label: 'Curral'       },
  { value: 'confinamento', label: 'Confinamento' },
  { value: 'mangueira',    label: 'Mangueira'    },
  { value: 'baia',         label: 'Baia'         },
  { value: 'outro',        label: 'Outro'        },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

export function LocalForm({
  tenantSlug,
  fazendas,
  local,
}: {
  tenantSlug: string
  fazendas: Fazenda[]
  local?: LocalData
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [tipo, setTipo]   = useState(local?.tipo ?? '')

  const isEditing = !!local

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isEditing
        ? await updateLocal(tenantSlug, local.id, fd)
        : await createLocal(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      router.push(`/${tenantSlug}/cadastros/locais`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fazendas.length === 1 && (
        <input type="hidden" name="fazenda_id" value={fazendas[0].id} />
      )}

      {/* Fazenda — só se multiFazenda */}
      {fazendas.length > 1 && (
        <Field label="Fazenda">
          <select name="fazenda_id" defaultValue={local?.fazenda_id ?? ''} className={SELECT_CLS}>
            <option value="">Todas as fazendas</option>
            {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome" required>
          <Input name="nome" defaultValue={local?.nome ?? ''} placeholder="Ex: Pasto A, Curral 1…" required />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={local?.status ?? 'ativo'} className={SELECT_CLS}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tipo">
          <select
            name="tipo"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Não informado</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Área (ha)">
          <Input
            type="number"
            name="area_ha"
            step="0.01"
            min="0"
            defaultValue={local?.area_ha ?? ''}
            placeholder="0,00"
          />
        </Field>
      </div>

      {/* Sistema — só relevante para pasto */}
      <Field label="Sistema de pastejo">
        <select
          name="sistema"
          defaultValue={local?.sistema ?? ''}
          className={SELECT_CLS}
          disabled={tipo !== '' && tipo !== 'pasto'}
        >
          <option value="">Não informado</option>
          <option value="rotacionado">Rotacionado</option>
          <option value="continuo">Contínuo</option>
        </select>
        {tipo !== '' && tipo !== 'pasto' && (
          <p className="text-xs text-muted-foreground mt-1">Aplicável apenas para pastos.</p>
        )}
      </Field>

      <Field label="Observações">
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={local?.observacoes ?? ''}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Informações adicionais sobre o local…"
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={() => router.push(`/${tenantSlug}/cadastros/locais`)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar local'}
        </Button>
      </div>
    </form>
  )
}
