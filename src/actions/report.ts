'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { emailService } from '@/lib/email'
import { stripe } from '@/lib/stripe'


const formSchema = z.object({
    student_id: z.string().optional(),
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.string(), // ISO string from frontend
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    feedback_good: z.string().optional(),
    feedback_next: z.string().optional(),
    coach_comment: z.string().optional(),
    price: z.number().min(0),
    billing_price: z.number().min(0).optional(),
})

type FormValues = z.infer<typeof formSchema>

export async function submitLessonReport(values: FormValues) {
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // 2. Validate Input
    const parsed = formSchema.safeParse(values)
    if (!parsed.success) {
        return { success: false, error: 'Invalid input', details: parsed.error.flatten() }
    }
    const data = parsed.data

    // 2.5 Determine Billing Price
    let billingPrice = data.price
    if (data.student_id) {
        const { data: student } = await supabase
            .from('students')
            .select('membership_types ( fee )')
            .eq('id', data.student_id)
            .single()

        const membership = Array.isArray(student?.membership_types)
            ? student.membership_types[0]
            : student?.membership_types

        // If Monthly Member (Fee > 0), Billing Price is 0 (Included in Sub)
        if (membership && membership.fee > 0) {
            billingPrice = 0
        }
    }

    try {
        // 3. Insert into Supabase
        const { error: dbError } = await supabase.from('lessons').insert({
            coach_id: user.id,
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date, // Already ISO string
            location: data.location,
            menu_description: data.menu_description || '',
            feedback_good: data.feedback_good || '',
            feedback_next: data.feedback_next || '',
            coach_comment: data.coach_comment || '',
            price: data.price,
            billing_price: billingPrice,
        })

        if (dbError) throw dbError

        // 4. Send Email Notification
        const toAddress = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER

        if (toAddress) {
            // Fetch lesson name for better message
            const { data: lessonMaster } = await supabase
                .from('lesson_masters')
                .select('name')
                .eq('id', data.lesson_master_id)
                .single()

            // Get Coach Name (Profile)
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single()

            const lessonName = lessonMaster?.name || '不明なレッスン'
            const coachName = profile?.full_name || 'コーチ'
            const dateStr = new Date(data.lesson_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })

            // Construct Email Content
            const subject = `【レッスン報告】${data.student_name}様 (${dateStr})`
            const emailBody = `
レッスン報告が提出されました。

■基本情報
担当コーチ: ${coachName}
生徒名: ${data.student_name}
日時: ${dateStr}
場所: ${data.location}

■レッスン内容
種類: ${lessonName}
金額: ${data.price.toLocaleString()}円

■記録・メモ
${data.menu_description || '(なし)'}

--------------------------------------------------
Swim Partners Manager
            `.trim()

            await emailService.sendEmail({
                to: toAddress,
                subject: subject,
                text: emailBody,
            })
        } else {
            console.warn('Report email not sent: No recipient address configured (REPORT_NOTIFICATION_EMAIL or SMTP_USER)')
        }

        revalidatePath('/coach')
        return { success: true }

    } catch (error) {
        console.error('Submission Error:', error)
        return { success: false, error: 'Failed to submit report' }
    }
}

export async function deleteLessonReport(lessonId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Admin Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return { success: false, error: '権限がありません' }
    }

    try {
        // 1. Check for Stripe Invoice Item
        const { data: lesson } = await supabase
            .from('lessons')
            .select('stripe_invoice_item_id')
            .eq('id', lessonId)
            .single()

        if (lesson?.stripe_invoice_item_id) {
            try {
                await stripe.invoiceItems.del(lesson.stripe_invoice_item_id)
            } catch (stripeError: any) {
                console.error('Stripe Delete Error:', stripeError)
                // If it's not "resource_missing", it might be important (e.g. frozen invoice).
                // Throwing ensures we don't delete the local record if we can't delete the charge.
                if (stripeError.code !== 'resource_missing') {
                    throw new Error('Stripe請求項目の削除に失敗しました（すでに請求書が確定している可能性があります）')
                }
            }
        }

        const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
        if (error) throw error

        revalidatePath('/admin/reports')
        return { success: true }
    } catch (error: any) {
        console.error('Delete Error:', error)
        return { success: false, error: error.message || '削除に失敗しました' }
    }
}


