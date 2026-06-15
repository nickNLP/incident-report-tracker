'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '@/app/actions/auth'

const initialState: AuthState = { error: null }

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white/90'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  return (
    <div
      className="min-h-screen flex items-start justify-center px-4 pt-12 relative"
      style={{
        backgroundImage: 'url("/NPT truck logo.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay so form is readable */}
      <div className="absolute inset-0" style={{ background: 'rgba(8, 20, 12, 0.72)' }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/logo.png"
            alt="Northern Lights Petroleum"
            style={{ height: '5rem', width: 'auto' }}
            className="mx-auto mb-4 drop-shadow-lg"
          />
          <p className="text-sm font-medium tracking-wide" style={{ color: '#74C69D' }}>
            Incident Report System
          </p>
        </div>

        <form
          action={formAction}
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}
        >
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

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
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
            className="w-full text-white py-3 rounded-lg text-base font-semibold disabled:opacity-50 mt-2 transition-opacity"
            style={{ background: 'linear-gradient(120deg, #2D6A4F, #1F4D39)' }}
          >
            {pending ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="text-center">
            <a href="/forgot-password" className="text-sm text-gray-500 hover:text-brand-700">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
