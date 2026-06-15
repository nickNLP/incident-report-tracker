'use client'

import { useState } from 'react'

function toDisplay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export function DatePicker({ defaultValue }: { defaultValue: string }) {
  const [iso, setIso] = useState(defaultValue)

  return (
    <div className="relative">
      {/* Styled display — pointer-events-none so clicks fall through to the input */}
      <div className="pointer-events-none w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white flex items-center justify-between">
        <span>{toDisplay(iso)}</span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Native date input — invisible, covers the whole area, opens calendar on click */}
      <input
        type="date"
        value={iso}
        onChange={e => e.target.value && setIso(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {/* Hidden input carries the value on form submit */}
      <input type="hidden" name="date" value={iso} />
    </div>
  )
}
