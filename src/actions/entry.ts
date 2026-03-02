
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Schema for Public Entry Form
const entrySchema = z.object({
    full_name: z.string().min(1, '氏名は必須です'),
    full_name_kana: z.string().optional(),
    gender: z.string().optional(),
    contact_email: z.string().email('有効なメールアドレスを入力してください'),
    contact_phone: z.string().min(1, '電話番号は必須です'),
    student_notes: z.string().optional(),
    birth_date: z.string().optional(), // YYYY-MM-DD
})

export type EntryFormValues = z.infer<typeof entrySchema>

export async function submitEntry(values: EntryFormValues) {
    const supabase = await createClient()

    // 1. Validate Input
    const parsed = entrySchema.safeParse(values)
    if (!parsed.success) {
        return { success: false, error: '入力内容が正しくありません', details: parsed.error.flatten() }
    }
    const data = parsed.data

    try {
        // 2. Insert into Students Table (as trial_pending)
        // Note: Using Service Role (createAdminClient) might be safer if RLS blocks public insert,
        // but typically public insert should be allowed or handled via a specific RPC.
        // For now, let's try direct insert with anon key if RLS allows, or use admin client for reliability in this specific flow.
        // Given this is a public form, admin client is safer to ensure assignment.
        const supabaseAdmin = createAdminClient()

        const { data: newStudent, error } = await supabaseAdmin
            .from('students')
            .insert({
                full_name: data.full_name,
                full_name_kana: data.full_name_kana || null,
                gender: data.gender || null,
                contact_email: data.contact_email,
                contact_phone: data.contact_phone,
                notes: data.student_notes || null,
                birth_date: data.birth_date || null,
                status: 'trial_pending', // Waiting for admin approval
                registered_date: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return { success: true }

    } catch (error: any) {
        console.error('Entry Submission Error:', error)
        return { success: false, error: '送信に失敗しました' }
    }
}



export async function completeReceptionManually(studentId: string) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const supabaseAdmin = createAdminClient()

        // Update status to 'trial_pending' to remove from inquiry list
        await supabaseAdmin
            .from('students')
            .update({ status: 'trial_pending' })
            .eq('id', studentId)

        revalidatePath('/customers')
        revalidatePath('/admin/approvals')
        return { success: true }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
