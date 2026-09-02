import { NextRequest, NextResponse } from 'next/server'
import { processLessonReminders } from '@/lib/reminders'

// キャッシュを無効化
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'
    const targetDateParam = searchParams.get('date') || undefined // YYYY-MM-DD 指定テスト用

    try {
        const result = await processLessonReminders({
            dryRun,
            targetDate: targetDateParam
        })

        return NextResponse.json(result, { status: result.success ? 200 : 500 })
    } catch (e: any) {
        console.error('[Cron Reminders Route] Error:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
