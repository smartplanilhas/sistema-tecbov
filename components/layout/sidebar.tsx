'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Users,
  FileBarChart2,
  Settings,
  MessageCircle,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Tag,
  Tags,
  Scale,
  Heart,
  Syringe,
  ChevronDown,
  BookOpen,
  MapPin,
  ArrowLeftRight,
  Droplets,
  Pill,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-context'

type NavChild = {
  label: string
  href: string
  icon: React.ElementType
  soon?: boolean
}

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  match?: string
  external?: boolean
  children?: NavChild[]
}

const WA_SUPORTE = 'https://wa.me/5515997612670?text=' + encodeURIComponent('Olá! Preciso de suporte com o Tecbov.')

const navItems: NavItem[] = [
  { label: 'Dashboard',    href: 'dashboard',              icon: LayoutDashboard                      },
  {
    label: 'Animais',
    href: 'animais',
    icon: Tag,
    match: 'animais',
    children: [
      { label: 'Animais',        href: 'animais',                    icon: Tag            },
      { label: 'Lotes',          href: 'animais/lotes',              icon: Tags           },
      { label: 'Movimentações',  href: 'animais/movimentacoes',      icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Manejo',
    href: 'manejo',
    icon: Layers,
    match: 'manejo',
    children: [
      { label: 'Pesagem',    href: 'manejo/pesagem',    icon: Scale   },
      { label: 'Reprodução', href: 'manejo/reproducao', icon: Heart   },
      { label: 'Sanidade',   href: 'manejo/sanidade',   icon: Syringe },
    ],
  },
  { label: 'Financeiro',   href: 'financeiro/lancamentos', icon: Wallet,       match: 'financeiro'   },
  {
    label: 'Cadastros',
    href: 'cadastros',
    icon: BookOpen,
    match: 'cadastros',
    children: [
      { label: 'Pessoas',       href: 'cadastros/pessoas',       icon: Users    },
      { label: 'Locais',        href: 'cadastros/locais',        icon: MapPin   },
      { label: 'Sêmen',         href: 'cadastros/semen',         icon: Droplets },
      { label: 'Medicamentos',  href: 'cadastros/medicamentos',  icon: Pill     },
    ],
  },
  { label: 'Relatórios',   href: 'relatorios',             icon: FileBarChart2                        },
  { label: 'Configurações',href: 'configuracoes',          icon: Settings                             },
  { label: 'Suporte',      href: WA_SUPORTE,               icon: MessageCircle, external: true        },
]

function NavContent({
  tenantSlug,
  tenantName,
  parentTenant,
  collapsed,
  onLinkClick,
}: {
  tenantSlug: string
  tenantName: string
  parentTenant?: { name: string; slug: string } | null
  collapsed: boolean
  onLinkClick?: () => void
}) {
  const pathname = usePathname()
  const { toggleCollapsed } = useSidebar()

  // Auto-open group whose child matches current path
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    for (const item of navItems) {
      if (item.children?.some(c => pathname.includes(`/${tenantSlug}/${c.href}`))) {
        return item.label
      }
    }
    return null
  })

  function toggleGroup(label: string) {
    setOpenGroup(prev => prev === label ? null : label)
  }

  const baseCls = 'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors'

  return (
    <>
      {/* Logo / tenant */}
      <div className={cn('border-b border-white/10 shrink-0', collapsed ? 'p-3 flex justify-center' : 'px-4 py-3')}>
        {collapsed ? (
          <Image src="/logo-tecbov.png" alt="Tecbov" width={32} height={38} className="shrink-0" priority />
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <Image src="/logo-tecbov.png" alt="Tecbov" width={52} height={62} priority />
              <span className="font-bold text-base tracking-widest leading-none text-white uppercase" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.2em' }}>
                Tecbov
              </span>
            </div>
            <p className="text-xs text-white/50 truncate mt-2 text-center">{tenantName}</p>
            {parentTenant && (
              <Link
                href={`/${parentTenant.slug}/dashboard`}
                onClick={onLinkClick}
                className="mt-1 flex items-center justify-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">Filial de {parentTenant.name}</span>
              </Link>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => {
          const isGroupActive = item.children
            ? item.children.some(c => pathname.includes(`/${tenantSlug}/${c.href}`))
            : false

          const isActive = !item.external && !item.children && (
            item.match
              ? pathname.includes(`/${tenantSlug}/${item.match}`)
              : pathname === `/${tenantSlug}/${item.href}`
          )

          // ── Group with children ──────────────────────────────────────
          if (item.children) {
            const isOpen = openGroup === item.label

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => collapsed ? toggleCollapsed() : toggleGroup(item.label)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    baseCls, 'w-full',
                    collapsed && 'justify-center px-0',
                    isGroupActive
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )} />
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {!collapsed && isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                    {item.children.map(child => {
                      if (child.soon) {
                        return (
                          <div
                            key={child.href}
                            className="flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-white/25 cursor-default"
                          >
                            <child.icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{child.label}</span>
                            <span className="ml-auto text-[10px] bg-white/10 text-white/30 rounded px-1.5 py-0.5 leading-none">
                              Em breve
                            </span>
                          </div>
                        )
                      }

                      const childActive = pathname.includes(`/${tenantSlug}/${child.href}`)
                      return (
                        <Link
                          key={child.href}
                          href={`/${tenantSlug}/${child.href}`}
                          onClick={onLinkClick}
                          className={cn(
                            'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
                            childActive
                              ? 'bg-white/15 text-white font-medium'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // ── External link ────────────────────────────────────────────
          if (item.external) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? item.label : undefined}
                className={cn(
                  baseCls,
                  collapsed && 'justify-center px-0',
                  'text-green-400 hover:bg-white/10 hover:text-green-300'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </a>
            )
          }

          // ── Regular link ─────────────────────────────────────────────
          return (
            <Link
              key={item.href}
              href={`/${tenantSlug}/${item.href}`}
              onClick={onLinkClick}
              title={collapsed ? item.label : undefined}
              className={cn(
                baseCls,
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Desktop collapse toggle */}
      <div className="hidden md:flex border-t border-white/10 p-2 shrink-0">
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'flex items-center gap-2 text-xs text-white/40 hover:text-white/80 transition-colors rounded-md p-2 hover:bg-white/10 w-full',
            collapsed && 'justify-center'
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4 shrink-0" />
            : <><PanelLeftClose className="h-4 w-4 shrink-0" /><span>Recolher menu</span></>
          }
        </button>
      </div>
    </>
  )
}

export function Sidebar({
  tenantSlug,
  tenantName,
  parentTenant,
}: {
  tenantSlug: string
  tenantName: string
  parentTenant?: { name: string; slug: string } | null
}) {
  const { mobileOpen, collapsed, closeMobile } = useSidebar()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobile() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeMobile])

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={closeMobile}
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sidebar panel */}
      <aside
        style={{ backgroundColor: '#2a2f42' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 w-72 transition-transform duration-300',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
          'md:relative md:inset-auto md:z-auto md:translate-x-0 md:shadow-none md:h-screen md:shrink-0 md:transition-all md:duration-300',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        <NavContent
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          parentTenant={parentTenant}
          collapsed={collapsed}
          onLinkClick={closeMobile}
        />
      </aside>
    </>
  )
}
