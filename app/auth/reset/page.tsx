'use client'

import { useActionState } from 'react'
import { resetPassword, type ResetState } from './actions'

const initialState: ResetState = { error: null }

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-600'

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 mt-1 text-sm">Choose a new password for your account.</p>
        </div>

        <form action={formAction} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white py-3 rounded-lg text-base font-semibold disabled:opacity-50 transition-colors"
          >
            {pending ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
