'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/export-utils'
import Link from 'next/link'
import { ChevronLeft, Download, Printer } from 'lucide-react'

function GmdBadge({ gmd }: { gmd: number }) {
  const cls =
    gmd >= 0.8
      ? 'bg-green-100 text-green-700 border-green-200'
      : gmd >= 0.4
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {gmd.toFixed(3)}
    </span>
  )
}

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  sexo: string
  peso_inicial: number | null
  data_peso_inicial: string | null
  peso_atual: number | null
  gmd_geral: number
  gmd_geral_duracao: number | null
  gmd_geral_ganho_peso: number | null
  total_pesagens: number
  categorias_animal: { nome: string } | null
  lotes: { nome: string } | null
}

export function GanhoPesoReportView({
  tenantSlug,
  animais,
  lotes,
  filtros,
}: {
  tenantSlug: string
  animais: Animal[]
  lotes: { id: string; nome: string }[]
  filtros: { loteId: string; sexo: string; minPesagens: number }
}) {
  const router = useRouter()
  const [loteId,      setLoteId]      = useState(filtros.loteId)
  const [sexo,        setSexo]        = useState(filtros.sexo)
  const [minPesagens, setMinPesagens] = useState(String(filtros.minPesagens))

  function exportarCsv() {
    const header = ['#','Brinco','Nome','Lote','Sexo','Peso Inicial (kg)','Peso Atual (kg)','Ganho (kg)','Dias','GMD (kg/dia)']
    const rows = animais.map((a, i) => [
      String(i + 1),
      a.brinco ?? '',
      a.nome ?? '',
      (a.lotes as any)?.nome ?? '',
      a.sexo === 'M' ? 'Macho' : 'Fêmea',
      a.peso_inicial?.toFixed(1) ?? '',
      a.peso_atual?.toFixed(1) ?? '',
      a.gmd_geral_ganho_peso?.toFixed(1) ?? '',
      String(a.gmd_geral_duracao ?? ''),
      a.gmd_geral.toFixed(3),
    ])
    downloadCsv('relatorio-ganho-peso.csv', [header, ...rows])
  }

  function aplicar() {
    const p = new URLSearchParams()
    if (loteId)      p.set('lote_id',      loteId)
    if (sexo)        p.set('sexo',         sexo)
    if (minPesagens) p.set('min_pesagens', minPesagens)
    router.push(`?${p.toString()}`)
  }

  const gmds = animais.map(a => a.gmd_geral)
  const gmdMedio = gmds.length ? gmds.reduce((a, b) => a + b, 0) / gmds.length : null
  const melhor = animais[0] ?? null
  const pior   = animais[animais.length - 1] ?? null
  const acimaDe08 = gmds.filter(g => g >= 0.8).length
  const pct08 = gmds.length ? Math.round((acimaDe08 / gmds.length) * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href={`/${tenantSlug}/relatorios`} className="text-muted-foreground hover:text-foreground mt-1 no-print">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Ganho de Peso</h1>
            <p className="text-sm text-muted-foreground">Rebanho ativo rankeado por GMD</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={exportarCsv}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end no-print">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Lote</label>
          <select
            value={loteId}
            onChange={e => setLoteId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
          >
            <option value="">Todos os lotes</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sexo</label>
          <select
            value={sexo}
            onChange={e => setSexo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="M">Macho</option>
            <option value="F">Fêmea</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Mín. pesagens</label>
          <input
            type="number"
            min={1}
            value={minPesagens}
            onChange={e => setMinPesagens(e.target.value)}
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <Button onClick={aplicar} size="sm">Filtrar</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Animais avaliados</p>
          <p className="text-2xl font-bold">{animais.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">GMD médio</p>
          <p className="text-2xl font-bold">{gmdMedio != null ? `${gmdMedio.toFixed(3)} kg` : '—'}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Melhor GMD</p>
          <p className="text-2xl font-bold">{melhor ? `${melhor.gmd_geral.toFixed(3)} kg` : '—'}</p>
          {melhor && <p className="text-xs text-muted-foreground">{melhor.brinco ?? melhor.nome ?? '—'}</p>}
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Com GMD ≥ 0,8 kg</p>
          <p className="text-2xl font-bold">{pct08}%</p>
          <p className="text-xs text-muted-foreground">{acimaDe08} de {animais.length}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Brinco</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lote</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sexo</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Peso inicial</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Peso atual</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ganho (kg)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Dias</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">GMD (kg/dia)</th>
            </tr>
          </thead>
          <tbody>
            {animais.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-muted-foreground">
                  Nenhum animal com avaliação de GMD encontrado.
                </td>
              </tr>
            ) : animais.map((a, i) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.brinco ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.nome ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{(a.lotes as any)?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
                <td className="px-4 py-3 text-right">{a.peso_inicial != null ? `${a.peso_inicial.toFixed(1)} kg` : '—'}</td>
                <td className="px-4 py-3 text-right">{a.peso_atual   != null ? `${a.peso_atual.toFixed(1)} kg`   : '—'}</td>
                <td className="px-4 py-3 text-right">{a.gmd_geral_ganho_peso != null ? `${a.gmd_geral_ganho_peso.toFixed(1)} kg` : '—'}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{a.gmd_geral_duracao ?? '—'}</td>
                <td className="px-4 py-3 text-right"><GmdBadge gmd={a.gmd_geral} /></td>
              </tr>
            ))}
          </tbody>
          {animais.length > 0 && (
            <tfoot className="border-t bg-muted/20">
              <tr>
                <td colSpan={7} className="px-4 py-2 text-xs text-muted-foreground">
                  {animais.length} animal{animais.length !== 1 ? 'is' : ''}
                </td>
                <td className="px-4 py-2 text-right text-xs font-medium">
                  {animais.filter(a => a.gmd_geral_ganho_peso != null).length > 0
                    ? `Média: ${(animais.reduce((s, a) => s + (a.gmd_geral_ganho_peso ?? 0), 0) / animais.filter(a => a.gmd_geral_ganho_peso != null).length).toFixed(1)} kg`
                    : ''}
                </td>
                <td />
                <td className="px-4 py-2 text-right text-xs font-medium">
                  {gmdMedio != null ? `Média: ${gmdMedio.toFixed(3)}` : ''}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
