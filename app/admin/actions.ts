'use server'

import { revalidatePath } from 'next/cache'
import { serverSupabase } from '@/lib/supabase/server'

export async function addDriver(formData: FormData) {
  const supabase = await serverSupabase()
  const full_name = (formData.get('full_name') as string)?.trim()
  if (!full_name) return
  await supabase.from('drivers').insert({ full_name })
  revalidatePath('/admin')
}

export async function toggleDriver(id: string, isActive: boolean) {
  const supabase = await serverSupabase()
  await supabase.from('drivers').update({ is_active: isActive }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/submit')
}

export async function addCustomer(formData: FormData) {
  const supabase = await serverSupabase()
  const name     = (formData.get('name') as string)?.trim()
  const province = (formData.get('province') as string)?.trim() || null
  if (!name) return
  await supabase.from('customers').insert({ name, province })
  revalidatePath('/admin')
  revalidatePath('/submit')
}

export async function toggleCustomer(id: string, isActive: boolean) {
  const supabase = await serverSupabase()
  await supabase.from('customers').update({ is_active: isActive }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/submit')
}

export async function addLookupOption(formData: FormData) {
  const supabase = await serverSupabase()
  const category = (formData.get('category') as string)?.trim()
  const label    = (formData.get('label') as string)?.trim()
  if (!category || !label) return
  const { data: existing } = await supabase
    .from('lookup_options')
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1
  await supabase.from('lookup_options').insert({ category, label, sort_order })
  revalidatePath('/admin')
  revalidatePath('/submit')
}

export async function toggleLookupOption(id: string, isActive: boolean) {
  const supabase = await serverSupabase()
  await supabase.from('lookup_options').update({ is_active: isActive }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/submit')
}

export async function removeLookupOption(id: string) {
  const supabase = await serverSupabase()
  await supabase.from('lookup_options').delete().eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/submit')
}
