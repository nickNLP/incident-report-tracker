'use client'

import { useActionState } from 'react'
import { submitIncident, type SubmitState } from '@/app/actions/submitIncident'
import { DatePicker } from './DatePicker'
import { SpillFields } from './SpillFields'

type Option = { id: string; label: string }
type Driver = { id: string; full_name: string }
type Customer = { id: string; name: string }

type Props = {
  incidentTypes: Option[]
  reportedToOptions: Option[]
  dispatchers: Option[]
  rootCauses: Option[]
  drivers: Driver[]
  customers: Customer[]
  userId: string | null
  defaultDriverId: string | null
}

const initialState: SubmitState = { error: null }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-600'

function SelectField({ name, options, placeholder, required }: { name: string; options: Option[]; placeholder: string; required?: boolean }) {
  return (
    <select name={name} required={required} className={inputClass}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  )
}

export default function IncidentForm({ incidentTypes, reportedToOptions, dispatchers, rootCauses, drivers, customers, userId, defaultDriverId }: Props) {
  const submitWithUser = submitIncident.bind(null, userId)
  const [state, formAction, pending] = useActionState(submitWithUser, initialState)

  return (
    <form action={formAction} className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Incident Report</h1>

      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <Field label="Date" required>
        <DatePicker defaultValue={new Date().toISOString().split('T')[0]} />
      </Field>

      <Field label="Type of Incident" required>
        <SelectField name="incident_type_id" options={incidentTypes} placeholder="Select type..." required />
      </Field>

      <Field label="Reported To">
        <SelectField name="reported_to_id" options={reportedToOptions} placeholder="Select person..." />
      </Field>

      <Field label="Driver" required>
        <select name="driver_id" required defaultValue={defaultDriverId ?? ''} className={inputClass}>
          <option value="">Select driver...</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </Field>

      <Field label="Dispatcher">
        <SelectField name="dispatcher_id" options={dispatchers} placeholder="Select dispatcher..." />
      </Field>

      <Field label="Root Cause" required>
        <SelectField name="root_cause_id" options={rootCauses} placeholder="Select root cause..." required />
      </Field>

      <Field label="Preventable" required>
        <div className="flex gap-3">
          {['Yes', 'No'].map((label, i) => (
            <label
              key={label}
              className="flex-1 flex items-center justify-center border border-gray-300 rounded-lg py-3 cursor-pointer has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="preventable"
                value={label === 'Yes' ? 'true' : 'false'}
                required={i === 0}
                className="sr-only"
              />
              <span className="text-base font-medium">{label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Customer">
        <select name="customer_id" className={inputClass}>
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={4}
          placeholder="Describe what happened..."
          className={`${inputClass} resize-none`}
        />
      </Field>

      <Field label="Photos">
        <input
          name="photos"
          type="file"
          multiple
          accept="image/*"
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700"
        />
      </Field>

      <Field label="Corrective Action">
        <textarea
          name="corrective_action"
          rows={4}
          placeholder="Describe the corrective action taken..."
          className={`${inputClass} resize-none`}
        />
      </Field>

      <SpillFields />

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand-700 hover:bg-brand-800 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50 transition-colors"
        >
          {pending ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}
