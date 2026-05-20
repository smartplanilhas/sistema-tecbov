'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { createProduto, updateProduto } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Categoria  = { id: string; nome: string }
export type TipoUso    = { id: string; nome: string; ordem: number }
export type ProdutoData = {
  id:               string
  codigo:           string
  descricao:        string
  unidade:          string | null
  valor_medio:      number | null
  controla_estoque: boolean
  saldo_atual:      number
  estoque_minimo:   number | null
  categoria_id:     string | null
  tipo_uso_id:      string | null
  observacao:       string | null
  ativo:            boolean
}

const SELECT_CLS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function ProdutoForm({
  tenantSlug,
  categorias,
  tiposUso,
  produto,
}: {
  tenantSlug:  string
  categorias:  Categoria[]
  tiposUso:    TipoUso[]
  produto?:    ProdutoData
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState('')
  const [controla, setControla]    = useState(produto?.controla_estoque ?? true)
  const isEditing = !!produto

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const descricao = (fd.get('descricao') as string)?.trim()
    if (!descricao) { setError('Descrição é obrigatória.'); return }
    setError('')
    startTransition(async () => {
      const result = isEditing
        ? await updateProduto(tenantSlug, produto.id, fd)
        : await createProduto(tenantSlug, fd)
      if (result?.error) { setError(result.error); return }
      window.location.href = `/${tenantSlug}/estoque/produtos`
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Código — somente exibição no edit */}
      {isEditing && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border text-sm">
          <span className="text-muted-foreground">Código interno:</span>
          <span className="font-mono font-semibold">{produto.codigo}</span>
          <input type="hidden" name="ativo" value="1" />
        </div>
      )}

      <Field label="Descrição" required>
        <Input
          name="descricao"
          defaultValue={produto?.descricao ?? ''}
          placeholder="Nome ou descrição do produto"
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Unidade">
          <select name="unidade" defaultValue={produto?.unidade ?? ''} className={SELECT_CLS}>
            <option value="">Não informada</option>
            {['kg','g','ton','L','ml','dose','palheta','saco','fardo','galão','balde','caixa','tambor','un','rolo','peça'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor médio (R$)">
          <Input
            type="number"
            name="valor_medio"
            step="0.0001"
            min="0"
            defaultValue={produto?.valor_medio ?? ''}
            placeholder="0,00"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Categoria">
          <select name="categoria_id" defaultValue={produto?.categoria_id ?? ''} className={SELECT_CLS}>
            <option value="">Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Tipo de uso">
          <select name="tipo_uso_id" defaultValue={produto?.tipo_uso_id ?? ''} className={SELECT_CLS}>
            <option value="">Não informado</option>
            {tiposUso.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Field>
      </div>

      {/* Controle de estoque */}
      <div className={`rounded-lg border p-4 space-y-4 transition-colors ${controla ? 'border-primary/30 bg-primary/5' : 'border-dashed'}`}>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="controla_estoque"
            value="1"
            checked={controla}
            onChange={e => setControla(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-primary"
          />
          <span className="text-sm font-medium">Controla estoque</span>
        </label>

        {controla && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={isEditing ? 'Saldo atual' : 'Saldo inicial'}>
              <Input
                type="number"
                name={isEditing ? 'saldo_atual' : 'saldo_inicial'}
                step="0.001"
                min="0"
                defaultValue={produto?.saldo_atual ?? ''}
                placeholder="0"
              />
            </Field>
            <Field label="Estoque mínimo">
              <Input
                type="number"
                name="estoque_minimo"
                step="0.001"
                min="0"
                defaultValue={produto?.estoque_minimo ?? ''}
                placeholder="0"
              />
            </Field>
          </div>
        )}
      </div>

      <Field label="Observação">
        <textarea
          name="observacao"
          rows={3}
          defaultValue={produto?.observacao ?? ''}
          placeholder="Informações adicionais sobre o produto…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => { window.location.href = `/${tenantSlug}/estoque/produtos` }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="gap-2">
          <Save className="h-4 w-4" />
          {pending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </div>
    </form>
  )
}
