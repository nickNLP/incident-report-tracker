'use server'

import { redirect } from 'next/navigation'
import { serverSupabase } from '@/lib/supabase/server'

export type AuthState = { error: string | null }

export async function signIn(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await serverSupabase()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  redirect('/submit')
}

export async function signOut() {
  const supabase = await serverSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
