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
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // 2. Validate Input
    const parsed = formSchema.safeParse(values)
    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const firstError = Object.values(errors).flat()[0]
        return { success: false, error: firstError || '入力内容が正しくありません' }
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
        // 3. Insert into Supabase (Base columns only to match current DB schema)
        // Note: feedback_good, feedback_next, coach_comment, and billing_price 
        // seem to be missing from the current database schema cache.
        // We only include columns that are confirmed to exist.
        const { data: insertedLesson, error: dbError } = await supabase.from('lessons').insert({
            coach_id: user.id,
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date, // Already ISO string
            location: data.location,
            menu_description: data.menu_description || '',
            price: data.price,
            // billing_price: billingPrice, // Temporarily disabled due to schema mismatch
        }).select('id').single()

        if (dbError) {
            console.error('Database Insertion Error:', dbError)
            throw new Error(`データベース保存エラー: ${dbError.message}`)
        }

        const newLessonId = insertedLesson?.id


        // 4. 管理者通知（メール設定のlesson_report_sentトリガー経由）
        try {
            const toAddress = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER

            if (toAddress) {
                // レッスン名・コーチ名を取得
                const { data: lessonMaster } = await supabase
                    .from('lesson_masters')
                    .select('name')
                    .eq('id', data.lesson_master_id)
                    .single()

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()

                const lessonName = lessonMaster?.name || '不明なレッスン'
                const coachName = profile?.full_name || 'コーチ'
                const dateStr = new Date(data.lesson_date).toLocaleDateString('ja-JP', {
                    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                })

                // lesson_report_sentトリガー経由で送信
                // テンプレート変数として以下が利用可能:
                // {{coach_name}} {{student_name}} {{lesson_date}} {{location}} {{lesson_type}} {{price}} {{description}}
                await emailService.sendTriggerEmail('lesson_report_sent', toAddress, {
                    coach_name: coachName,
                    student_name: data.student_name,
                    lesson_date: dateStr,
                    location: data.location,
                    lesson_type: lessonName,
                    price: data.price.toLocaleString() + '円',
                    description: data.menu_description || '(なし)',
                })
            }
        } catch (emailError) {
            console.error('Error sending report notification email:', emailError)
            // メール失敗しても処理を続行
        }

        revalidatePath('/coach')
        return { success: true, lessonId: newLessonId }


    } catch (error: any) {
        console.error('Submission Error:', error)
        return { success: false, error: error.message || 'データ保存中にエラーが発生しました' }
    }
}

export async function deleteLessonReport(lessonId: string) {
    const supabase = await createClient()

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
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

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
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
    feedback_good: z.string().optional(),
    feedback_next: z.string().optional(),
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
            p_location: data.location,
            p_feedback_good: data.feedback_good || '',
            p_feedback_next: data.feedback_next || '',
            p_coach_comment: ''
        })

        if (error) throw error

        // 3. 管理者通知（メール設定のlesson_report_sentトリガー経由）
        const toAddress = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER

        if (toAddress) {
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
            const dateStr = new Date(data.lesson_date).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
            })

            // lesson_report_sentトリガー経由で送信
            await emailService.sendTriggerEmail('lesson_report_sent', toAddress, {
                coach_name: coachName,
                student_name: data.student_name,
                lesson_date: dateStr,
                location: data.location,
                lesson_type: lessonName,
                price: data.price.toLocaleString() + '円',
                description: data.menu_description || '(なし)',
            })
        }

        return { success: true }
    } catch (error: any) {
        console.error('Public Submission Error:', error)
        return { success: false, error: '送信に失敗しました' }
    }
}

export async function getStudentsForCoachPublicAction(coachId: string) {
    // Use the admin client to bypass RLS since public (anon) users cannot read the students table
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()

    // Fetch direct associations
    const { data: directData, error: directError } = await supabaseAdmin
        .from('students')
        .select(`
            id, 
            full_name, 
            membership_types!students_membership_type_id_fkey ( default_lesson_master_id )
        `)
        .eq('coach_id', coachId)

    // Fetch associations via junction table
    const { data: junctionData, error: junctionError } = await supabaseAdmin
        .from('student_coaches')
        .select(`
            students (
                id, 
                full_name, 
                membership_types!students_membership_type_id_fkey ( default_lesson_master_id )
            )
        `)
        .eq('coach_id', coachId)

    if (directError || junctionError) {
        console.error('Error fetching students server action:', directError || junctionError)
        return { success: false, data: [] }
    }

    type StudentData = {
        id: string;
        full_name: string;
        default_master_id?: string;
    }

    const extractMembership = (s: any): StudentData => {
        const membership = Array.isArray(s.membership_types) ? s.membership_types[0] : s.membership_types;
        return {
            id: s.id,
            full_name: s.full_name,
            default_master_id: membership?.default_lesson_master_id
        }
    }

    const combined: StudentData[] = (directData || []).map(extractMembership)

    if (junctionData) {
        for (const item of junctionData) {
            // relationship is many-to-one, returning a single object via junction
            const student = item.students as any
            if (student && !combined.find(s => s.id === student.id)) {
                combined.push(extractMembership(student))
            }
        }
    }

    // sort by full_name
    combined.sort((a, b) => a.full_name.localeCompare(b.full_name))

    return { success: true, data: combined }
}

