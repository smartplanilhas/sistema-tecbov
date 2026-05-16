import type { Metadata } from 'next'
import { CheckCircle2, BarChart3, Wallet, Globe, TrendingUp, Shield, Star } from 'lucide-react'
import { LeadForm } from './lead-form'

export const metadata: Metadata = {
  title: 'GeSmart — Controle Financeiro para Pequenas Empresas',
  description: 'Chega de gerir às cegas. Controle real das finanças da sua empresa em tempo real.',
}

const features = [
  {
    icon: BarChart3,
    title: 'Dashboard em tempo real',
    desc: 'Visão completa do seu caixa, contas a receber e a pagar, tudo em uma tela só.',
  },
  {
    icon: TrendingUp,
    title: 'DRE e Fluxo de Caixa',
    desc: 'Saiba se sua empresa está dando lucro de verdade, não só faturamento.',
  },
  {
    icon: Wallet,
    title: 'Conciliação bancária',
    desc: 'Seus lançamentos batendo com o extrato. Sem surpresa no fechamento.',
  },
  {
    icon: Globe,
    title: 'Acesse de qualquer lugar',
    desc: 'Celular, tablet ou computador. Seus números sempre no bolso.',
  },
]

const forWho = [
  {
    num: '01',
    title: 'Pequenos comércios e lojas',
    desc: 'Que precisam saber o que entra, o que sai e o que sobra todo dia, sem precisar de contador para isso.',
  },
  {
    num: '02',
    title: 'Prestadores de serviço',
    desc: 'Que têm clientes para cobrar e não querem perder dinheiro por falta de acompanhamento.',
  },
  {
    num: '03',
    title: 'Microempreendedores',
    desc: 'Que estão crescendo e precisam de uma base financeira sólida antes de dar o próximo passo.',
  },
  {
    num: '04',
    title: 'Quem usa planilha hoje',
    desc: 'E já sabe que planilha não escala. Chegou a hora de ter um sistema que cresce com você.',
  },
]

const included = [
  'Cadastro de contas bancárias',
  'Cadastro de clientes e fornecedores',
  'Plano de contas personalizado',
  'Contas a receber e a pagar',
  'Conciliação bancária',
  'Fluxo de caixa diário e mensal',
  'DRE — Demonstração de Resultados',
  'Dashboard gerencial visual',
  'Suporte via WhatsApp',
  'Atualizações sem custo adicional',
]

const faqs = [
  {
    q: 'Quando terei acesso após contratar?',
    a: 'Imediatamente. Para pagamentos via cartão ou Pix, seu login chega na hora. No boleto, em até 2 dias úteis após a compensação.',
  },
  {
    q: 'Funciona para qualquer tipo de negócio?',
    a: 'Sim. O GeSmart foi desenvolvido para atender comércios, indústrias e prestadoras de serviço de todos os segmentos.',
  },
  {
    q: 'Posso acessar pelo celular?',
    a: 'Sim. O sistema funciona em qualquer dispositivo com internet como computador, tablet ou smartphone.',
  },
  {
    q: 'Como funciona o suporte?',
    a: 'Via WhatsApp, de segunda a sexta das 09h às 18h. Você também tem acesso a videoaulas completas para tirar dúvidas no seu ritmo.',
  },
  {
    q: 'Quais formas de pagamento são aceitas?',
    a: 'Cartão de crédito e Pix.',
  },
]

