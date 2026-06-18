import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import {
  addDriver, toggleDriver,
  addCustomer, toggleCustomer,
  addLookupOption, toggleLookupOption, removeLookupOption,
} from './actions'
import { ConfirmForm } from './ConfirmForm'
import { AssistantChat } from './AssistantChat'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const inputClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600'
const LOOKUP_CATEGORIES = [
  { key: 'incident_type', label: 'Incident Types' },
  { key: 'reported_to',   label: 'Reported To' },
  { key: 'dispatcher',    label: 'Dispatchers' },
  { key: 'root_cause',    label: 'Root Causes' },
]

export default async function AdminPage() {
  const supabase = await serverSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user?.id ?? '').single()

  if (profile?.role !== 'manager') redirect('/dashboard')

  const [{ data: drivers }, { data: customers }, { data: lookupOptions }] = await Promise.all([
    supabase.from('drivers').select('id, full_name, is_active').order('full_name'),
    supabase.from('customers').select('id, name, province, is_active').order('name'),
    supabase.from('lookup_options').select('id, category, label, is_active').order('sort_order'),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Northern Lights Petroleum" style={{ height: '2.25rem', width: 'auto' }} className="hidden sm:block" />
            <nav className="flex items-center gap-1">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50">Dashboard</Link>
              <span className="text-sm font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg">Admin</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* AI Assistant (demo) */}
        <AssistantChat />

        {/* Drivers */}
        <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Drivers</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(drivers ?? []).map((d) => {
              const toggle = toggleDriver.bind(null, d.id, !d.is_active)
              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <span className={`text-sm ${d.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {d.full_name}
                  </span>
                  <form action={toggle}>
                    <button type="submit" className={`text-xs font-medium ${d.is_active ? 'text-red-500' : 'text-green-600'}`}>
                      {d.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
          <form action={addDriver} className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
            <input name="full_name" placeholder="Driver name" required className={`flex-1 ${inputClass}`} />
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Add</button>
          </form>
        </section>

        {/* Customers */}
        <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Customers</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(customers ?? []).map((c) => {
              const toggle = toggleCustomer.bind(null, c.id, !c.is_active)
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <span className={`text-sm ${c.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {c.name}{c.province ? ` — ${c.province}` : ''}
                  </span>
                  <form action={toggle}>
                    <button type="submit" className={`text-xs font-medium ${c.is_active ? 'text-red-500' : 'text-green-600'}`}>
                      {c.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
          <form action={addCustomer} className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
            <input name="name" placeholder="Customer name" required className={`flex-1 ${inputClass}`} />
            <input name="province" placeholder="Province" className={`w-28 ${inputClass}`} />
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Add</button>
          </form>
        </section>

        {/* Lookup Options */}
        {LOOKUP_CATEGORIES.map(({ key, label }) => {
          const options = (lookupOptions ?? []).filter(o => o.category === key)
          return (
            <section key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">{label}</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {options.map((o) => {
                  const isDispatcher = key === 'dispatcher'
                  const toggle = isDispatcher
                    ? removeLookupOption.bind(null, o.id)
                    : toggleLookupOption.bind(null, o.id, !o.is_active)
                  return (
                    <div key={o.id} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-gray-900">{o.label}</span>
                      {isDispatcher ? (
                        <ConfirmForm
                          action={toggle}
                          message={`Remove "${o.label}" as a dispatcher? This cannot be undone.`}
                          buttonLabel="Remove"
                          buttonClass="text-xs font-medium text-red-500"
                        />
                      ) : (
                        <form action={toggle}>
                          <button type="submit" className={`text-xs font-medium ${o.is_active ? 'text-red-500' : 'text-green-600'}`}>
                            {o.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </form>
                      )}
                    </div>
                  )
                })}
              </div>
              <form action={addLookupOption} className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <input type="hidden" name="category" value={key} />
                <input name="label" placeholder={`New ${label.toLowerCase().replace(/s$/, '')}...`} required className={`flex-1 ${inputClass}`} />
                <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Add</button>
              </form>
            </section>
          )
        })}
      </main>
    </div>
  )
}
