'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FacilityPayload {
    name: string
    isFacilityFeeApplied?: boolean
    facilityFee?: number
    feePaymentType?: 'reward' | 'expense'
}

export async function createFacilityAction(data: FacilityPayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const feeAmount = typeof data.facilityFee === 'number'
        ? Math.max(0, Math.floor(data.facilityFee))
        : (data.isFacilityFeeApplied ? 1500 : 0)
    const isApplied = feeAmount > 0
    const paymentType = data.feePaymentType || 'reward'

    try {
        const { error } = await supabase
            .from('facilities')
            .insert({
                name: data.name,
                is_facility_fee_applied: isApplied,
                facility_fee: feeAmount,
                fee_payment_type: paymentType
            })

        if (error) {
            // 新規カラム未適用環境へのフォールバック
            if (error.message?.includes('facility_fee') || error.message?.includes('fee_payment_type') || error.code === '42703' || error.code === 'PGRST204') {
                const { error: fallbackError } = await supabase
                    .from('facilities')
                    .insert({
                        name: data.name,
                        is_facility_fee_applied: isApplied
                    })
                if (fallbackError) throw fallbackError
            } else {
                throw error
            }
        }

        revalidatePath('/admin/masters/facilities')
        return { success: true }
    } catch (error: any) {
        console.error('Create Facility Error:', error)
        return { success: false, error: error.message || 'Failed to create facility' }
    }
}

export async function updateFacilityAction(id: string, data: FacilityPayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const feeAmount = typeof data.facilityFee === 'number'
        ? Math.max(0, Math.floor(data.facilityFee))
        : (data.isFacilityFeeApplied ? 1500 : 0)
    const isApplied = feeAmount > 0
    const paymentType = data.feePaymentType || 'reward'

    try {
        const { error } = await supabase
            .from('facilities')
            .update({
                name: data.name,
                is_facility_fee_applied: isApplied,
                facility_fee: feeAmount,
                fee_payment_type: paymentType
            })
            .eq('id', id)

        if (error) {
            // 新規カラム未適用環境へのフォールバック
            if (error.message?.includes('facility_fee') || error.message?.includes('fee_payment_type') || error.code === '42703' || error.code === 'PGRST204') {
                const { error: fallbackError } = await supabase
                    .from('facilities')
                    .update({
                        name: data.name,
                        is_facility_fee_applied: isApplied
                    })
                    .eq('id', id)
                if (fallbackError) throw fallbackError
            } else {
                throw error
            }
        }

        revalidatePath('/admin/masters/facilities')
        return { success: true }
    } catch (error: any) {
        console.error('Update Facility Error:', error)
        return { success: false, error: error.message || 'Failed to update facility' }
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
