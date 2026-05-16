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
  { icon: Wallet,      title: 'Lançamentos',            desc: 'Receitas, despesas e transferências em segundos.' },
  { icon: BarChart3,   title: 'Dashboard ao vivo',      desc: 'Saldo, entradas e saídas sempre atualizados.' },
  { icon: TrendingUp,  title: 'Fluxo de Caixa',         desc: 'Diário e mensal — saiba para onde vai o dinheiro.' },
  { icon: Receipt,     title: 'Contas a Pagar/Receber', desc: 'Nunca mais esqueça um vencimento.' },
  { icon: RefreshCw,   title: 'Recorrências',            desc: 'Lançamentos automáticos para cobranças fixas.' },
  { icon: FileText,    title: 'Relatórios e Extrato',   desc: 'DRE, extrato financeiro e muito mais.' },
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
      className={`inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold px-8 py-4 rounded-xl text-base transition-colors ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

/* ──────────────────────────────────────────
   MOCKUP: Dashboard
─────────────────────────────────────────── */
function DashboardMockup() {
  const barHeights = [55, 72, 48, 88, 65, 80, 58, 94, 70, 83, 50, 76]
  const months     = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

  const txns = [
    { desc: 'Venda de produtos',    cat: 'Receita',       val: '+R$ 3.200,00', clr: '#22c55e' },
    { desc: 'Aluguel do escritório',cat: 'Despesa',       val: '-R$ 2.500,00', clr: '#f87171' },
    { desc: 'Serviços prestados',   cat: 'Receita',       val: '+R$ 5.800,00', clr: '#22c55e' },
    { desc: 'Fornecedores',         cat: 'Despesa',       val: '-R$ 1.350,00', clr: '#f87171' },
    { desc: 'Transf. entre contas', cat: 'Transferência', val: 'R$ 1.000,00',  clr: '#60a5fa' },
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
    <div className="rounded-xl overflow-hidden border border-white/15 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
      {/* Chrome bar */}
      <div className="bg-[#16202f] px-4 py-2.5 flex items-center gap-3 border-b border-white/10">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white/5 rounded px-3 py-1 text-[10px] text-slate-500 font-mono truncate">
          app.gesmart.com.br/minha-empresa/dashboard
        </div>
      </div>

      {/* App shell */}
      <div className="flex" style={{ height: 420 }}>
        {/* Sidebar */}
        <div className="w-44 shrink-0 bg-[#080d18] border-r border-white/5 flex flex-col">
          <div className="px-4 py-4 flex flex-col items-center gap-1 border-b border-white/5">
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
                    background: item.active ? 'rgba(34,197,94,0.12)' : 'transparent',
                    color:      item.active ? '#22c55e' : '#64748b',
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
        <div className="flex-1 overflow-hidden bg-[#0b1322] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Dashboard</span>
            <span className="text-[9px] text-slate-500 bg-white/5 px-2 py-1 rounded">maio 2025</span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Saldo Total',  value: 'R$ 48.320',  change: '↑ +12,4%', changeClr: '#22c55e',  bg: 'rgba(34,197,94,0.06)'  },
              { label: 'Receitas',     value: 'R$ 12.450',  change: 'este mês',  changeClr: '#94a3b8',  bg: 'rgba(255,255,255,0.04)' },
              { label: 'Despesas',     value: 'R$ 8.130',   change: 'este mês',  changeClr: '#94a3b8',  bg: 'rgba(255,255,255,0.04)' },
            ].map(c => (
              <div key={c.label} className="rounded-lg p-2.5" style={{ background: c.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] text-slate-500">{c.label}</p>
                <p className="text-xs font-bold text-white mt-0.5">{c.value}</p>
                <p className="text-[8px] mt-0.5" style={{ color: c.changeClr }}>{c.change}</p>
              </div>
            ))}
          </div>

          {/* Chart + transactions */}
          <div className="flex gap-3 flex-1 min-h-0">
            {/* Bar chart */}
            <div className="flex-1 rounded-lg p-3 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] text-slate-500 mb-2">Fluxo de Caixa 2025</p>
              <div className="flex-1 flex items-end gap-1">
                {barHeights.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${h}%`,
                        background: i === 4 ? '#22c55e' : 'rgba(34,197,94,0.35)',
                      }}
                    />
                    <span className="text-[6px] text-slate-600">{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction list */}
            <div className="w-48 rounded-lg p-3 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] text-slate-500 mb-2">Últimos lançamentos</p>
              <div className="space-y-2 flex-1">
                {txns.map((t, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-white truncate">{t.desc}</p>
                      <p className="text-[7px] text-slate-600">{t.cat}</p>
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
   MOCKUP: Contas a Pagar/Receber
─────────────────────────────────────────── */
function ContasMockup() {
  const items = [
    { desc: 'Mensalidade SaaS',    due: '10/06', val: 'R$ 297,00',   type: 'pagar',   status: 'Vence hoje', statusClr: '#f59e0b' },
    { desc: 'NF Serviço #4821',    due: '15/06', val: 'R$ 4.500,00', type: 'receber', status: 'A vencer',   statusClr: '#22c55e' },
    { desc: 'Energia elétrica',    due: '20/06', val: 'R$ 380,00',   type: 'pagar',   status: 'A vencer',   statusClr: '#64748b' },
    { desc: 'Cliente Alfa — Proj', due: '25/06', val: 'R$ 8.200,00', type: 'receber', status: 'A vencer',   statusClr: '#22c55e' },
    { desc: 'Folha de pagamento',  due: '30/06', val: 'R$ 12.400,00',type: 'pagar',   status: 'A vencer',   statusClr: '#64748b' },
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-white/15 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
      {/* Chrome */}
      <div className="bg-[#16202f] px-4 py-2.5 flex items-center gap-3 border-b border-white/10">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white/5 rounded px-3 py-1 text-[10px] text-slate-500 font-mono truncate">
          app.gesmart.com.br/minha-empresa/financeiro/contas-a-pagar
        </div>
      </div>

      {/* Content */}
      <div className="bg-[#0b1322] p-4" style={{ height: 300 }}>
        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-4">
          {['A Pagar', 'A Receber'].map((tab, i) => (
            <button
              key={tab}
              className="text-[10px] pb-2 font-medium"
              style={{
                color:       i === 1 ? '#22c55e' : '#64748b',
                borderBottom: i === 1 ? '2px solid #22c55e' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 mb-3">
          {[
            { l: 'A receber', v: 'R$ 12.700', clr: '#22c55e' },
            { l: 'A pagar',   v: 'R$ 13.077', clr: '#f87171' },
          ].map(s => (
            <div key={s.l} className="flex-1 rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[8px] text-slate-500">{s.l}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: s.clr }}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div
                className="w-1.5 h-5 rounded-full shrink-0"
                style={{ background: item.type === 'receber' ? '#22c55e' : '#f87171' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white truncate">{item.desc}</p>
                <p className="text-[7px] text-slate-600">Vence {item.due}</p>
              </div>
              <p className="text-[9px] text-slate-300 font-mono">{item.val}</p>
              <span className="text-[7px] px-1.5 py-0.5 rounded" style={{ background: `${item.statusClr}20`, color: item.statusClr }}>
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
   MOCKUP: Extrato Financeiro
─────────────────────────────────────────── */
function ExtratoMockup() {
  const groups = [
    {
      date: '12 maio 2025',
      net: '+R$ 2.850,00',
      netClr: '#22c55e',
      txns: [
        { desc: 'Serviço de consultoria', acc: 'Conta Principal', val: '+R$ 3.500,00', clr: '#22c55e', badge: 'Receita', badgeClr: '#22c55e' },
        { desc: 'Material de escritório', acc: 'Conta Principal', val: '-R$ 650,00',   clr: '#f87171', badge: 'Despesa', badgeClr: '#f87171' },
      ],
    },
    {
      date: '10 maio 2025',
      net: '-R$ 1.200,00',
      netClr: '#f87171',
      txns: [
        { desc: 'Internet fibra — maio', acc: 'Conta Empresarial', val: '-R$ 380,00',   clr: '#f87171', badge: 'Despesa', badgeClr: '#f87171' },
        { desc: 'Transf. para poupança', acc: 'Caixa',             val: 'R$ 820,00',    clr: '#60a5fa', badge: 'Transf.', badgeClr: '#60a5fa' },
      ],
    },
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-white/15 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
      {/* Chrome */}
      <div className="bg-[#16202f] px-4 py-2.5 flex items-center gap-3 border-b border-white/10">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white/5 rounded px-3 py-1 text-[10px] text-slate-500 font-mono truncate">
          app.gesmart.com.br/minha-empresa/relatorios/extrato
        </div>
      </div>

      {/* Content */}
      <div className="bg-[#0b1322] p-4" style={{ height: 300 }}>
        {/* Summary bar */}
        <div className="flex gap-2 mb-4">
          {[
            { l: 'Receitas',  v: '+R$ 9.850', clr: '#22c55e' },
            { l: 'Despesas',  v: '-R$ 4.320', clr: '#f87171' },
            { l: 'Resultado', v: '+R$ 5.530', clr: '#22c55e' },
          ].map(s => (
            <div key={s.l} className="flex-1 rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[8px] text-slate-500">{s.l}</p>
              <p className="text-[11px] font-bold mt-0.5" style={{ color: s.clr }}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Grouped list */}
        <div className="space-y-3">
          {groups.map((g, gi) => (
            <div key={gi}>
              {/* Day separator */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] text-slate-500">{g.date}</span>
                <span className="text-[8px] font-mono" style={{ color: g.netClr }}>{g.net}</span>
              </div>
              <div className="space-y-1">
                {g.txns.map((t, ti) => (
                  <div key={ti} className="flex items-center gap-2 rounded px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-white truncate">{t.desc}</p>
                      <p className="text-[7px] text-slate-600">{t.acc}</p>
                    </div>
                    <span className="text-[7px] px-1.5 py-0.5 rounded" style={{ background: `${t.badgeClr}20`, color: t.badgeClr }}>
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
export default function LpTrialPage() {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="GeSmart" width={32} height={32} className="opacity-90" />
          <span className="font-bold text-lg tracking-tight">GeSmart</span>
        </div>
        <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
          Já tenho conta →
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-14 pb-6 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Clock className="h-3.5 w-3.5" />
          7 dias grátis · Sem cartão de crédito
        </div>

        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
          Teste o GeSmart{' '}
          <span className="text-[#22c55e]">gratuitamente</span>{' '}
          por 7 dias.
        </h1>

        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
          Controle financeiro completo para sua empresa. Configure em minutos,
          use por uma semana inteira — sem pagar nada.
        </p>

        <CtaButton />

        <p className="text-xs text-slate-600 mt-4">
          Sem cartão · Sem instalação · Cancele quando quiser
        </p>
      </section>

      {/* Hero mockup — Dashboard */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <DashboardMockup />
      </section>

      {/* O que está incluso */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2">Tudo liberado durante o teste</h2>
        <p className="text-slate-400 text-center text-sm mb-10">Sem recursos bloqueados. Use o sistema completo.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5 flex gap-4">
              <div className="mt-0.5 shrink-0">
                <f.icon className="h-5 w-5 text-[#22c55e]" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{f.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Screen previews */}
      <section className="px-6 py-16 bg-white/[0.015] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Veja o sistema em ação</h2>
          <p className="text-slate-400 text-center text-sm mb-10">
            Interface limpa, dados em tempo real, sem complicação.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-[#22c55e] uppercase tracking-wider mb-3">
                Contas a Pagar / Receber
              </p>
              <ContasMockup />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#22c55e] uppercase tracking-wider mb-3">
                Extrato Financeiro
              </p>
              <ExtratoMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Como funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.n} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] font-black text-lg flex items-center justify-center mx-auto mb-3">
                  {s.n}
                </div>
                <p className="font-semibold mb-1">{s.title}</p>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Garantia */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <ShieldCheck className="h-10 w-10 text-[#22c55e] mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-3">Sem risco nenhum</h2>
        <p className="text-slate-400 max-w-lg mx-auto">
          O teste é completamente gratuito e sem compromisso. Se não gostar, é só parar de usar.
          Nenhum e-mail chato, nenhuma cobrança surpresa.
        </p>
      </section>

      {/* CTA central */}
      <section className="px-6 py-14 bg-[#22c55e]/8 border-y border-[#22c55e]/20">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <Zap className="h-8 w-8 text-[#22c55e] mx-auto" />
          <h2 className="text-2xl font-bold">Pronto para testar?</h2>
          <p className="text-slate-400 text-sm">Crie sua conta em menos de 1 minuto.</p>
          <CtaButton className="mx-auto" />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Perguntas frequentes</h2>
        <div className="space-y-4">
          {faqs.map(faq => (
            <div key={faq.q} className="border border-white/10 rounded-xl p-5">
              <p className="font-semibold text-sm mb-1.5 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#22c55e] mt-0.5 shrink-0" />
                {faq.q}
              </p>
              <p className="text-slate-400 text-sm pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-3">Comece hoje, decida depois.</h2>
        <p className="text-slate-400 text-sm mb-6">7 dias. Sem cartão. Sem burocracia.</p>
        <CtaButton label="Criar minha conta grátis" />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} GeSmart · Todos os direitos reservados
      </footer>
    </div>
  )
}
