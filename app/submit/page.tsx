import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import IncidentForm from './IncidentForm'

export default async function SubmitPage() {
  const supabase = await serverSupabase()

  const [
    { data: { user } },
    { data: lookupOptions },
    { data: drivers },
    { data: customers },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('lookup_options').select('id, category, label').eq('is_active', true).order('sort_order'),
    supabase.from('drivers').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('customers').select('id, name').eq('is_active', true).order('name'),
  ])

  const byCategory = (cat: string) =>
    (lookupOptions ?? []).filter((o) => o.category === cat)

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-lg mx-auto w-full">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <form action={signOut}>
          <button type="submit" className="text-sm text-red-500 font-medium">
            Sign out
          </button>
        </form>
      </header>
      <IncidentForm
        incidentTypes={byCategory('incident_type')}
        reportedToOptions={byCategory('reported_to')}
        dispatchers={byCategory('dispatcher')}
        rootCauses={byCategory('root_cause')}
        drivers={drivers ?? []}
        customers={customers ?? []}
        userId={user?.id ?? null}
      />
    </>
  )
}
