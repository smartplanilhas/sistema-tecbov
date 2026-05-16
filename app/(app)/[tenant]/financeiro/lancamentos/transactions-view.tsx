'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingDown, TrendingUp, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ChevronsUpDown,
  SlidersHorizontal, Download, Loader2, X, Search, RefreshCw,
  ArrowLeftRight,
} from 'lucide-react'
import { RecurrenceList } from './recurrence-list'
import type { Recurrence, RCategory, RCostCenter, RPerson } from './recurrence-dialog'
import { TransferDialog } from './transfer-dialog'
import { TransferList } from './transfer-list'
import type { TransferTx } from './transfer-list'
import { TabNav } from '@/components/ui/tab-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'EXPENSE' | 'INCOME' | 'RECURRENCE' | 'TRANSFER'
type SortDir = 'asc' | 'desc'
type SortKey = 'due_date' | 'person' | 'description' | 'account' | 'amount' | 'status'

type Transaction = {
  id: string
  number: number
  type: 'INCOME' | 'EXPENSE'
  account_id: string
  category_id: string | null
  cost_center_id: string | null
  person_id: string | null
  payment_method_id: string | null
  date: string
  due_date: string | null
  payment_date: string | null
  description: string | null
  status: string
  amount: number
  financial_accounts: { name: string } | null
  people: { name: string } | null
}

