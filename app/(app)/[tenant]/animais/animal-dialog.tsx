'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createAnimal, updateAnimal } from './actions'

type Fazenda = { id: string; nome: string }
type Categoria = { id: string; nome: string; sexo: string; ordem: number }

type Animal = {
  id: string
  fazenda_id: string
  categoria_id: string | null
  sexo: string
  brinco: string | null
  identificador: string | null
  sisbov: string | null
  registro: string | null
  rfid: string | null
  nome: string | null
  raca: string | null
  origem: string | null
  status: string
  data_nascimento: string | null
  data_compra: string | null
  data_entrada: string | null
  data_saida: string | null
  data_desmama: string | null
  observacoes: string | null
}

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export function AnimalDialog({
  tenantSlug,
  fazendas,
  categorias,
  animal,
  open,
  onClose,
}: {
  tenantSlug: string
  fazendas: Fazenda[]
  categorias: Categoria[]
  animal?: Animal
  open: boolean
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [sexo, setSexo] = useState(animal?.sexo ?? '')
  const [categoriaId, setCategoriaId] = useState(animal?.categoria_id ?? '')

  useEffect(() => {
    if (open) {
      setSexo(animal?.sexo ?? '')
      setCategoriaId(animal?.categoria_id ?? '')
      setError('')
    }
  }, [open, animal])

  function handleCategoriaChange(id: string) {
    setCategoriaId(id)
    const cat = categorias.find(c => c.id === id)
    if (cat) setSexo(cat.sexo)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = animal
        ? await updateAnimal(tenantSlug, animal.id, fd)
        : await createAnimal(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  const title = animal ? 'Editar animal' : 'Novo animal'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <input type="hidden" name="sexo" value={sexo} />

          {/* Fazenda */}
          {fazendas.length > 1 && (
            <Field label="Fazenda" required>
              <select name="fazenda_id" required defaultValue={animal?.fazenda_id ?? ''} className={SELECT_CLS}>
                <option value="">Selecione</option>
                {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
          )}
          {fazendas.length === 1 && (
            <input type="hidden" name="fazenda_id" value={fazendas[0].id} />
          )}

          {/* Categoria + Sexo */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria" required>
              <select
                name="categoria_id"
                value={categoriaId}
                onChange={e => handleCategoriaChange(e.target.value)}
                required
                className={SELECT_CLS}
              >
                <option value="">Selecione</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Sexo">
              <div className="flex h-9 items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                {sexo === 'M' ? 'Macho' : sexo === 'F' ? 'Fêmea' : '—'}
              </div>
            </Field>
          </div>

          {/* Identificação */}
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Identificação</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brinco"><Input name="brinco" defaultValue={animal?.brinco ?? ''} /></Field>
            <Field label="Identificador"><Input name="identificador" defaultValue={animal?.identificador ?? ''} /></Field>
            <Field label="SISBOV"><Input name="sisbov" defaultValue={animal?.sisbov ?? ''} /></Field>
            <Field label="Registro"><Input name="registro" defaultValue={animal?.registro ?? ''} /></Field>
            <Field label="RFID"><Input name="rfid" defaultValue={animal?.rfid ?? ''} /></Field>
            <Field label="Nome"><Input name="nome" defaultValue={animal?.nome ?? ''} /></Field>
            <Field label="Raça"><Input name="raca" defaultValue={animal?.raca ?? ''} /></Field>
          </div>

          {/* Origem e Status */}
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Origem e Status</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origem">
              <select name="origem" defaultValue={animal?.origem ?? ''} className={SELECT_CLS}>
                <option value="">Não informado</option>
                <option value="compra">Compra</option>
                <option value="nascimento">Nascimento</option>
                <option value="transferencia">Transferência</option>
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={animal?.status ?? 'ativo'} className={SELECT_CLS}>
                <option value="ativo">Ativo</option>
                <option value="vendido">Vendido</option>
                <option value="morto">Morto</option>
                <option value="transferido">Transferido</option>
              </select>
            </Field>
          </div>

          {/* Datas */}
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Datas</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nascimento"><Input type="date" name="data_nascimento" defaultValue={animal?.data_nascimento ?? ''} /></Field>
            <Field label="Compra"><Input type="date" name="data_compra" defaultValue={animal?.data_compra ?? ''} /></Field>
            <Field label="Entrada na fazenda"><Input type="date" name="data_entrada" defaultValue={animal?.data_entrada ?? ''} /></Field>
            <Field label="Saída"><Input type="date" name="data_saida" defaultValue={animal?.data_saida ?? ''} /></Field>
            <Field label="Desmama"><Input type="date" name="data_desmama" defaultValue={animal?.data_desmama ?? ''} /></Field>
          </div>

          {/* Observações */}
          <Field label="Observações">
            <textarea
              name="observacoes"
              rows={2}
              defaultValue={animal?.observacoes ?? ''}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending || !sexo}>
              {pending ? 'Salvando...' : animal ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}
