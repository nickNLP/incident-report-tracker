'use server'

import { revalidatePath } from 'next/cache'
import { serverSupabase } from '@/lib/supabase/server'

export async function updateIncidentStatusInline(incidentId: string, formData: FormData) {
  const status = formData.get('status') as string
  if (!status) return

  const supabase = await serverSupabase()
  await supabase.from('incidents').update({ status }).eq('id', incidentId)
  revalidatePath('/dashboard')
}
