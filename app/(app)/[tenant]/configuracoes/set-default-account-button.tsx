'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function SetDefaultAccountButton({
  accountId,
  isDefault,
}: {
  accountId: string
  isDefault: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  if (isDefault) {
    return (
      <Badge variant="default" className="gap-1 text-xs">
        <Star className="h-3 w-3 fill-current" />
        Padrão
      </Badge>
    )
  }

  async function handleClick() {
    setLoading(true)
    await supabase.from('financial_accounts').update({ is_default: true }).eq('id', accountId)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={loading} className="h-7 text-xs text-muted-foreground hover:text-foreground">
      {loading ? '...' : 'Definir padrão'}
    </Button>
  )
}
