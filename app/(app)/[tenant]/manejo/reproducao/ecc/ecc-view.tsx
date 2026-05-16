'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Check, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createEccRegistros, deleteEccRegistro } from './actions'

type Femea = {
  id: string
  brinco: string | null
  nome: string | null
  categoria: string | null
}

type EccRecord = {
  id: string
  animal_id: string
  data: string
  escore: number
  avaliador: string | null
  observacoes: string | null
  animal: { brinco: string | null; nome: string | null } | null
}

type SessionEntry = { id: string; femea: Femea; escore: number }

const SCORES = [1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0]

function scoreColor(s: number) {
  if (s <= 2.0) return 'bg-red-100 text-red-700'
  if (s <= 3.0) return 'bg-amber-100 text-amber-700'
  if (s <= 4.5) return 'bg-green-100 text-green-700'
  if (s <= 6.0) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function scoreLabel(s: number) {
  if (s <= 2.0) return 'Muito baixo'
  if (s <= 3.0) return 'Baixo'
  if (s <= 4.5) return 'Ideal'
  if (s <= 6.0) return 'Alto'
  return 'Muito alto'
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function EccView({
  tenantSlug,
  femeas,
  historico,
}: {
  tenantSlug: string
  femeas: Femea[]
  historico: EccRecord[]
}) {
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [data, setData]           = useState(today)
  const [avaliador, setAvaliador] = useState('')

  const [search, setSearch]             = useState('')
  const [searchOpen, setSearchOpen]     = useState(false)
  const [selectedFemea, setSelectedFemea] = useState<Femea | null>(null)
  const [escore, setEscore]             = useState(3.5)

  const [entries, setEntries] = useState<SessionEntry[]>([])
  const sessionIds = useMemo(() => new Set(entries.map(e => e.id)), [entries])

  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const searchRef = useRef<HTMLInputElement>(null)

  const femeasDisponiveis = useMemo(() => {
    const q = search.toLowerCase()
    return femeas.filter(f =>
      !sessionIds.has(f.id) &&
      (!q || f.brinco?.toLowerCase().includes(q) || f.nome?.toLowerCase().includes(q))
    )
  }, [femeas, search, sessionIds])

  function selectFemea(f: Femea) {
    setSelectedFemea(f)
    setSearch(f.brinco ?? f.nome ?? '')
    setSearchOpen(false)
  }

  function addEntry() {
    if (!selectedFemea) return
    setEntries(prev => [...prev, { id: selectedFemea.id, femea: selectedFemea, escore }])
    setSelectedFemea(null)
    setSearch('')
    setEscore(3.5)
    setSuccess('')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function handleSave() {
    if (!entries.length) return
    setError('')
    setSuccess('')
    startTransition(async () => {
      const result = await createEccRegistros(tenantSlug, {
        data,
        avaliador: avaliador.trim() || null,
        observacoes: null,
        registros: entries.map(e => ({ animal_id: e.id, escore: e.escore })),
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`${entries.length} registro(s) salvos com sucesso.`)
        setEntries([])
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteEccRegistro(tenantSlug, id)
      if (!result.error) router.refresh()
    })
  }

  const SELECT = 'flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="space-y-6">
      {/* Session header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Data da avaliação</label>
          <Input type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Avaliador{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input
            value={avaliador}
            onChange={e => setAvaliador(e.target.value)}
            placeholder="Nome do avaliador"
          />
        </div>
      </div>

      {/* Animal + score row */}
      <div className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0 space-y-1.5 relative">
          <label className="text-sm font-medium">Animal</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedFemea(null); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Buscar por brinco ou nome…"
              className="pl-9"
            />
          </div>
          {searchOpen && femeasDisponiveis.length > 0 && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-md max-h-52 overflow-auto">
              {femeasDisponiveis.slice(0, 12).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={() => selectFemea(f)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{f.brinco ?? '—'}</span>
                  {f.nome && <span className="text-muted-foreground ml-1.5">· {f.nome}</span>}
                  {f.categoria && <span className="text-muted-foreground ml-1.5">· {f.categoria}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 shrink-0">
          <label className="text-sm font-medium">ECC (1,0 – 9,0)</label>
          <select
            value={escore}
            onChange={e => setEscore(Number(e.target.value))}
            className={SELECT}
          >
            {SCORES.map(s => (
              <option key={s} value={s}>{s.toFixed(1)} — {scoreLabel(s)}</option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={addEntry}
          disabled={!selectedFemea}
          className="gap-2 shrink-0 self-end"
        >
          Adicionar
        </Button>
      </div>

      {/* Session entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Animais desta sessão{' '}
            <span className="text-muted-foreground font-normal">({entries.length})</span>
          </h3>
          <div className="border rounded-md divide-y">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="font-medium text-sm w-20 shrink-0">{entry.femea.brinco ?? '—'}</span>
                <span className="text-sm text-muted-foreground flex-1 truncate">{entry.femea.nome ?? '—'}</span>
                {entry.femea.categoria && (
                  <span className="text-xs text-muted-foreground hidden sm:block shrink-0">{entry.femea.categoria}</span>
                )}
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${scoreColor(entry.escore)}`}>
                  {entry.escore.toFixed(1)} · {scoreLabel(entry.escore)}
                </span>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending} className="gap-2">
              <Check className="h-4 w-4" />
              {isPending ? 'Salvando…' : `Registrar ${entries.length} animal(is)`}
            </Button>
          </div>
        </div>
      )}

      {success && !entries.length && (
        <p className="text-sm text-green-600">{success}</p>
      )}

      {/* ECC scale legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">1,0–2,0 Muito baixo</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">2,5–3,0 Baixo</span>
        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">3,5–4,5 Ideal</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">5,0–6,0 Alto</span>
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">6,5–9,0 Muito alto</span>
      </div>

      {/* History */}
      {historico.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Registros recentes</h3>
          <div className="border rounded-md divide-y">
            {historico.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{fmtDate(r.data)}</span>
                <span className="font-medium text-sm w-20 shrink-0">{r.animal?.brinco ?? '—'}</span>
                <span className="text-sm text-muted-foreground flex-1 truncate">{r.animal?.nome ?? '—'}</span>
                {r.avaliador && (
                  <span className="text-xs text-muted-foreground hidden sm:block shrink-0">{r.avaliador}</span>
                )}
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${scoreColor(Number(r.escore))}`}>
                  {Number(r.escore).toFixed(1)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {historico.length === 0 && entries.length === 0 && !success && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum registro de ECC ainda. Adicione animais acima para começar.
        </div>
      )}
    </div>
  )
}
