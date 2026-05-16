import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Use an env var so the redirect target is never controlled by the caller.
// Falls back to localhost only in dev.
function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const siteUrl = getSiteUrl()

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${siteUrl}/login?error=auth_error`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/onboarding`)
}
