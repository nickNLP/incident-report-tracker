'use server'

import { serverSupabase } from '@/lib/supabase/server'

export type ForgotState = { error: string | null; sent: boolean }

export async function sendResetEmail(
  prevState: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'Email is required.', sent: false }

  const supabase = await serverSupabase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset`,
  })

  if (error) return { error: error.message, sent: false }
  return { error: null, sent: true }
}
