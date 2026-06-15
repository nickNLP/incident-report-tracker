'use server'

import { redirect } from 'next/navigation'
import { serverSupabase } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const full_name = (formData.get('full_name') as string).trim()
  if (!full_name) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name })
    .eq('id', user.id)

  if (error) return { error: error.message }

  redirect('/profile?toast=Profile+updated')
}
