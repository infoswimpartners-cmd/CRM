import {
    fetchAndBuildWeeklySalesReport,
    getPreviousWeekRangeJst,
    writeWeeklySalesReportToSheet,
} from '@/lib/weekly-sales-report'

export const dynamic = 'force-dynamic'

/**
 * Validates the Authorization header against process.env.CRON_SECRET.
 * Rejects execution if CRON_SECRET is unset or the Bearer token does not match.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || cronSecret.trim().length === 0) {
        return false
    }
    const authHeader = request.headers.get('authorization')
    return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
    if (!isAuthorizedCronRequest(request)) {
        console.error('[WeeklySalesReport Cron] Unauthorized access attempt rejected.')
        return Response.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const now = new Date()
    const weekRange = getPreviousWeekRangeJst(now)

    console.log(
        `[WeeklySalesReport Cron] Starting weekly sales aggregation for period ${weekRange.weekStartDate} to ${weekRange.weekEndDate} (JST)`
    )

    try {
        const report = await fetchAndBuildWeeklySalesReport(weekRange, now)

        const sheetResult = await writeWeeklySalesReportToSheet({
            report,
        })

        console.log(
            `[WeeklySalesReport Cron] Successfully ${sheetResult.action} row ${sheetResult.rowNumber} in "${sheetResult.sheetTitle}" (${sheetResult.spreadsheetId}):`,
            JSON.stringify(report)
        )

        return Response.json({
            success: true,
            action: sheetResult.action,
            rowNumber: sheetResult.rowNumber,
            sheetTitle: sheetResult.sheetTitle,
            report,
        })
    } catch (error: any) {
        console.error(
            `[WeeklySalesReport Cron] Failed to generate or export weekly sales report for ${weekRange.weekStartDate}〜${weekRange.weekEndDate}:`,
            error
        )
        return Response.json(
            {
                success: false,
                error: error?.message || 'Internal Server Error',
            },
            { status: 500 }
        )
    }
}
