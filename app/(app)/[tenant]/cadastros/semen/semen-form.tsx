'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { createSemen, updateSemen } from './actions'

export type SemenData = {
  id: string
  nome_touro: string
  registro_rgd: string | null
  raca: string | null
  apelido_codigo: string | null
  central_coleta: string | null
  grau_sangue: string | null
  tipo: string
  qtd_doses: number | null
  botijao: string | null
  caneca: string | null
  observacoes_zootecnicas: string | null
  pai_nome: string | null
  pai_rgd: string | null
  observacoes: string | null
  status: string
}

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
const TEXTAREA_CLS = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none'
const SECTION_CLS = 'rounded-lg border bg-card p-5 space-y-4'
const SECTION_TITLE_CLS = 'text-sm font-semibold text-foreground border-b pb-2 mb-1'

const RACAS = [
  'Nelore', 'Angus', 'Brahman', 'Hereford', 'Simental', 'Limousin',
  'Charolês', 'Gir', 'Guzerá', 'Tabapuã', 'Senepol', 'Brangus', 'Outra',
]

const CENTRAIS = ['ABS', 'Alta Genetics', 'CRV Lagoa', 'Sexing Technologies', 'Genex', 'Semex', 'Outra']

const GRAUS_SANGUE = ['PO – Puro de Origem', '100% Puro', '7/8', '3/4', '5/8', '1/2']

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

export function SemenForm({
  tenantSlug,
  semen,
}: {
  tenantSlug: string
  semen?: SemenData
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const isEditing = !!semen

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isEditing
        ? await updateSemen(tenantSlug, semen.id, fd)
        : await createSemen(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      router.push(`/${tenantSlug}/cadastros/semen`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Identificação */}
      <div className={SECTION_CLS}>
        <p className={SECTION_TITLE_CLS}>Identificação do Touro</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome do Touro" required>
            <Input
              name="nome_touro"
              defaultValue={semen?.nome_touro ?? ''}
              placeholder="Nome comercial completo"
              required
            />
          </Field>
          <Field label="Registro (RGD)">
            <Input
              name="registro_rgd"
              defaultValue={semen?.registro_rgd ?? ''}
              placeholder="Registro genealógico definitivo"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Raça">
            <select name="raca" defaultValue={semen?.raca ?? ''} className={SELECT_CLS}>
              <option value="">Não informada</option>
              {RACAS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Apelido / Código Interno">
            <Input
              name="apelido_codigo"
              defaultValue={semen?.apelido_codigo ?? ''}
              placeholder="Como o touro é conhecido na fazenda"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Central de Coleta">
            <select name="central_coleta" defaultValue={semen?.central_coleta ?? ''} className={SELECT_CLS}>
              <option value="">Não informada</option>
              {CENTRAIS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Grau de Sangue">
            <select name="grau_sangue" defaultValue={semen?.grau_sangue ?? ''} className={SELECT_CLS}>
              <option value="">Não informado</option>
              {GRAUS_SANGUE.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo de Sêmen">
            <select name="tipo" defaultValue={semen?.tipo ?? 'convencional'} className={SELECT_CLS}>
              <option value="convencional">Convencional</option>
              <option value="sexado_macho">Sexado – Macho</option>
              <option value="sexado_femea">Sexado – Fêmea</option>
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={semen?.status ?? 'ativo'} className={SELECT_CLS}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Armazenamento */}
      <div className={SECTION_CLS}>
        <p className={SECTION_TITLE_CLS}>Armazenamento</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Quantidade de Doses">
            <Input
              type="number"
              name="qtd_doses"
              min="0"
              step="1"
              defaultValue={semen?.qtd_doses ?? ''}
              placeholder="0"
            />
          </Field>
          <Field label="Botijão">
            <Input
              name="botijao"
              defaultValue={semen?.botijao ?? ''}
              placeholder="Ex: Botijão 01"
            />
          </Field>
          <Field label="Caneca / Posição">
            <Input
              name="caneca"
              defaultValue={semen?.caneca ?? ''}
              placeholder="Ex: Caneca A, Palheta 3"
            />
          </Field>
        </div>
      </div>

      {/* Dados Zootécnicos */}
      <div className={SECTION_CLS}>
        <p className={SECTION_TITLE_CLS}>Dados Zootécnicos</p>

        <Field label="Informações zootécnicas">
          <textarea
            name="observacoes_zootecnicas"
            rows={3}
            defaultValue={semen?.observacoes_zootecnicas ?? ''}
            className={TEXTAREA_CLS}
            placeholder="DEPs, índices de seleção, características produtivas…"
          />
        </Field>
      </div>

      {/* Dados do Pai */}
      <div className={SECTION_CLS}>
        <p className={SECTION_TITLE_CLS}>Dados do Pai</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome do Pai">
            <Input
              name="pai_nome"
              defaultValue={semen?.pai_nome ?? ''}
              placeholder="Nome do pai"
            />
          </Field>
          <Field label="Registro do Pai (RGD)">
            <Input
              name="pai_rgd"
              defaultValue={semen?.pai_rgd ?? ''}
              placeholder="Registro genealógico do pai"
            />
          </Field>
        </div>
      </div>

      {/* Observações */}
      <Field label="Observações">
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={semen?.observacoes ?? ''}
          className={TEXTAREA_CLS}
          placeholder="Informações adicionais…"
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={() => router.push(`/${tenantSlug}/cadastros/semen`)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar sêmen'}
        </Button>
      </div>
    </form>
  )
}
