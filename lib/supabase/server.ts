import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Cliente admin com service role key — bypassa RLS, usar apenas server-side
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createClient() {
  const cookieStore = await cookies()

  const cookiesAdapter = {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // Ignorado em Server Components (read-only)
      }
    },
  }

  // Em Next.js 16 + @supabase/ssr, o JWT não é propagado automaticamente
  // para as requisições PostgREST. Lemos a sessão explicitamente e injetamos
  // via global.headers para garantir que auth.uid() chegue ao banco.
  const reader = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter }
  )

  const { data: { session } } = await reader.auth.getSession()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(session && {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      }),
      cookies: cookiesAdapter,
    }
  )
}
