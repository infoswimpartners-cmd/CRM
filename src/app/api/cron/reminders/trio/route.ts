
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
        const now = new Date()
        
        // 1日前と3日前の日付範囲を計算
        const tomorrow = addDays(now, 1)
        const in3Days = addDays(now, 3)

        const datesToRemind = [
            { date: tomorrow, label: '前日' },
            { date: in3Days, label: '3日前' }
        ]

        const results = []

        for (const target of datesToRemind) {
            const startOfTarget = startOfDay(target.date).toISOString()
            const endOfTarget = endOfDay(target.date).toISOString()

            // 該当日の予約が確定しているスロットを取得
            const { data: slots, error } = await supabase
                .from('trio_slots')
                .select(`
                    id,
                    start_at,
                    reserved_count,
                    trio_entries!inner (
                        student_id,
                        students!inner (
                            full_name,
                            line_user_id
                        )
                    )
                `)
                .gte('start_at', startOfTarget)
                .lte('start_at', endOfTarget)
                .gte('reserved_count', 2) // 開催確定のみ

            if (error) throw error

            if (!slots || slots.length === 0) continue

            for (const slot of slots) {
                const formattedDate = format(new Date(slot.start_at), 'M月d日(E) HH:mm', { locale: ja })
                
                for (const entry of slot.trio_entries as any[]) {
                    const student = entry.students
                    if (!student.line_user_id) continue

                    const message = `【THE TRIO】リマインド通知（${target.label}）\n\n${student.full_name}様\nご予約いただいているセッションの${target.label}となりました。\n\n日時：${formattedDate}\n場所：THE TRIO 専用施設\n\n当日のご来場を心よりお待ちしております。`

                    if (dryRun) {
                        console.log(`[DRY RUN] Would send LINE to ${student.full_name}: ${message}`)
                        results.push({ student: student.full_name, status: 'dry-run', label: target.label })
                    } else {
                        const sent = await lineService.pushMessage(student.line_user_id, message)
                        results.push({ student: student.full_name, status: sent ? 'sent' : 'failed', label: target.label })
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            dry_run: dryRun,
            processed: results.length,
            details: results
        })

    } catch (e: any) {
        console.error('Unexpected Error in Trio Reminders:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
