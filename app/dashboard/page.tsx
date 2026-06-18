import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { formatDate } from '@/lib/format'
import { DriverFilter } from './DriverFilter'
import { StatusSelect } from './StatusSelect'
import { SearchInput } from './SearchInput'
import { AssistantChat } from './AssistantChat'
import Link from 'next/link'

const PAGE_SIZE = 25

const statusConfig = {
  open:      { label: 'Open',      className: 'bg-yellow-100 text-yellow-800' },
  in_review: { label: 'In Review', className: 'bg-brand-100 text-brand-800' },
  closed:    { label: 'Closed',    className: 'bg-green-100 text-green-800' },
} as const

type Incident = {
  id: string
  date: string
  status: string
  preventable: boolean | null
  incident_type: { label: string } | null
  driver: { full_name: string } | null
  customer: { name: string } | null
}

const PERIOD_FILTERS = [
  { key: 'day',   label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'All' },
] as const

const STATUS_FILTERS = [
  { key: 'all',       label: 'All Status' },
  { key: 'open',      label: 'Open' },
  { key: 'in_review', label: 'In Review' },
  { key: 'closed',    label: 'Closed' },
] as const

function getStartDate(filter: string): string | null {
  const now = new Date()
  if (filter === 'day')   { return now.toISOString().split('T')[0] }
  if (filter === 'week')  { now.setDate(now.getDate() - 7);         return now.toISOString().split('T')[0] }
  if (filter === 'month') { now.setMonth(now.getMonth() - 1);       return now.toISOString().split('T')[0] }
  if (filter === 'year')  { now.setFullYear(now.getFullYear() - 1); return now.toISOString().split('T')[0] }
  return null
}

