'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'

type Category = { id: string; name: string; type: string; parent_id: string | null; is_group: boolean }

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  const result = new Date(y, m - 1 + months, day)
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`
}

export function TransactionForm({
  type,
  tenantId,
  tenantSlug,
  accounts,
  categories,
  costCenters,
  people,
  paymentMethods,
  defaultAccountId,
  returnTab,
  returnMonth,
}: {
  type: 'EXPENSE' | 'INCOME'
  tenantId: string
  tenantSlug: string
  accounts: { id: string; name: string; is_default: boolean }[]
  categories: Category[]
  costCenters: { id: string; name: string }[]
  people: { id: string; name: string }[]
  paymentMethods: { id: string; name: string }[]
  defaultAccountId?: string
  returnTab?: string
  returnMonth?: string
}) {
  const isExpense = type === 'EXPENSE'
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().slice(0, 10)

  const [personId, setPersonId] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [referenceDocument, setReferenceDocument] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)
  const [paymentDate, setPaymentDate] = useState(today)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'PENDING' | 'COMPLETED'>('PENDING')
  const [useInstallments, setUseInstallments] = useState(false)
  const [installmentCount, setInstallmentCount] = useState(2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleStatus() {
    if (status === 'PENDING') {
      setStatus('COMPLETED')
      setPaymentDate(dueDate)
    } else {
      setStatus('PENDING')
    }
  }

  const coaType = isExpense ? 'EXPENSE' : 'REVENUE'
  const analyticalItems = categories.filter((c) => !c.is_group && c.type === coaType)
  const parentById = Object.fromEntries(categories.filter((c) => c.is_group).map((c) => [c.id, c.name]))
  const groupedCategories = analyticalItems.reduce<Record<string, Category[]>>((acc, item) => {
    const key = item.parent_id ?? '__root__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const parsedAmount = parseFloat(amount) || 0

  const installmentPreview = useMemo(() => {
    if (!useInstallments || parsedAmount <= 0 || installmentCount < 2 || !date) return []
    const count = installmentCount
    const base = parseFloat((parsedAmount / count).toFixed(2))
    const remainder = parseFloat((parsedAmount - base * (count - 1)).toFixed(2))
    return Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      date: addMonths(date, i),
      amount: i === count - 1 ? remainder : base,
    }))
  }, [useInstallments, parsedAmount, installmentCount, date])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId) return
    setSaving(true)
    setError('')

    const rows =
      useInstallments && installmentPreview.length > 0
        ? installmentPreview.map((p) => ({
            tenant_id: tenantId,
            type,
            account_id: accountId,
            person_id: personId || null,
            category_id: categoryId || null,
            cost_center_id: costCenterId || null,
            payment_method_id: (!paymentMethodId || paymentMethodId === '__none__') ? null : paymentMethodId,
            reference_document: referenceDocument || null,
            amount: p.amount,
            date,
            due_date: p.date,
            payment_date: null,
            description: description
              ? `${description} (${p.index}/${installmentCount})`
              : `Parcela ${p.index}/${installmentCount}`,
            status: 'PENDING' as const,
          }))
        : [
            {
              tenant_id: tenantId,
              type,
              account_id: accountId,
              person_id: personId || null,
              category_id: categoryId || null,
              cost_center_id: costCenterId || null,
              payment_method_id: (!paymentMethodId || paymentMethodId === '__none__') ? null : paymentMethodId,
              reference_document: referenceDocument || null,
              amount: parsedAmount,
              date,
              due_date: dueDate || null,
              payment_date: status === 'COMPLETED' ? (paymentDate || null) : null,
              description: description || null,
              status,
            },
          ]

    const { error: err } = await supabase.from('transactions').insert(rows)
    if (err) {
      setError('Erro ao salvar.')
      setSaving(false)
      return
    }
    router.push(`/${tenantSlug}/financeiro/lancamentos`)
    router.refresh()
  }

  const backParams = returnTab && returnMonth ? `?tab=${returnTab}&month=${returnMonth}` : ''
  const backHref = `/${tenantSlug}/financeiro/lancamentos${backParams}`

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isExpense
            ? <TrendingDown className="h-5 w-5 text-destructive" />
            : <TrendingUp className="h-5 w-5 text-green-600" />}
          <h1 className="text-2xl font-bold">{isExpense ? 'Nova Despesa' : 'Nova Receita'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-6">

        <div className="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Input
            placeholder="Descreva o lançamento"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Valor total (R$)</Label>
          <Input
            type="number" step="0.01" min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoria (opcional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(groupedCategories).map(([parentId, items]) => (
                  <SelectGroup key={parentId}>
                    <SelectLabel className="text-xs text-muted-foreground font-medium">
                      {parentById[parentId] ?? ''}
                    </SelectLabel>
                    {items.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="pl-6">{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                {analyticalItems.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhuma categoria disponível</p>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Centro de custo (opcional)</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{isExpense ? 'Pago para (opcional)' : 'Recebido de (opcional)'}</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger>
              <SelectValue placeholder={isExpense ? 'Selecione um fornecedor' : 'Selecione um cliente'} />
            </SelectTrigger>
            <SelectContent>
              {people.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {isExpense ? 'Nenhum fornecedor cadastrado' : 'Nenhum cliente cadastrado'}
                </p>
              ) : (
                people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Forma de pagamento (opcional)</Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhuma —</SelectItem>
                {paymentMethods.map((pm) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Documento de referência (opcional)</Label>
            <Input
              placeholder="NF, pedido, contrato..."
              value={referenceDocument}
              onChange={(e) => setReferenceDocument(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Conta bancária</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Data de emissão</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>{useInstallments ? 'Vencimento (1ª parcela)' : 'Data de vencimento'}</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {!useInstallments && (
          <>
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Status</Label>
              <button
                type="button"
                role="switch"
                aria-checked={status === 'COMPLETED'}
                onClick={toggleStatus}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  status === 'COMPLETED' ? 'bg-green-500' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  status === 'COMPLETED' ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
              <span className={`text-sm font-medium ${status === 'COMPLETED' ? 'text-green-700' : 'text-amber-600'}`}>
                {status === 'COMPLETED' ? (isExpense ? 'Pago' : 'Recebido') : 'Pendente'}
              </span>
            </div>

            {status === 'COMPLETED' && (
              <div className="space-y-1.5">
                <Label>Data de pagamento</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-48"
                />
              </div>
            )}
          </>
        )}

        {/* Installments section */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useInstallments}
              onChange={(e) => setUseInstallments(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <span className="text-sm font-medium">Parcelamento</span>
          </label>

          {useInstallments && (
            <>
              <div className="flex items-center gap-3">
                <Label className="shrink-0 text-sm">Número de parcelas</Label>
                <Input
                  type="number"
                  min={2}
                  max={60}
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-24"
                />
              </div>

              {installmentPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Parcelas que serão criadas
                  </p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs w-10">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Data</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentPreview.map((p) => (
                          <tr key={p.index} className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground text-xs">{p.index}</td>
                            <td className="px-3 py-2">{formatDate(p.date)}</td>
                            <td className={`px-3 py-2 text-right font-medium ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Todas as parcelas serão criadas com status <span className="font-medium text-amber-600">Pendente</span>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href={backHref}>
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || !accountId || !amount}
            className={isExpense
              ? 'bg-destructive hover:bg-destructive/90 text-white'
              : ''}
          >
            {saving
              ? 'Salvando...'
              : useInstallments && installmentPreview.length > 0
                ? `Criar ${installmentCount} parcelas`
                : isExpense ? 'Salvar despesa' : 'Salvar receita'}
          </Button>
        </div>
      </form>
    </div>
  )
}
