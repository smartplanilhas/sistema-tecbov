'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_CHARS = 2 * 1024 * 1024 // ~2 MB for ASCII CSV
const MAX_ROWS  = 1000

async function getTenantId(slug: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

function sanitize(s: string): string {
  // Strip control chars (except \t), keep printable ASCII + Latin
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

const SAFE_BRINCO = /^[\w\-\/\. ]+$/i

export type ImportResult = {
  inserted: number
  notFound: string[]
  errors: { row: number; brinco: string; reason: string }[]
}

export async function importarPesagensCsv(
  tenantSlug: string,
  csvText: string,
  data: string,
  tipo: string,
): Promise<{ error: string } | ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  // Guard: size
  if (typeof csvText !== 'string' || csvText.length > MAX_CHARS) {
    return { error: 'Arquivo muito grande (máximo 2 MB).' }
  }

  // Guard: date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: 'Data inválida.' }

  // Guard: tipo
  const tiposOk = ['controle', 'entrada', 'saida']
  if (!tiposOk.includes(tipo)) return { error: 'Tipo inválido.' }

  // Parse
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return { error: 'CSV vazio ou sem dados.' }
  if (lines.length - 1 > MAX_ROWS) return { error: `Máximo de ${MAX_ROWS} linhas por importação.` }

  const delimiter = lines[0].includes(';') ? ';' : ','
  const headers   = lines[0].split(delimiter).map(h => sanitize(h).toLowerCase())
  const brincoIdx = headers.indexOf('brinco')
  const pesoIdx   = headers.indexOf('peso')

  if (brincoIdx === -1 || pesoIdx === -1) {
    return { error: 'O CSV deve conter as colunas "brinco" e "peso".' }
  }

  type Row = { brinco: string; peso: number; rowNum: number }
  const rows: Row[] = []
  const errors: ImportResult['errors'] = []

  for (let i = 1; i < lines.length; i++) {
    const cols  = lines[i].split(delimiter)
    const brinco = sanitize(cols[brincoIdx] ?? '')
    const rawPeso = sanitize(cols[pesoIdx] ?? '').replace(',', '.')

    if (!brinco) {
      errors.push({ row: i + 1, brinco: '—', reason: 'Brinco vazio.' })
      continue
    }

    if (!SAFE_BRINCO.test(brinco)) {
      errors.push({ row: i + 1, brinco, reason: 'Brinco com caracteres não permitidos.' })
      continue
    }

    const peso = parseFloat(rawPeso)
    if (isNaN(peso) || peso < 0.5 || peso > 2000) {
      errors.push({ row: i + 1, brinco, reason: `Peso inválido: "${rawPeso}".` })
      continue
    }

    rows.push({ brinco, peso, rowNum: i + 1 })
  }

  if (rows.length === 0) {
    return { error: 'Nenhuma linha válida encontrada no CSV.' }
  }

  // Lookup animals by brinco — scoped to tenant
  const brincos = [...new Set(rows.map(r => r.brinco))]
  const { data: animais } = await admin
    .from('animals')
    .select('id, brinco')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')
    .in('brinco', brincos)

  const brincoMap: Record<string, string> = {}
  for (const a of animais ?? []) {
    if (a.brinco) brincoMap[a.brinco] = a.id
  }

  const notFound: string[] = []
  const toInsert: {
    animal_id: string
    tenant_id: string
    peso: number
    data: string
    tipo: string
  }[] = []

  for (const row of rows) {
    const animalId = brincoMap[row.brinco]
    if (!animalId) {
      notFound.push(row.brinco)
    } else {
      toInsert.push({ animal_id: animalId, tenant_id: tenantId, peso: row.peso, data, tipo })
    }
  }

  let inserted = 0
  if (toInsert.length > 0) {
    const { error: insertError } = await (admin as any).from('pesagens').insert(toInsert)
    if (insertError) return { error: insertError.message }
    inserted = toInsert.length
  }

  revalidatePath(`/${tenantSlug}/manejo/pesagem`)
  revalidatePath(`/${tenantSlug}/animais`)

  return { inserted, notFound, errors }
}