function buildHref(
  overrides: Record<string, string>,
  current: { filter: string; status: string; driver: string; page: string; search: string }
) {
  const merged = { ...current, ...overrides }
  if ('filter' in overrides || 'status' in overrides || 'driver' in overrides || 'search' in overrides) {
    merged.page = '1'
  }
  const params = new URLSearchParams()
  if (merged.filter !== 'all') params.set('filter', merged.filter)
  if (merged.status !== 'all') params.set('status', merged.status)
  if (merged.driver !== 'all') params.set('driver', merged.driver)
  if (merged.search) params.set('search', merged.search)
  if (merged.page && merged.page !== '1') params.set('page', merged.page)
  return `/dashboard${params.size ? '?' + params : ''}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; status?: string; driver?: string; page?: string; search?: string }>
}) {
  const { filter = 'all', status = 'all', driver = 'all', page = '1', search = '' } = await searchParams
  const currentPage = Math.max(1, parseInt(page) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE
  const current = { filter, status, driver, page, search }

  const supabase = await serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  let incidentQuery = supabase
    .from('incidents')
    .select(`
      id, date, status, preventable,
      incident_type:lookup_options!incident_type_id(label),
      driver:drivers(full_name),
      customer:customers(name)
    `, { count: 'exact' })
    .order('date', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const startDate = getStartDate(filter)
  if (startDate) {
    incidentQuery = filter === 'day'
      ? incidentQuery.eq('date', startDate)
      : incidentQuery.gte('date', startDate)
  }
  if (status !== 'all') incidentQuery = incidentQuery.eq('status', status)
  if (driver !== 'all') incidentQuery = incidentQuery.eq('driver_id', driver)

  const [{ data: profile }, { data: driversData }, matchingDriverIds, matchingCustomerIds] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user?.id ?? '').single(),
    supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name'),
    search ? supabase.from('drivers').select('id').ilike('full_name', `%${search}%`).then(r => r.data?.map(d => d.id) ?? []) : Promise.resolve([] as string[]),
    search ? supabase.from('customers').select('id').ilike('name', `%${search}%`).then(r => r.data?.map(c => c.id) ?? []) : Promise.resolve([] as string[]),
  ])

  if (search) {
    const orParts: string[] = [`description.ilike.%${search}%`]
    if (matchingDriverIds.length) orParts.push(`driver_id.in.(${matchingDriverIds.join(',')})`)
    if (matchingCustomerIds.length) orParts.push(`customer_id.in.(${matchingCustomerIds.join(',')})`)
    incidentQuery = incidentQuery.or(orParts.join(','))
  }

  const { data: raw, count } = await incidentQuery

  const incidents = (raw ?? []) as unknown as Incident[]
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const drivers = driversData ?? []
  const isManager = profile?.role === 'manager'
  const canManage = profile?.role === 'manager' || profile?.role === 'dispatcher'

  const counts = {
    total:     totalCount,
    open:      incidents.filter(i => i.status === 'open').length,
    in_review: incidents.filter(i => i.status === 'in_review').length,
    closed:    incidents.filter(i => i.status === 'closed').length,
  }

  const driverBaseHref = buildHref({ driver: 'all' }, current)

  // Build export URL with current filters
  const exportParams = new URLSearchParams()
  if (filter !== 'all') exportParams.set('filter', filter)
  if (status !== 'all') exportParams.set('status', status)
  if (driver !== 'all') exportParams.set('driver', driver)
  const exportHref = `/api/export${exportParams.size ? '?' + exportParams : ''}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Northern Lights Petroleum" style={{ height: '2.25rem', width: 'auto' }} className="hidden sm:block" />
            <nav className="flex items-center gap-1">
              <span className="text-sm font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg">Dashboard</span>
              <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50">Profile</Link>
              {isManager && (
                <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50">Admin</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <Link href="/submit" className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + New Incident
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* Search + Period filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} baseHref={buildHref({}, current)} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_FILTERS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildHref({ filter: key }, current)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-brand-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Status + Driver + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildHref({ status: key }, current)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <DriverFilter drivers={drivers} value={driver} baseHref={driverBaseHref} />
            {isManager && (
              <a
                href={exportHref}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              >
                Export CSV
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Incidents', value: totalCount,       accent: 'border-gray-300',   sub: 'All time in view' },
            { label: 'Open',            value: counts.open,      accent: 'border-yellow-400', sub: 'Awaiting review' },
            { label: 'In Review',       value: counts.in_review, accent: 'border-brand-500',   sub: 'Being processed' },
            { label: 'Closed',          value: counts.closed,    accent: 'border-green-500',  sub: 'Resolved' },
          ].map(({ label, value, accent, sub }) => (
            <div key={label} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${accent} px-4 py-4`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* AI Assistant (manager only) */}
        {isManager && <AssistantChat />}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {incidents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No incidents in this period</p>
              <Link href="/submit" className="text-brand-700 text-sm mt-2 inline-block">Submit one →</Link>
            </div>
          ) : (
            <>
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Date', 'Type', 'Driver', 'Customer', 'Preventable', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => {
                    const s = statusConfig[incident.status as keyof typeof statusConfig]
                    return (
                      <tr key={incident.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDate(incident.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{incident.incident_type?.label ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{incident.driver?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{incident.customer?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {incident.preventable === null ? '—' : incident.preventable ? 'Yes' : 'No'}
                        </td>
                        <td className="px-4 py-3">
                          {canManage
                            ? <StatusSelect incidentId={incident.id} status={incident.status} />
                            : <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s?.className ?? ''}`}>{s?.label ?? incident.status}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/incidents/${incident.id}`} className="text-xs font-medium text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-md px-2.5 py-1 transition-colors">View</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="sm:hidden divide-y divide-gray-50">
                {incidents.map((incident) => {
                  const s = statusConfig[incident.status as keyof typeof statusConfig]
                  return (
                    <Link key={incident.id} href={`/incidents/${incident.id}`} className="block px-4 py-4 space-y-1 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{incident.incident_type?.label ?? '—'}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s?.className ?? ''}`}>
                          {s?.label ?? incident.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(incident.date)} · {incident.driver?.full_name ?? 'No driver'}
                      </p>
                      {incident.customer?.name && (
                        <p className="text-xs text-gray-400">{incident.customer.name}</p>
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={buildHref({ page: String(currentPage - 1) }, current)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400"
                      >
                        ← Prev
                      </Link>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg border border-gray-100 text-sm text-gray-300">← Prev</span>
                    )}
                    <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                    {currentPage < totalPages ? (
                      <Link
                        href={buildHref({ page: String(currentPage + 1) }, current)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400"
                      >
                        Next →
                      </Link>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg border border-gray-100 text-sm text-gray-300">Next →</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
