'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'
import { startOfMonth, endOfMonth, differenceInDays, format, addMonths } from 'date-fns'
import { emailService } from '@/lib/email'

import { formatStudentNames } from '@/lib/utils'

interface CreateLessonScheduleParams {
    coach_id: string
    student_id?: string | null
    lesson_master_id?: string | null
    start_time: string
    end_time: string
    title: string
    location?: string
    notes?: string
}


interface MonthlyUsageResult {
    currentTotal: number
    rollover: number
    effectiveLimit: number
}

async function calculateMonthlyUsage(
    supabaseAdmin: any,
    studentId: string,
    targetDate: Date,
    monthlyLimit: number,
    maxRollover: number
): Promise<MonthlyUsageResult> {
    // 1. Current Month Usage
    const start = startOfMonth(targetDate).toISOString()
    const end = endOfMonth(targetDate).toISOString()

    // Note: We count ALL lessons/schedules, including overage ones? 
    // Usually usage counts everything. The Limit determines if the NEXT one is overage.

    const { count: completed } = await supabaseAdmin
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('lesson_date', start)
        .lte('lesson_date', end)

    const { count: scheduled } = await supabaseAdmin
        .from('lesson_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('start_time', start)
        .lte('start_time', end)

    const currentTotal = (completed || 0) + (scheduled || 0)

    // 2. Previous Month Rollover calculation
    let rollover = 0
    if (monthlyLimit > 0 && maxRollover > 0) {
        const prevDate = addMonths(targetDate, -1)
        const prevStart = startOfMonth(prevDate).toISOString()
        const prevEnd = endOfMonth(prevDate).toISOString()

        const { count: prevCompleted } = await supabaseAdmin
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .gte('lesson_date', prevStart)
            .lte('lesson_date', prevEnd)

        const { count: prevScheduled } = await supabaseAdmin
            .from('lesson_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .gte('start_time', prevStart)
            .lte('start_time', prevEnd)

        const prevTotal = (prevCompleted || 0) + (prevScheduled || 0)

        // Calculate unused
        const unused = Math.max(0, monthlyLimit - prevTotal)
        rollover = Math.min(unused, maxRollover)
    }

    return {
        currentTotal,
        rollover,
        effectiveLimit: monthlyLimit + rollover
    }
}

export async function createLessonSchedule(params: CreateLessonScheduleParams) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Auth Check (Admin or Coach)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    let isOverage = false
    let billingStatus = 'pending'
    let billingScheduledAt: string | null = null
    let notificationSentAt: string | null = null
    let stripeInvoiceItemId: string | null = null
    let overagePrice = 0
    let studentNameForEmail = ''
    let priceReasonForEmail = ''

    try {
        // 2. Check Monthly Limit (Only if student is assigned)
        if (params.student_id) {
            const studentId = params.student_id
            const date = new Date(params.start_time)

            // Get Membership Limit (Use Admin Client)
            const { data: student, error: studentError } = await supabaseAdmin
                .from('students')
                .select(`
                    id, 
                    membership_type_id,
                    stripe_customer_id,
                    contact_email,
                    contact_email,
                    full_name,
                    second_student_name,
                    membership_types!students_membership_type_id_fkey (
                        monthly_lesson_limit,
                        max_rollover_limit,
                        fee,
                        name
                    )
                `)
                .eq('id', studentId)
                .single()

            if (studentError) {
                console.error('Student fetch error:', studentError)
            } else if (student && student.membership_types) {
                // @ts-ignore
                const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
                const limit = membership?.monthly_lesson_limit
                const maxRollover = membership?.max_rollover_limit || 0
                const membershipName = membership?.name

                // Logic: 
                // A. If limit > 0, check count. If count >= limit -> Overage.
                // B. If Membership includes '単発' -> Always Overage (Single Fee).
                // C. If limit == 0 and NOT Single? -> Overage (No plan).

                let checkOverage = false
                if (membershipName?.includes('単発')) {
                    checkOverage = true
                } else if (limit > 0) {
                    const { currentTotal, effectiveLimit } = await calculateMonthlyUsage(
                        supabaseAdmin,
                        studentId,
                        date,
                        limit,
                        maxRollover
                    )

                    if (currentTotal >= effectiveLimit) checkOverage = true
                }

                if (checkOverage) {
                    isOverage = true

                    // 3. Billing Logic
                    // Calculate Price regardless of Stripe ID (to save in DB)
                    // Fetch Lesson Master Price
                    if (params.lesson_master_id) {
                        const { data: lm } = await supabaseAdmin
                            .from('lesson_masters')
                            .select('unit_price')
                            .eq('id', params.lesson_master_id)
                            .single()
                        if (lm && lm.unit_price) {
                            overagePrice = lm.unit_price
                            console.log(`[CreateLesson] Using Lesson Master Price: ${overagePrice}`)
                        }
                    }

                    // Fallback
                    if (overagePrice === 0) {
                        if (membership?.fee && limit > 0) {
                            overagePrice = Math.floor(membership.fee / limit)
                        } else {
                            overagePrice = 8800
                        }
                        console.log(`[CreateLesson] Using Calculated/Fallback Price: ${overagePrice}`)
                    }

                    if (student.stripe_customer_id) {
                        // Define Terms
                        const isSingle = membershipName?.includes('単発')
                        const priceReason = isSingle
                            ? 'ご登録の会員プランに基づき、レッスン料をご請求させていただきます。'
                            : '月規定回数を超過しているため、追加レッスン料をご請求させていただきます。'
                        const itemDescription = isSingle
                            ? `レッスン料`
                            : `追加レッスン料`

                        // Capture for email
                        studentNameForEmail = formatStudentNames(student)
                        priceReasonForEmail = priceReason

                        // Schedule Dates
                        // Notice: LessonDate - 2 days @ 12:00
                        // Charge: LessonDate - 1 day @ 12:00
                        const lessonDate = new Date(params.start_time)
                        const noticeDate = new Date(lessonDate)
                        noticeDate.setDate(lessonDate.getDate() - 2)
                        noticeDate.setHours(12, 0, 0, 0)

                        const chargeDate = new Date(lessonDate)
                        chargeDate.setDate(lessonDate.getDate() - 1)
                        chargeDate.setHours(12, 0, 0, 0)

                        const now = new Date()

                        // A. Notice Logic (Still sent immediately if late booking)
                        if (now >= noticeDate) {
                            if (student.contact_email) {
                                try {
                                    await emailService.sendTemplateEmail(
                                        'schedule_overage_billing',
                                        student.contact_email,
                                        {
                                            name: formatStudentNames(student),
                                            amount: overagePrice.toLocaleString(),
                                            date: format(lessonDate, 'yyyy/MM/dd'),
                                            time: format(lessonDate, 'HH:mm'),
                                            title: params.title,
                                            reason: priceReason
                                        }
                                    )
                                    console.log(`[CreateLesson] Notice Email sent immediately to ${student.contact_email}`)
                                    notificationSentAt = new Date().toISOString()
                                } catch (e) {
                                    console.error('Email Send Error:', e)
                                }
                            }
                        }

                        // B. Billing Status Logic
                        // Always set to 'awaiting_approval' if overage.
                        billingStatus = 'awaiting_approval'
                        billingScheduledAt = chargeDate.toISOString()
                        console.log(`[CreateLesson] Overage Detected. Price: ${overagePrice}, Status: awaiting_approval`)

                        // [NEW] Send Admin Approval Request Email
                        const adminEmail = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

                        // We need the schedule ID for the link, but it's not inserted yet.
                        // Strategy: Insert first, then send email? No, function structure inserts later.
                        // We can't generate ID here. But we can send email AFTER insertion if successful.
                        // I will move this logic to AFTER insertion.
                    }
                }
            }
        }

        // 4. Insert Schedule
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('lesson_schedules')
            .insert({
                coach_id: params.coach_id,
                student_id: params.student_id ? params.student_id : null,
                lesson_master_id: params.lesson_master_id ? params.lesson_master_id : null,
                start_time: params.start_time,
                end_time: params.end_time,
                title: params.title,
                location: params.location,
                notes: params.notes,
                is_overage: isOverage,
                billing_status: billingStatus,
                billing_scheduled_at: billingScheduledAt,
                notification_sent_at: notificationSentAt,
                stripe_invoice_item_id: stripeInvoiceItemId,
                price: isOverage ? overagePrice : null
            })
            .select()
            .single()

        if (insertError) throw insertError

        // [NEW] Send Admin Email if awaiting_approval
        if (billingStatus === 'awaiting_approval' && inserted) {
            const adminEmail = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            if (adminEmail) {
                // Formatting
                const lessonDate = new Date(params.start_time)
                const formattedDate = format(lessonDate, 'yyyy/MM/dd')
                const formattedTime = format(lessonDate, 'HH:mm')

                try {
                    await emailService.sendTemplateEmail(
                        'admin_billing_approval_request',
                        adminEmail,
                        {
                            student_name: studentNameForEmail || '生徒',
                            date: formattedDate,
                            time: formattedTime,
                            amount: overagePrice.toLocaleString() + '円',
                            reason: priceReasonForEmail || '追加請求',
                            approval_url: `${appUrl}/admin/billing?approve_id=${inserted.id}`
                        }
                    )
                    console.log(`[CreateLesson] Admin Approval Request sent to ${adminEmail}`)
                } catch (e) {
                    console.error('Admin Email Send Error:', e)
                }
            }
        }

        revalidatePath('/coach/schedule')
        revalidatePath('/admin/schedule')
        revalidatePath('/admin/billing')

        return { success: true, data: inserted, isOverage }

    } catch (error: any) {
        console.error('createLessonSchedule Error:', error)
        return { success: false, error: error.message }
    }
}

export async function approveLessonSchedule(scheduleId: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Admin Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
        return { success: false, error: 'Permission denied' }
    }

    try {
        const { error } = await supabaseAdmin
            .from('lesson_schedules')
            .update({ billing_status: 'approved' })
            .eq('id', scheduleId)

        if (error) throw error

        revalidatePath('/admin/billing')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function rejectLessonSchedule(scheduleId: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Admin Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
        return { success: false, error: 'Permission denied' }
    }

    try {
        // Change status to 'cancelled' or null?
        // If we reject billing, does it mean we cancel the lesson? Or just billing?
        // Usually "Reject Billing" -> "Cancelled" status for billing, but lesson might remain?
        // Let's set billing_status to 'cancelled_billing' (custom) or just null if we want to remove billing requirement.
        // But better to keep trace. 'cancelled' seems appropriate if the enum allows string. 
        // Our billing_status is text, so it's fine.

        const { error } = await supabaseAdmin
            .from('lesson_schedules')
            .update({
                billing_status: 'cancelled',
                is_overage: false, // Optionally remove overage flag if manual override
                price: null
            })
            .eq('id', scheduleId)

        if (error) throw error

        revalidatePath('/admin/billing')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function checkStudentLessonStatus(studentId: string, dateStr: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const date = new Date(dateStr)
        const start = startOfMonth(date).toISOString()
        const end = endOfMonth(date).toISOString()

        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select(`
                id, 
                membership_types!students_membership_type_id_fkey (
                    name,
                    id,
                    default_lesson_master_id,
                    monthly_lesson_limit,
                    max_rollover_limit,
                    default_lesson:lesson_masters!default_lesson_master_id (
                        id,
                        name,
                        unit_price
                    ),
                    membership_type_lessons (
                        lesson_master_id,
                        lesson_masters (
                            id,
                            name,
                            unit_price
                        )
                    )
                )
            `).eq('id', studentId)
            .single()

        if (studentError || !student) throw new Error('Student not found')

        console.log(`[CheckStatus] Student ${studentId} membership data:`, student.membership_types)

        // @ts-ignore
        const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
        const limit = membership?.monthly_lesson_limit || 0
        const maxRollover = membership?.max_rollover_limit || 0
        const membershipName = membership?.name

        // Count
        const { currentTotal, effectiveLimit, rollover } = await calculateMonthlyUsage(
            supabaseAdmin,
            studentId,
            date,
            limit,
            maxRollover
        )

        // Logic Update:
        // 1. If active limit reached: Overage
        // 2. If 'Single Plan' or No Plan: Always Overage (Show selector)
        let isOverage = false
        if (!membership || !limit || limit === 0 || (membershipName && membershipName.includes('単発'))) {
            isOverage = true
        } else if (limit > 0 && currentTotal >= effectiveLimit) {
            isOverage = true
        }

        // Extract active lessons for this membership
        // @ts-ignore
        const linkedLessons = membership?.membership_type_lessons?.map((mtl: any) => mtl.lesson_masters) || []

        let availableLessons = linkedLessons.filter((l: any) => l) // filter nulls

        // Ensure default lesson is included if exists
        // @ts-ignore
        const defaultLesson = membership?.default_lesson
        // @ts-ignore
        if (defaultLesson && !availableLessons.find(l => l.id === defaultLesson.id)) {
            availableLessons.push(defaultLesson)
        }

        // Sort by name for consistency
        availableLessons.sort((a: any, b: any) => a.name.localeCompare(b.name))

        return {
            success: true,
            isOverage,
            limit: effectiveLimit,
            baseLimit: limit,
            rollover,
            count: currentTotal,
            membershipName,
            defaultLessonId: membership?.default_lesson_master_id,
            availableLessons
        }

    } catch (error: any) {
        console.error('checkStatus Error:', error)
        return { success: false, error: error.message }
    }
}
