import { NextRequest, NextResponse } from 'next/server'
import { processLineStepReminders } from '@/lib/line-step-reminders'

// キャッシュを無効化
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'

    try {
        const result = await processLineStepReminders({ dryRun })
        return NextResponse.json({ success: true, ...result })
    } catch (e: any) {
        console.error('[Cron Line Step Reminders Route] Error:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    return GET(request)
}
