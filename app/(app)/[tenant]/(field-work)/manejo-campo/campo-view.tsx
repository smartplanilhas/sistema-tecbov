'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Tag, Trash2, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarManejoAnimal, buscarUltimaPesagem, type MedicamentoRow } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = {
  id:              string
  brinco:          string | null
  rfid:            string | null
  nome:            string | null
  raca:            string | null
  data_nascimento: string | null
  lote_atual_id:   string | null
  local_atual_id:  string | null
  peso_atual:      number | null
  sexo:            string
  categoria:       string | null
}

type Lote  = { id: string; nome: string }
type Local = { id: string; nome: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function idadeMeses(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const nasc = new Date(dataNasc + 'T12:00:00')
  const now  = new Date()
  return (now.getFullYear() - nasc.getFullYear()) * 12 + (now.getMonth() - nasc.getMonth())
}

function diasAtras(dataStr: string): number {
  return Math.round((Date.now() - new Date(dataStr + 'T12:00:00').getTime()) / 86_400_000)
}

function arrobas(kg: number) {
  return (kg / 30).toFixed(2)
}

function emptyMed(): MedicamentoRow {
  return { tipo: 'vacina', produto: '', quantidade: '' }
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm font-bold text-green-600 mt-0.5">{value}</p>
    </div>
  )
}

// ─── Card: Identificação ──────────────────────────────────────────────────────

