'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers } from 'lucide-react'

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
]

const LOCAL_COLORS = [
  '#f59e0b', '#06b6d4', '#8b5cf6', '#10b981', '#ef4444',
  '#f97316', '#3b82f6', '#ec4899', '#84cc16', '#6366f1',
]

type LoteSlice  = { nome: string; total: number }
type LocalSlice = { nome: string; total: number }
type Props = { data: LoteSlice[]; locais: LocalSlice[]; machos: number; femeas: number }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { nome, total } = payload[0].payload
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{nome}</p>
      <p className="text-muted-foreground">{total} animal(is)</p>
    </div>
  )
}

function SexoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground">{value} animal(is)</p>
    </div>
  )
}

function CustomLegend({ payload }: any) {
  return (
    <ul className="flex flex-col gap-1 mt-2">
      {(payload ?? []).map((entry: any, i: number) => (
        <li key={i} className="flex items-center justify-between text-xs gap-2">
          <span className="flex items-center gap-1.5 truncate">
            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="truncate text-muted-foreground">{entry.value}</span>
          </span>
          <span className="font-medium shrink-0">{entry.payload.total}</span>
        </li>
      ))}
    </ul>
  )
}

const SEXO_DATA = (machos: number, femeas: number) => [
  { name: 'Machos', value: machos },
  { name: 'Fêmeas', value: femeas },
]
const SEXO_COLORS = ['#3b82f6', '#ec4899']

export function LotesDonutCard({ data, locais, machos, femeas }: Props) {
  const total = data.reduce((s, d) => s + d.total, 0)
  const sexoData = SEXO_DATA(machos, femeas).filter(d => d.value > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição</CardTitle>
          <div className="p-2 rounded-lg bg-violet-50">
            <Layers className="h-4 w-4 text-violet-600" />
          </div>
        </div>
        <p className="text-2xl font-bold">{total} <span className="text-sm font-normal text-muted-foreground">animal(is)</span></p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2 items-start">

          {/* Rosca — Lotes */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Lotes</p>
            {data.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum lote.</p>
            ) : (
              <>
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                        dataKey="total" nameKey="nome" strokeWidth={2} stroke="hsl(var(--background))">
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full">
                  <Legend content={<CustomLegend />}
                    {...{ payload: data.map((d, i) => ({ value: d.nome, color: COLORS[i % COLORS.length], payload: d })) } as any} />
                </div>
              </>
            )}
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          {/* Rosca — Locais */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Locais</p>
            {locais.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum local.</p>
            ) : (
              <>
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={locais} cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                        dataKey="total" nameKey="nome" strokeWidth={2} stroke="hsl(var(--background))">
                        {locais.map((_, i) => <Cell key={i} fill={LOCAL_COLORS[i % LOCAL_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full">
                  <Legend content={<CustomLegend />}
                    {...{ payload: locais.map((d, i) => ({ value: d.nome, color: LOCAL_COLORS[i % LOCAL_COLORS.length], payload: d })) } as any} />
                </div>
              </>
            )}
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          {/* Rosca — Sexo */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Sexo</p>
            <div className="w-full h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sexoData.length > 0 ? sexoData : [{ name: 'Sem dados', value: 1 }]}
                    cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                    dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                    {(sexoData.length > 0 ? sexoData : [{ name: 'Sem dados', value: 1 }]).map((_, i) => (
                      <Cell key={i} fill={sexoData.length > 0 ? SEXO_COLORS[i % SEXO_COLORS.length] : '#e5e7eb'} />
                    ))}
                  </Pie>
                  <Tooltip content={<SexoTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1 text-xs w-full">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-muted-foreground truncate">Machos</span>
                <span className="font-medium ml-auto">{machos}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-pink-500 shrink-0" />
                <span className="text-muted-foreground truncate">Fêmeas</span>
                <span className="font-medium ml-auto">{femeas}</span>
              </span>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
