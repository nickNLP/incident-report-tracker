'use client'

import { useRouter } from 'next/navigation'

type Driver = { id: string; full_name: string }

export function DriverFilter({
  drivers,
  value,
  baseHref,
}: {
  drivers: Driver[]
  value: string
  baseHref: string
}) {
  const router = useRouter()

  function handleChange(driverId: string) {
    const sep = baseHref.includes('?') ? '&' : '?'
    const url = driverId === 'all' ? baseHref : `${baseHref}${sep}driver=${driverId}`
    router.push(url)
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
    >
      <option value="all">All Drivers</option>
      {drivers.map((d) => (
        <option key={d.id} value={d.id}>{d.full_name}</option>
      ))}
    </select>
  )
}
