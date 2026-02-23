'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { emailService } from '@/lib/email'

import { isCancelPenalty } from '@/lib/utils'

export type CancelLessonResult = {
    success: boolean
    error?: string
    isPenalty?: boolean
}

/**
 * 会員がレッスンをキャンセルするServer Action
 */
export async function cancelLesson(lessonId: string): Promise<CancelLessonResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const session = await getServerSession(authOptions)

    if (!user && !session) {
        return { success: false, error: 'ログインが必要です' }
    }

    // 認証方法に応じてクライアントを決定
    const client = user ? supabase : createAdminClient()
    const field = user ? 'auth_user_id' : 'line_user_id'
    const userId = user ? user.id : (session?.user as any)?.id

    // 1. 生徒情報を取得
    const { data: student, error: studentError } = await client
        .from('students')
        .select('id, current_tickets, membership_type_id')
        .eq(field, userId)
        .single()

    if (studentError || !student) {
        return { success: false, error: '会員情報が見つかりません' }
    }

    // 2. レッスン情報を取得（所有確認も兼ねる）
    const { data: lesson, error: lessonError } = await client
        .from('lessons')
        .select('id, lesson_date, location, status, coach_id, student_id')
        .eq('id', lessonId)
        .eq('student_id', student.id) // 自分のレッスンのみ
        .single()

    if (lessonError || !lesson) {
        return { success: false, error: 'レッスンが見つかりません' }
    }

    // 3. キャンセル可能かチェック
    if (lesson.status === 'cancelled') {
        return { success: false, error: 'すでにキャンセル済みです' }
    }
    if (lesson.status === 'completed') {
        return { success: false, error: '完了済みのレッスンはキャンセルできません' }
    }

    const lessonDate = new Date(lesson.lesson_date)
    const now = new Date()
    if (lessonDate <= now) {
        return { success: false, error: '過去のレッスンはキャンセルできません' }
    }

    // 4. ペナルティ判定
    const isPenalty = isCancelPenalty(lessonDate)

    // 5. adminクライアントでキャンセル処理を実行（RLS制限を回避）
    const adminClient = createAdminClient()

    // レッスンのステータスを更新
    const { error: updateError } = await adminClient
        .from('lessons')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_penalty: isPenalty,
        })
        .eq('id', lessonId)

    if (updateError) {
        console.error('[cancelLesson] update error:', updateError)
        return { success: false, error: 'キャンセル処理中にエラーが発生しました' }
    }

    // 6. チケット振替処理
    if (!isPenalty) {
        // ペナルティなし → チケットを1枚戻す（振替可能）
        const newTickets = (student.current_tickets || 0) + 1

        const { error: ticketError } = await adminClient
            .from('students')
            .update({ current_tickets: newTickets })
            .eq('id', student.id)

        if (!ticketError) {
            // チケット取引履歴を記録
            await adminClient
                .from('ticket_transactions')
                .insert({
                    student_id: student.id,
                    change_amount: 1,
                    balance_after: newTickets,
                    reason: 'cancel_refund',
                    related_id: lessonId,
                })
        }
    }
    // ペナルティあり → チケットは戻さない（キャンセル料として消化）

    // 7. 通知処理
    if (lesson.coach_id) {
        const penaltyText = isPenalty
            ? '（前日12時以降のキャンセルのため、チケットは消化されました）'
            : '（前日12時前のキャンセルのため、チケットは返却されました）'

        const dateStr = format(lessonDate, 'M月d日(E) HH:mm', { locale: ja })

        // 7a. 生徒向け通知（DB）
        await adminClient
            .from('notifications')
            .insert({
                student_id: student.id,
                title: 'レッスンのキャンセルを承りました',
                body: `${dateStr} のレッスンをキャンセルしました。${penaltyText}`,
                type: isPenalty ? 'alert' : 'success',
            })

        // 7b. 管理者/コーチ向け通知（メール）
        const adminEmail = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER
        if (adminEmail) {
            const { data: profile } = await adminClient
                .from('profiles')
                .select('full_name')
                .eq('id', lesson.coach_id)
                .single()

            const coachName = profile?.full_name || 'コーチ'
            const { data: studentProfile } = await adminClient
                .from('students')
                .select('full_name')
                .eq('id', student.id)
                .single()
            const studentName = studentProfile?.full_name || '生徒'

            await emailService.sendEmail({
                to: adminEmail,
                subject: `【レッスンキャンセル】${studentName}様 (${dateStr})`,
                text: `
レッスンがキャンセルされました。

■キャンセル詳細
生徒名: ${studentName}
担当コーチ: ${coachName}
日時: ${dateStr}
場所: ${lesson.location || '(未定)'}

■判定
${penaltyText}
キャンセル時刻: ${format(new Date(), 'yyyy/MM/dd HH:mm:ss')}

--------------------------------------------------
Swim Partners Manager
                `.trim(),
                requireApproval: false // キャンセル通知は自動送信でOK
            })
        }
    }

    // 8. キャッシュ再検証
    revalidatePath('/member/dashboard')
    revalidatePath('/member/cancel') // リストを更新するために追加

    return { success: true, isPenalty }
}

