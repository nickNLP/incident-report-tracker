import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { FlashBanner } from '@/app/components/FlashBanner'
import { editIncident } from './actions'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DatePicker } from '@/app/submit/DatePicker'
import { SpillFields } from '@/app/submit/SpillFields'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-600'

export default async function EditIncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorMsg } = await searchParams
  const supabase = await serverSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single()
  if (profile?.role !== 'manager') redirect(`/incidents/${id}`)

  const [{ data: incident }, { data: lookupOptions }, { data: drivers }, { data: customers }] = await Promise.all([
    supabase.from('incidents').select('*').eq('id', id).single(),
    supabase.from('lookup_options').select('id, category, label').eq('is_active', true).order('sort_order'),
    supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('customers').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!incident) notFound()

  const byCategory = (cat: string) =>
    (lookupOptions ?? []).filter(o => o.category === cat)

  const action = editIncident.bind(null, id)

  return (
    <div className="min-h-screen bg-gray-50">
      <FlashBanner />
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Northern Lights Petroleum" style={{ height: '2rem', width: 'auto' }} className="hidden sm:block" />
            <Link href={`/incidents/${id}`} className="text-sm text-gray-500 hover:text-brand-700 transition-colors">← Back to Incident</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <form action={action} className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Edit Incident</h1>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{errorMsg}</div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
          <DatePicker defaultValue={incident.date} />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Type of Incident <span className="text-red-500">*</span></label>
          <select name="incident_type_id" required defaultValue={incident.incident_type_id ?? ''} className={inputClass}>
            <option value="">Select type...</option>
            {byCategory('incident_type').map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Reported To</label>
          <select name="reported_to_id" defaultValue={incident.reported_to_id ?? ''} className={inputClass}>
            <option value="">Select person...</option>
            {byCategory('reported_to').map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Driver <span className="text-red-500">*</span></label>
          <select name="driver_id" required defaultValue={incident.driver_id ?? ''} className={inputClass}>
            <option value="">Select driver...</option>
            {(drivers ?? []).map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Dispatcher</label>
          <select name="dispatcher_id" defaultValue={incident.dispatcher_id ?? ''} className={inputClass}>
            <option value="">Select dispatcher...</option>
            {byCategory('dispatcher').map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Root Cause <span className="text-red-500">*</span></label>
          <select name="root_cause_id" required defaultValue={incident.root_cause_id ?? ''} className={inputClass}>
            <option value="">Select root cause...</option>
            {byCategory('root_cause').map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Preventable <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            {['Yes', 'No'].map((label, i) => (
              <label key={label} className="flex-1 flex items-center justify-center border border-gray-300 rounded-lg py-3 cursor-pointer has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="preventable"
                  value={label === 'Yes' ? 'true' : 'false'}
                  required={i === 0}
                  defaultChecked={incident.preventable === (label === 'Yes')}
                  className="sr-only"
                />
                <span className="text-base font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <select name="customer_id" defaultValue={incident.customer_id ?? ''} className={inputClass}>
            <option value="">Select customer...</option>
            {(customers ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={4} defaultValue={incident.description ?? ''} className={`${inputClass} resize-none`} />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Corrective Action</label>
          <textarea name="corrective_action" rows={4} defaultValue={incident.corrective_action ?? ''} className={`${inputClass} resize-none`} />
        </div>

        <SpillFields
          defaults={{
            product_type: incident.product_type,
            spill_volume_litres: incident.spill_volume_litres,
            spill_location: incident.spill_location,
            reported_to_authority: incident.reported_to_authority,
            authority_name: incident.authority_name,
            authority_ref: incident.authority_ref,
            authority_reported_at: incident.authority_reported_at,
          }}
        />

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg flex gap-3">
          <Link href={`/incidents/${id}`} className="flex-1 text-center border border-gray-300 text-gray-700 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" className="flex-1 text-white py-4 rounded-xl text-lg font-semibold transition-colors" style={{ background: 'linear-gradient(120deg, #2D6A4F, #1F4D39)' }}>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
