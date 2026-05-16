'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  RecurrenceDialog, Recurrence, FREQUENCY_LABELS,
  RCategory, RAccount, RCostCenter, RPerson,
} from './recurrence-dialog'

export function RecurrenceList({
  tenantId,
  recurrences,
  categories,
  accounts,
  costCenters,
  people,
}: {
  tenantId: string
  recurrences: Recurrence[]
  categories: RCategory[]
  accounts: RAccount[]
  costCenters: RCostCenter[]
  people: RPerson[]
}) {
  const [createOpen, setCreateOpen]       = useState(false)
  const [editTarget, setEditTarget]       = useState<Recurrence | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Recurrence | null>(null)
  const [deletePending, setDeletePending] = useState(true)
  const [deleting, setDeleting]           = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    if (deletePending) {
      await supabase
        .from('transactions')
        .delete()
        .eq('recurrence_id', deleteTarget.id)
        .eq('status', 'PENDING')
    }
    await supabase.from('recurrences').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />Nova recorrência
        </Button>
      </div>

      {recurrences.length === 0 ? (
        <div className="rounded-xl border bg-card text-center py-16 text-muted-foreground text-sm">
          Nenhuma recorrência cadastrada.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Período</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Início</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {recurrences.map(rec => (
                <tr key={rec.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant={rec.type === 'PAYABLE' ? 'destructive' : 'success'}>
                      {rec.type === 'PAYABLE' ? 'Despesa' : 'Receita'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{rec.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{rec.chart_of_accounts?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{rec.financial_accounts?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{FREQUENCY_LABELS[rec.frequency]}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(rec.start_date)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${rec.type === 'PAYABLE' ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(rec.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEditTarget(rec)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { setDeleteTarget(rec); setDeletePending(true) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create */}
      <RecurrenceDialog
        tenantId={tenantId}
        categories={categories}
        accounts={accounts}
        costCenters={costCenters}
        people={people}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit */}
      {editTarget && (
        <RecurrenceDialog
          tenantId={tenantId}
          categories={categories}
          accounts={accounts}
          costCenters={costCenters}
          people={people}
          recurrence={editTarget}
          open={true}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir recorrência</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>&quot;{deleteTarget?.description}&quot;</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="my-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                checked={deletePending}
                onChange={e => setDeletePending(e.target.checked)}
              />
              <span className="text-sm">Também excluir os lançamentos em aberto gerados por esta recorrência</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
