'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  TrendingUp,
  Calendar,
  CalendarRange,
  BarChart2,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Report = {
  label: string
  description: string
  href: string
  icon: React.ElementType
}

type ReportGroup = {
  id: string
  label: string
  icon: React.ElementType
  reports: Report[]
}

const GROUPS: ReportGroup[] = [
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: TrendingUp,
    reports: [
      {
        label: 'Extrato Financeiro',
        description: 'Visão cronológica de todas as entradas, saídas e transferências — filtrável por conta, tipo e período.',
        href: 'relatorios/extrato',
        icon: FileText,
      },
      {
        label: 'Fluxo de Caixa Diário',
        description: 'Visão dia a dia de entradas, saídas e saldo — filtro por conta e previstos.',
        href: 'financeiro/fluxo-caixa',
        icon: Calendar,
      },
      {
        label: 'Fluxo de Caixa Mensal',
        description: 'Visão anual por categoria do plano de contas — comparativo mês a mês.',
        href: 'financeiro/fluxo-mensal',
        icon: CalendarRange,
      },
      {
        label: 'DRE',
        description: 'Demonstração do Resultado do Exercício estruturada pelo plano de contas.',
        href: 'financeiro/dre',
        icon: BarChart2,
      },
    ],
  },
]

export function ReportsView({ tenantSlug }: { tenantSlug: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set(GROUPS.map(g => g.id)))

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Selecione um relatório para visualizar</p>
      </div>

      <div className="space-y-3">
        {GROUPS.map(group => {
          const isOpen = open.has(group.id)
          return (
            <div key={group.id} className="rounded-xl border bg-card overflow-x-auto">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggle(group.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                    <group.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-base">{group.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {group.reports.length} relatório{group.reports.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Report list */}
              {isOpen && (
                <div className="border-t divide-y">
                  {group.reports.map(report => (
                    <Link
                      key={report.href}
                      href={`/${tenantSlug}/${report.href}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg border bg-background shrink-0 group-hover:border-primary/40 transition-colors">
                        <report.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {report.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {report.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
