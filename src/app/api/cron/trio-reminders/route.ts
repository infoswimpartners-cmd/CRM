
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { lineService } from '@/lib/line'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'
    const supabase = createAdminClient()

    try {
        const results: any[] = []
        
        // 1. 3日前リマインド (確定済みセッション)
        const threeDaysLater = addDays(new Date(), 3)
        const { data: threeDaySessions } = await supabase
            .from('trio_slots')
            .select(`
                *,
                trio_entries (
                    student_id,
                    students (
                        full_name,
                        line_user_id
                    )
                )
            `)
            .eq('status', 'confirmed')
            .gte('start_at', startOfDay(threeDaysLater).toISOString())
            .lte('start_at', endOfDay(threeDaysLater).toISOString())

        // 2. 前日リマインド (確定済みセッション)
        const tomorrow = addDays(new Date(), 1)
        const { data: tomorrowSessions } = await supabase
            .from('trio_slots')
            .select(`
                *,
                trio_entries (
                    student_id,
                    students (
                        full_name,
                        line_user_id
                    )
                )
            `)
            .eq('status', 'confirmed')
            .gte('start_at', startOfDay(tomorrow).toISOString())
            .lte('start_at', endOfDay(tomorrow).toISOString())

        // 3. マッチング不成立の判定 (前日時点で status が matching のままのもの)
        const { data: unmatchedSessions } = await supabase
            .from('trio_slots')
            .select(`
                *,
                trio_entries (
                    student_id,
                    students (
                        full_name,
                        line_user_id
                    )
                )
            `)
            .eq('status', 'matching')
            .gte('start_at', startOfDay(tomorrow).toISOString())
            .lte('start_at', endOfDay(tomorrow).toISOString())

        // 処理実行
        const processSessions = async (sessions: any[] | null, messageType: 'three_days' | 'one_day' | 'unmatched') => {
            if (!sessions) return
            for (const slot of sessions) {
                const dateStr = format(new Date(slot.start_at), 'M月d日(E) HH:mm', { locale: ja })
                
                for (const entry of slot.trio_entries) {
                    const student = entry.students
                    if (!student?.line_user_id) continue

                    let message = ''
                    if (messageType === 'three_days') {
                        message = `【THE TRIO】レッスン3日前リマインド\n\n${student.full_name}様、こんにちは！\n3日後の ${dateStr} よりTHE TRIOのレッスンが予定されています。\n\n会場にてお待ちしております。`
                    } else if (messageType === 'one_day') {
                        message = `【THE TRIO】いよいよ明日開催です！\n\n${student.full_name}様、こんにちは。\n明日の ${dateStr} よりTHE TRIOのレッスンです。\n\nお気をつけてお越しください。`
                    } else if (messageType === 'unmatched') {
                        message = `【THE TRIO】マッチング不成立のお知らせ\n\n${student.full_name}様、誠に恐縮ながら、明日の ${dateStr} のセッションは規定人数に達しなかったため開催見送りとなりました。\n\nお支払い済みの費用は返金または次回振替にて対応させていただきます。詳細は後ほど運営よりご連絡いたします。`
                    }

                    if (dryRun) {
                        console.log(`[DRY RUN] Send to ${student.full_name}: ${message}`)
                        results.push({ student: student.full_name, type: messageType, status: 'dry-run' })
                    } else {
                        const sent = await lineService.pushMessage(student.line_user_id, message)
                        results.push({ student: student.full_name, type: messageType, status: sent ? 'sent' : 'failed' })
                    }
                }
                
                // 不成立の場合はスロットを閉鎖
                if (messageType === 'unmatched' && !dryRun) {
                    await supabase.from('trio_slots').update({ status: 'closed' }).eq('id', slot.id)
                }
            }
        }

        await processSessions(threeDaySessions, 'three_days')
        await processSessions(tomorrowSessions, 'one_day')
        await processSessions(unmatchedSessions, 'unmatched')

        return NextResponse.json({ success: true, processed: results })

    } catch (e: any) {
        console.error('Trio Reminder Cron Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