type FilterState = {
  statuses: string[]
  categoryIds: string[]
  accountIds: string[]
  paymentMethodIds: string[]
  personIds: string[]
  periodPreset: string
  dateFrom: string
  dateTo: string
  installments: '' | 'only' | 'exclude'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FILTERS: FilterState = {
  statuses: [],
  categoryIds: [],
  accountIds: [],
  paymentMethodIds: [],
  personIds: [],
  periodPreset: '',
  dateFrom: '',
  dateTo: '',
  installments: '',
}

const PAGE_SIZES = [10, 20, 50, 100]

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  COMPLETED: { label: 'Pago',      variant: 'success' },
  PENDING:   { label: 'Pendente',  variant: 'warning' },
  OVERDUE:   { label: 'Atrasado',  variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'secondary' },
}

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Pago' },
  { value: 'PENDING',   label: 'Pendente' },
  { value: 'OVERDUE',   label: 'Atrasado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const PERIOD_PRESETS = [
  { value: 'today',      label: 'Hoje' },
  { value: 'yesterday',  label: 'Ontem' },
  { value: 'this_week',  label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_30',    label: 'Últimos 30 dias' },
  { value: 'next_30',    label: 'Próximos 30 dias' },
  { value: 'custom',     label: 'Personalizado' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

function getDateRangeForPreset(preset: string): { from: string; to: string } | null {
  const d = new Date()
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  const today = fmt(d)
  switch (preset) {
    case 'today': return { from: today, to: today }
    case 'yesterday': { const y = new Date(d); y.setDate(y.getDate() - 1); return { from: fmt(y), to: fmt(y) } }
    case 'this_week': { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); return { from: fmt(s), to: today } }
    case 'this_month': return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: today }
    case 'last_30': { const s = new Date(d); s.setDate(s.getDate() - 30); return { from: fmt(s), to: today } }
    case 'next_30': { const e = new Date(d); e.setDate(e.getDate() + 30); return { from: today, to: fmt(e) } }
    default: return null
  }
}

function getEffectiveStatus(tx: Transaction, today: string) {
  if (tx.status === 'PENDING' && tx.due_date && tx.due_date < today) return 'OVERDUE'
  return tx.status
}

function sortValue(tx: Transaction, key: SortKey): string | number {
  switch (key) {
    case 'due_date':    return tx.due_date ?? ''
    case 'person':      return tx.people?.name?.toLowerCase() ?? ''
    case 'description': return tx.description?.toLowerCase() ?? ''
    case 'account':     return tx.financial_accounts?.name?.toLowerCase() ?? ''
    case 'amount':      return tx.amount
    case 'status':      return tx.status
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />
  return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
}

function Th({ col, label, align = 'left', sortKey, sortDir, onSort }: {
  col: SortKey; label: string; align?: 'left' | 'right'
  sortKey: SortKey; sortDir: SortDir; onSort: (c: SortKey) => void
}) {
  return (
    <th className={cn('px-4 py-3 font-medium text-muted-foreground select-none', align === 'right' ? 'text-right' : 'text-left')}>
      <button type="button" onClick={() => onSort(col)}
        className={cn('inline-flex items-center gap-0 hover:text-foreground transition-colors', align === 'right' && 'flex-row-reverse')}>
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  )
}

function CheckList({ items, selected, onChange }: {
  items: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!items.length) return <p className="text-xs text-muted-foreground italic">Nenhum disponível</p>
  return (
    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
      {items.map(item => (
        <label key={item.id} className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary"
            checked={selected.includes(item.id)}
            onChange={() => onChange(selected.includes(item.id) ? selected.filter(x => x !== item.id) : [...selected, item.id])}
          />
          <span className="text-sm">{item.name}</span>
        </label>
      ))}
    </div>
  )
}

function MultiSelectDropdown({ items, selected, onChange, placeholder = 'Selecionar...' }: {
  items: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? (items.find(i => i.id === selected[0])?.name ?? '1 selecionado')
      : `${selected.length} selecionados`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm"
      >
        <span className={cn(selected.length === 0 ? 'text-muted-foreground' : '')}>{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 w-full rounded-md border bg-background shadow-md max-h-48 overflow-y-auto">
            {items.length === 0
              ? <p className="text-xs text-muted-foreground italic px-3 py-2">Nenhum disponível</p>
              : items.map(item => (
                <label key={item.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={selected.includes(item.id)}
                    onChange={() => onChange(
                      selected.includes(item.id)
                        ? selected.filter(x => x !== item.id)
                        : [...selected, item.id]
                    )}
                  />
                  <span className="text-sm">{item.name}</span>
                </label>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function FilterDrawer({ open, onClose, filters, onChange, onClear, categories, accounts, paymentMethods, people, tab }: {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (f: FilterState) => void
  onClear: () => void
  categories: { id: string; name: string }[]
  accounts: { id: string; name: string }[]
  paymentMethods: { id: string; name: string }[]
  people: { id: string; name: string }[]
  tab: Tab
}) {
  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div className={cn('fixed inset-0 z-50', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-black/30 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div className={cn(
        'absolute right-0 top-0 h-full w-96 bg-background shadow-2xl flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-semibold">Filtros</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <Section title="Período">
            <div className="flex flex-wrap gap-2">
              {PERIOD_PRESETS.map(p => (
                <button key={p.value} type="button"
                  onClick={() => set('periodPreset', filters.periodPreset === p.value ? '' : p.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    filters.periodPreset === p.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
            {filters.periodPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">De</label>
                  <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                  <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
                </div>
              </div>
            )}
          </Section>

          <Section title="Status">
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(s => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary"
                    checked={filters.statuses.includes(s.value)}
                    onChange={() => {
                      const next = filters.statuses.includes(s.value)
                        ? filters.statuses.filter(x => x !== s.value)
                        : [...filters.statuses, s.value]
                      set('statuses', next)
                    }} />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Categoria">
            <MultiSelectDropdown items={categories} selected={filters.categoryIds} onChange={ids => set('categoryIds', ids)} placeholder="Todas as categorias" />
          </Section>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide shrink-0">Filtros avançados</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Section title="Conta financeira">
            <CheckList items={accounts} selected={filters.accountIds} onChange={ids => set('accountIds', ids)} />
          </Section>

          <Section title="Forma de pagamento">
            <CheckList items={paymentMethods} selected={filters.paymentMethodIds} onChange={ids => set('paymentMethodIds', ids)} />
          </Section>

          <Section title={tab === 'EXPENSE' ? 'Fornecedor' : 'Cliente'}>
            <Select
              value={filters.personIds[0] ?? ''}
              onValueChange={val => set('personIds', val ? [val] : [])}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={tab === 'EXPENSE' ? 'Todos os fornecedores' : 'Todos os clientes'} />
              </SelectTrigger>
              <SelectContent>
                {people.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-sm">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.personIds.length > 0 && (
              <button type="button" onClick={() => set('personIds', [])} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1">
                Limpar
              </button>
            )}
          </Section>

          <Section title="Parcelados">
            <div className="space-y-2">
              {([['', 'Todos'], ['only', 'Somente parcelados'], ['exclude', 'Excluir parcelados']] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="drawer-installments" className="h-4 w-4 accent-primary"
                    checked={filters.installments === val} onChange={() => set('installments', val)} />
                  <span className="text-sm">{lbl}</span>
                </label>
              ))}
            </div>
          </Section>

        </div>

        <div className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClear}>
            Limpar todos os filtros
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Status Popover ───────────────────────────────────────────────────────────

type StatusPopoverState = {
  txId: string
  currentStatus: string
  currentPaymentDate: string | null
  rect: DOMRect
}

function StatusPopover({
  state,
  onClose,
  onSaved,
}: {
  state: StatusPopoverState
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus]           = useState(state.currentStatus)
  const [paymentDate, setPaymentDate] = useState(state.currentPaymentDate ?? todayStr())
  const [saving, setSaving]           = useState(false)
  const popoverRef                    = useRef<HTMLDivElement>(null)
  const supabase                      = createClient()

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Position: prefer below, flip above if near bottom
  const spaceBelow = window.innerHeight - state.rect.bottom
  const top = spaceBelow > 220
    ? state.rect.bottom + window.scrollY + 6
    : state.rect.top  + window.scrollY  - 220
  const left = Math.min(state.rect.left + window.scrollX, window.innerWidth - 260)

  async function handleSave() {
    setSaving(true)
    const update: { status: 'COMPLETED' | 'PENDING' | 'CANCELLED'; payment_date?: string | null } = { status: status as 'COMPLETED' | 'PENDING' | 'CANCELLED' }
    if (status === 'COMPLETED') update.payment_date = paymentDate
    else update.payment_date = null
    await supabase.from('transactions').update(update).eq('id', state.txId)
    setSaving(false)
    onClose()
    onSaved()
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-56 rounded-xl border bg-background shadow-xl p-3 space-y-3"
      style={{ top, left }}
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alterar status</p>

      <div className="space-y-1.5">
        {STATUS_OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 hover:bg-muted transition-colors">
            <input
              type="radio"
              name="popover-status"
              className="h-3.5 w-3.5 accent-primary"
              checked={status === opt.value}
              onChange={() => setStatus(opt.value)}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>

      {status === 'COMPLETED' && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data de pagamento</label>
          <input
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 h-8 rounded-md border border-input text-sm hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TransactionsView({
  tenantSlug,
  tenantId,
  transactions,
  categories = [],
  paymentMethods = [],
  recurrences = [],
  costCenters = [],
  people = [],
  accounts = [],
  transfers = [],
  initialTab,
  initialMonth,
}: {
  tenantSlug: string
  tenantId: string
  transactions: Transaction[]
  categories?: RCategory[]
  paymentMethods?: { id: string; name: string }[]
  recurrences?: Recurrence[]
  costCenters?: RCostCenter[]
  people?: RPerson[]
  accounts?: { id: string; name: string }[]
  transfers?: TransferTx[]
  initialTab?: Tab
  initialMonth?: string
}) {
  const now = new Date()
  const parsedMonth = initialMonth?.match(/^(\d{4})-(\d{2})$/)

  const [tab, setTab]               = useState<Tab>(initialTab ?? 'EXPENSE')
  const [transferOpen, setTransferOpen] = useState(false)
  const [pageSize, setPageSize]     = useState(20)
  const [page, setPage]             = useState(1)
  const [sortKey, setSortKey]       = useState<SortKey>('due_date')
  const [sortDir, setSortDir]       = useState<SortDir>('desc')
  const [exporting, setExporting]   = useState(false)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [statusPopover, setStatusPopover] = useState<StatusPopoverState | null>(null)
  const [filters, setFilters]       = useState<FilterState>(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [monthYear, setMonthYear]     = useState(
    parsedMonth
      ? { year: Number(parsedMonth[1]), month: Number(parsedMonth[2]) }
      : { year: now.getFullYear(), month: now.getMonth() + 1 }
  )

  const router = useRouter()
  const today = todayStr()

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function prevMonth() {
    setMonthYear(({ year, month }) => month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 })
    setPage(1)
  }
  function nextMonth() {
    setMonthYear(({ year, month }) => month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 })
    setPage(1)
  }

  const monthPrefix = `${monthYear.year}-${String(monthYear.month).padStart(2, '0')}`
  const monthLabel = formatMonthYear(new Date(monthYear.year, monthYear.month - 1, 1))
    .replace(/^\w/, c => c.toUpperCase())

  function changeTab(next: Tab) { setTab(next); setPage(1) }
  function changePageSize(size: number) { setPageSize(size); setPage(1) }
  function updateFilters(f: FilterState) { setFilters(f); setPage(1) }
  function clearFilters() { setFilters(EMPTY_FILTERS); setSearchInput(''); setSearch(''); setPage(1) }

  const returnParams = `returnTab=${tab}&returnMonth=${monthPrefix}`

  // Active date range from period filter
  const activeDateRange = useMemo(() => {
    if (!filters.periodPreset) return null
    if (filters.periodPreset === 'custom') {
      if (!filters.dateFrom && !filters.dateTo) return null
      return { from: filters.dateFrom || '0000-01-01', to: filters.dateTo || '9999-12-31' }
    }
    return getDateRangeForPreset(filters.periodPreset)
  }, [filters.periodPreset, filters.dateFrom, filters.dateTo])

  const activePeriodLabel = useMemo(() => {
    if (!activeDateRange) return null
    if (filters.periodPreset === 'custom') {
      const fmt = (s: string) => s ? formatDate(s) : '?'
      const parts: string[] = []
      if (filters.dateFrom) parts.push(fmt(filters.dateFrom))
      if (filters.dateTo) parts.push(fmt(filters.dateTo))
      return parts.join(' – ')
    }
    return PERIOD_PRESETS.find(p => p.value === filters.periodPreset)?.label ?? null
  }, [activeDateRange, filters.periodPreset, filters.dateFrom, filters.dateTo])

  // Unique accounts and people derived from transactions
  const uniqueAccounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    transactions.forEach(tx => {
      if (tx.financial_accounts && !map.has(tx.account_id))
        map.set(tx.account_id, { id: tx.account_id, name: tx.financial_accounts.name })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions])

  const uniquePeople = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    transactions
      .filter(tx => tx.type === tab && tx.person_id && tx.people)
      .forEach(tx => {
        if (!map.has(tx.person_id!))
          map.set(tx.person_id!, { id: tx.person_id!, name: tx.people!.name })
      })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions, tab])

  const tabCategories = useMemo(() =>
    categories.filter(c => c.type === (tab === 'EXPENSE' ? 'EXPENSE' : 'REVENUE'))
  , [categories, tab])

  // Filtered + sorted list
  const filtered = useMemo(() => {
    return transactions
      .filter(tx => {
        if (tx.type !== tab) return false

        const dateRef = tx.due_date ?? tx.date
        if (activeDateRange) {
          if (dateRef < activeDateRange.from || dateRef > activeDateRange.to) return false
        } else {
          if (!dateRef.startsWith(monthPrefix)) return false
        }

        if (search) {
          const q = search.toLowerCase()
          if (!tx.description?.toLowerCase().includes(q) && !tx.people?.name?.toLowerCase().includes(q)) return false
        }

        if (filters.statuses.length > 0 && !filters.statuses.includes(getEffectiveStatus(tx, today))) return false
        if (filters.categoryIds.length > 0 && (!tx.category_id || !filters.categoryIds.includes(tx.category_id))) return false
        if (filters.accountIds.length > 0 && !filters.accountIds.includes(tx.account_id)) return false
        if (filters.paymentMethodIds.length > 0 && (!tx.payment_method_id || !filters.paymentMethodIds.includes(tx.payment_method_id))) return false
        if (filters.personIds.length > 0 && (!tx.person_id || !filters.personIds.includes(tx.person_id))) return false

        if (filters.installments) {
          const isInstallment = /parcela \d+\/\d+/i.test(tx.description ?? '')
          if (filters.installments === 'only' && !isInstallment) return false
          if (filters.installments === 'exclude' && isInstallment) return false
        }

        return true
      })
      .sort((a, b) => {
        const av = sortValue(a, sortKey), bv = sortValue(b, sortKey)
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [transactions, tab, activeDateRange, monthPrefix, search, filters, sortKey, sortDir, today])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const pageTotal  = paginated.reduce((s, tx) => s + tx.amount, 0)

  const amountClass  = tab === 'INCOME' ? 'text-green-600' : 'text-red-600'
  const personLabel  = tab === 'EXPENSE' ? 'Fornecedor' : 'Cliente'
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to   = Math.min(safePage * pageSize, filtered.length)

  const activeFilterCount = [
    search ? 1 : 0,
    filters.periodPreset ? 1 : 0,
    filters.statuses.length,
    filters.categoryIds.length,
    filters.accountIds.length,
    filters.paymentMethodIds.length,
    filters.personIds.length,
    filters.installments ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  async function handleExport() {
    setExporting(true)
    const { utils, writeFile } = await import('xlsx')
    const label = tab === 'EXPENSE' ? 'Despesas' : 'Receitas'
    const rows = filtered.map(tx => ({
      '#':           `#${String(tx.number).padStart(5, '0')}`,
      'Vencimento':  tx.due_date ?? '',
      [personLabel]: tx.people?.name ?? '',
      'Descrição':   tx.description ?? '',
      'Conta':       tx.financial_accounts?.name ?? '',
      'Valor (R$)':  tx.amount,
      'Status':      statusLabels[getEffectiveStatus(tx, today)]?.label ?? tx.status,
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, label)
    writeFile(wb, `lancamentos-${label.toLowerCase()}-${today}.xlsx`)
    setExporting(false)
  }

  const thProps = { sortKey, sortDir, onSort: handleSort }

  // Active filter chips data
  type Chip = { key: string; label: string; onRemove: () => void }
  const chips: Chip[] = [
    ...(search ? [{ key: 'search', label: `"${search}"`, onRemove: () => { setSearchInput(''); setSearch('') } }] : []),
    ...(filters.periodPreset ? [{ key: 'period', label: PERIOD_PRESETS.find(p => p.value === filters.periodPreset)?.label ?? '', onRemove: () => setFilters(f => ({ ...f, periodPreset: '', dateFrom: '', dateTo: '' })) }] : []),
    ...filters.statuses.map(s => ({ key: `s-${s}`, label: statusLabels[s]?.label ?? s, onRemove: () => setFilters(f => ({ ...f, statuses: f.statuses.filter(x => x !== s) })) })),
    ...filters.categoryIds.map(id => ({ key: `c-${id}`, label: tabCategories.find(c => c.id === id)?.name ?? id, onRemove: () => setFilters(f => ({ ...f, categoryIds: f.categoryIds.filter(x => x !== id) })) })),
    ...filters.accountIds.map(id => ({ key: `a-${id}`, label: uniqueAccounts.find(a => a.id === id)?.name ?? id, onRemove: () => setFilters(f => ({ ...f, accountIds: f.accountIds.filter(x => x !== id) })) })),
    ...filters.paymentMethodIds.map(id => ({ key: `pm-${id}`, label: paymentMethods.find(p => p.id === id)?.name ?? id, onRemove: () => setFilters(f => ({ ...f, paymentMethodIds: f.paymentMethodIds.filter(x => x !== id) })) })),
    ...filters.personIds.map(id => ({ key: `p-${id}`, label: uniquePeople.find(p => p.id === id)?.name ?? id, onRemove: () => setFilters(f => ({ ...f, personIds: f.personIds.filter(x => x !== id) })) })),
    ...(filters.installments ? [{ key: 'inst', label: filters.installments === 'only' ? 'Parcelados' : 'Sem parcelados', onRemove: () => setFilters(f => ({ ...f, installments: '' })) }] : []),
  ]

  return (
    <>
      {statusPopover && (
        <StatusPopover
          state={statusPopover}
          onClose={() => setStatusPopover(null)}
          onSaved={() => router.refresh()}
        />
      )}

      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        tenantId={tenantId}
        accounts={accounts}
      />

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        categories={tabCategories}
        accounts={uniqueAccounts}
        paymentMethods={paymentMethods}
        people={uniquePeople}
        tab={tab}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">Lançamentos</h1>
            <div className="flex items-center gap-2">
              <TabNav
                tabs={[
                  { id: 'EXPENSE',     label: 'Despesas' },
                  { id: 'INCOME',      label: 'Receitas' },
                  { id: 'RECURRENCE',  label: 'Recorrências' },
                  { id: 'TRANSFER',    label: 'Transferências' },
                ]}
                active={tab}
                onChange={changeTab}
              />
            </div>
          </div>
          {tab === 'EXPENSE' ? (
            <Link href={`/${tenantSlug}/financeiro/lancamentos/novo?type=EXPENSE&${returnParams}`}>
              <Button className="bg-destructive hover:bg-destructive/90 text-white gap-1.5">
                <TrendingDown className="h-4 w-4" />Nova Despesa
              </Button>
            </Link>
          ) : tab === 'INCOME' ? (
            <Link href={`/${tenantSlug}/financeiro/lancamentos/novo?type=INCOME&${returnParams}`}>
              <Button className="gap-1.5">
                <TrendingUp className="h-4 w-4" />Nova Receita
              </Button>
            </Link>
          ) : tab === 'TRANSFER' ? (
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
              onClick={() => setTransferOpen(true)}
            >
              <ArrowLeftRight className="h-4 w-4" />Nova Transferência
            </Button>
          ) : null}
        </div>

        {tab === 'TRANSFER' && (
          <TransferList transfers={transfers} tenantId={tenantId} />
        )}

        {tab === 'RECURRENCE' && (
          <RecurrenceList
            tenantId={tenantId}
            recurrences={recurrences}
            categories={categories}
            accounts={uniqueAccounts}
            costCenters={costCenters}
            people={people}
          />
        )}

        {tab !== 'RECURRENCE' && tab !== 'TRANSFER' && <>

        {/* Toolbar */}
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar descrição, pessoa..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1) }}
              className="pl-8 h-8 text-sm"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            variant="outline" size="sm"
            className={cn('gap-1.5', activeFilterCount > 0 ? 'text-foreground border-foreground' : 'text-muted-foreground')}
            onClick={() => setDrawerOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-primary text-primary-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>


          <div className="flex-1" />

          {activeDateRange ? (
            <span className="text-sm font-medium text-foreground px-2">{activePeriodLabel}</span>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="w-px h-5 bg-border mx-1" />

          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground"
            onClick={handleExport} disabled={exporting || filtered.length === 0}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar
          </Button>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(chip => (
              <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground text-xs px-3 py-1 font-medium">
                {chip.label}
                <button onClick={chip.onRemove} className="ml-0.5 hover:text-foreground/60"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Limpar tudo
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground w-16 text-left">#</th>
                <Th col="due_date"    label="Vencimento"  {...thProps} />
                <Th col="person"      label={personLabel} {...thProps} />
                <Th col="description" label="Descrição"   {...thProps} />
                <Th col="account"     label="Conta"       {...thProps} />
                <Th col="amount"      label="Valor" align="right" {...thProps} />
                <Th col="status"      label="Status"      {...thProps} />
              </tr>
            </thead>
            <tbody>
              {!paginated.length ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                <>
                  {paginated.map(tx => {
                    const effStatus  = getEffectiveStatus(tx, today)
                    const statusInfo = statusLabels[effStatus] ?? statusLabels['PENDING']
                    return (
                      <tr key={tx.id}
                        className="border-b hover:bg-green-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/${tenantSlug}/financeiro/lancamentos/editar/${tx.id}?${returnParams}`)}>
                        <td className="px-4 py-3 text-muted-foreground/60 text-xs font-mono whitespace-nowrap">
                          #{String(tx.number).padStart(5, '0')}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{tx.due_date ? formatDate(tx.due_date) : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.people?.name ?? '—'}</td>
                        <td className="px-4 py-3">{tx.description ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.financial_accounts?.name ?? '—'}</td>
                        <td className={`px-4 py-3 text-right font-medium ${amountClass}`}>{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={e => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setStatusPopover({
                                txId: tx.id,
                                currentStatus: effStatus,
                                currentPaymentDate: tx.payment_date,
                                rect,
                              })
                            }}
                            className="rounded hover:opacity-80 transition-opacity"
                          >
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t bg-muted/20">
                    <td colSpan={5} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">
                      Total ({paginated.length} lançamentos)
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(pageTotal)}
                    </td>
                    <td />
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Linhas por página:</span>
              <Select value={String(pageSize)} onValueChange={v => changePageSize(Number(v))}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">
                {filtered.length === 0 ? '0' : `${from}–${to}`} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-16 text-center">{safePage} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        </>}
      </div>
    </>
  )
}
