'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function FlashBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const message = searchParams.get('toast')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('toast')
    router.replace(`${pathname}${params.size ? '?' + params : ''}`)
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [message])

  if (!visible) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
      <span>✓</span>
      <span>{message}</span>
    </div>
  )
}
