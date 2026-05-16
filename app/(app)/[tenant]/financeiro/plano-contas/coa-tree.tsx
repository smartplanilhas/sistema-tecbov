'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronDown, GripVertical, Plus,
  Pencil, Trash2, Archive, ArchiveRestore, MoreHorizontal, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CoaDialog } from './coa-dialog'
import type { ChartOfAccount } from '@/types/database'

// ─── Tree building ───────────────────────────────────────────
export interface AccountNode extends ChartOfAccount {
  children: AccountNode[]
}

function buildTree(accounts: ChartOfAccount[]): AccountNode[] {
  const map = new Map<string, AccountNode>()
  for (const a of accounts) map.set(a.id, { ...a, children: [] })

  const roots: AccountNode[] = []
  for (const a of accounts) {
    const node = map.get(a.id)!
    if (a.parent_id && map.has(a.parent_id)) {
      map.get(a.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

// ─── Drop target state ───────────────────────────────────────
interface DropTarget {
  id: string
  position: 'before' | 'after' | 'inside'
}

// ─── CoaTree (root component) ────────────────────────────────
export function CoaTree({
  tenantId,
  accounts,
}: {
  tenantId: string
  accounts: ChartOfAccount[]
}) {
  const [expanded, setExpanded]       = useState<Set<string>>(() =>
    new Set(accounts.filter((a) => a.level === 1).map((a) => a.id))
  )
  const [dialogState, setDialogState] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    parent: AccountNode | null
    account: AccountNode | null
  }>({ open: false, mode: 'create', parent: null, account: null })

  const [draggedId, setDraggedId]   = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [busy, setBusy]             = useState(false)

  const router    = useRouter()
  const supabase  = createClient()
  const flatAccounts = accounts

  const tree = buildTree(accounts)

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openCreate(parent: AccountNode) {
    setDialogState({ open: true, mode: 'create', parent, account: null })
  }

  function openEdit(account: AccountNode) {
    setDialogState({ open: true, mode: 'edit', parent: null, account })
  }

  async function handleArchive(id: string) {
    const { error } = await supabase.rpc('archive_coa_account', { p_account_id: id })
    if (error) { alert(error.message); return }
    router.refresh()
  }

  async function handleUnarchive(id: string) {
    const { error } = await supabase.rpc('unarchive_coa_account', { p_account_id: id })
    if (error) { alert(error.message); return }
    router.refresh()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?\n\nEssa ação não pode ser desfeita.`)) return
    const { error } = await supabase.rpc('delete_coa_account', { p_account_id: id })
    if (error) { alert(error.message); return }
    router.refresh()
  }

  // ── DnD handlers ──────────────────────────────────────────
  function handleDragStart(id: string) { setDraggedId(id) }
  function handleDragEnd() { setDraggedId(null); setDropTarget(null) }

  function handleDragOver(e: React.DragEvent, node: AccountNode) {
    e.preventDefault()
    if (!draggedId || draggedId === node.id) return

    const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height

    let position: DropTarget['position']
    if (ratio < 0.28)                       position = 'before'
    else if (ratio > 0.72)                  position = 'after'
    else if (node.is_group)                 position = 'inside'
    else                                    position = 'after'

    setDropTarget({ id: node.id, position })
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropTarget(null)
    }
  }

  async function handleDrop(e: React.DragEvent, targetNode: AccountNode) {
    e.preventDefault()
    if (!draggedId || !dropTarget || draggedId === targetNode.id || busy) return

    setDropTarget(null)
    setDraggedId(null)
    setBusy(true)

    let newParentId: string | null
    let beforeId: string | null = null

    if (dropTarget.position === 'inside') {
      newParentId = targetNode.id
    } else {
      newParentId = targetNode.parent_id
      if (dropTarget.position === 'before') {
        beforeId = targetNode.id
      } else {
        const siblings = flatAccounts
          .filter((a) => a.parent_id === targetNode.parent_id)
          .sort((a, b) => a.sort_order - b.sort_order)
        const idx = siblings.findIndex((a) => a.id === targetNode.id)
        beforeId = idx < siblings.length - 1 ? siblings[idx + 1].id : null
      }
    }

    const { error } = await supabase.rpc('move_coa_account', {
      p_account_id:    draggedId,
      p_new_parent_id: newParentId,
      p_before_id:     beforeId,
    })

    if (error) alert(error.message)
    else router.refresh()
    setBusy(false)
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-card', busy && 'opacity-60 pointer-events-none')}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
        <Button
          variant="ghost" size="sm" className="text-xs h-7"
          onClick={() => setExpanded(new Set(accounts.filter((a) => a.is_group).map((a) => a.id)))}
        >
          Expandir tudo
        </Button>
        <Button
          variant="ghost" size="sm" className="text-xs h-7"
          onClick={() => setExpanded(new Set(accounts.filter((a) => a.level === 1).map((a) => a.id)))}
        >
          Recolher tudo
        </Button>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2 border-b bg-muted/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Conta</span>
        <span className="w-24 text-right pr-8">Nível</span>
        <span className="w-10" />
      </div>

      {/* Tree */}
      <div>
        {tree.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground text-sm">
            Inicializando... Recarregue a página.
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onAddChild={openCreate}
              onEdit={openEdit}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
              draggedId={draggedId}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      <CoaDialog
        tenantId={tenantId}
        open={dialogState.open}
        mode={dialogState.mode}
        parent={dialogState.parent}
        account={dialogState.account}
        onOpenChange={(v) => setDialogState((s) => ({ ...s, open: v }))}
      />
    </div>
  )
}

// ─── TreeNode (recursive) ────────────────────────────────────
interface TreeNodeProps {
  node: AccountNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddChild: (parent: AccountNode) => void
  onEdit: (account: AccountNode) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onDelete: (id: string, name: string) => void
  draggedId: string | null
  dropTarget: DropTarget | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, node: AccountNode) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, node: AccountNode) => void
}

function TreeNode({
  node, depth, expanded,
  onToggle, onAddChild, onEdit, onArchive, onUnarchive, onDelete,
  draggedId, dropTarget,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: TreeNodeProps) {
  const isExpanded   = expanded.has(node.id)
  const hasChildren  = node.children.length > 0
  const isDropTarget = dropTarget?.id === node.id
  const isDragging   = draggedId === node.id
  const isRoot       = node.level === 1
  const isCategory   = node.level === 2
  const isSubitem    = node.level === 3
  const noChildren   = isCategory && node.children.length === 0 && node.active

  const indentPx = depth * 20 + 12

  return (
    <div>
      {/* Drop indicator — before */}
      {isDropTarget && dropTarget.position === 'before' && (
        <div
          className="h-0.5 bg-primary rounded mx-3 pointer-events-none"
          style={{ marginLeft: indentPx + 8 }}
        />
      )}

      {/* Row */}
      <div
        draggable={!isRoot}
        onDragStart={!isRoot ? () => onDragStart(node.id) : undefined}
        onDragEnd={!isRoot ? onDragEnd : undefined}
        onDragOver={(e) => onDragOver(e, node)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node)}
        className={cn(
          'group flex items-center gap-1.5 py-1.5 pr-2 border-b border-border/40',
          'transition-colors hover:bg-muted/40',
          isRoot && 'bg-muted/20',
          isDropTarget && dropTarget.position === 'inside' &&
            'bg-primary/5 outline outline-1 outline-primary/40',
          isDragging && 'opacity-40',
          !node.active && 'opacity-50',
        )}
        style={{ paddingLeft: indentPx }}
      >
        {/* Drag handle — hidden for root accounts */}
        <GripVertical className={cn(
          'h-3.5 w-3.5 shrink-0',
          isRoot
            ? 'text-transparent'
            : 'text-transparent group-hover:text-muted-foreground/50 cursor-grab',
        )} />

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => (hasChildren || node.is_group) && onToggle(node.id)}
          className={cn(
            'h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground/50 transition-colors rounded',
            (hasChildren || node.is_group) && 'hover:text-foreground hover:bg-muted cursor-pointer',
          )}
        >
          {hasChildren ? (
            isExpanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Code */}
        <span className="font-mono text-xs text-muted-foreground w-10 shrink-0 select-none">
          {node.code}
        </span>

        {/* Name */}
        <span className={cn(
          'flex-1 text-sm truncate',
          isRoot     && 'font-bold text-foreground',
          isCategory && 'font-semibold',
          isSubitem  && 'font-normal text-muted-foreground',
          !node.active && 'line-through',
        )}>
          {node.name}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {noChildren && (
            <span
              className="flex items-center gap-1 text-xs text-amber-600"
              title="Categoria sem subitens — não disponível para lançamentos"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sem subitens</span>
            </span>
          )}
          {!node.active && (
            <Badge variant="outline" className="text-xs px-1.5">Arquivada</Badge>
          )}
          {isRoot && (
            <Badge variant="secondary" className="text-xs px-1.5">
              {node.type === 'REVENUE' ? 'Receita' : 'Despesa'}
            </Badge>
          )}
          {isSubitem && (
            <Badge variant="outline" className="text-xs px-1.5 hidden sm:inline-flex text-muted-foreground">
              Analítico
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* "+" button for root (Nova Categoria) and category (Novo Subitem) */}
          {(isRoot || isCategory) && node.active && (
            <Button
              variant="ghost" size="icon"
              className={cn('h-7 w-7', !isRoot && 'opacity-0 group-hover:opacity-100 transition-opacity')}
              onClick={() => onAddChild(node)}
              title={isRoot ? 'Nova categoria' : 'Novo subitem'}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Dropdown — only for level 2 and 3 */}
          {!isRoot && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>

                {node.active ? (
                  <DropdownMenuItem
                    onClick={() => onArchive(node.id)}
                    className="text-amber-600 focus:text-amber-600"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onUnarchive(node.id)}>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Reativar
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => onDelete(node.id, node.name)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Drop indicator — after */}
      {isDropTarget && dropTarget.position === 'after' && (
        <div
          className="h-0.5 bg-primary rounded mx-3 pointer-events-none"
          style={{ marginLeft: indentPx + 8 }}
        />
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
              draggedId={draggedId}
              dropTarget={dropTarget}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}
