'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Info, AlertTriangle, AlertCircle, Zap, X, CheckCheck, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/lib/alerts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SystemAlert = {
  id: string
  module: string
  severity: AlertSeverity
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, {
  icon: React.ElementType
  iconClass: string
  badgeClass: string
  rowClass: string
}> = {
  info:     { icon: Info,          iconClass: 'text-blue-500',   badgeClass: 'bg-blue-100 text-blue-700',   rowClass: '' },
  warning:  { icon: AlertTriangle, iconClass: 'text-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-700', rowClass: '' },
  error:    { icon: AlertCircle,   iconClass: 'text-red-500',    badgeClass: 'bg-red-100 text-red-700',     rowClass: 'bg-red-50/40' },
  critical: { icon: Zap,           iconClass: 'text-red-600',    badgeClass: 'bg-red-200 text-red-800',     rowClass: 'bg-red-50/60' },
}

// ─── Time helper ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertsCard({ alerts: initial, tenantId }: { alerts: SystemAlert[]; tenantId: string }) {
  const [alerts, setAlerts] = useState(initial)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const supabase = createClient()

  const unread = alerts.filter(a => !a.read).length

  async function markRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
    await supabase.from('system_alerts').update({ read: true }).eq('id', id)
  }

  async function resolve(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    await supabase
      .from('system_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
    startTransition(() => router.refresh())
  }

  async function markAllRead() {
    const ids = alerts.filter(a => !a.read).map(a => a.id)
    if (!ids.length) return
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
    await supabase.from('system_alerts').update({ read: true }).in('id', ids)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Alertas do Sistema</span>
          {unread > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0 leading-5 font-medium">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todos como lidos
          </button>
        )}
      </div>

      {/* List */}
      {alerts.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Nenhum alerta ativo.
        </div>
      ) : (
        <ul className="divide-y">
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity]
            const Icon = cfg.icon
            return (
              <li
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 group transition-colors hover:bg-muted/20',
                  cfg.rowClass,
                  !alert.read && 'border-l-2 border-primary',
                )}
                onClick={() => !alert.read && markRead(alert.id)}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.iconClass)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs rounded px-1.5 py-0 leading-5 font-medium', cfg.badgeClass)}>
                      {alert.module}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
                  </div>
                  <p className={cn('text-sm mt-0.5', !alert.read && 'font-semibold')}>{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                  )}
                  {alert.link && (
                    <Link
                      href={alert.link}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      onClick={e => e.stopPropagation()}
                    >
                      Ver detalhes <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  onClick={e => { e.stopPropagation(); resolve(alert.id) }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Dispensar alerta"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
