import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY'

function advanceDate(dateStr: string, freq: Frequency, interval: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  switch (freq) {
    case 'DAILY':      d.setUTCDate(d.getUTCDate() + interval);         break
    case 'WEEKLY':     d.setUTCDate(d.getUTCDate() + 7 * interval);     break
    case 'BIWEEKLY':   d.setUTCDate(d.getUTCDate() + 14 * interval);    break
    case 'MONTHLY':    d.setUTCMonth(d.getUTCMonth() + interval);       break
    case 'QUARTERLY':  d.setUTCMonth(d.getUTCMonth() + 3 * interval);   break
    case 'SEMIANNUAL': d.setUTCMonth(d.getUTCMonth() + 6 * interval);   break
    case 'YEARLY':     d.setUTCFullYear(d.getUTCFullYear() + interval); break
  }
  return d.toISOString().slice(0, 10)
}

function generateDates(
  startFrom: string,
  freq: Frequency,
  interval: number,
  endDate: string | null,
  maxRemaining: number | null,
): string[] {
  const hardEnd = new Date(startFrom + 'T00:00:00Z')
  hardEnd.setUTCFullYear(hardEnd.getUTCFullYear() + 2)
  const limit = endDate && endDate < hardEnd.toISOString().slice(0, 10)
    ? endDate
    : hardEnd.toISOString().slice(0, 10)

  const dates: string[] = []
  let current = startFrom
  while (current <= limit) {
    dates.push(current)
    if (maxRemaining !== null && dates.length >= maxRemaining) break
    current = advanceDate(current, freq, interval)
  }
  return dates
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today = new Date().toISOString().slice(0, 10)
  const horizon = new Date()
  horizon.setUTCDate(horizon.getUTCDate() + 45)
  const horizonStr = horizon.toISOString().slice(0, 10)

  const { data: recurrences, error } = await supabase
    .from('recurrences')
    .select('*')
    .eq('active', true)
    .or(`last_generated_date.is.null,last_generated_date.lte.${horizonStr}`)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let totalGenerated = 0
  const results: unknown[] = []

  for (const rec of recurrences ?? []) {
    if (rec.end_date && rec.end_date <= today) continue
    if (rec.max_occurrences && rec.total_generated >= rec.max_occurrences) continue

    const startFrom = rec.last_generated_date
      ? advanceDate(rec.last_generated_date, rec.frequency as Frequency, rec.interval)
      : rec.start_date

    const maxRemaining = rec.max_occurrences ? rec.max_occurrences - rec.total_generated : null
    const dates = generateDates(startFrom, rec.frequency as Frequency, rec.interval, rec.end_date, maxRemaining)

    if (dates.length === 0) continue

    const txType = rec.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME'

    const { error: insertError } = await supabase.from('transactions').insert(
      dates.map((date) => ({
        tenant_id:         rec.tenant_id,
        type:              txType,
        description:       rec.description,
        amount:            rec.amount,
        date,
        due_date:          date,
        account_id:        rec.financial_account_id,
        category_id:       rec.category_id,
        cost_center_id:    rec.cost_center_id,
        person_id:         rec.person_id,
        payment_method_id: rec.payment_method_id,
        status:            'PENDING',
        recurrence_id:     rec.id,
      }))
    )

    if (insertError) {
      results.push({ id: rec.id, error: insertError.message })
      continue
    }

    await supabase
      .from('recurrences')
      .update({
        last_generated_date: dates[dates.length - 1],
        total_generated:     rec.total_generated + dates.length,
      })
      .eq('id', rec.id)

    totalGenerated += dates.length
    results.push({ id: rec.id, description: rec.description, generated: dates.length })
  }

  return new Response(
    JSON.stringify({ success: true, total_generated: totalGenerated, results }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
