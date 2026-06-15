import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import IncidentForm from './IncidentForm'
import { FlashBanner } from '@/app/components/FlashBanner'
import Link from 'next/link'

export default async function SubmitPage() {
  const supabase = await serverSupabase()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: lookupOptions },
    { data: drivers },
    { data: customers },
    { data: profile },
  ] = await Promise.all([
    supabase.from('lookup_options').select('id, category, label').eq('is_active', true).order('sort_order'),
    supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('customers').select('id, name').eq('is_active', true).order('name'),
    supabase.from('profiles').select('full_name, role').eq('id', user?.id ?? '').single(),
  ])

  const defaultDriverId =
    profile?.role === 'driver'
      ? (drivers ?? []).find(
          (d) => d.full_name.toLowerCase() === (profile.full_name ?? '').toLowerCase()
        )?.id ?? null
      : null

  const byCategory = (cat: string) =>
    (lookupOptions ?? []).filter((o) => o.category === cat)

  return (
    <>
      <FlashBanner />
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
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
      <IncidentForm
        incidentTypes={byCategory('incident_type')}
        reportedToOptions={byCategory('reported_to')}
        dispatchers={byCategory('dispatcher')}
        rootCauses={byCategory('root_cause')}
        drivers={drivers ?? []}
        customers={customers ?? []}
        userId={user?.id ?? null}
        defaultDriverId={defaultDriverId}
      />
    </>
  )
}
