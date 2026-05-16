import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, Wallet2, Plus } from 'lucide-react'
import { AlertsCard } from '@/components/dashboard/alerts-card'
import { UpcomingPayablesCard } from '@/components/dashboard/upcoming-payables-card'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return null

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [accountsRes, transactionsRes, alertsRes, upcomingRes, animalsCountRes] = await Promise.all([
    supabase
      .from('financial_accounts')
      .select('balance')
      .eq('tenant_id', tenant.id)
      .eq('active', true),
    supabase
      .from('transactions')
      .select('type, amount')
      .eq('tenant_id', tenant.id)
      .eq('status', 'COMPLETED')
      .gte('date', monthStart),
    supabase
      .from('system_alerts')
      .select('id, module, severity, title, message, link, read, created_at')
      .eq('tenant_id', tenant.id)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('transactions')
      .select('id, description, amount, date, due_date')
      .eq('tenant_id', tenant.id)
      .eq('type', 'EXPENSE')
      .eq('status', 'PENDING')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('date',     { ascending: true })
      .limit(5),
    supabase.from('animals').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
  ])

  const animalsCount   = animalsCountRes.count ?? 0
  const totalBalance   = (accountsRes.data    ?? []).reduce((s, a) => s + Number(a.balance), 0)
  const monthlyIncome  = (transactionsRes.data ?? []).filter(t => t.type === 'INCOME') .reduce((s, t) => s + Number(t.amount), 0)
  const monthlyExpense = (transactionsRes.data ?? []).filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  // Despesas pendentes (previstos) no mês atual
  const pendingExpenseRes = await supabase
    .from('transactions')
    .select('amount')
    .eq('tenant_id', tenant.id)
    .eq('type', 'EXPENSE')
    .eq('status', 'PENDING')
    .gte('date', monthStart)
  const pendingExpenses = (pendingExpenseRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)

  const cards = [
    { title: 'Saldo Total',          value: formatCurrency(totalBalance),    icon: Wallet,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { title: 'Receitas do Mês',      value: formatCurrency(monthlyIncome),   icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50'  },
    { title: 'Despesas do Mês',      value: formatCurrency(monthlyExpense),  icon: TrendingDown, color: 'text-red-600',    bg: 'bg-red-50'    },
    { title: 'Despesas Previstas',   value: formatCurrency(pendingExpenses), icon: Wallet2,      color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Resultado do Mês',     value: formatCurrency(monthlyIncome - monthlyExpense), icon: TrendingUp, color: monthlyIncome - monthlyExpense >= 0 ? 'text-teal-600' : 'text-red-600', bg: monthlyIncome - monthlyExpense >= 0 ? 'bg-teal-50' : 'bg-red-50' },
  ]

  const upcomingTransactions = (upcomingRes.data ?? []) as {
    id: string; description: string | null; amount: number; date: string; due_date: string | null
  }[]

  const alerts = (alertsRes.data ?? []) as {
    id: string; module: string; severity: 'info' | 'warning' | 'error' | 'critical'
    title: string; message: string | null; link: string | null; read: boolean; created_at: string
  }[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral financeira do mês atual</p>
      </div>

      {/* Banner CTA — só aparece se não houver animais */}
      {animalsCount === 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%)' }}>
          <div className="flex flex-col sm:flex-row items-center gap-6 px-8 py-6">
            <div className="shrink-0 w-44 sm:w-52">
              <Image
                src="/bovinos-ilustracao.png"
                alt="Bovinos Nelore"
                width={320}
                height={220}
                className="w-full h-auto drop-shadow-md"
                priority
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-3">
              <h2 className="text-xl font-bold text-gray-800 leading-snug">
                Comece cadastrando seu<br className="hidden sm:block" /> primeiro animal
              </h2>
              <p className="text-sm text-gray-600 max-w-sm">
                Cadastre um animal para começar a acompanhar GMD, lotes, reprodução e resultados financeiros.
              </p>
              <Button asChild className="gap-2">
                <Link href={`/${tenantSlug}/animais/novo`}>
                  <Plus className="h-4 w-4" /> Cadastrar primeiro animal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom row: upcoming + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingPayablesCard transactions={upcomingTransactions} tenantSlug={tenantSlug} />
        <AlertsCard alerts={alerts} tenantId={tenant.id} />
      </div>
    </div>
  )
}
