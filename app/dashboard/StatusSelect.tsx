'use client'

import { useTransition } from 'react'
import { updateIncidentStatusInline } from './actions'

const options = [
  { value: 'open',      label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'closed',    label: 'Closed' },
]

const selectClass: Record<string, string> = {
  open:      'bg-yellow-50 text-yellow-800 border-yellow-200',
  in_review: 'bg-brand-50 text-brand-800 border-brand-200',
  closed:    'bg-green-50 text-green-800 border-green-200',
}

export function StatusSelect({ incidentId, status }: { incidentId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const action = updateIncidentStatusInline.bind(null, incidentId)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData()
    formData.set('status', e.target.value)
    startTransition(() => action(formData))
  }

  return (
    <select
      defaultValue={status}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs font-medium border rounded-full px-2.5 py-1 focus:outline-none transition-opacity ${isPending ? 'opacity-50' : ''} ${selectClass[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
