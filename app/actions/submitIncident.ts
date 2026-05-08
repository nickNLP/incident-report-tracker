'use server'

import { serverSupabase } from '@/lib/supabase/server'

export type SubmitState = { error: string | null; success: boolean }

export async function submitIncident(
  userId: string | null,
  prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const supabase = await serverSupabase()

  const date = formData.get('date') as string
  const str = (key: string) => (formData.get(key) as string) || null

  if (!date)                        return { error: 'Date is required.', success: false }
  if (!str('incident_type_id'))     return { error: 'Type of Incident is required.', success: false }
  if (!str('driver_id'))            return { error: 'Driver is required.', success: false }
  if (!str('root_cause_id'))        return { error: 'Root Cause is required.', success: false }
  if (!formData.get('preventable')) return { error: 'Preventable is required.', success: false }

  const preventableRaw = formData.get('preventable')
  const preventable =
    preventableRaw === 'true' ? true : preventableRaw === 'false' ? false : null

  const { error } = await supabase.from('incidents').insert({
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
    submitted_by: userId,
  })

  if (error) return { error: error.message, success: false }
  return { error: null, success: true }
}
