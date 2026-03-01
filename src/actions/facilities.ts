'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFacilityAction(data: { name: string, isFacilityFeeApplied: boolean }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const { error } = await supabase
            .from('facilities')
            .insert({
                name: data.name,
                is_facility_fee_applied: data.isFacilityFeeApplied
            })

        if (error) throw error

        revalidatePath('/admin/masters/facilities')
        return { success: true }
    } catch (error: any) {
        console.error('Create Facility Error:', error)
        return { success: false, error: error.message || 'Failed to create facility' }
    }
}

export async function deleteFacilityAction(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const { error } = await supabase
            .from('facilities')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/masters/facilities')
        return { success: true }
    } catch (error: any) {
        console.error('Delete Facility Error:', error)
        return { success: false, error: error.message || 'Failed to delete facility' }
    }
}
