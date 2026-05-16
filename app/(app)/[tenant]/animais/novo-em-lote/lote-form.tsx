'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { createAnimaisEmLote } from '../actions'

type Fazenda      = { id: string; nome: string }
type Categoria    = { id: string; nome: string; sexo: string | null }
type Raca         = { id: string; nome: string }
type Lote         = { id: string; nome: string }
type Local        = { id: string; nome: string }
type Proprietario = { id: string; nome: string }

const SEL = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const ORIGEM_OPTIONS = [
  { value: 'compra',        label: 'Compra' },
  { value: 'nascimento',    label: 'Nascimento' },
  { value: 'transferencia', label: 'Transferência' },
]

export function LoteForm({
  tenantSlug,
  fazendas,
  categorias,
  racas,
  lotes,
  locais,
  proprietarios,
  multiFazenda,
}: {
  tenantSlug: string
  fazendas: Fazenda[]
  categorias: Categoria[]
  racas: Raca[]
  lotes: Lote[]
  locais: Local[]
  proprietarios: Proprietario[]
  multiFazenda: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [sexo, setSexo]           = useState('')
  const [comPeso, setComPeso]     = useState(false)
  const [comBrinco, setComBrinco] = useState(false)
  const [prefixo, setPrefixo]     = useState('')
  const [inicio, setInicio]       = useState(1)
  const [digitos, setDigitos]     = useState(1)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [quantidade, setQtd]      = useState(1)

  const today = new Date().toISOString().split('T')[0]

  function brincoPreview() {
    const fmt = (n: number) => prefixo + String(n).padStart(digitos, '0')
    if (quantidade <= 4) return Array.from({ length: quantidade }, (_, i) => fmt(inicio + i)).join(', ')
    return `${fmt(inicio)}, ${fmt(inicio + 1)}, ${fmt(inicio + 2)}, … ${fmt(inicio + quantidade - 1)}`
  }

  function handleCat(id: string) {
    const cat = categorias.find(c => c.id === id)
    if (cat?.sexo) setSexo(cat.sexo)
    else setSexo('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sexo) { setError('Selecione uma categoria válida.'); return }
    if (quantidade < 1 || quantidade > 100) { setError('Quantidade deve ser entre 1 e 100.'); return }
    setError('')

    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createAnimaisEmLote(tenantSlug, fd)
      if (res.error) { setError(res.error); return }
      setSuccess(`${res.count} animal(is) cadastrado(s) com sucesso!`)
      setTimeout(() => router.push(`/${tenantSlug}/animais`), 1500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="sexo" value={sexo} />

      {/* Quantidade */}
      <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quantidade</h2>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="quantidade">Número de animais <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-3">
            <Input
              id="quantidade"
              name="quantidade"
              type="number"
              min={1}
              max={100}
              value={quantidade}
              onChange={e => setQtd(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              required
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">máximo 100</span>
          </div>
          {quantidade > 1 && (
            <p className="text-xs text-muted-foreground">
              Serão criados <strong>{quantidade}</strong> animais sem brinco. Os brincos podem ser adicionados individualmente depois.
            </p>
          )}
        </div>
      </div>

      {/* Dados compartilhados */}
      <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados dos animais</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {multiFazenda && (
            <div className="space-y-2">
              <Label>Fazenda <span className="text-destructive">*</span></Label>
              <select name="fazenda_id" required className={SEL}>
                <option value="">Selecione a fazenda</option>
                {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          )}

          {!multiFazenda && fazendas[0] && (
            <input type="hidden" name="fazenda_id" value={fazendas[0].id} />
          )}

          <div className="space-y-2">
            <Label>Categoria <span className="text-destructive">*</span></Label>
            <select
              name="categoria_id"
              required
              className={SEL}
              onChange={e => handleCat(e.target.value)}
            >
              <option value="">Selecione a categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Lote</Label>
            <select name="lote_atual_id" className={SEL}>
              <option value="">Sem lote</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Local / Pasto</Label>
            <select name="local_atual_id" className={SEL}>
              <option value="">Sem local</option>
              {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Raça</Label>
            <select name="raca_id" className={SEL}>
              <option value="">Sem raça</option>
              {racas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Proprietário</Label>
            <select name="proprietario_id" className={SEL}>
              <option value="">Sem proprietário</option>
              {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Origem</Label>
            <select name="origem" className={SEL}>
              <option value="">Não informada</option>
              {ORIGEM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Data de entrada</Label>
            <Input type="date" name="data_entrada" defaultValue={today} />
          </div>

          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <Input type="date" name="data_nascimento" />
          </div>

        </div>
      </div>

      {/* Peso médio */}
      <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <input
            id="com_peso"
            type="checkbox"
            checked={comPeso}
            onChange={e => setComPeso(e.target.checked)}
            className="h-4 w-4 accent-primary rounded"
          />
          <label htmlFor="com_peso" className="text-sm font-semibold cursor-pointer">
            Adicionar peso médio de entrada
          </label>
        </div>

        {comPeso && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <Label>Peso médio (kg) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                name="peso_medio"
                step="0.001"
                min="1"
                placeholder="Ex: 280.5"
                required={comPeso}
              />
            </div>
            <div className="space-y-2">
              <Label>Data da pesagem <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                name="data_peso"
                defaultValue={today}
                required={comPeso}
              />
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              O mesmo peso será registrado como pesagem de entrada para cada animal criado.
            </p>
          </div>
        )}
      </div>

      {/* Brincos sequenciais */}
      <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <input
            id="brinco_sequencial"
            name="brinco_sequencial"
            type="checkbox"
            checked={comBrinco}
            onChange={e => setComBrinco(e.target.checked)}
            className="h-4 w-4 accent-primary rounded"
          />
          <label htmlFor="brinco_sequencial" className="text-sm font-semibold cursor-pointer">
            Gerar brincos em sequência
          </label>
        </div>

        {comBrinco && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brinco_prefixo">Prefixo</Label>
                <Input
                  id="brinco_prefixo"
                  name="brinco_prefixo"
                  placeholder="Ex: T, BR, 2024-"
                  value={prefixo}
                  onChange={e => setPrefixo(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brinco_inicio">Número inicial <span className="text-destructive">*</span></Label>
                <Input
                  id="brinco_inicio"
                  name="brinco_inicio"
                  type="number"
                  min={0}
                  value={inicio}
                  onChange={e => setInicio(Math.max(0, parseInt(e.target.value) || 0))}
                  required={comBrinco}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brinco_digitos">Dígitos mínimos</Label>
                <select
                  id="brinco_digitos"
                  name="brinco_digitos"
                  value={digitos}
                  onChange={e => setDigitos(parseInt(e.target.value))}
                  className={SEL}
                >
                  <option value={1}>1 — ex: 1, 2, 10</option>
                  <option value={2}>2 — ex: 01, 02, 10</option>
                  <option value={3}>3 — ex: 001, 002, 100</option>
                  <option value={4}>4 — ex: 0001, 0010</option>
                  <option value={5}>5 — ex: 00001</option>
                  <option value={6}>6 — ex: 000001</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Prévia dos brincos</p>
              <p className="font-mono font-medium">{brincoPreview()}</p>
              <p className="text-xs text-muted-foreground">{quantidade} brinco(s) gerado(s)</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-700 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          {success}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${tenantSlug}/animais`)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2 min-w-36">
          <Save className="h-4 w-4" />
          {isPending
            ? 'Cadastrando…'
            : `Cadastrar ${quantidade > 1 ? `${quantidade} animais` : '1 animal'}`}
        </Button>
      </div>
    </form>
  )
}
