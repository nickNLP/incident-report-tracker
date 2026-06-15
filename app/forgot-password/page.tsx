'use client'

import { useActionState } from 'react'
import { sendResetEmail, type ForgotState } from './actions'
import Link from 'next/link'

const initialState: ForgotState = { error: null, sent: false }

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-600'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(sendResetEmail, initialState)

  if (state.sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6">
            We sent a password reset link. Check your inbox and follow the link to set a new password.
          </p>
          <Link href="/login" className="text-brand-700 text-sm font-medium hover:text-brand-800">← Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your email and we'll send a reset link.</p>
        </div>

        <form action={formAction} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white py-3 rounded-lg text-base font-semibold disabled:opacity-50 transition-colors"
          >
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
