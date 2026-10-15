import { NextRequest, NextResponse } from 'next/server'
import { processLessonReminders, processLessonReportRequests } from '@/lib/reminders'
import { processLeaveManagement } from '@/actions/leave'

// キャッシュを無効化
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'
    const targetDateParam = searchParams.get('date') || undefined // YYYY-MM-DD 指定テスト用
    const reportDateParam = searchParams.get('report_date') || undefined // 報告依頼の対象日（YYYY-MM-DD）指定テスト用

    try {
        const result = await processLessonReminders({
            dryRun,
            targetDate: targetDateParam
        })

        // レッスン翌日の報告依頼（前日実施分で未報告のもの）
        let reportRequests: any = null
        try {
            reportRequests = await processLessonReportRequests({ dryRun, targetDate: reportDateParam })
        } catch (e: any) {
            console.error('[Cron Reminders Route] Report request error:', e)
            reportRequests = { success: false, error: e.message }
        }

        // 休会管理（前月5日の再開案内、休会期間終了後の自動再開、休会開始の自動反映）
        let leaveManagement: any = null
        try {
            leaveManagement = await processLeaveManagement({
                dryRun,
                targetDate: targetDateParam
            })
        } catch (e: any) {
            console.error('[Cron Reminders Route] Leave management error:', e)
            leaveManagement = { success: false, error: e.message }
        }

        return NextResponse.json({ ...result, report_requests: reportRequests, leave_management: leaveManagement }, { status: result.success ? 200 : 500 })
    } catch (e: any) {
        console.error('[Cron Reminders Route] Error:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
