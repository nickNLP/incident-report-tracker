'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { serverSupabase } from '@/lib/supabase/server'

export async function updateIncidentStatus(incidentId: string, formData: FormData) {
  const supabase = await serverSupabase()
  const status = formData.get('status') as string

  await supabase.from('incidents').update({ status }).eq('id', incidentId)
  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/dashboard')
  redirect(`/incidents/${incidentId}?toast=Status+updated`)
}

export async function addIncidentNote(incidentId: string, formData: FormData) {
  const supabase = await serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const body = (formData.get('body') as string)?.trim()

  if (!body) return

  await supabase.from('incident_notes').insert({
    incident_id: incidentId,
    author_id: user?.id,
    body,
  })
  revalidatePath(`/incidents/${incidentId}`)
  redirect(`/incidents/${incidentId}?toast=Note+added`)
}
