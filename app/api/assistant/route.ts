import Anthropic from '@anthropic-ai/sdk'
import { serverSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // allow the streamed AI response time to complete

// Manager-only AI assistant over the incident history. Streams a Claude
// response as plain-text chunks. Demo feature — read-only analysis, no writes.

type IncidentRow = {
  date: string
  status: string
  preventable: boolean | null
  description: string | null
  incident_type: { label: string } | null
  root_cause: { label: string } | null
  driver: { full_name: string } | null
  customer: { name: string } | null
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `You are the AI assistant inside Northern Lights Petroleum's Incident Report Tracker, helping a manager review fuel/transport incident history.

You are given a snapshot of the incident dataset below. Use ONLY that data to answer. When asked for predictions or what to fix, reason from the patterns in the data (frequent types, recurring root causes, preventable rate, repeat drivers/customers) and give concrete, prioritized, actionable recommendations. Be specific and cite the numbers you're drawing from.

Keep answers concise and skimmable: short paragraphs or tight bullet lists. If the data is too sparse to support a claim, say so rather than inventing incidents. This is a manager-facing internal tool; a plain, professional tone is right.

Never use em dashes (—) in your writing. Use commas, periods, colons, or parentheses instead.`

function buildContext(rows: IncidentRow[]): string {
  if (rows.length === 0) return 'INCIDENT DATA: (no incidents on record yet)'

  const tally = (key: (r: IncidentRow) => string | null | undefined) => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const k = key(r) || 'Unspecified'
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}: ${n}`)
      .join(', ')
  }

  const preventable = rows.filter((r) => r.preventable === true).length
  const withFlag = rows.filter((r) => r.preventable !== null).length
  const rate = withFlag ? Math.round((preventable / withFlag) * 100) : 0

  const recent = rows
    .slice(0, 40)
    .map((r) => {
      const desc = (r.description ?? '').replace(/\s+/g, ' ').slice(0, 90)
      return `- ${r.date} | ${r.incident_type?.label ?? 'n/a'} | driver: ${r.driver?.full_name ?? 'n/a'} | customer: ${r.customer?.name ?? 'n/a'} | root cause: ${r.root_cause?.label ?? 'n/a'} | ${r.status} | preventable: ${r.preventable === null ? 'n/a' : r.preventable ? 'yes' : 'no'}${desc ? ` | ${desc}` : ''}`
    })
    .join('\n')

  return `INCIDENT DATA SNAPSHOT (most recent ${rows.length} incidents)

Totals
- Incidents: ${rows.length}
- By status: ${tally((r) => r.status)}
- By type: ${tally((r) => r.incident_type?.label)}
- By root cause: ${tally((r) => r.root_cause?.label)}
- By driver: ${tally((r) => r.driver?.full_name)}
- Preventable: ${preventable} of ${withFlag} flagged (${rate}%)

Most recent incidents
${recent}`
}

export async function POST(request: Request) {
  const supabase = await serverSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return new Response('Forbidden', { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      'AI assistant is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.',
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null)
  const messages: ChatMessage[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(
      (m: unknown): m is ChatMessage =>
        !!m &&
        typeof m === 'object' &&
        ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
        typeof (m as ChatMessage).content === 'string',
    )
    .slice(-20)
  if (messages.length === 0) return new Response('No messages provided', { status: 400 })

  const { data } = await supabase
    .from('incidents')
    .select(`
      date, status, preventable, description,
      incident_type:lookup_options!incident_type_id(label),
      root_cause:lookup_options!root_cause_id(label),
      driver:drivers(full_name),
      customer:customers(name)
    `)
    .order('date', { ascending: false })
    .limit(300)

  const rows = (data ?? []) as unknown as IncidentRow[]

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: `${SYSTEM_PROMPT}\n\n${buildContext(rows)}`,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'request failed'
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
