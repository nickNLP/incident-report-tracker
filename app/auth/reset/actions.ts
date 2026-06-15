'use server'

import { redirect } from 'next/navigation'
import { serverSupabase } from '@/lib/supabase/server'

export type ResetState = { error: string | null }

export async function resetPassword(
  prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (!password || password.length < 6)
    return { error: 'Password must be at least 6 characters.' }
  if (password !== confirm)
    return { error: 'Passwords do not match.' }

  const supabase = await serverSupabase()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }
  redirect('/submit?toast=Password+updated')
}
