'use client'

import { cn } from '@/lib/utils'

export type TabNavItem<T extends string = string> = {
  id: T
  label: string
  /** Opcional: badge numérico ou texto curto exibido ao lado do label */
  badge?: string | number
}

export function TabNav<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabNavItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-lg border bg-card p-1 gap-0.5', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            active === tab.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className={cn(
              'text-xs rounded-full px-1.5 py-0 leading-5 font-medium',
              active === tab.id
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
