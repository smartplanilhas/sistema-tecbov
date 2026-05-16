import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2, ArrowRight, Wallet, BarChart3, TrendingUp,
  Receipt, RefreshCw, FileText, Clock, ShieldCheck, Zap,
  LayoutDashboard, Users, Settings, MessageCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'GeSmart — 7 dias grátis, sem cartão',
  description: 'Controle financeiro completo para sua empresa. Teste por 7 dias, sem compromisso.',
}

const features = [
  { icon: Wallet,     title: 'Lançamentos',            desc: 'Receitas, despesas e transferências em segundos.' },
  { icon: BarChart3,  title: 'Dashboard ao vivo',      desc: 'Saldo, entradas e saídas sempre atualizados.' },
  { icon: TrendingUp, title: 'Fluxo de Caixa',         desc: 'Diário e mensal — saiba para onde vai o dinheiro.' },
  { icon: Receipt,    title: 'Contas a Pagar/Receber', desc: 'Nunca mais esqueça um vencimento.' },
  { icon: RefreshCw,  title: 'Recorrências',            desc: 'Lançamentos automáticos para cobranças fixas.' },
  { icon: FileText,   title: 'Relatórios e Extrato',   desc: 'DRE, extrato financeiro e muito mais.' },
]

const steps = [
  { n: '1', title: 'Crie sua conta',        desc: 'E-mail e senha em menos de 1 minuto. Sem cartão.' },
  { n: '2', title: 'Configure sua empresa', desc: 'Nome, contas bancárias e pronto para usar.' },
  { n: '3', title: 'Use por 7 dias livre',  desc: 'Todos os recursos liberados. Sem limitação.' },
]

const faqs = [
  {
    q: 'Preciso informar cartão de crédito?',
    a: 'Não. O teste é 100% gratuito e não exige nenhum dado de pagamento.',
  },
  {
    q: 'O que acontece após os 7 dias?',
    a: 'Você recebe um contato da nossa equipe para escolher o plano ideal. Sem bloqueio surpresa.',
  },
  {
    q: 'Meus dados ficam salvos?',
    a: 'Sim. Tudo que você lançar durante o teste fica salvo ao contratar um plano.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem multa e sem burocracia. Basta falar com a gente.',
  },
]

