import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const BLOCKED_PATH_FRAGMENTS = [
  '/.git',
  '/.env',
  '/.htaccess',
  '/.htpasswd',
  '/wp-admin',
  '/wp-login',
  '/phpmyadmin',
  '/adminer',
  '/xmlrpc.php',
]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.toLowerCase()

  if (BLOCKED_PATH_FRAGMENTS.some((f) => pathname.startsWith(f) || pathname.includes(f))) {
    return new NextResponse(null, { status: 404 })
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
