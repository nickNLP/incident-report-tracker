import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { formatDate } from '@/lib/format'
import { FlashBanner } from '@/app/components/FlashBanner'
import { updateIncidentStatus, addIncidentNote } from './actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
  description: string | null
  corrective_action: string | null
  created_at: string
  incident_type: { label: string } | null
  reported_to:   { label: string } | null
  dispatcher:    { label: string } | null
  root_cause:    { label: string } | null
  driver:   { full_name: string } | null
  customer: { name: string } | null
}

type Note = { id: string; body: string; created_at: string }

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await serverSupabase()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: incidentRaw }, { data: notes }, { data: profile }, { data: photosRaw }] = await Promise.all([
    supabase
      .from('incidents')
      .select(`
        id, date, status, preventable, description, corrective_action, created_at,
        incident_type:lookup_options!incident_type_id(label),
        reported_to:lookup_options!reported_to_id(label),
        dispatcher:lookup_options!dispatcher_id(label),
        root_cause:lookup_options!root_cause_id(label),
        driver:drivers(full_name),
        customer:customers(name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('incident_notes')
      .select('id, body, created_at')
      .eq('incident_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('role').eq('id', user?.id ?? '').single(),
    supabase.from('incident_photos').select('id, storage_path').eq('incident_id', id).order('created_at', { ascending: true }),
  ])

  if (!incidentRaw) notFound()

  const incident = incidentRaw as unknown as Incident
  const canManage = profile?.role === 'dispatcher' || profile?.role === 'manager'

  const photos = photosRaw ?? []
  let signedUrls: string[] = []
  if (photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from('incident-photos')
      .createSignedUrls(photos.map((p) => p.storage_path), 3600)
    signedUrls = (signed ?? []).map((s) => s.signedUrl)
  }
  const status = statusConfig[incident.status as keyof typeof statusConfig]

  const updateStatus = updateIncidentStatus.bind(null, id)
  const addNote = addIncidentNote.bind(null, id)

  return (
    <div className="min-h-screen bg-gray-50">
      <FlashBanner />
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Northern Lights Petroleum" style={{ height: '2rem', width: 'auto' }} className="hidden sm:block" />
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-700 transition-colors">← Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Incident — {formatDate(incident.date)}</h1>
          <div className="flex items-center gap-2">
            {profile?.role === 'manager' && (
              <Link href={`/incidents/${id}/edit`} className="text-xs font-medium border border-gray-300 text-gray-600 hover:border-brand-600 hover:text-brand-700 rounded-md px-3 py-1.5 transition-colors">
                Edit
              </Link>
            )}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status?.className ?? ''}`}>
              {status?.label ?? incident.status}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Type"        value={incident.incident_type?.label} />
          <Detail label="Driver"      value={incident.driver?.full_name} />
          <Detail label="Customer"    value={incident.customer?.name} />
          <Detail label="Reported To" value={incident.reported_to?.label} />
          <Detail label="Dispatcher"  value={incident.dispatcher?.label} />
          <Detail label="Root Cause"  value={incident.root_cause?.label} />
          <Detail label="Preventable" value={
            incident.preventable === null ? undefined : incident.preventable ? 'Yes' : 'No'
          } />
        </div>

        {incident.description && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{incident.description}</p>
          </div>
        )}

        {incident.corrective_action && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Corrective Action</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{incident.corrective_action}</p>
          </div>
        )}

        {signedUrls.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Photos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {signedUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Incident photo ${i + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-100"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {canManage && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Update Status</p>
            <form action={updateStatus} className="flex gap-3">
              <select
                name="status"
                defaultValue={incident.status}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="open">Open</option>
                <option value="in_review">In Review</option>
                <option value="closed">Closed</option>
              </select>
              <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Save
              </button>
            </form>
          </div>
        )}

        {/* Notes — visible to all, add-note form only for dispatchers/managers */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Notes</p>
          {(notes ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {(notes as Note[]).map((note) => (
                <div key={note.id} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-sm text-gray-800">{note.body}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          {canManage && (
            <form action={addNote} className="space-y-2 pt-2 border-t border-gray-100">
              <textarea
                name="body"
                rows={3}
                placeholder="Add a note..."
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
              />
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Add Note
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
