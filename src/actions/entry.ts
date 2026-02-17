
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'
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

        // 3. Notify Admin (Email)
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
        if (adminEmail) {
            await emailService.sendEmail({
                to: adminEmail,
                subject: `【新規申込】${data.full_name}様`,
                text: `
ウェブサイトから新規の申し込みがありました。
管理画面から内容を確認し、受付メールを送信（承認）してください。

■申込者情報
氏名: ${data.full_name}
メール: ${data.contact_email}
電話: ${data.contact_phone}
備考: ${data.student_notes || '(なし)'}

--------------------------------------------------
Swim Partners Manager
                `.trim()
            })
        }

        return { success: true }

    } catch (error: any) {
        console.error('Entry Submission Error:', error)
        return { success: false, error: '送信に失敗しました' }
    }
}

export async function sendReceptionEmail(studentId: string) {
    const supabase = await createClient()

    // 1. Auth Check (Admin Only)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const supabaseAdmin = createAdminClient()

        // 2. Fetch Student Info
        const { data: student, error: fetchError } = await supabaseAdmin
            .from('students')
            .select('contact_email, full_name, status, notes')
            .eq('id', studentId)
            .single()

        if (fetchError || !student) throw new Error('Student not found')
        if (!student.contact_email) throw new Error('メールアドレスが登録されていません')

        // 3. Extract Dates from Notes
        // Notes format from GAS: ...\n【生年月日】\n...\n\n[追加情報]\n...【第一今望】: 2026/02/17 10:00...
        // We look for patterns like 【第一希望】: value
        // value might be till next newline or end of string.
        let date1 = '(フォームから自動引用できませんでした)'
        let date2 = '(フォームから自動引用できませんでした)'
        let date3 = '(フォームから自動引用できませんでした)'

        if (student.notes) {
            const extract = (key: string) => {
                const regex = new RegExp(`【${key}】\\s*[:：]?\\s*(.*)`)
                const match = student.notes!.match(regex)
                return match ? match[1].trim() : ''
            }

            // Try to extract from the structured part if available
            const d1 = extract('第一希望') || extract('第1希望日')
            const d2 = extract('第二希望') || extract('第2希望日')
            const d3 = extract('第三希望') || extract('第3希望日')

            if (d1) date1 = d1
            if (d2) date2 = d2
            if (d3) date3 = d3
        }

        const emailSent = await emailService.sendTemplateEmail('reception_completed', student.contact_email, {
            name: student.full_name,
            date1,
            date2,
            date3
        })

        if (!emailSent) throw new Error('メール送信に失敗しました')

        // 4. Update Status to 'trial_pending'
        // This removes it from the "Inquiry" list
        await supabaseAdmin
            .from('students')
            .update({ status: 'trial_pending' })
            .eq('id', studentId)

        revalidatePath('/customers')
        revalidatePath('/admin/approvals')
        return { success: true }

    } catch (error: any) {
        console.error('Send Reception Email Error:', error)
        return { success: false, error: error.message }
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
