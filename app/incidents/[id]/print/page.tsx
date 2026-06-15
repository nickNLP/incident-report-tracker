import { serverSupabase } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { PrintButton } from './PrintButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  closed: 'Closed',
}

type Incident = {
  id: string
  date: string
  status: string
  preventable: boolean | null
  description: string | null
  corrective_action: string | null
  product_type: string | null
  spill_volume_litres: number | null
  spill_location: string | null
  reported_to_authority: boolean | null
  authority_name: string | null
  authority_ref: string | null
  authority_reported_at: string | null
  created_at: string
  incident_type: { label: string } | null
  reported_to: { label: string } | null
  dispatcher: { label: string } | null
  root_cause: { label: string } | null
  driver: { full_name: string } | null
  customer: { name: string } | null
}

type Note = { id: string; body: string; created_at: string }

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex border-b border-gray-200 py-1.5">
      <span className="w-48 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}

export default async function IncidentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await serverSupabase()

  const [{ data: incidentRaw }, { data: notes }, { data: photosRaw }] = await Promise.all([
    supabase
      .from('incidents')
      .select(`
        id, date, status, preventable, description, corrective_action, created_at,
        product_type, spill_volume_litres, spill_location, reported_to_authority,
        authority_name, authority_ref, authority_reported_at,
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
    supabase.from('incident_photos').select('id, storage_path').eq('incident_id', id).order('created_at', { ascending: true }),
  ])

  if (!incidentRaw) notFound()

  const incident = incidentRaw as unknown as Incident

  const photos = photosRaw ?? []
  let signedUrls: string[] = []
  if (photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from('incident-photos')
      .createSignedUrls(photos.map((p) => p.storage_path), 3600)
    signedUrls = (signed ?? []).map((s) => s.signedUrl)
  }

  const hasSpill =
    incident.product_type ||
    incident.spill_volume_litres != null ||
    incident.spill_location ||
    incident.reported_to_authority != null ||
    incident.authority_name ||
    incident.authority_ref ||
    incident.authority_reported_at

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only toolbar; hidden when printing */}
      <div className="no-print sticky top-0 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <Link href={`/incidents/${id}`} className="text-sm text-gray-500 hover:text-brand-700 transition-colors">
          ← Back to Incident
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="flex items-center justify-between border-b-2 border-brand-700 pb-4">
          <div>
            <img src="/logo.png" alt="Northern Lights Petroleum" style={{ height: '2.5rem', width: 'auto' }} />
            <h1 className="mt-3 text-2xl font-bold text-gray-900">Incident Report</h1>
            <p className="text-sm text-gray-500">{formatDate(incident.date)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
            <p className="text-lg font-semibold text-gray-900">{statusLabels[incident.status] ?? incident.status}</p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Incident Details</h2>
          <Row label="Date" value={formatDate(incident.date)} />
          <Row label="Type" value={incident.incident_type?.label} />
          <Row label="Driver" value={incident.driver?.full_name} />
          <Row label="Customer" value={incident.customer?.name} />
          <Row label="Reported To" value={incident.reported_to?.label} />
          <Row label="Dispatcher" value={incident.dispatcher?.label} />
          <Row label="Root Cause" value={incident.root_cause?.label} />
          <Row
            label="Preventable"
            value={incident.preventable === null ? undefined : incident.preventable ? 'Yes' : 'No'}
          />
        </section>

        {incident.description && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{incident.description}</p>
          </section>
        )}

        {incident.corrective_action && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Corrective Action</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{incident.corrective_action}</p>
          </section>
        )}

        {hasSpill && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Spill / Regulatory</h2>
            <Row label="Product" value={incident.product_type} />
            <Row
              label="Estimated Volume"
              value={incident.spill_volume_litres != null ? `${incident.spill_volume_litres} L` : undefined}
            />
            <Row label="Spill Location" value={incident.spill_location} />
            <Row
              label="Reported to Authority"
              value={
                incident.reported_to_authority === null
                  ? undefined
                  : incident.reported_to_authority
                  ? 'Yes'
                  : 'No'
              }
            />
            <Row label="Authority / Agency" value={incident.authority_name} />
            <Row label="Authority File / Ref #" value={incident.authority_ref} />
            <Row
              label="Date Reported"
              value={incident.authority_reported_at ? formatDate(incident.authority_reported_at) : undefined}
            />
          </section>
        )}

        {signedUrls.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {signedUrls.map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={url} alt={`Incident photo ${i + 1}`} className="w-full rounded border border-gray-200" />
              ))}
            </div>
          </section>
        )}

        {(notes ?? []).length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Notes</h2>
            <div className="space-y-2">
              {(notes as Note[]).map((note) => (
                <div key={note.id} className="border-l-2 border-gray-300 pl-3">
                  <p className="text-sm text-gray-800">{note.body}</p>
                  <p className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-400">
          Generated {new Date().toLocaleString()} · Northern Lights Petroleum — Incident Report Tracker
        </footer>
      </div>
    </div>
  )
}
