'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export function SearchInput({ value, baseHref }: { value: string; baseHref: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim() ?? ''
    const url = new URL(baseHref, 'http://x')
    if (q) url.searchParams.set('search', q)
    else url.searchParams.delete('search')
    url.searchParams.delete('page')
    router.push(url.pathname + url.search)
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = ''
    const url = new URL(baseHref, 'http://x')
    url.searchParams.delete('search')
    url.searchParams.delete('page')
    router.push(url.pathname + url.search)
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <input
        ref={inputRef}
        defaultValue={value}
        type="text"
        placeholder="Search driver, customer, description…"
        className="border border-gray-200 rounded-full pl-9 pr-8 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 w-64"
      />
      <svg className="absolute left-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      {value && (
        <button type="button" onClick={handleClear} className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
      )}
    </form>
  )
}
