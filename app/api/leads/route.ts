import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, whatsapp, plan } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()
    await supabase.from('leads').insert({ name, email, whatsapp, plan })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'erro interno' }, { status: 500 })
  }
}
