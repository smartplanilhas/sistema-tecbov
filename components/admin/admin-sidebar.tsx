'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin',         label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/tenants', label: 'Clientes',     icon: Building2 },
  { href: '/admin/leads',   label: 'Leads',        icon: Inbox },
]

export function AdminSidebar({ adminName, userEmail }: { adminName: string; userEmail: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-slate-900 text-slate-100 h-screen">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="bg-white rounded-lg p-1 shrink-0">
            <Image src="/logo.png" alt="Tecbov" width={28} height={28} priority />
          </div>
          <div>
            <p className="text-sm font-bold leading-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
              Tecbov
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-slate-300 truncate">{adminName}</p>
          <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
        </div>
      </div>
    </aside>
  )
}
