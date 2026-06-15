type SpillDefaults = {
  product_type?: string | null
  spill_volume_litres?: number | null
  spill_location?: string | null
  reported_to_authority?: boolean | null
  authority_name?: string | null
  authority_ref?: string | null
  authority_reported_at?: string | null
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-600'

const labelClass = 'block text-sm font-medium text-gray-700'

/**
 * Spill / regulatory reporting fields. Plain (server-renderable) component so it
 * can be dropped into both the client submit form and the server-rendered edit
 * form. All fields optional; relevant mainly to spill / reportable incidents.
 * Opens by default when the incident already has spill data.
 */
export function SpillFields({ defaults }: { defaults?: SpillDefaults }) {
  const d = defaults ?? {}
  const hasData =
    d.product_type ||
    d.spill_volume_litres != null ||
    d.spill_location ||
    d.reported_to_authority != null ||
    d.authority_name ||
    d.authority_ref ||
    d.authority_reported_at

  const reportedDefault =
    d.reported_to_authority === true ? 'true' : d.reported_to_authority === false ? 'false' : ''

  return (
    <details open={!!hasData} className="rounded-lg border border-gray-200 bg-gray-50/60">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-900">
        Spill / Regulatory Details
        <span className="ml-2 font-normal text-gray-400">(complete if applicable)</span>
      </summary>

      <div className="space-y-4 px-4 pb-4 pt-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelClass}>Product</label>
            <input
              name="product_type"
              type="text"
              defaultValue={d.product_type ?? ''}
              placeholder="e.g. Diesel, Gasoline, Propane"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Estimated Volume (L)</label>
            <input
              name="spill_volume_litres"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              defaultValue={d.spill_volume_litres ?? ''}
              placeholder="Litres"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Spill Location</label>
          <input
            name="spill_location"
            type="text"
            defaultValue={d.spill_location ?? ''}
            placeholder="Address, landmark, or GPS coordinates"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Reported to Authority?</label>
          <select name="reported_to_authority" defaultValue={reportedDefault} className={inputClass}>
            <option value="">Not specified</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelClass}>Authority / Agency</label>
            <input
              name="authority_name"
              type="text"
              defaultValue={d.authority_name ?? ''}
              placeholder="e.g. MB Environment, TDG"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Authority File / Ref #</label>
            <input
              name="authority_ref"
              type="text"
              defaultValue={d.authority_ref ?? ''}
              placeholder="Reference number"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Date Reported to Authority</label>
          <input
            name="authority_reported_at"
            type="date"
            defaultValue={d.authority_reported_at ?? ''}
            className={inputClass}
          />
        </div>
      </div>
    </details>
  )
}
