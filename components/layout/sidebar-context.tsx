'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type SidebarContextType = {
  mobileOpen: boolean
  collapsed: boolean
  toggleMobile: () => void
  closeMobile: () => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  mobileOpen: false,
  collapsed: false,
  toggleMobile: () => {},
  closeMobile: () => {},
  toggleCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true)
  }, [])

  const toggleMobile = useCallback(() => setMobileOpen(v => !v), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const toggleCollapsed = useCallback(() => {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ mobileOpen, collapsed, toggleMobile, closeMobile, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
