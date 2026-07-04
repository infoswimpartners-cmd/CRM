'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignMembership } from '../stripe'
import { revalidatePath } from 'next/cache'

/**
 * 生徒自身によるプラン変更申請の送信
 */
export async function submitMembershipChangeRequest(data: {
    studentId: string
    requestedMembershipTypeId?: string | null
    requestType?: 'change_plan' | 'add_plan' | 'cancel_plan'
    requestedIsTrio?: boolean | null
    note?: string
}) {
    const supabase = await createClient()

    try {
        // 1. 生徒情報と現在のロック状態を確認
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, membership_type_id, membership_lock_until, is_trio')
            .eq('id', data.studentId)
            .single()

        if (studentError || !student) {
            return { success: false, error: '生徒情報が見つかりません。' }
        }

        // すでに保留中の申請があるかチェック
        const { data: existingRequest } = await supabase
            .from('membership_change_requests')
            .select('id')
            .eq('student_id', data.studentId)
            .eq('status', 'pending')
            .limit(1)

        if (existingRequest && existingRequest.length > 0) {
            return { success: false, error: 'すでに保留中の申請があります。' }
        }

        // 2. 申請レコードの作成
        const { error: insertError } = await supabase
            .from('membership_change_requests')
            .insert({
                student_id: data.studentId,
                current_membership_type_id: student.membership_type_id,
                requested_membership_type_id: data.requestedMembershipTypeId || null,
                request_type: data.requestType || 'change_plan',
                requested_is_trio: data.requestedIsTrio !== undefined ? data.requestedIsTrio : null,
                note: data.note || null,
                status: 'pending'
            })

        if (insertError) throw insertError

        revalidatePath('/member/billing')
        return { success: true }

    } catch (error: any) {
        console.error('Submit Change Request Error:', error)
        return { success: false, error: error.message || '申請の送信に失敗しました。' }
    }
}

/**
 * 管理者によるプラン変更申請の承認
 */
export async function approveMembershipChangeRequest(requestId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. 申請情報の取得
        const { data: request, error: requestError } = await supabaseAdmin
            .from('membership_change_requests')
            .select('*, requested:membership_types!requested_membership_type_id ( lock_period_months )')
            .eq('id', requestId)
            .single()

        if (requestError || !request) {
            return { success: false, error: '申請情報が見つかりません。' }
        }

        if (request.status !== 'pending') {
            return { success: false, error: 'この申請はすでに処理済みです。' }
        }

        let updatedPrivatePlan = false

        // 2. 申請のタイプに応じた処理の実行
        if (request.request_type === 'add_plan' && request.requested_is_trio && !request.requested_membership_type_id) {
            // Trioプランのみの追加（プライベートレッスンはそのまま）
            const { error: studentUpdateError } = await supabaseAdmin
                .from('students')
                .update({
                    is_trio: true
                })
                .eq('id', request.student_id)

            if (studentUpdateError) throw studentUpdateError
        } else if (request.request_type === 'cancel_plan' && request.requested_is_trio === false && !request.requested_membership_type_id) {
            // Trioプランのみの解約
            const { error: studentUpdateError } = await supabaseAdmin
                .from('students')
                .update({
                    is_trio: false
                })
                .eq('id', request.student_id)

            if (studentUpdateError) throw studentUpdateError
        } else {
            // プライベートレッスンプランの変更または追加 (次月1日より適用とするため timing を 'next' に設定)
            const assignResult = await assignMembership(request.student_id, request.requested_membership_type_id, 'next')
            if (!assignResult.success) {
                return { success: false, error: assignResult.error || 'プランの割り当てに失敗しました。' }
            }
            updatedPrivatePlan = true
            
            // Trioの追加/解約も同時にリクエストされている場合は is_trio も更新する
            if (request.requested_is_trio !== null) {
                const { error: studentUpdateError } = await supabaseAdmin
                    .from('students')
                    .update({
                        is_trio: request.requested_is_trio
                    })
                    .eq('id', request.student_id)

                if (studentUpdateError) throw studentUpdateError
            }
        }

        // 3. ロック期限の更新（プライベートレッスンの変更/追加があった場合のみ）
        if (updatedPrivatePlan) {
            // 新しいプランの lock_period_months に基づき、生徒の lock_until を更新
            // @ts-ignore
            const lockMonths = request.requested?.lock_period_months ?? 2
            const lockUntil = new Date()
            lockUntil.setMonth(lockUntil.getMonth() + lockMonths)

            const { error: studentUpdateError } = await supabaseAdmin
                .from('students')
                .update({
                    membership_lock_until: lockUntil.toISOString()
                })
                .eq('id', request.student_id)

            if (studentUpdateError) throw studentUpdateError
        }

        // 4. 申請ステータスの更新
        const { error: requestUpdateError } = await supabaseAdmin
            .from('membership_change_requests')
            .update({
                status: 'approved'
            })
            .eq('id', requestId)

        if (requestUpdateError) throw requestUpdateError

        revalidatePath(`/customers/${request.student_id}`)
        return { success: true }

    } catch (error: any) {
        console.error('Approve Change Request Error:', error)
        return { success: false, error: error.message || '承認処理に失敗しました。' }
    }
}

/**
 * 管理者によるプラン変更申請の却下
 */
export async function rejectMembershipChangeRequest(requestId: string, note?: string) {
    const supabaseAdmin = createAdminClient()

    try {
        const { data: request, error: requestError } = await supabaseAdmin
            .from('membership_change_requests')
            .select('id, student_id')
            .eq('id', requestId)
            .single()

        if (requestError || !request) {
            return { success: false, error: '申請情報が見つかりません。' }
        }

        const { error: updateError } = await supabaseAdmin
            .from('membership_change_requests')
            .update({
                status: 'rejected',
                note: note ? `【却下理由】${note}` : null
            })
            .eq('id', requestId)

        if (updateError) throw updateError

        revalidatePath(`/customers/${request.student_id}`)
        return { success: true }

    } catch (error: any) {
        console.error('Reject Change Request Error:', error)
        return { success: false, error: error.message || '却下処理に失敗しました。' }
    }
}
