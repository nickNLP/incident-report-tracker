import { serverSupabase } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type Row = {
  date: string
  status: string
  preventable: boolean | null
  description: string | null
  corrective_action: string | null
  incident_type: { label: string } | null
  reported_to:   { label: string } | null
  dispatcher:    { label: string } | null
  root_cause:    { label: string } | null
  driver:   { full_name: string } | null
  customer: { name: string } | null
}

function escape(val: string | null | undefined): string {
  if (!val) return ''
  const str = String(val)
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str
}

function getStartDate(filter: string): string | null {
  const now = new Date()
  if (filter === 'day')   { return now.toISOString().split('T')[0] }
  if (filter === 'week')  { now.setDate(now.getDate() - 7);         return now.toISOString().split('T')[0] }
  if (filter === 'month') { now.setMonth(now.getMonth() - 1);       return now.toISOString().split('T')[0] }
  if (filter === 'year')  { now.setFullYear(now.getFullYear() - 1); return now.toISOString().split('T')[0] }
  return null
}

export async function GET(request: NextRequest) {
  const supabase = await serverSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single()

  if (profile?.role !== 'manager') {
    return new Response('Forbidden', { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const filter = searchParams.get('filter') ?? 'all'
  const status = searchParams.get('status') ?? 'all'
  const driver = searchParams.get('driver') ?? 'all'

  let query = supabase
    .from('incidents')
    .select(`
      date, status, preventable, description, corrective_action,
      incident_type:lookup_options!incident_type_id(label),
      reported_to:lookup_options!reported_to_id(label),
      dispatcher:lookup_options!dispatcher_id(label),
      root_cause:lookup_options!root_cause_id(label),
      driver:drivers(full_name),
      customer:customers(name)
    `)
    .order('date', { ascending: false })

  const startDate = getStartDate(filter)
  if (startDate) {
    query = filter === 'day' ? query.eq('date', startDate) : query.gte('date', startDate)
  }
  if (status !== 'all') query = query.eq('status', status)
  if (driver !== 'all') query = query.eq('driver_id', driver)

  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]

  const headers = [
    'Date', 'Type', 'Driver', 'Customer', 'Reported To',
    'Dispatcher', 'Root Cause', 'Preventable', 'Status',
    'Description', 'Corrective Action',
  ]

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        escape(r.date),
        escape(r.incident_type?.label),
        escape(r.driver?.full_name),
        escape(r.customer?.name),
        escape(r.reported_to?.label),
        escape(r.dispatcher?.label),
        escape(r.root_cause?.label),
        r.preventable === null ? '' : r.preventable ? 'Yes' : 'No',
        escape(r.status),
        escape(r.description),
        escape(r.corrective_action),
      ].join(',')
    ),
  ]

  const csv = lines.join('\r\n')
  const filename = `incidents-${new Date().toISOString().split('T')[0]}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
