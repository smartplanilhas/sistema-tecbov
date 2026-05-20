'use client'

import { useEffect } from 'react'

type Parcela = { id: string; date: string; amount: number; status: 'COMPLETED' | 'PENDING' }

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function PrintView({
  tenantNome,
  data,
  comprador,
  conta,
  referencia,
  tipoPreco,
  qtdAnimais,
  brincos,
  total,
  parcelas,
}: {
  tenantNome: string
  data: string
  comprador: string | null
  conta: string | null
  referencia: string | null
  tipoPreco: string | null
  qtdAnimais: number | null
  brincos: string | null
  total: number
  parcelas: Parcela[]
}) {
  useEffect(() => {
    window.print()
  }, [])

  const isParcelas = parcelas.length > 1

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: system-ui, sans-serif; color: #111; background: #fff; }
      `}</style>

      {/* Botão só visível na tela */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg shadow hover:bg-gray-800 transition-colors"
        >
          Imprimir / Salvar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg shadow hover:bg-gray-200 transition-colors"
        >
          Fechar
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold">{tenantNome}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Comprovante de Venda</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Data: <strong className="text-gray-900">{fmtDate(data)}</strong></p>
            {referencia && <p className="mt-0.5">Ref.: <strong className="text-gray-900">{referencia}</strong></p>}
          </div>
        </div>

        {/* Dados da venda */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Dados da Venda</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Row label="Comprador" value={comprador ?? '—'} />
            <Row label="Conta" value={conta ?? '—'} />
            {tipoPreco && <Row label="Precificação" value={tipoPreco} />}
            {qtdAnimais != null && <Row label="Qtd. animais" value={String(qtdAnimais)} />}
          </div>
        </div>

        {/* Animais */}
        {brincos && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Animais</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{brincos}</p>
          </div>
        )}

        {/* Pagamento */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {isParcelas ? 'Parcelas' : 'Pagamento'}
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-500">
                  {isParcelas ? 'Parcela' : 'Descrição'}
                </th>
                <th className="text-left py-2 font-medium text-gray-500">Vencimento</th>
                <th className="text-right py-2 font-medium text-gray-500">Valor</th>
                <th className="text-right py-2 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">
                    {isParcelas ? `${i + 1}/${parcelas.length}` : 'À vista'}
                  </td>
                  <td className="py-2 text-gray-700">{fmtDate(p.date)}</td>
                  <td className="py-2 text-right font-mono">R$ {fmt(p.amount)}</td>
                  <td className="py-2 text-right text-xs">
                    <span style={{
                      background: p.status === 'COMPLETED' ? '#dcfce7' : '#fef9c3',
                      color:      p.status === 'COMPLETED' ? '#15803d' : '#a16207',
                      padding: '2px 8px', borderRadius: 99,
                    }}>
                      {p.status === 'COMPLETED' ? 'Recebido' : 'A receber'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-3 font-semibold">Total</td>
                <td className="pt-3 text-right font-bold font-mono text-base">R$ {fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-12 pt-8 mt-8 border-t">
          <div className="space-y-1 text-center text-sm text-gray-500">
            <div className="border-t border-gray-400 pt-2">{tenantNome}</div>
            <p>Vendedor</p>
          </div>
          <div className="space-y-1 text-center text-sm text-gray-500">
            <div className="border-t border-gray-400 pt-2">{comprador ?? '_____________________'}</div>
            <p>Comprador</p>
          </div>
        </div>

      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
