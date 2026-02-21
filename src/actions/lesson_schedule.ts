'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'
import { startOfMonth, endOfMonth, differenceInDays, format, addMonths } from 'date-fns'
import { emailService } from '@/lib/email'
import { processLessonBilling } from '@/actions/billing'
import { createStripeInvoiceItemOnly } from '@/actions/stripe'

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
    maxRollover: number,
    membershipStartedAt?: string | null,
    createdAt?: string | null // [NEW] Fallback
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

        // [NEW] Logic: If previous month is BEFORE membership start, No Rollover
        // [NEW] Logic: If previous month is BEFORE membership start, No Rollover
        let canHaveRollover = true
        if (membershipStartedAt) {
            // Fix: Compare in JST to handle "1st of Month" joiners correctly
            // (Server is UTC, so 1st 00:00 JST is PrevMonth 15:00 UTC)

            const JST_OFFSET = 9 * 60 * 60 * 1000

            // 1. Shift timestamps to JST (as UTC scalar)
            const startUtcTime = new Date(membershipStartedAt).getTime()
            const startJstTime = startUtcTime + JST_OFFSET
            const startJstDate = new Date(startJstTime) // Treated as UTC-container for JST values

            const targetUtcTime = targetDate.getTime()
            const targetJstTime = targetUtcTime + JST_OFFSET
            const targetJstDate = new Date(targetJstTime)

            // 2. Compare Year-Month
            const startMonthCode = startJstDate.getUTCFullYear() * 100 + startJstDate.getUTCMonth()
            const targetMonthCode = targetJstDate.getUTCFullYear() * 100 + targetJstDate.getUTCMonth()

            // If Start Month is SAME as or AFTER Target Month -> No Rollover (Joined this month or later)
            if (startMonthCode >= targetMonthCode) {
                canHaveRollover = false
                console.log(`[CalcUsage] No rollover: StartMonth(JST) ${startMonthCode} >= TargetMonth(JST) ${targetMonthCode}`)
            } else {
                console.log(`[CalcUsage] Rollover ALLOWED: StartMonth(JST) ${startMonthCode} < TargetMonth(JST) ${targetMonthCode}`)
            }
        }

        console.log(`[CalcUsage] canHaveRollover: ${canHaveRollover}, StartedAt: ${membershipStartedAt}`)

        if (canHaveRollover) {
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
                    membership_started_at,
                    created_at,
                    full_name,
                    second_student_name,
                    status,
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
            } else if (student) {
                // @ts-ignore
                const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
                const limit = membership?.monthly_lesson_limit
                const maxRollover = membership?.max_rollover_limit || 0
                const membershipName = membership?.name

                // Logic: 
                // A. If limit > 0, check count. If count >= limit -> Overage.
                // B. If Membership includes '単発' -> Always Overage (Single Fee).
                // C. If limit == 0 and NOT Single? -> Overage (No plan).
                // [NEW] D. If Student has NO membership (e.g. Trial or Deleted) -> Overage (Single Fee).

                let checkOverage = false

                // 2.5 Handle Missing Membership explicitly
                // If membership is null/undefined, treat as "No Plan" (Overage = true)
                if (!membership) {
                    checkOverage = true
                    console.log(`[CreateLesson] Student ${studentId} has NO membership. Defaulting to Overage.`)
                }
                else if (membershipName?.includes('単発')) {
                    checkOverage = true
                } else if (limit > 0) {
                    const { currentTotal, effectiveLimit } = await calculateMonthlyUsage(
                        supabaseAdmin,
                        studentId,
                        date,
                        limit,
                        maxRollover,
                        student.membership_started_at,
                        student.created_at
                    )

                    if (currentTotal >= effectiveLimit) checkOverage = true
                } else {
                    // Limit is 0 or undefined, but not '単発' explicit name?
                    // Treat as Overage if limit is 0.
                    if (!limit || limit === 0) {
                        checkOverage = true
                    }
                }

                if (checkOverage) {
                    isOverage = true

                    // 3. Billing Logic (Immediate)
                    // Calculate Price
                    if (params.lesson_master_id) {
                        const { data: lm } = await supabaseAdmin
                            .from('lesson_masters')
                            .select('unit_price')
                            .eq('id', params.lesson_master_id)
                            .single()
                        if (lm && lm.unit_price) {
                            overagePrice = lm.unit_price
                        }
                    }

                    if (overagePrice === 0) {
                        // Fallback price logic
                        if (membership?.fee && limit > 0) {
                            overagePrice = Math.floor(membership.fee / limit)
                        } else {
                            // Default fallback if no membership fee or limit
                            overagePrice = 8800
                        }
                    }

                    // Determine Billing Status
                    billingStatus = 'awaiting_approval'
                    console.log(`[CreateLesson] Overage Detected. Price: ${overagePrice}. Status: ${billingStatus}`)
                } // End if (checkOverage)

                // 4. Insert Schedule (Always)
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

                revalidatePath('/coach/schedule')
                revalidatePath('/admin/schedule')
                revalidatePath('/admin/billing')

                const isTrial = (student.status === 'trial_pending' || student.status === 'trial_confirmed') && !membership

                return { success: true, data: inserted, isOverage, isTrial }

            } else {
                // Should not happen if student_id is valid, but handle case where student not found
                return { success: false, error: 'Student not found or system error' }
            }
        } else {
            // No student_id provided (e.g. blocking out time?)
            // If logic allows schedule without student:
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('lesson_schedules')
                .insert({
                    coach_id: params.coach_id,
                    student_id: null,
                    lesson_master_id: null,
                    start_time: params.start_time,
                    end_time: params.end_time,
                    title: params.title,
                    location: params.location,
                    notes: params.notes,
                    is_overage: false,
                    billing_status: 'pending',
                    price: null
                })
                .select()
                .single()

            if (insertError) throw insertError

            revalidatePath('/coach/schedule')
            return { success: true, data: inserted }
        }
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


        console.log('[ApproveLesson] Starting approval for:', scheduleId)
        console.log('[ApproveLesson] Type of ID:', typeof scheduleId)
        console.log('[ApproveLesson] Has Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

        // Debug: Check if ANY schedule exists
        const { count, error: countError } = await supabaseAdmin.from('lesson_schedules').select('*', { count: 'exact', head: true })


        console.log('[ApproveLesson] Total Schedules in DB:', count)
        if (countError) console.error('[ApproveLesson] Count Error:', countError)

        // 1. Fetch Schedule (Raw)
        const { data: scheduleRaw, error: scheduleError } = await supabaseAdmin
            .from('lesson_schedules')
            .select('*')
            .eq('id', scheduleId)
            .single()

        if (scheduleError || !scheduleRaw) {
            // debugLog removed
            throw new Error(`Schedule not found: ${scheduleError?.message || 'No data'}`)
        }



        // 2. Fetch Student Details
        // We know student_id exists on scheduleRaw
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('id, stripe_customer_id, contact_email, full_name, second_student_name, membership_type_id, next_membership_type_id')
            .eq('id', scheduleRaw.student_id)
            .single()

        if (studentError || !student) {

            return { success: false, error: 'Student not found or missing details' }
        }

        if (!student.stripe_customer_id) {

            return { success: false, error: 'Stripe Customer ID not found' }
        }

        // Combine for existing logic compatibility
        const schedule = {
            ...scheduleRaw,
            student
        }
        // 2. Check Timing

        // [NEW] If student has NO membership (New/Waiting), Force Immediate Billing
        // UNLESS they have a reservation (next_membership_type_id), then Deferred Billing
        if (!student.membership_type_id) {
            if (student.next_membership_type_id) {
                console.log('[ApproveLesson] User has reservation. Creating Deferred Invoice Item.')
                const billingResult = await createStripeInvoiceItemOnly(schedule.id)
                if (!billingResult.success) {
                    return { success: false, error: billingResult.error }
                }
                return { success: true, message: '承認完了：次月の月会費と合算して請求されます' }
            }

            console.log('[ApproveLesson] User has no active membership. Forcing Immediate Billing.')
            const billingResult = await processLessonBilling(schedule.id)
            if (!billingResult.success) {
                return { success: false, error: billingResult.error }
            }
            return { success: true }
        }

        // Deadline: Day before lesson at 12:00 JST
        // Convert start_time (UTC) to a Date object
        const lessonDate = new Date(schedule.start_time)

        // Calculate "Day Before"
        const billingDeadline = new Date(lessonDate)
        billingDeadline.setDate(billingDeadline.getDate() - 1)

        // Set to 12:00 JST. 
        // Logic: 12:00 JST is 03:00 UTC.
        billingDeadline.setUTCHours(3, 0, 0, 0)

        const now = new Date()

        console.log('[ApproveLesson] Now (UTC):', now.toISOString())
        console.log('[ApproveLesson] Deadline (UTC):', billingDeadline.toISOString())

        if (now >= billingDeadline) {
            // Late: Bill Immediately
            console.log('[ApproveLesson] Deadline passed. Executing immediate billing.')
            return await processLessonBilling(scheduleId)
        } else {
            // Early: Set to 'approved' (Future Billing)
            console.log('[ApproveLesson] Before deadline. Setting status to approved (future billing).')

            const { error: updateError } = await supabaseAdmin
                .from('lesson_schedules')
                .update({
                    billing_status: 'approved', // Waiting for Cron
                })
                .eq('id', scheduleId)

            if (updateError) throw updateError

            revalidatePath('/admin/billing')
            return { success: true, message: '承認完了：請求は前日12時に自動実行されます' }
        }

    } catch (error: any) {
        console.error('[ApproveLesson] Error:', error)
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
        // [MODIFIED] User requested to DELETE the schedule if rejected.
        const { error } = await supabaseAdmin
            .from('lesson_schedules')
            .delete()
            .eq('id', scheduleId)

        if (error) throw error

        revalidatePath('/admin/billing')
        // Also revalidate schedule pages since it's gone
        revalidatePath('/admin/schedule')
        revalidatePath('/coach/schedule')

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
                status,
                membership_started_at,
                created_at,
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

        console.log(`[CheckStatus] Student: ${student.id} (${studentId}), Status: ${student.status}`)

        // @ts-ignore
        const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
        const limit = membership?.monthly_lesson_limit || 0
        const maxRollover = membership?.max_rollover_limit || 0
        let membershipName = membership?.name

        // Count
        const { currentTotal, effectiveLimit, rollover } = await calculateMonthlyUsage(
            supabaseAdmin,
            studentId,
            date,
            limit,
            maxRollover,
            student.membership_started_at, // Pass start date
            student.created_at // Pass created_at
        )

        let isOverage = false
        let availableLessons: any[] = []

        // [NEW] Trial Logic: If student is 'trial_pending' OR 'trial_confirmed' (and no membership), return ONLY Trial Lessons
        // Note: 'trial_confirmed' happens after they book, but if they cancel and re-book, they might still be 'trial_confirmed' but no membership.
        if ((student.status === 'trial_pending' || student.status === 'trial_confirmed') && !membership) {
            console.log(`[CheckStatus] Student is ${student.status}. Fetching Trial Lessons only.`)

            // Fetch lessons with "体験" in name
            const { data: trialLessons, error: trialError } = await supabaseAdmin
                .from('lesson_masters')
                .select('id, name, unit_price')
                .ilike('name', '%体験%')
                .eq('active', true)

            if (trialError) {
                console.error('[CheckStatus] Error fetching trial lessons:', trialError)
            } else {
                console.log(`[CheckStatus] Found ${trialLessons?.length} trial lessons`)
            }

            availableLessons = trialLessons || []
            membershipName = '体験利用' // Override for UI display

            // Trial lessons must be billed (even if free/special price), so we treat them as "Overage"
            // to trigger the Billing Flow (which will be set to 'awaiting_approval' in createLessonSchedule).
            isOverage = true

        } else {
            // Normal Logic (Existing)

            // Logic Update:
            // 1. If active limit reached: Overage
            // 2. If 'Single Plan' or No Plan: Always Overage (Show selector)
            // [NEW] 3. If target date is BEFORE membership_started_at: Always Overage (Single Ticket behavior)

            // Check Start Date
            if (student.membership_started_at) {
                const startDate = new Date(student.membership_started_at)
                // Normalize to start of day? Or exact time? Usually start of day.
                // Let's be lenient: if lesson date is strictly before start date (day level?)
                // If start date is "2024-02-01", and lesson is "2024-01-31", it is overage.
                if (date < startDate) {
                    // But wait, date is the lesson start time (e.g. 10:00).
                    // If start date is 2024-02-01 00:00:00, then 2024-01-31 is less.
                    isOverage = true
                    console.log(`[CheckStatus] Pre-membership lesson. Date: ${date.toISOString()}, Start: ${startDate.toISOString()}`)
                }
            }

            if (!isOverage) {
                if (!membership || !limit || limit === 0 || (membershipName && membershipName.includes('単発'))) {
                    isOverage = true
                } else if (limit > 0 && currentTotal >= effectiveLimit) {
                    isOverage = true
                }
            }

            // Extract active lessons for this membership
            // @ts-ignore
            const linkedLessons = membership?.membership_type_lessons?.map((mtl: any) => mtl.lesson_masters) || []

            availableLessons = linkedLessons.filter((l: any) => l) // filter nulls

            if (availableLessons.length === 0 && !membership) {
                // [NEW] If NO membership and NO linked lessons, show ALL active lessons
                console.log(`[CheckStatus] No membership found for student ${studentId}. Fetching all active lessons.`)
                const { data: allLessons } = await supabaseAdmin
                    .from('lesson_masters')
                    .select('id, name, unit_price')
                    .eq('active', true)
                    .order('display_order', { ascending: true })

                availableLessons = allLessons || []
            } else {
                // Ensure default lesson is included if exists
                // @ts-ignore
                const defaultLesson = membership?.default_lesson
                // @ts-ignore
                if (defaultLesson && !availableLessons.find(l => l.id === defaultLesson.id)) {
                    availableLessons.push(defaultLesson)
                }

                // Sort by name for consistency
                availableLessons.sort((a: any, b: any) => a.name.localeCompare(b.name))
            }
        }

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

export async function approveLessonScheduleManually(scheduleId: string) {
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
        console.log('[ApproveManually] Updating to paid status:', scheduleId)

        const { error } = await supabaseAdmin
            .from('lesson_schedules')
            .update({
                billing_status: 'paid',
                payment_intent_id: 'manual_approval', // Track that it was manual
                notes: `[手動承認] ${new Date().toLocaleString('ja-JP')} に管理者により手動で決済済みに更新されました。`
            })
            .eq('id', scheduleId)

        if (error) throw error

        revalidatePath('/admin/billing')
        return { success: true }
    } catch (error: any) {
        console.error('[ApproveManually] Error:', error)
        return { success: false, error: error.message }
    }
}