function CtaButton({ label = 'Começar teste grátis — 7 dias', className = '' }: { label?: string; className?: string }) {
  return (
    <Link
      href="/register"
      className={`inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-green-200 ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

/* ──────────────────────────────────────────
   MOCKUP: Dashboard (light theme)
─────────────────────────────────────────── */
function DashboardMockup() {
  const barHeights = [55, 72, 48, 88, 65, 80, 58, 94, 70, 83, 50, 76]
  const months     = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

  const txns = [
    { desc: 'Venda de produtos',    cat: 'Receita',       val: '+R$ 3.200,00', clr: '#16a34a' },
    { desc: 'Aluguel do escritório',cat: 'Despesa',       val: '-R$ 2.500,00', clr: '#dc2626' },
    { desc: 'Serviços prestados',   cat: 'Receita',       val: '+R$ 5.800,00', clr: '#16a34a' },
    { desc: 'Fornecedores',         cat: 'Despesa',       val: '-R$ 1.350,00', clr: '#dc2626' },
    { desc: 'Transf. entre contas', cat: 'Transferência', val: 'R$ 1.000,00',  clr: '#2563eb' },
  ]

  const navItems = [
    { label: 'Dashboard',     icon: LayoutDashboard, active: true  },
    { label: 'Financeiro',    icon: Wallet,          active: false },
    { label: 'Pessoas',       icon: Users,           active: false },
    { label: 'Relatórios',    icon: BarChart3,       active: false },
    { label: 'Configurações', icon: Settings,        active: false },
    { label: 'Suporte',       icon: MessageCircle,   active: false },
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      {/* Chrome bar */}
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white rounded border border-slate-200 px-3 py-1 text-[10px] text-slate-400 font-mono truncate">
          app.gesmart.com.br/minha-empresa/dashboard
        </div>
      </div>

      {/* App shell */}
      <div className="flex" style={{ height: 420 }}>
        {/* Sidebar */}
        <div className="w-44 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="px-4 py-4 flex flex-col items-center gap-1 border-b border-slate-700">
            <div className="w-7 h-7 rounded-lg bg-[#22c55e] flex items-center justify-center text-black font-black text-[10px]">
              G
            </div>
            <span className="text-[10px] font-bold text-white tracking-tight">GeSmart</span>
          </div>
          <nav className="p-2 space-y-0.5 flex-1">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px]"
                  style={{
                    background: item.active ? 'rgba(34,197,94,0.15)' : 'transparent',
                    color:      item.active ? '#22c55e' : '#94a3b8',
                  }}
                >
                  <Icon size={11} />
                  {item.label}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-hidden bg-slate-50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Dashboard</span>
            <span className="text-[9px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">maio 2025</span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Saldo Total', value: 'R$ 48.320', change: '↑ +12,4%', changeClr: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
              { label: 'Receitas',    value: 'R$ 12.450', change: 'este mês',  changeClr: '#94a3b8', bg: '#ffffff', border: '#e2e8f0' },
              { label: 'Despesas',    value: 'R$ 8.130',  change: 'este mês',  changeClr: '#94a3b8', bg: '#ffffff', border: '#e2e8f0' },
            ].map(c => (
              <div key={c.label} className="rounded-lg p-2.5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <p className="text-[9px] text-slate-500">{c.label}</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{c.value}</p>
                <p className="text-[8px] mt-0.5" style={{ color: c.changeClr }}>{c.change}</p>
              </div>
            ))}
          </div>

          {/* Chart + transactions */}
          <div className="flex gap-3 flex-1 min-h-0">
            {/* Bar chart */}
            <div className="flex-1 rounded-lg p-3 flex flex-col bg-white border border-slate-200">
              <p className="text-[9px] text-slate-400 mb-2">Fluxo de Caixa 2025</p>
              <div className="flex-1 flex items-end gap-1">
                {barHeights.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height:     `${h}%`,
                        background: i === 4 ? '#16a34a' : '#bbf7d0',
                      }}
                    />
                    <span className="text-[6px] text-slate-400">{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction list */}
            <div className="w-48 rounded-lg p-3 flex flex-col bg-white border border-slate-200">
              <p className="text-[9px] text-slate-400 mb-2">Últimos lançamentos</p>
              <div className="space-y-2 flex-1">
                {txns.map((t, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-slate-700 truncate">{t.desc}</p>
                      <p className="text-[7px] text-slate-400">{t.cat}</p>
                    </div>
                    <p className="text-[9px] font-mono ml-1 shrink-0" style={{ color: t.clr }}>{t.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────
   MOCKUP: Contas a Pagar/Receber (light)
─────────────────────────────────────────── */
function ContasMockup() {
  const items = [
    { desc: 'Mensalidade SaaS',    due: '10/06', val: 'R$ 297,00',    type: 'pagar',   status: 'Vence hoje', statusClr: '#d97706' },
    { desc: 'NF Serviço #4821',    due: '15/06', val: 'R$ 4.500,00',  type: 'receber', status: 'A vencer',   statusClr: '#16a34a' },
    { desc: 'Energia elétrica',    due: '20/06', val: 'R$ 380,00',    type: 'pagar',   status: 'A vencer',   statusClr: '#94a3b8' },
    { desc: 'Cliente Alfa — Proj', due: '25/06', val: 'R$ 8.200,00',  type: 'receber', status: 'A vencer',   statusClr: '#16a34a' },
    { desc: 'Folha de pagamento',  due: '30/06', val: 'R$ 12.400,00', type: 'pagar',   status: 'A vencer',   statusClr: '#94a3b8' },
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white rounded border border-slate-200 px-3 py-1 text-[10px] text-slate-400 font-mono truncate">
          app.gesmart.com.br/minha-empresa/financeiro/contas-a-pagar
        </div>
      </div>

      <div className="bg-slate-50 p-4" style={{ height: 300 }}>
        <div className="flex gap-4 border-b border-slate-200 mb-4">
          {['A Pagar', 'A Receber'].map((tab, i) => (
            <button
              key={tab}
              className="text-[10px] pb-2 font-medium"
              style={{
                color:        i === 1 ? '#16a34a' : '#94a3b8',
                borderBottom: i === 1 ? '2px solid #16a34a' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          {[
            { l: 'A receber', v: 'R$ 12.700', clr: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { l: 'A pagar',   v: 'R$ 13.077', clr: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          ].map(s => (
            <div key={s.l} className="flex-1 rounded-lg p-2 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="text-[8px] text-slate-500">{s.l}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: s.clr }}>{s.v}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-white border border-slate-100">
              <div
                className="w-1.5 h-5 rounded-full shrink-0"
                style={{ background: item.type === 'receber' ? '#16a34a' : '#dc2626' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-700 truncate">{item.desc}</p>
                <p className="text-[7px] text-slate-400">Vence {item.due}</p>
              </div>
              <p className="text-[9px] text-slate-600 font-mono">{item.val}</p>
              <span
                className="text-[7px] px-1.5 py-0.5 rounded"
                style={{ background: `${item.statusClr}18`, color: item.statusClr }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────
   MOCKUP: Extrato Financeiro (light)
─────────────────────────────────────────── */
function ExtratoMockup() {
  const groups = [
    {
      date: '12 maio 2025',
      net: '+R$ 2.850,00',
      netClr: '#16a34a',
      txns: [
        { desc: 'Serviço de consultoria', acc: 'Conta Principal',  val: '+R$ 3.500,00', clr: '#16a34a', badge: 'Receita', badgeClr: '#16a34a', badgeBg: '#f0fdf4' },
        { desc: 'Material de escritório', acc: 'Conta Principal',  val: '-R$ 650,00',   clr: '#dc2626', badge: 'Despesa', badgeClr: '#dc2626', badgeBg: '#fef2f2' },
      ],
    },
    {
      date: '10 maio 2025',
      net: '-R$ 1.200,00',
      netClr: '#dc2626',
      txns: [
        { desc: 'Internet fibra — maio',  acc: 'Conta Empresarial', val: '-R$ 380,00',  clr: '#dc2626', badge: 'Despesa', badgeClr: '#dc2626', badgeBg: '#fef2f2' },
        { desc: 'Transf. para poupança',  acc: 'Caixa',             val: 'R$ 820,00',   clr: '#2563eb', badge: 'Transf.', badgeClr: '#2563eb', badgeBg: '#eff6ff' },
      ],
    },
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white rounded border border-slate-200 px-3 py-1 text-[10px] text-slate-400 font-mono truncate">
          app.gesmart.com.br/minha-empresa/relatorios/extrato
        </div>
      </div>

      <div className="bg-slate-50 p-4" style={{ height: 300 }}>
        <div className="flex gap-2 mb-4">
          {[
            { l: 'Receitas',  v: '+R$ 9.850', clr: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { l: 'Despesas',  v: '-R$ 4.320', clr: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
            { l: 'Resultado', v: '+R$ 5.530', clr: '#16a34a', bg: '#ffffff', border: '#e2e8f0' },
          ].map(s => (
            <div key={s.l} className="flex-1 rounded-lg p-2 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="text-[8px] text-slate-500">{s.l}</p>
              <p className="text-[11px] font-bold mt-0.5" style={{ color: s.clr }}>{s.v}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {groups.map((g, gi) => (
            <div key={gi}>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[8px] text-slate-400">{g.date}</span>
                <span className="text-[8px] font-mono" style={{ color: g.netClr }}>{g.net}</span>
              </div>
              <div className="space-y-1">
                {g.txns.map((t, ti) => (
                  <div key={ti} className="flex items-center gap-2 rounded px-2.5 py-1.5 bg-white border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-slate-700 truncate">{t.desc}</p>
                      <p className="text-[7px] text-slate-400">{t.acc}</p>
                    </div>
                    <span
                      className="text-[7px] px-1.5 py-0.5 rounded"
                      style={{ background: t.badgeBg, color: t.badgeClr }}
                    >
                      {t.badge}
                    </span>
                    <p className="text-[9px] font-mono shrink-0" style={{ color: t.clr }}>{t.val}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────
   PAGE
─────────────────────────────────────────── */
export default function LpLightPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="GeSmart" width={32} height={32} />
          <span className="font-bold text-lg tracking-tight text-slate-900">GeSmart</span>
        </div>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          Já tenho conta →
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-8 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Clock className="h-3.5 w-3.5" />
          7 dias grátis · Sem cartão de crédito
        </div>

        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5 text-slate-900">
          Teste o GeSmart{' '}
          <span className="text-green-600">gratuitamente</span>{' '}
          por 7 dias.
        </h1>

        <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto">
          Controle financeiro completo para sua empresa. Configure em minutos,
          use por uma semana inteira — sem pagar nada.
        </p>

        <CtaButton />

        <p className="text-xs text-slate-400 mt-4">
          Sem cartão · Sem instalação · Cancele quando quiser
        </p>
      </section>

      {/* Hero mockup — Dashboard */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <DashboardMockup />
      </section>

      {/* O que está incluso */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">Tudo liberado durante o teste</h2>
        <p className="text-slate-500 text-center text-sm mb-10">Sem recursos bloqueados. Use o sistema completo.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4 hover:border-green-200 hover:bg-green-50/40 transition-colors">
              <div className="mt-0.5 shrink-0">
                <f.icon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1 text-slate-800">{f.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Screen previews */}
      <section className="px-6 py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">Veja o sistema em ação</h2>
          <p className="text-slate-500 text-center text-sm mb-10">
            Interface limpa, dados em tempo real, sem complicação.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">
                Contas a Pagar / Receber
              </p>
              <ContasMockup />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">
                Extrato Financeiro
              </p>
              <ExtratoMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10 text-slate-900">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map(s => (
            <div key={s.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 border border-green-300 text-green-700 font-black text-lg flex items-center justify-center mx-auto mb-3">
                {s.n}
              </div>
              <p className="font-semibold mb-1 text-slate-800">{s.title}</p>
              <p className="text-slate-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Garantia */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-slate-900">Sem risco nenhum</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          O teste é completamente gratuito e sem compromisso. Se não gostar, é só parar de usar.
          Nenhum e-mail chato, nenhuma cobrança surpresa.
        </p>
      </section>

      {/* CTA central */}
      <section className="px-6 py-16 bg-green-600">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <Zap className="h-8 w-8 text-white/80 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Pronto para testar?</h2>
          <p className="text-green-100 text-sm">Crie sua conta em menos de 1 minuto.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-green-700 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg mx-auto"
          >
            Começar teste grátis — 7 dias
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8 text-slate-900">Perguntas frequentes</h2>
        <div className="space-y-3">
          {faqs.map(faq => (
            <div key={faq.q} className="border border-slate-200 rounded-xl p-5 hover:border-green-200 transition-colors">
              <p className="font-semibold text-sm mb-1.5 flex items-start gap-2 text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                {faq.q}
              </p>
              <p className="text-slate-500 text-sm pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3 text-slate-900">Comece hoje, decida depois.</h2>
          <p className="text-slate-500 text-sm mb-6">7 dias. Sem cartão. Sem burocracia.</p>
          <CtaButton label="Criar minha conta grátis" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} GeSmart · Todos os direitos reservados
      </footer>
    </div>
  )
}
