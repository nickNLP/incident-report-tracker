'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { serverSupabase } from '@/lib/supabase/server'

export async function editIncident(incidentId: string, formData: FormData) {
  const supabase = await serverSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (profile?.role !== 'manager') redirect(`/incidents/${incidentId}`)

  const str = (key: string) => (formData.get(key) as string) || null
  const num = (key: string) => {
    const v = formData.get(key) as string
    return v ? Number(v) : null
  }
  const tri = (key: string) => {
    const v = formData.get(key)
    return v === 'true' ? true : v === 'false' ? false : null
  }
  const preventableRaw = formData.get('preventable')
  const preventable =
    preventableRaw === 'true' ? true : preventableRaw === 'false' ? false : null

  const { error } = await supabase.from('incidents').update({
    date: formData.get('date') as string,
    incident_type_id: str('incident_type_id'),
    reported_to_id: str('reported_to_id'),
    driver_id: str('driver_id'),
    dispatcher_id: str('dispatcher_id'),
    root_cause_id: str('root_cause_id'),
    preventable,
    customer_id: str('customer_id'),
    description: str('description'),
    corrective_action: str('corrective_action'),
    product_type: str('product_type'),
    spill_volume_litres: num('spill_volume_litres'),
    spill_location: str('spill_location'),
    reported_to_authority: tri('reported_to_authority'),
    authority_name: str('authority_name'),
    authority_ref: str('authority_ref'),
    authority_reported_at: str('authority_reported_at'),
  }).eq('id', incidentId)

  if (error) redirect(`/incidents/${incidentId}/edit?error=${encodeURIComponent(error.message)}`)

  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/dashboard')
  redirect(`/incidents/${incidentId}?toast=Incident+updated`)
}
