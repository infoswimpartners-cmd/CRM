
import { createAdminClient } from '@/lib/supabase/admin'
import { processLessonBilling } from '@/actions/billing'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Optional: Add a secret token check for security (CRON_SECRET)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    try {
        console.log('[Cron:Billing] Starting check...')

        // 1. Fetch 'approved' schedules (Waiting for billing)
        const { data: schedules, error } = await supabaseAdmin
            .from('lesson_schedules')
            .select('id, start_time, title, billing_status')
            .eq('billing_status', 'approved') // 'approved' means "Waiting for Delayed Billing"

        if (error) throw error

        console.log(`[Cron:Billing] Found ${schedules?.length || 0} approved schedules.`)

        const results = []
        const now = new Date()

        if (schedules) {
            for (const schedule of schedules) {
                // Check Timing
                const lessonDate = new Date(schedule.start_time)
                const billingDeadline = new Date(lessonDate)
                billingDeadline.setDate(billingDeadline.getDate() - 1)
                // Set to 12:00 JST = 03:00 UTC
                billingDeadline.setUTCHours(3, 0, 0, 0)

                // If Now >= Deadline, Process Billing
                if (now >= billingDeadline) {
                    console.log(`[Cron:Billing] Processing schedule ${schedule.id} (Deadline: ${billingDeadline.toISOString()})`)
                    const res = await processLessonBilling(schedule.id)
                    results.push({ id: schedule.id, ...res })
                } else {
                    console.log(`[Cron:Billing] Skipping schedule ${schedule.id} (Not yet time. Deadline: ${billingDeadline.toISOString()})`)
                }
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results })

    } catch (error: any) {
        console.error('[Cron:Billing] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
