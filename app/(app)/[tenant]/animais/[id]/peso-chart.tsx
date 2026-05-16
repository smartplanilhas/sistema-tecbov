'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Point = {
  data: string
  peso: number
  tipo: string
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

function fmt(v: number, dec = 1) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

const TIPO_LABEL: Record<string, string> = {
  entrada:  'Entrada',
  controle: 'Controle',
  saida:    'Saída',
  venda:    'Venda',
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as Point
  return (
    <div className="rounded-lg border bg-background shadow-md px-3 py-2 text-sm">
      <p className="font-semibold">{fmt(d.peso)} kg</p>
      <p className="text-muted-foreground text-xs">{fmtDate(d.data)}</p>
      <p className="text-muted-foreground text-xs">{TIPO_LABEL[d.tipo] ?? d.tipo}</p>
    </div>
  )
}

export function PesoChart({ pesagens }: { pesagens: Point[] }) {
  if (pesagens.length < 2) return null

  const data = [...pesagens].reverse()

  const pesos = data.map(p => p.peso)
  const min = Math.min(...pesos)
  const max = Math.max(...pesos)
  const pad = Math.max((max - min) * 0.2, 5)
  const yMin = Math.floor(min - pad)
  const yMax = Math.ceil(max + pad)

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold mb-4">Evolução do peso</h2>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pesoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="data"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={v => `${v} kg`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="peso"
            stroke="hsl(142 71% 45%)"
            strokeWidth={2}
            fill="url(#pesoGradient)"
            dot={{ r: 3, fill: 'hsl(142 71% 45%)', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
