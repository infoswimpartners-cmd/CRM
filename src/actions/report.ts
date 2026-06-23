'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { emailService } from '@/lib/email'
import { stripe } from '@/lib/stripe'
import { calculateCoachRate, LessonData } from '@/lib/reward-system'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function getCalculatedLessonAmounts(
    supabaseAdmin: any,
    coachId: string,
    studentId: string | null | undefined,
    lessonMasterId: string,
    lessonDate: string,
    location: string,
    attendanceType: string
) {
    // 1. コーチの情報を取得
    const { data: coachProfile } = await supabaseAdmin
        .from('profiles')
        .select('role, override_coach_rank, distant_reward_fee')
        .eq('id', coachId)
        .single()

    // 2. 施設情報を取得
    const { data: facility } = await supabaseAdmin
        .from('facilities')
        .select('id, is_facility_fee_applied')
        .eq('name', location)
        .maybeSingle()

    const facilityId = facility?.id || null
    const facilityFee = facility?.is_facility_fee_applied ? 1500 : 0

    // 3. レッスンマスタの取得
    const { data: master } = await supabaseAdmin
        .from('lesson_masters')
        .select('id, unit_price, pair_unit_price, is_trial')
        .eq('id', lessonMasterId)
        .single()

    if (!master) {
        throw new Error('指定されたレッスンマスタが見つかりません')
    }

    // 4. 生徒情報およびプランコーチ報酬の取得
    let studentInfo: any = null
    let customRewardPrice: number | null = null
    let planBaseRewardPrice: number | null = null

    if (studentId) {
        const { data: student } = await supabaseAdmin
            .from('students')
            .select(`
                id,
                apply_pair_pricing,
                is_two_person_lesson,
                is_default_distant_option,
                membership_type_id
            `)
            .eq('id', studentId)
            .single()

        studentInfo = student

        const isSingleAttendance = attendanceType !== 'both' && !!attendanceType
        const isPairStudent = !!student?.is_two_person_lesson

        if (student?.membership_type_id) {
            const { data: config } = await supabaseAdmin
                .from('membership_type_lessons')
                .select('reward_price')
                .eq('membership_type_id', student.membership_type_id)
                .eq('lesson_master_id', lessonMasterId)
                .maybeSingle()

            if (config && config.reward_price !== null && config.reward_price !== undefined) {
                // ペア受講対象で2名出席（both）の場合のみ、固定のカスタム報酬としてそのまま適用する（レートは掛けない）
                const isPairBothAttendance = isPairStudent && !isSingleAttendance
                if (isPairBothAttendance) {
                    customRewardPrice = config.reward_price
                } else {
                    // ペア受講の1名出席、または通常の通常受講生の場合は、プラン報酬設定額にコーチレートを適用して計算する
                    planBaseRewardPrice = config.reward_price
                }
            }
        }
    }

    // 5. コーチの適用レート計算
    let rate = 0.50
    const referenceDate = new Date(lessonDate)
    const rankStart = startOfMonth(subMonths(referenceDate, 3))
    const rankEnd = endOfMonth(subMonths(referenceDate, 1))

    if (coachProfile?.role === 'admin' || coachProfile?.role === 'owner') {
        rate = 1.0
    } else {
        // 過去3ヶ月の実績をロード
        const { data: pastLessons } = await supabaseAdmin
            .from('lessons')
            .select('coach_id, lesson_date')
            .eq('coach_id', coachId)
            .gte('lesson_date', rankStart.toISOString())
            .lte('lesson_date', rankEnd.toISOString())

        rate = calculateCoachRate(
            coachId,
            (pastLessons as any) || [],
            referenceDate,
            coachProfile?.override_coach_rank
        )
    }

    // 6. 基本受講料（base_price）の決定
    let basePrice = master.unit_price
    const isPair = !!studentInfo?.is_two_person_lesson && (attendanceType === 'both' || !attendanceType)
    const applyPairPrice = !!studentInfo?.apply_pair_pricing && isPair
    if (applyPairPrice && master.pair_unit_price) {
        basePrice = master.pair_unit_price
    }

    // 7. 基本報酬（base_reward）の決定
    let baseReward = 0
    if (coachProfile?.role === 'admin' || coachProfile?.role === 'owner') {
        baseReward = basePrice + facilityFee
    } else if (master.is_trial) {
        // 体験レッスン
        if (rate === 1.0) {
            baseReward = basePrice
        } else if (Math.abs(rate - 0.7000001) < 0.00000001) {
            baseReward = 5000 // trial_special
        } else {
            baseReward = 4500 // trial_standard
        }
    } else if (customRewardPrice !== null) {
        // プランコーチ報酬を優先適用（2名受講時）
        baseReward = customRewardPrice
    } else if (planBaseRewardPrice !== null) {
        // 1名受講のときはプラン報酬設定額にコーチの報酬率を適用する
        baseReward = Math.floor(planBaseRewardPrice * rate)
    } else {
        baseReward = Math.floor(basePrice * rate)
    }

    // ペアレッスン手当 (通常レッスンかつ2人出席時のみ)
    if (studentInfo?.is_two_person_lesson && !master.is_trial && (attendanceType === 'both' || !attendanceType)) {
        baseReward += 1000
    }

    // 施設利用料（支払報酬には施設利用料を上乗せする）
    if (facilityFee > 0) {
        baseReward += facilityFee
    }

    // 8. 遠方対応オプションの判定
    const isActualDistantOption = !!studentInfo?.is_default_distant_option && !master.is_trial

    return {
        base_price: basePrice,
        base_reward: baseReward,
        facility_id: facilityId,
        is_actual_distant_option: isActualDistantOption
    }
}