const pains = [
  'Chega o fim do mês e você não sabe de onde veio o prejuízo',
  'Toma decisões no "feeling", sem números concretos na mão',
  'Mistura contas pessoais com as da empresa sem perceber',
  'Planilha bagunçada que ninguém mais entende, nem você',
  'Medo de expandir porque não sabe se tem caixa para isso',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white" style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.08),transparent)] pointer-events-none" />

        <span className="relative inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Oferta de lançamento — vagas limitadas
        </span>

        <h1 className="relative text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-tight mb-6">
          Chega de gerir às cegas.{' '}
          <span className="text-green-400">Controle real, agora.</span>
        </h1>

        <p className="relative text-lg sm:text-xl text-slate-300 max-w-xl mb-10 leading-relaxed">
          Cada dia sem gestão financeira é dinheiro saindo sem você saber. O GeSmart coloca você no
          comando — gerencie entradas, saídas, fluxo de caixa e resultados em tempo real.
        </p>

        <div className="relative w-full max-w-md">
          <LeadForm cta="Quero controlar agora" />
        </div>
      </section>

      {/* DOR */}
      <section className="bg-slate-900/40 border-y border-slate-800/50 py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Você reconhece alguma dessas situações?
          </h2>
          <ul className="space-y-3">
            {pains.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-5 py-4"
              >
                <span className="text-red-400 font-bold mt-0.5 shrink-0">✗</span>
                <span className="text-slate-200">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* VIRADA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">O GeSmart muda isso de vez.</h2>
            <p className="text-slate-400 text-lg max-w-lg mx-auto">
              Um sistema pensado para quem precisa de resultado, não de complicação.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 hover:border-green-500/30 transition-colors"
              >
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 shrink-0 h-fit">
                  <Icon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUEM */}
      <section className="bg-slate-900/40 border-y border-slate-800/50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Para quem é o GeSmart?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {forWho.map(({ num, title, desc }) => (
              <div
                key={num}
                className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 hover:border-green-500/30 transition-colors"
              >
                <span className="text-green-400 font-mono font-bold text-3xl">{num}</span>
                <h3 className="font-semibold text-white mt-3 mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INCLUSO */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Tudo que está incluso na sua assinatura
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {included.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <span className="text-slate-200 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREÇO */}
      <section className="bg-slate-900/40 border-y border-slate-800/50 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-amber-400 text-sm font-medium mb-3">
              🔒 Preço de lançamento — por tempo limitado
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold">Escolha seu plano</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Mensal */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-1">Mensal</h3>
              <p className="text-slate-400 text-sm mb-4">Sem fidelidade. Cancele quando quiser.</p>
              <p className="text-slate-500 line-through text-sm">de R$ 147,90</p>
              <p className="text-4xl font-bold text-white mt-1">
                R$ 79<span className="text-xl font-normal text-slate-400">,00/mês</span>
              </p>
              <div className="mt-6">
                <LeadForm cta="Começar agora" plan="mensal" compact />
              </div>
            </div>

            {/* Anual */}
            <div className="relative bg-slate-800/50 border-2 border-green-500/50 rounded-2xl p-6">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                <Star className="w-3 h-3" />
                Melhor custo-benefício
              </span>
              <h3 className="font-semibold text-lg mb-1">Anual</h3>
              <p className="text-slate-400 text-sm mb-4">Acesso completo por 12 meses.</p>
              <p className="text-slate-500 line-through text-sm">de R$ 948,00</p>
              <p className="text-4xl font-bold text-white mt-1">
                R$ 697<span className="text-xl font-normal text-slate-400"> à vista</span>
              </p>
              <p className="text-slate-400 text-sm mt-1">
                ou 12x de <strong className="text-white">R$ 58,09</strong>
              </p>
              <div className="mt-6">
                <LeadForm cta="Quero o plano anual" plan="anual" compact />
              </div>
            </div>
          </div>

          {/* Garantia */}
          <div className="flex items-start gap-3 bg-slate-800/30 border border-slate-700/30 rounded-xl px-5 py-4 text-sm text-slate-300">
            <Shield className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-white">Garantia de 7 dias.</strong> Não gostou? Devolvemos
              100% do seu dinheiro, sem burocracia e sem perguntas. O risco é todo nosso.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Dúvidas frequentes</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div
                key={q}
                className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5"
              >
                <h3 className="font-semibold text-white mb-2">{q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-green-950/20 border-t border-green-900/30 py-20 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          Cada dia sem controle é prejuízo acumulando.
        </h2>
        <p className="text-slate-300 text-lg mb-10">
          Comece agora. O próximo mês pode fechar diferente.
        </p>
        <div className="max-w-md mx-auto">
          <LeadForm cta="Quero o GeSmart agora" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 px-4 text-center text-slate-500 text-sm space-y-1">
        <p className="font-semibold text-slate-300">GeSmart — Sistema de Gestão Financeira</p>
        <p>contato@gesmart.com.br | Suporte: seg–sáb, 10h–19h</p>
        <p className="pt-1">© 2025 GeSmart. Todos os direitos reservados.</p>
      </footer>

    </div>
  )
}
