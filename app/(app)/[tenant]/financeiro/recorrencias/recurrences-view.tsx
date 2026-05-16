'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Pause, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RecurrenceDialog } from './recurrence-dialog'
import type { Recurrence } from '@/types/database'

type SimpleItem = { id: string; name: string }

type Tab = 'PAYABLE' | 'RECEIVABLE'

const FREQUENCY_LABEL: Record<string, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  YEARLY: 'Anual',
}

export function RecurrencesView({
  tenantId,
  recurrences,
  people,
  expenseCategories,
  revenueCategories,
  costCenters,
  financialAccounts,
  paymentMethods,
}: {
  tenantId: string
  recurrences: Recurrence[]
  people: SimpleItem[]
  expenseCategories: SimpleItem[]
  revenueCategories: SimpleItem[]
  costCenters: SimpleItem[]
  financialAccounts: SimpleItem[]
  paymentMethods: SimpleItem[]
}) {
  const [tab, setTab] = useState<Tab>('PAYABLE')
  const [editing, setEditing] = useState<Recurrence | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const peopleMap = Object.fromEntries(people.map((p) => [p.id, p.name]))
  const filtered = recurrences.filter((r) => r.type === tab)

  async function handleToggleActive(r: Recurrence) {
    await supabase.from('recurrences').update({ active: !r.active }).eq('id', r.id)
    router.refresh()
  }

  async function handleDelete(r: Recurrence) {
    if (!confirm(`Excluir recorrência "${r.description}"? As parcelas já geradas serão mantidas.`)) return
    await supabase.from('recurrences').delete().eq('id', r.id)
    router.refresh()
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(r: Recurrence) {
    setEditing(r)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recorrências</h1>
          <p className="text-muted-foreground text-sm">Lançamentos periódicos automáticos</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nova recorrência
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['PAYABLE', 'RECEIVABLE'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'PAYABLE' ? 'A Pagar' : 'A Receber'}
            <span className="ml-2 text-xs text-muted-foreground">
              ({recurrences.filter((r) => r.type === t).length})
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pessoa</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Frequência</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Início</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Geradas</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma recorrência {tab === 'PAYABLE' ? 'a pagar' : 'a receber'} cadastrada.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.person_id ? (peopleMap[r.person_id] ?? '—') : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.interval > 1 ? `A cada ${r.interval} ` : ''}
                    {FREQUENCY_LABEL[r.frequency]}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${tab === 'PAYABLE' ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.start_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.total_generated}
                    {r.max_occurrences ? ` / ${r.max_occurrences}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.active ? 'success' : 'secondary'}>
                      {r.active ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={r.active ? 'Pausar' : 'Reativar'}
                        onClick={() => handleToggleActive(r)}
                      >
                        {r.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Excluir"
                        onClick={() => handleDelete(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecurrenceDialog
        tenantId={tenantId}
        recurrence={editing ?? undefined}
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v) setEditing(null)
        }}
        defaultType={tab}
        people={people}
        expenseCategories={expenseCategories}
        revenueCategories={revenueCategories}
        costCenters={costCenters}
        financialAccounts={financialAccounts}
        paymentMethods={paymentMethods}
      />
    </div>
  )
}
