import { serverSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { FlashBanner } from '@/app/components/FlashBanner'
import { updateProfile } from './actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const roleLabels: Record<string, string> = {
  driver:     'Driver',
  dispatcher: 'Dispatcher',
  manager:    'Manager',
}

const roleBadgeClass: Record<string, string> = {
  driver:     'bg-gray-100 text-gray-700',
  dispatcher: 'bg-brand-100 text-brand-700',
  manager:    'bg-purple-100 text-purple-700',
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-600'

function StatBox({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className={`rounded-lg p-3 text-center ${className}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  )
}

export default async function ProfilePage() {
  const supabase = await serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role, created_at').eq('id', user.id).single()

  const { data: allIncidents } = profile?.role === 'driver'
    ? await supabase.from('incidents').select('status, date').eq('submitted_by', user.id)
    : { data: [] }

  const all = allIncidents ?? []
  const thisYear = all.filter((i) => i.date >= yearStart)

  const countByStatus = (arr: typeof all) => ({
    open:      arr.filter((i) => i.status === 'open').length,
    in_review: arr.filter((i) => i.status === 'in_review').length,
    closed:    arr.filter((i) => i.status === 'closed').length,
  })

  const yearStats = countByStatus(thisYear)
  const allStats  = countByStatus(all)

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <FlashBanner />
      <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Northern Lights Petroleum" style={{ height: '2rem', width: 'auto' }} className="hidden sm:block" />
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-700 transition-colors">← Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass[profile?.role ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
            {roleLabels[profile?.role ?? ''] ?? profile?.role}
          </span>
        </div>

        {/* Account info + edit name */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-sm text-gray-800 break-all">{user.email}</p>
            </div>
            {memberSince && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p>
                <p className="text-sm text-gray-800">{memberSince}</p>
              </div>
            )}
          </div>

          <form action={updateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                name="full_name"
                type="text"
                required
                defaultValue={profile?.full_name ?? ''}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-700 hover:bg-brand-800 text-white py-3 rounded-xl text-base font-semibold transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>

        {/* Incident stats — drivers only */}
        {profile?.role === 'driver' && <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <p className="text-sm font-semibold text-gray-900">Incidents Submitted</p>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{currentYear}</p>
            <div className="grid grid-cols-4 gap-2">
              <StatBox label="Total"     value={thisYear.length}      className="bg-gray-50 text-gray-700" />
              <StatBox label="Open"      value={yearStats.open}       className="bg-yellow-50 text-yellow-700" />
              <StatBox label="In Review" value={yearStats.in_review}  className="bg-brand-50 text-brand-700" />
              <StatBox label="Closed"    value={yearStats.closed}     className="bg-green-50 text-green-700" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">All Time</p>
            <div className="grid grid-cols-4 gap-2">
              <StatBox label="Total"     value={all.length}          className="bg-gray-50 text-gray-700" />
              <StatBox label="Open"      value={allStats.open}       className="bg-yellow-50 text-yellow-700" />
              <StatBox label="In Review" value={allStats.in_review}  className="bg-brand-50 text-brand-700" />
              <StatBox label="Closed"    value={allStats.closed}     className="bg-green-50 text-green-700" />
            </div>
          </div>
        </div>}
      </main>
    </div>
  )
}
