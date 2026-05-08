'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '@/app/actions/auth'

const initialState: AuthState = { error: null }

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Northern Lights Petroleum</h1>
          <p className="text-gray-500 mt-1 text-sm">Incident Report System</p>
        </div>

        <form action={formAction} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
              Email
            </label>
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

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-base font-semibold disabled:opacity-50 mt-2"
          >
            {pending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