export async function updateLessonReport(lessonId: string, values: FormValues) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Admin Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return { success: false, error: '権限がありません' }
    }

    const parsed = formSchema.safeParse(values)
    if (!parsed.success) return { success: false, error: 'Invalid input' }
    const data = parsed.data

    // Recalculate billing price only if not provided
    let billingPrice = data.billing_price

    if (billingPrice === undefined) {
        billingPrice = data.price
        if (data.student_id) {
            const { data: student } = await supabase
                .from('students')
                .select('membership_types ( fee )')
                .eq('id', data.student_id)
                .single()

            const membership = Array.isArray(student?.membership_types)
                ? student.membership_types[0]
                : student?.membership_types

            if (membership && membership.fee > 0) {
                billingPrice = 0
            }
        }
    }

    try {
        console.log('Updating lesson report:', lessonId, {
            lesson_master_id: data.lesson_master_id,
            price: data.price,
            billing_price: billingPrice
        })

        const { error } = await supabase.from('lessons').update({
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date,
            location: data.location,
            menu_description: data.menu_description || '',
            feedback_good: data.feedback_good || '',
            feedback_next: data.feedback_next || '',
            price: data.price,
            billing_price: billingPrice
        }).eq('id', lessonId)

        if (error) {
            console.error('Supabase Update Error:', error)
            throw error
        }

        revalidatePath('/admin/reports')
        return { success: true }
    } catch (error: any) {
        console.error('Update Error:', error)
        return { success: false, error: '更新に失敗しました' }
    }
}

const publicFormSchema = z.object({
    coach_id: z.string().min(1, 'コーチを選択してください'),
    student_id: z.string().optional(),
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.string(), // ISO string
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    price: z.number().min(0),
})

type PublicFormValues = z.infer<typeof publicFormSchema>

export async function submitPublicLessonReport(values: PublicFormValues) {
    const supabase = await createClient()

    // 1. Validate Input
    const parsed = publicFormSchema.safeParse(values)
    if (!parsed.success) {
        return { success: false, error: '入力内容が正しくありません', details: parsed.error.flatten() }
    }
    const data = parsed.data

    try {
        // 2. Insert into Supabase using Public RPC
        const { data: newId, error } = await supabase.rpc('submit_lesson_report_public', {
            p_coach_id: data.coach_id,
            p_student_id: data.student_id || null,
            p_student_name: data.student_name,
            p_lesson_date: data.lesson_date,
            p_description: data.menu_description || '',
            p_lesson_master_id: data.lesson_master_id,
            p_price: data.price,
            p_location: data.location
        })

        if (error) throw error

        // 3. Send Email Notification
        const toAddress = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER

        if (toAddress) {
            // Fetch names for email
            const { data: lessonMaster } = await supabase
                .from('lesson_masters')
                .select('name')
                .eq('id', data.lesson_master_id)
                .single()

            const { data: coach } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', data.coach_id)
                .single()

            const lessonName = lessonMaster?.name || '不明なレッスン'
            const coachName = coach?.full_name || 'コーチ'
            const dateStr = new Date(data.lesson_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })

            // Construct Email Content
            const subject = `【レッスン報告】${data.student_name}様 (${dateStr})`
            const emailBody = `
レッスン報告が提出されました (Public)。

■基本情報
担当コーチ: ${coachName}
生徒名: ${data.student_name}
日時: ${dateStr}
場所: ${data.location}

■レッスン内容
種類: ${lessonName}
金額: ${data.price.toLocaleString()}円

■記録・メモ
${data.menu_description || '(なし)'}

--------------------------------------------------
Swim Partners Manager
            `.trim()

            await emailService.sendEmail({
                to: toAddress,
                subject: subject,
                text: emailBody,
            })
        }

        return { success: true }
    } catch (error: any) {
        console.error('Public Submission Error:', error)
        return { success: false, error: '送信に失敗しました' }
    }
}

