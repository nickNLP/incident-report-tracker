'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { serverSupabase } from '@/lib/supabase/server'

export type SubmitState = { error: string | null }

export async function submitIncident(
  userId: string | null,
  prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const supabase = await serverSupabase()

  const date = formData.get('date') as string
  const str = (key: string) => (formData.get(key) as string) || null
  const num = (key: string) => {
    const v = formData.get(key) as string
    return v ? Number(v) : null
  }
  const tri = (key: string) => {
    const v = formData.get(key)
    return v === 'true' ? true : v === 'false' ? false : null
  }

  if (!date)                        return { error: 'Date is required.' }
  if (!str('incident_type_id'))     return { error: 'Type of Incident is required.' }
  if (!str('driver_id'))            return { error: 'Driver is required.' }
  if (!str('root_cause_id'))        return { error: 'Root Cause is required.' }
  if (!formData.get('preventable')) return { error: 'Preventable is required.' }

  const preventableRaw = formData.get('preventable')
  const preventable =
    preventableRaw === 'true' ? true : preventableRaw === 'false' ? false : null

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      date,
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
      submitted_by: userId,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const incidentId = data.id
  const photoFiles = formData
    .getAll('photos')
    .filter((f): f is File => f instanceof File && f.size > 0)

  for (const file of photoFiles) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `${incidentId}/${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('incident-photos')
      .upload(path, file, { contentType: file.type })

    if (!uploadError) {
      await supabase.from('incident_photos').insert({ incident_id: incidentId, storage_path: path })
    }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
