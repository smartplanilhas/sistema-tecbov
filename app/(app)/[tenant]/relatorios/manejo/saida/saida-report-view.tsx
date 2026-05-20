'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { downloadCsv } from '@/lib/export-utils'
import Link from 'next/link'
import { ChevronLeft, Download, Printer } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  vendido:    'Vendido',
  abatido:    'Abatido',
  morto:      'Morto',
  doado:      'Doado',
  extraviado: 'Extraviado',
}

const STATUS_VARIANT: Record<string, 'secondary' | 'destructive' | 'warning' | 'outline'> = {
  vendido:    'secondary',
  abatido:    'secondary',
  morto:      'destructive',
  doado:      'outline',
  extraviado: 'warning',
}

function GmdBadge({ gmd }: { gmd: number | null }) {
  if (gmd == null) return <span className="text-muted-foreground">—</span>
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

function avg(arr: number[]) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

type Animal = {
  id: string
  brinco: string | null
  nome: string | null
  sexo: string
  status: string
  data_saida: string | null
  peso_inicial: number | null
  data_peso_inicial: string | null
  peso_atual: number | null
  data_peso_atual: string | null
  gmd_geral: number | null
  gmd_geral_duracao: number | null
  gmd_geral_ganho_peso: number | null
  categorias_animal: { nome: string } | null
  lotes: { nome: string } | null
}

export function SaidaReportView({
  tenantSlug,
  animais,
  filtros,
}: {
  tenantSlug: string
  animais: Animal[]
  filtros: { de: string; ate: string; status: string }
}) {
  const router = useRouter()
  const [de, setDe] = useState(filtros.de)
  const [ate, setAte] = useState(filtros.ate)
  const [status, setStatus] = useState(filtros.status)

  function aplicar() {
    const p = new URLSearchParams()
    if (de)     p.set('de', de)
    if (ate)    p.set('ate', ate)
    if (status) p.set('status', status)
    router.push(`?${p.toString()}`)
  }

  function exportarCsv() {
    const header = ['Brinco','Categoria','Sexo','Status','Data Saída','Peso Inicial (kg)','Peso Saída (kg)','Ganho (kg)','Dias','GMD (kg/dia)']
    const rows = animais.map(a => [
      a.brinco ?? '',
      (a.categorias_animal as any)?.nome ?? '',
      a.sexo === 'M' ? 'Macho' : 'Fêmea',
      STATUS_LABEL[a.status] ?? a.status,
      a.data_saida ? formatDate(a.data_saida) : '',
      a.peso_inicial?.toFixed(1) ?? '',
      a.peso_atual?.toFixed(1) ?? '',
      a.gmd_geral_ganho_peso?.toFixed(1) ?? '',
      String(a.gmd_geral_duracao ?? ''),
      a.gmd_geral?.toFixed(3) ?? '',
    ])
    downloadCsv(`relatorio-saida-${de}-${ate}.csv`, [header, ...rows])
  }

  const gmds   = animais.map(a => a.gmd_geral).filter((v): v is number => v != null)
  const ganhos = animais.map(a => a.gmd_geral_ganho_peso).filter((v): v is number => v != null)
  const pesos  = animais.map(a => a.peso_atual).filter((v): v is number => v != null)

  const gmdMedio     = avg(gmds)
  const ganhoMedio   = avg(ganhos)
  const pesoMedioSaida = avg(pesos)

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href={`/${tenantSlug}/relatorios`} className="text-muted-foreground hover:text-foreground mt-1 no-print">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Relatório de Saída</h1>
            <p className="text-sm text-muted-foreground">Animais que saíram do rebanho</p>
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
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <input
            type="date"
            value={de}
            onChange={e => setDe(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <input
            type="date"
            value={ate}
            onChange={e => setAte(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <Button onClick={aplicar} size="sm">Filtrar</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de animais',    value: animais.length.toString()                                     },
          { label: 'Ganho médio (kg)',     value: ganhoMedio   != null ? ganhoMedio.toFixed(1)   + ' kg' : '—' },
          { label: 'GMD médio (kg/dia)',   value: gmdMedio     != null ? gmdMedio.toFixed(3)     + ' kg' : '—' },
          { label: 'Peso médio de saída',  value: pesoMedioSaida != null ? pesoMedioSaida.toFixed(1) + ' kg' : '—' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Brinco</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sexo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data saída</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Peso inicial</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Peso saída</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ganho (kg)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Dias</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">GMD</th>
            </tr>
          </thead>
          <tbody>
            {animais.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-muted-foreground">
                  Nenhum animal encontrado para o período selecionado.
                </td>
              </tr>
            ) : animais.map(a => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{a.brinco ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{(a.categorias_animal as any)?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.data_saida ? formatDate(a.data_saida) : '—'}
                </td>
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
                <td colSpan={6} className="px-4 py-2 text-xs text-muted-foreground">
                  {animais.length} animal{animais.length !== 1 ? 'is' : ''}
                </td>
                <td className="px-4 py-2 text-right text-xs font-medium">
                  {pesoMedioSaida != null ? `Média: ${pesoMedioSaida.toFixed(1)} kg` : ''}
                </td>
                <td className="px-4 py-2 text-right text-xs font-medium">
                  {ganhoMedio != null ? `Média: ${ganhoMedio.toFixed(1)} kg` : ''}
                </td>
                <td className="px-4 py-2" />
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
