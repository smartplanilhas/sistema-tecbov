'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShoppingCart, Building2, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PersonDialog } from './person-dialog'
import type { Person } from '@/types/database'

type Tab = 'clients' | 'suppliers'

const PAGE_SIZES = [10, 20, 50, 100]

export function PersonsView({
  tenantId,
  people,
}: {
  tenantId: string
  people: Person[]
}) {
  const [tab, setTab]           = useState<Tab>('clients')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage]         = useState(1)
  const [createOpen, setCreateOpen]     = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  const clientCount   = people.filter((p) => p.is_client).length
  const supplierCount = people.filter((p) => p.is_supplier).length
  const filtered      = people.filter((p) => tab === 'clients' ? p.is_client : p.is_supplier)
  const totalPages    = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage      = Math.min(page, totalPages)
  const paginated     = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to   = Math.min(safePage * pageSize, filtered.length)

  function changeTab(next: Tab) { setTab(next); setPage(1) }
  function changePageSize(size: number) { setPageSize(size); setPage(1) }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deseja excluir "${name}"?`)) return
    await supabase.from('people').delete().eq('id', id)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border bg-card p-1">
          <button
            onClick={() => changeTab('clients')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === 'clients'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Clientes
            <span className="ml-1 text-xs opacity-70">{clientCount}</span>
          </button>
          <button
            onClick={() => changeTab('suppliers')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === 'suppliers'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            Fornecedores
            <span className="ml-1 text-xs opacity-70">{supplierCount}</span>
          </button>
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {tab === 'clients' ? 'Novo cliente' : 'Novo fornecedor'}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded-lg py-14 text-center text-muted-foreground text-sm bg-card">
          {tab === 'clients' ? 'Nenhum cliente cadastrado.' : 'Nenhum fornecedor cadastrado.'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome / Razão Social</th>
                <th className="text-left px-4 py-3 font-medium">Documento</th>
                <th className="text-left px-4 py-3 font-medium">Telefone</th>
                <th className="text-left px-4 py-3 font-medium">E-mail</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((person) => (
                <tr key={person.id} className={cn('hover:bg-muted/30 transition-colors', !person.active && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{person.name}</p>
                      {!person.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    {person.trade_name && (
                      <p className="text-xs text-muted-foreground">{person.trade_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{person.document ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{person.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{person.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingPerson(person)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(person.id, person.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="mr-2">Linhas por página:</span>
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => changePageSize(size)}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                    pageSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">
                {filtered.length === 0 ? '0' : `${from}–${to}`} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-16 text-center">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PersonDialog tenantId={tenantId} open={createOpen} onOpenChange={setCreateOpen} />
      <PersonDialog
        tenantId={tenantId}
        person={editingPerson}
        open={!!editingPerson}
        onOpenChange={(v) => { if (!v) setEditingPerson(null) }}
      />
    </>
  )
}