function CardIdentificacao({
  brincoQuery, onBrincoChange, animal, sugestoes, onSelecionarAnimal, brincoRef,
}: {
  brincoQuery:        string
  onBrincoChange:     (v: string) => void
  animal:             Animal | null
  sugestoes:          Animal[]
  onSelecionarAnimal: (a: Animal) => void
  brincoRef:          React.RefObject<HTMLInputElement | null>
}) {
  const idade = idadeMeses(animal?.data_nascimento ?? null)

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold flex items-center gap-2 mb-4">
        <Tag className="h-4 w-4 text-green-600" />
        Identificação do animal
      </h2>

      <label className="text-sm font-medium text-gray-600 block mb-1.5">Brinco ou RFID</label>
      <Input
        ref={brincoRef}
        value={brincoQuery}
        onChange={e => onBrincoChange(e.target.value)}
        placeholder="Ex: BR002"
        className="h-14 text-xl font-mono"
        autoComplete="off"
        autoFocus
      />

      {/* Suggestion list — inline, no absolute positioning */}
      {sugestoes.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-xl divide-y overflow-hidden">
          {sugestoes.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelecionarAnimal(a)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-mono font-semibold text-base">{a.brinco ?? a.rfid ?? '—'}</span>
              <span className="text-sm text-gray-400">{[a.nome, a.categoria].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}

      {/* Animal details */}
      {animal && (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-gray-100">
          <InfoField label="Categoria"  value={animal.categoria      ?? '—'} />
          <InfoField label="Raça"       value={animal.raca            ?? '—'} />
          <InfoField label="Nascimento" value={animal.data_nascimento ? fmtDate(animal.data_nascimento) : '—'} />
          <InfoField label="Idade"      value={idade != null ? `${idade} meses` : '—'} />
        </div>
      )}
    </Card>
  )
}

// ─── Card: Pesagem ────────────────────────────────────────────────────────────

function CardPesagem({
  ativo, onToggle, peso, onPesoChange, tipoPesagem, onTipoChange, ultimaPesagem,
}: {
  ativo:          boolean
  onToggle:       (v: boolean) => void
  peso:           string
  onPesoChange:   (v: string) => void
  tipoPesagem:    string
  onTipoChange:   (v: string) => void
  ultimaPesagem:  { peso: number; data: string } | null
}) {
  return (
    <Card className="p-5">
      <label className="flex items-center gap-2.5 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={ativo}
          onChange={e => onToggle(e.target.checked)}
          className="w-5 h-5 accent-green-600 cursor-pointer rounded"
        />
        <span className="text-base font-bold">Pesagem</span>
        {ativo && (
          <select
            value={tipoPesagem}
            onChange={e => onTipoChange(e.target.value)}
            className="ml-auto text-xs border rounded-md px-2 py-1 bg-background focus:outline-none"
          >
            <option value="controle">Controle</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        )}
      </label>

      {ativo && (
        <>
          <label className="text-sm font-medium text-gray-600 block mb-1.5">Peso atual (kg)</label>
          <Input
            type="number"
            inputMode="decimal"
            value={peso}
            onChange={e => onPesoChange(e.target.value)}
            placeholder="0,0"
            className="h-14 text-2xl text-center font-semibold"
          />

          {ultimaPesagem && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Peso anterior</p>
                <p className="text-lg font-bold mt-1">
                  {ultimaPesagem.peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
                </p>
                <p className="text-xs text-gray-400">{arrobas(ultimaPesagem.peso)} @</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Última pesagem</p>
                <p className="text-lg font-bold mt-1">{fmtDate(ultimaPesagem.data)}</p>
                <p className="text-xs text-gray-400">há {diasAtras(ultimaPesagem.data)} dias</p>
              </div>
            </div>
          )}

          {!ultimaPesagem && (
            <p className="text-xs text-gray-400 mt-3">Sem pesagem anterior registrada</p>
          )}
        </>
      )}

      {!ativo && (
        <p className="text-sm text-gray-400">Clique no checkbox para ativar a pesagem</p>
      )}
    </Card>
  )
}

// ─── Card: Sanitário ──────────────────────────────────────────────────────────

function CardSanitario({
  ativo, onToggle, medicamentos, onAddMed, onRemoveMed, onChangeMed,
}: {
  ativo:       boolean
  onToggle:    (v: boolean) => void
  medicamentos: MedicamentoRow[]
  onAddMed:    () => void
  onRemoveMed: (i: number) => void
  onChangeMed: (i: number, field: keyof MedicamentoRow, value: string) => void
}) {
  const SELECT = 'flex h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <Card className="p-5">
      <label className="flex items-center gap-2.5 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={ativo}
          onChange={e => onToggle(e.target.checked)}
          className="w-5 h-5 accent-green-600 cursor-pointer rounded"
        />
        <span className="text-base font-bold">Sanitário</span>
      </label>

      {ativo && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
            🩺 Manejo sanitário
          </p>

          {medicamentos.map((med, i) => (
            <div key={i}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Medicamento {i + 1}
              </p>
              <div className="flex gap-2 items-center">
                <select
                  value={med.tipo}
                  onChange={e => onChangeMed(i, 'tipo', e.target.value)}
                  className={`${SELECT} w-32`}
                >
                  <option value="vacina">Vacina</option>
                  <option value="vermifugo">Vermífugo</option>
                  <option value="medicamento">Medicamento</option>
                  <option value="exame">Exame</option>
                  <option value="outro">Outro</option>
                </select>
                <Input
                  value={med.produto}
                  onChange={e => onChangeMed(i, 'produto', e.target.value)}
                  placeholder="Produto..."
                  className="h-9 flex-1"
                />
                <Input
                  value={med.quantidade}
                  onChange={e => onChangeMed(i, 'quantidade', e.target.value)}
                  placeholder="ml"
                  className="h-9 w-16 text-center"
                />
                <button
                  type="button"
                  onClick={() => onRemoveMed(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddMed}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            Adicionar medicamento
          </button>
        </div>
      )}

      {!ativo && (
        <p className="text-sm text-gray-400">Clique no checkbox para registrar sanitário</p>
      )}
    </Card>
  )
}

// ─── Card: Mover para Local ────────────────────────────────────────────────────

function CardMovimentacao({
  lotes, locais, loteId, onLoteChange, localId, onLocalChange, anotacao, onAnotacaoChange,
}: {
  lotes:            Lote[]
  locais:           Local[]
  loteId:           string
  onLoteChange:     (v: string) => void
  localId:          string
  onLocalChange:    (v: string) => void
  anotacao:         string
  onAnotacaoChange: (v: string) => void
}) {
  const SELECT = 'flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold mb-4">Mover para Local</h2>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1.5">Lote / Grupo destino</label>
          <select value={loteId} onChange={e => onLoteChange(e.target.value)} className={SELECT}>
            <option value="">Selecione o destino</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>

        {locais.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Piquete / Local (opcional)</label>
            <select value={localId} onChange={e => onLocalChange(e.target.value)} className={SELECT}>
              <option value="">— nenhum —</option>
              {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1.5">Anotação</label>
          <textarea
            value={anotacao}
            onChange={e => onAnotacaoChange(e.target.value)}
            rows={3}
            placeholder="Observação sobre o manejo..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
    </Card>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CampoView({
  tenantSlug, animais, lotes, locais,
}: {
  tenantSlug: string
  animais:    Animal[]
  lotes:      Lote[]
  locais:     Local[]
}) {
  const [data, setData] = useState(todayStr)

  // Animal search
  const [brincoQuery, setBrincoQuery]       = useState('')
  const [animal, setAnimal]                 = useState<Animal | null>(null)
  const [ultimaPesagem, setUltimaPesagem]   = useState<{ peso: number; data: string } | null>(null)
  const brincoRef = useRef<HTMLInputElement>(null)

  // Sugestões derivadas — useMemo garante que sempre refletem o estado atual
  const sugestoes = useMemo<Animal[]>(() => {
    const q = brincoQuery.trim().toLowerCase()
    if (!q || animal) return []
    return animais
      .filter(a =>
        a.brinco?.toLowerCase().includes(q) ||
        a.rfid?.toLowerCase().includes(q) ||
        a.nome?.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [brincoQuery, animal, animais])

  // Pesagem
  const [pesagemAtiva, setPesagemAtiva] = useState(true)
  const [peso, setPeso]                 = useState('')
  const [tipoPesagem, setTipoPesagem]   = useState('controle')

  // Sanitário
  const [sanitarioAtivo, setSanitarioAtivo] = useState(false)
  const [medicamentos, setMedicamentos]     = useState<MedicamentoRow[]>([emptyMed()])

  // Movimentação
  const [loteDestinoId, setLoteDestinoId]   = useState('')
  const [localDestinoId, setLocalDestinoId] = useState('')
  const [anotacao, setAnotacao]             = useState('')

  // Feedback
  const [loading, setLoading]         = useState(false)
  const [confirmados, setConfirmados] = useState(0)
  const [lastMsg, setLastMsg]         = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => { brincoRef.current?.focus() }, [])

  // ── Busca ──────────────────────────────────────────────────────────────────

  function handleBrincoChange(valor: string) {
    setBrincoQuery(valor)
    setAnimal(null)
    setUltimaPesagem(null)
    setLastMsg(null)
    setPeso('')
  }

  async function selecionarAnimal(a: Animal) {
    setAnimal(a)
    setBrincoQuery(a.brinco ?? a.rfid ?? '')
    setPeso('')
    setLastMsg(null)

    const ult = await buscarUltimaPesagem(tenantSlug, a.id)
    setUltimaPesagem(ult)
  }

  // ── Medicamentos ───────────────────────────────────────────────────────────

  const addMed    = () => setMedicamentos(m => [...m, emptyMed()])
  const removeMed = (i: number) => setMedicamentos(m => m.filter((_, idx) => idx !== i))
  const changeMed = (i: number, field: keyof MedicamentoRow, value: string) =>
    setMedicamentos(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med))

  // ── Limpar ─────────────────────────────────────────────────────────────────

  function limpar() {
    setBrincoQuery('')
    setAnimal(null)
    setUltimaPesagem(null)
    setPeso('')
    setMedicamentos([emptyMed()])
    setLoteDestinoId('')
    setLocalDestinoId('')
    setAnotacao('')
    setLastMsg(null)
    setTimeout(() => brincoRef.current?.focus(), 50)
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────

  async function salvar() {
    if (!animal) { setLastMsg({ tipo: 'erro', texto: 'Selecione um animal.' }); return }

    const temPeso  = pesagemAtiva && !!peso && parseFloat(peso) > 0
    const temMeds  = sanitarioAtivo && medicamentos.some(m => m.produto.trim())
    const temMovim = !!loteDestinoId

    if (!temPeso && !temMeds && !temMovim) {
      setLastMsg({ tipo: 'erro', texto: 'Preencha pelo menos uma ação (peso, sanitário ou destino).' })
      return
    }

    setLoading(true)
    setLastMsg(null)

    const result = await registrarManejoAnimal(tenantSlug, animal.id, {
      data,
      peso:           temPeso ? peso      : undefined,
      tipoPesagem:    temPeso ? tipoPesagem : undefined,
      medicamentos:   temMeds ? medicamentos.filter(m => m.produto.trim()) : undefined,
      loteDestinoId:  loteDestinoId  || undefined,
      localDestinoId: localDestinoId || undefined,
      anotacao:       anotacao.trim() || undefined,
    })

    setLoading(false)

    if (result.error) {
      setLastMsg({ tipo: 'erro', texto: result.error })
      return
    }

    const brinco = animal.brinco ?? animal.rfid ?? 'Animal'
    setLastMsg({ tipo: 'ok', texto: `${brinco} salvo com sucesso.` })
    setConfirmados(c => c + 1)
    limpar()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-600">Data do manejo</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex items-center gap-4">
          {confirmados > 0 && (
            <span className="text-sm font-semibold text-green-600">
              ✓ {confirmados} {confirmados === 1 ? 'animal' : 'animais'} salvos
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => { window.location.href = `/${tenantSlug}/manejo/reproducao` }}
          >
            Encerrar
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
        <CardIdentificacao
          brincoQuery={brincoQuery}
          onBrincoChange={handleBrincoChange}
          animal={animal}
          sugestoes={sugestoes}
          onSelecionarAnimal={selecionarAnimal}
          brincoRef={brincoRef}
        />

        <CardPesagem
          ativo={pesagemAtiva}
          onToggle={setPesagemAtiva}
          peso={peso}
          onPesoChange={setPeso}
          tipoPesagem={tipoPesagem}
          onTipoChange={setTipoPesagem}
          ultimaPesagem={ultimaPesagem}
        />

        <CardSanitario
          ativo={sanitarioAtivo}
          onToggle={setSanitarioAtivo}
          medicamentos={medicamentos}
          onAddMed={addMed}
          onRemoveMed={removeMed}
          onChangeMed={changeMed}
        />

        <CardMovimentacao
          lotes={lotes}
          locais={locais}
          loteId={loteDestinoId}
          onLoteChange={setLoteDestinoId}
          localId={localDestinoId}
          onLocalChange={setLocalDestinoId}
          anotacao={anotacao}
          onAnotacaoChange={setAnotacao}
        />
      </div>

      {/* Feedback */}
      {lastMsg && (
        <div className={`mx-4 md:mx-6 mb-2 rounded-xl px-5 py-3 text-sm font-medium ${
          lastMsg.tipo === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {lastMsg.texto}
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t px-4 md:px-6 py-3 flex gap-3 shrink-0">
        <Button
          variant="outline"
          onClick={limpar}
          className="h-12 px-8 rounded-xl"
          disabled={loading}
        >
          Limpar
        </Button>
        <Button
          onClick={salvar}
          disabled={loading || !animal}
          className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-semibold gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar e próximo animal →'}
        </Button>
      </div>
    </div>
  )
}
