'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createMedicamento, updateMedicamento } from './actions'

type Medicamento = {
  id: string
  nome: string
  unidade: string | null
  dias_carencia: number | null
  instrucoes_uso: string | null
  status: string
}

export function MedicamentoForm({
  tenantSlug,
  medicamento,
}: {
  tenantSlug: string
  medicamento?: Medicamento
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = medicamento
        ? await updateMedicamento(tenantSlug, medicamento.id, fd)
        : await createMedicamento(tenantSlug, fd)
      if (result?.error) {
        alert(result.error)
        return
      }
      router.push(`/${tenantSlug}/cadastros/medicamentos`)
      router.refresh()
    })
  }

  const SELECT = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificação */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nome"
            name="nome"
            defaultValue={medicamento?.nome ?? ''}
            placeholder="ex: Ivermectina, Closantel, Oxitetraciclina…"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unidade">
            Unidade de saída{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="unidade"
            name="unidade"
            defaultValue={medicamento?.unidade ?? ''}
            placeholder="ex: ml, doses, comprimidos, g, mg…"
          />
          <p className="text-xs text-muted-foreground">
            Unidade usada ao aplicar o medicamento (exibida no lançamento sanitário).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dias_carencia">
            Dias de carência{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="dias_carencia"
            name="dias_carencia"
            type="number"
            min="0"
            defaultValue={medicamento?.dias_carencia ?? ''}
            placeholder="ex: 28"
          />
          <p className="text-xs text-muted-foreground">
            Período de carência em dias após a aplicação. Deixe em branco se não houver carência.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instrucoes_uso">
            Instruções de uso{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <textarea
            id="instrucoes_uso"
            name="instrucoes_uso"
            rows={4}
            defaultValue={medicamento?.instrucoes_uso ?? ''}
            placeholder="Dosagem, via de administração, observações clínicas…"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {medicamento && (
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={medicamento.status} className={SELECT}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${tenantSlug}/cadastros/medicamentos`)}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando…' : medicamento ? 'Salvar alterações' : 'Cadastrar medicamento'}
        </Button>
      </div>
    </form>
  )
}
