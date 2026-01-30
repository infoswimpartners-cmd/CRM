'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

const payoutSchema = z.object({
    coach_id: z.string().uuid(),
    amount: z.number().min(0),
    target_month: z.string(), // YYYY-MM
    note: z.string().optional(),
    status: z.enum(['paid', 'pending']).default('paid')
})

type PayoutValues = z.infer<typeof payoutSchema>

export async function submitPayout(values: PayoutValues) {
    const supabase = await createClient()

    // 1. Authenticate Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return { success: false, error: 'Forbidden' }
    }

    // 2. Validate
    const parsed = payoutSchema.safeParse(values)
    if (!parsed.success) {
        console.error('Validation Error', parsed.error)
        return { success: false, error: 'Invalid Input' }
    }
    const data = parsed.data

    try {
        const { error } = await supabase.from('payouts').insert({
            coach_id: data.coach_id,
            amount: data.amount,
            target_month: data.target_month,
            note: data.note || '',
            status: data.status
        })

        if (error) throw error

        revalidatePath('/admin/finance/payouts')
        return { success: true }

    } catch (error) {
        console.error('Payout Submission Error:', error)
        return { success: false, error: 'Failed to record payout' }
    }
}

export async function togglePayoutStatus(id: string, currentStatus: 'paid' | 'pending') {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { success: false, error: 'Forbidden' }

    try {
        const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
        const { error } = await supabase
            .from('payouts')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/admin/finance/payouts')
        return { success: true }
    } catch (error) {
        console.error('Toggle Status Error:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

export async function deletePayout(id: string) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { success: false, error: 'Forbidden' }

    try {
        const { error } = await supabase
            .from('payouts')
            .delete()
            .eq('id', id)

        if (error) throw error
        revalidatePath('/admin/finance/payouts')
        return { success: true }
    } catch (error) {
        console.error('Delete Payout Error:', error)
        return { success: false, error: 'Failed to delete payout' }
    }
}