const formSchema = z.object({
    student_id: z.string().optional(),
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.string(), // ISO string from frontend
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    coach_comment: z.string().optional(),
    price: z.number().min(0),
    billing_price: z.number().min(0).optional(),
    schedule_id: z.string().optional(),
    attendance_type: z.string().optional(),
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

    // 2.2 Add Facility Fee based on location
    const { data: facility } = await supabase
        .from('facilities')
        .select('is_facility_fee_applied')
        .eq('name', data.location)
        .single()

    const facilityFee = facility?.is_facility_fee_applied ? 1500 : 0
    data.price = data.price + facilityFee

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

        // If Monthly Member (Fee > 0), Billing Price is 0 (Included in Sub) plus facility fee
        if (membership && membership.fee > 0) {
            billingPrice = facilityFee
        }
    }

    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabaseAdmin = createAdminClient()

        // 報酬・請求金額の計算
        const { base_price, base_reward, facility_id, is_actual_distant_option } = 
            await getCalculatedLessonAmounts(
                supabaseAdmin,
                user.id,
                data.student_id,
                data.lesson_master_id,
                data.lesson_date,
                data.location,
                data.attendance_type || 'both'
            )

        // 3. Insert into Supabase using Admin Client
        const { data: insertedLesson, error: dbError } = await supabaseAdmin.from('lessons').insert({
            coach_id: user.id,
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date, // Already ISO string
            location: data.location,
            menu_description: data.menu_description || '',
            price: data.price,
            billing_price: billingPrice,
            attendance_type: data.attendance_type || 'both',
            base_price,
            base_reward,
            facility_id,
            is_actual_distant_option
        }).select('id').single()

        if (dbError) {
            console.error('Database Insertion Error:', dbError)
            throw new Error(`データベース保存エラー: ${dbError.message}`)
        }

        const newLessonId = insertedLesson?.id

        // Mark the original schedule as reported
        if (data.schedule_id) {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const supabaseAdmin = createAdminClient()
            await supabaseAdmin.from('lesson_schedules').update({ is_reported: true }).eq('id', data.schedule_id)

            // 単発レッスン・追加レッスンの自動請求追加
            try {
                const { data: schedule, error: scheduleError } = await supabaseAdmin
                    .from('lesson_schedules')
                    .select(`
                        id,
                        is_overage,
                        lesson_master:lesson_masters (
                            is_trial
                        )
                    `)
                    .eq('id', data.schedule_id)
                    .single()

                if (scheduleError) {
                    console.error('Error fetching schedule for auto-billing check:', scheduleError)
                } else if (schedule) {
                    const isOverage = schedule.is_overage
                    const isTrial = (schedule.lesson_master as any)?.is_trial === true

                    console.log(`[Auto-Billing Check] Schedule ${data.schedule_id}: isOverage=${isOverage}, isTrial=${isTrial}`)

                    if (isOverage && !isTrial) {
                        console.log(`[Auto-Billing] Triggering createStripeInvoiceItemOnly for schedule ${data.schedule_id}`)
                        const { createStripeInvoiceItemOnly } = await import('@/actions/stripe')
                        const billingResult = await createStripeInvoiceItemOnly(data.schedule_id)
                        if (billingResult.success) {
                            console.log(`[Auto-Billing] Successfully registered invoice item for schedule ${data.schedule_id}`)
                        } else {
                            console.error(`[Auto-Billing] Failed to register invoice item:`, billingResult.error)
                        }
                    }
                }
            } catch (autoBillingError) {
                console.error('[Auto-Billing] Error in auto-billing process:', autoBillingError)
            }
        }

        // 4. 管理者通知（メール設定のlesson_report_sentトリガー経由）
        try {
            const toAddress = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER

            if (toAddress) {
                // レッスン名・コーチ名を取得
                const { data: lessonMaster } = await supabase
                    .from('lesson_masters')
                    .select('name, is_trial')
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

        // 5. 体験レッスンの場合、生徒のステータスを更新
        if (data.student_id) {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const supabaseAdmin = createAdminClient()

            // lesson_masters の情報を取得（メール通知ブロックの外で取得している場合もあるが、確実を期す）
            const { data: masterInfo } = await supabaseAdmin
                .from('lesson_masters')
                .select('name, is_trial')
                .eq('id', data.lesson_master_id)
                .single()

            if (masterInfo?.is_trial) {
                const { data: student } = await supabaseAdmin
                    .from('students')
                    .select('status')
                    .eq('id', data.student_id)
                    .single()

                if (student?.status === 'trial_confirmed') {
                    await supabaseAdmin
                        .from('students')
                        .update({ status: 'trial_done' })
                        .eq('id', data.student_id)
                    console.log(`[Status Update] Student ${data.student_id} status updated to trial_done`)

                    // Make Webhookをトリガー
                    await triggerMakeTrialDoneWebhook(data.student_id, user.id, {
                        student_name: data.student_name,
                        lesson_date: data.lesson_date,
                        location: data.location,
                        lesson_type: masterInfo?.name || '体験レッスン',
                        price: data.price,
                        description: data.menu_description || ''
                    });
                }
            }
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
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()

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
        const { data: lesson } = await supabaseAdmin
            .from('lessons')
            .select('stripe_invoice_item_id')
            .eq('id', lessonId)
            .single()

        if (lesson?.stripe_invoice_item_id) {
            try {
                await stripe.invoiceItems.del(lesson.stripe_invoice_item_id)
            } catch (stripeError: any) {
                console.error('Stripe Delete Error:', stripeError)
                if (stripeError.code !== 'resource_missing') {
                    throw new Error('Stripe請求項目の削除に失敗しました（すでに請求書が確定している可能性があります）')
                }
            }
        }

        const { error } = await supabaseAdmin.from('lessons').delete().eq('id', lessonId)
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
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return { success: false, error: 'Unauthorized' }

    // Admin or Owner Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    // Fetch the lesson to check ownership
    const { data: lesson } = await supabaseAdmin
        .from('lessons')
        .select('coach_id')
        .eq('id', lessonId)
        .single()

    if (!isAdmin && lesson?.coach_id !== user.id) {
        return { success: false, error: '権限がありません' }
    }

    const parsed = formSchema.safeParse(values)
    if (!parsed.success) {
        console.error('Validation error:', parsed.error.flatten())
        return { success: false, error: '入力内容に誤りがあります: ' + JSON.stringify(parsed.error.flatten().fieldErrors) }
    }
    const data = parsed.data

    const { data: master } = await supabaseAdmin
        .from('lesson_masters')
        .select('unit_price, pair_unit_price')
        .eq('id', data.lesson_master_id)
        .single()

    const { data: facility } = await supabaseAdmin
        .from('facilities')
        .select('is_facility_fee_applied')
        .eq('name', data.location)
        .single()

    const facilityFee = facility?.is_facility_fee_applied ? 1500 : 0

    // ペア価格を適用するか判定
    let basePrice = master?.unit_price ?? data.price
    if (data.student_id) {
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('apply_pair_pricing')
            .eq('id', data.student_id)
            .single()

        const applyPairPrice = !!student?.apply_pair_pricing && (data.attendance_type === 'both' || !data.attendance_type)
        if (applyPairPrice && master?.pair_unit_price) {
            basePrice = master.pair_unit_price
        }
    }

    data.price = basePrice + facilityFee

    // Recalculate billing price only if not provided
    let billingPrice = data.billing_price

    if (billingPrice === undefined) {
        billingPrice = data.price
        if (data.student_id) {
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('membership_types ( fee )')
                .eq('id', data.student_id)
                .single()

            const membership = Array.isArray(student?.membership_types)
                ? student.membership_types[0]
                : student?.membership_types

            if (membership && membership.fee > 0) {
                billingPrice = facilityFee
            }
        }
    }

    try {
        console.log('Updating lesson report:', lessonId, {
            lesson_master_id: data.lesson_master_id,
            price: data.price,
            billing_price: billingPrice,
            attendance_type: data.attendance_type
        })

        // 報酬・請求金額の計算
        const { base_price, base_reward, facility_id, is_actual_distant_option } = 
            await getCalculatedLessonAmounts(
                supabaseAdmin,
                lesson?.coach_id || user.id,
                data.student_id,
                data.lesson_master_id,
                data.lesson_date,
                data.location,
                data.attendance_type || 'both'
            )

        const { error } = await supabaseAdmin.from('lessons').update({
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date,
            location: data.location,
            menu_description: data.menu_description || '',
            coach_comment: data.coach_comment || '',
            price: data.price,
            billing_price: billingPrice,
            attendance_type: data.attendance_type || 'both',
            base_price,
            base_reward,
            facility_id,
            is_actual_distant_option
        }).eq('id', lessonId)

        if (error) {
            console.error('Supabase Update Error:', error)
            return { success: false, error: 'DBエラー: ' + error.message }
        }

        revalidatePath('/admin/reports')
        revalidatePath('/admin/finance/payouts')
        revalidatePath('/coach')
        revalidatePath('/finance')
        return { success: true }
    } catch (error: any) {
        console.error('Update Error:', error)
        return { success: false, error: error.message || '予期せぬエラーが発生しました' }
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

    const { data: facility } = await supabase
        .from('facilities')
        .select('is_facility_fee_applied')
        .eq('name', data.location)
        .single()

    const facilityFee = facility?.is_facility_fee_applied ? 1500 : 0
    data.price = data.price + facilityFee

    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabaseAdmin = createAdminClient()

        // 報酬・請求金額の計算
        const { base_price, base_reward, facility_id, is_actual_distant_option } = 
            await getCalculatedLessonAmounts(
                supabaseAdmin,
                data.coach_id,
                data.student_id,
                data.lesson_master_id,
                data.lesson_date,
                data.location,
                'both'
            )

        // 請求金額計算（月会員は施設利用料のみ）
        let billingPrice = data.price
        if (data.student_id) {
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('membership_types ( fee )')
                .eq('id', data.student_id)
                .single()

            const membership = Array.isArray(student?.membership_types)
                ? student.membership_types[0]
                : student?.membership_types

            if (membership && membership.fee > 0) {
                billingPrice = facilityFee
            }
        }

        // 2. Insert into Supabase using Admin Client directly
        const { data: insertedLesson, error: dbError } = await supabaseAdmin.from('lessons').insert({
            coach_id: data.coach_id,
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date,
            location: data.location,
            menu_description: data.menu_description || '',
            coach_comment: '',
            price: data.price,
            billing_price: billingPrice,
            attendance_type: 'both',
            base_price,
            base_reward,
            facility_id,
            is_actual_distant_option
        }).select('id').single()

        if (dbError) throw dbError

        const newId = insertedLesson?.id

        const { data: lessonMaster } = await supabaseAdmin
            .from('lesson_masters')
            .select('name, is_trial')
            .eq('id', data.lesson_master_id)
            .single()

        // 3. 体験レッスンの場合、生徒のステータスを更新
        if (data.student_id) {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const supabaseAdmin = createAdminClient()

            if (lessonMaster?.is_trial) {
                const { data: student } = await supabaseAdmin
                    .from('students')
                    .select('status')
                    .eq('id', data.student_id)
                    .single()

                if (student?.status === 'trial_confirmed') {
                    await supabaseAdmin
                        .from('students')
                        .update({ status: 'trial_done' })
                        .eq('id', data.student_id)
                    console.log(`[Public Status Update] Student ${data.student_id} status updated to trial_done`)

                    // Make Webhookをトリガー
                    await triggerMakeTrialDoneWebhook(data.student_id, data.coach_id, {
                        student_name: data.student_name,
                        lesson_date: data.lesson_date,
                        location: data.location,
                        lesson_type: lessonMaster?.name || '体験レッスン',
                        price: data.price,
                        description: data.menu_description || ''
                    });
                }
            }
        }

        // 4. 管理者通知（メール設定のlesson_report_sentトリガー経由）
        const toAddress = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER

        if (toAddress) {

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
            second_student_name,
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
                second_student_name,
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
        second_student_name?: string | null;
        default_master_id?: string;
    }

    const extractMembership = (s: any): StudentData => {
        const membership = Array.isArray(s.membership_types) ? s.membership_types[0] : s.membership_types;
        return {
            id: s.id,
            full_name: s.full_name,
            second_student_name: s.second_student_name,
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


// ── 管理者代理レッスン報告作成 ──────────────────────────────────────────
// RLS をバイパスするため Admin Client を使用（管理者のみ実行可能）

const adminProxySchema = z.object({
    coach_id: z.string().min(1, 'コーチを選択してください'),
    student_id: z.string().optional(),
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.string().min(1, 'レッスン日は必須です'),
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    coach_comment: z.string().optional(),
    price: z.number().min(0),
    attendance_type: z.string().optional(),
})

type AdminProxyValues = z.infer<typeof adminProxySchema>

export async function submitAdminProxyReport(values: AdminProxyValues) {
    const supabase = await createClient()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()

    // 1. 認証チェック
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. 管理者権限チェック
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return { success: false, error: '管理者のみが代理報告を作成できます' }
    }

    // 3. バリデーション
    const parsed = adminProxySchema.safeParse(values)
    if (!parsed.success) {
        const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
        return { success: false, error: firstError || '入力内容が正しくありません' }
    }
    const data = parsed.data

    // 4. 施設利用料チェック
    const { data: facility } = await supabaseAdmin
        .from('facilities')
        .select('is_facility_fee_applied')
        .eq('name', data.location)
        .single()
    const facilityFee = facility?.is_facility_fee_applied ? 1500 : 0

    // 5. レッスン単価を取得して最終金額を計算
    const { data: master } = await supabaseAdmin
        .from('lesson_masters')
        .select('unit_price, pair_unit_price, is_trial, name')
        .eq('id', data.lesson_master_id)
        .single()

    // ペア価格を適用するか判定
    let basePrice = master?.unit_price ?? data.price
    if (data.student_id) {
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('apply_pair_pricing')
            .eq('id', data.student_id)
            .single()

        const applyPairPrice = !!student?.apply_pair_pricing && (data.attendance_type === 'both' || !data.attendance_type)
        if (applyPairPrice && master?.pair_unit_price) {
            basePrice = master.pair_unit_price
        }
    }
    const finalPrice = basePrice + facilityFee

    // 6. 請求金額計算（月会員は施設利用料のみ）
    let billingPrice = finalPrice
    if (data.student_id) {
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('membership_types ( fee )')
            .eq('id', data.student_id)
            .single()
        const membership = Array.isArray((student as any)?.membership_types)
            ? (student as any).membership_types[0]
            : (student as any)?.membership_types
        if (membership && membership.fee > 0) {
            billingPrice = facilityFee
        }
    }

    try {
        // 報酬・請求金額の計算
        const { base_price, base_reward, facility_id, is_actual_distant_option } = 
            await getCalculatedLessonAmounts(
                supabaseAdmin,
                data.coach_id,
                data.student_id,
                data.lesson_master_id,
                data.lesson_date,
                data.location,
                data.attendance_type || 'both'
            )

        // 7. Admin Client で RLS バイパスして INSERT
        const { error } = await supabaseAdmin.from('lessons').insert({
            coach_id: data.coach_id,
            student_id: data.student_id || null,
            student_name: data.student_name,
            lesson_master_id: data.lesson_master_id,
            lesson_date: data.lesson_date,
            location: data.location,
            menu_description: data.menu_description || '',
            coach_comment: data.coach_comment || '',
            price: finalPrice,
            billing_price: billingPrice,
            attendance_type: data.attendance_type || 'both',
            base_price,
            base_reward,
            facility_id,
            is_actual_distant_option
        })

        if (error) throw new Error(error.message)

        // 8. 体験レッスンの場合、生徒のステータスを更新
        if (data.student_id && master?.is_trial) {
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('status')
                .eq('id', data.student_id)
                .single()

            if (student?.status === 'trial_confirmed') {
                await supabaseAdmin
                    .from('students')
                    .update({ status: 'trial_done' })
                    .eq('id', data.student_id)
                console.log(`[Admin Proxy Status Update] Student ${data.student_id} status updated to trial_done`)

                // Make Webhookをトリガー
                await triggerMakeTrialDoneWebhook(data.student_id, data.coach_id, {
                    student_name: data.student_name,
                    lesson_date: data.lesson_date,
                    location: data.location,
                    lesson_type: master?.name || '体験レッスン',
                    price: finalPrice,
                    description: data.menu_description || ''
                });
            }
        }

        revalidatePath('/admin/reports')
        return { success: true }
    } catch (error: any) {
        console.error('[AdminProxyReport] Error:', error)
        return { success: false, error: error.message || '作成に失敗しました' }
    }
}

// ── Make Webhook トリガー（体験レッスン終了時） ──────────────────────────────────────────
async function triggerMakeTrialDoneWebhook(studentId: string, coachId: string, lessonData: {
    student_name: string,
    lesson_date: string,
    location: string,
    lesson_type: string,
    price: number,
    description: string
}) {
    const webhookUrl = process.env.MAKE_TRIAL_DONE_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("MAKE_TRIAL_DONE_WEBHOOK_URL is not set. Skipping Webhook trigger.");
        return;
    }

    try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = createAdminClient();

        // 1. 生徒の情報を取得（line_user_id や連絡先）
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('line_user_id, contact_email, contact_phone')
            .eq('id', studentId)
            .single();

        // 2. コーチの名前を取得
        const { data: coach } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', coachId)
            .single();

        const payload = {
            student_id: studentId,
            student_name: lessonData.student_name,
            line_user_id: student?.line_user_id || null,
            contact_email: student?.contact_email || null,
            contact_phone: student?.contact_phone || null,
            coach_id: coachId,
            coach_name: coach?.full_name || 'コーチ',
            lesson_date: lessonData.lesson_date,
            location: lessonData.location,
            lesson_type: lessonData.lesson_type,
            price: lessonData.price,
            menu_description: lessonData.description || ''
        };

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Make Trial Done Webhook Error (${response.status}):`, errorText);
        } else {
            console.log(`Successfully triggered Make Trial Done Webhook for student: ${studentId}`);
        }
    } catch (error) {
        console.error("Error triggering Make Trial Done Webhook:", error);
    }
}
