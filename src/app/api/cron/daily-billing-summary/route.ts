
import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'
import { formatCurrency } from '@/lib/utils'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = createAdminClient()

        // Target: Tomorrow
        const tomorrow = addDays(new Date(), 1)
        const start = startOfDay(tomorrow).toISOString()
        const end = endOfDay(tomorrow).toISOString()

        console.log(`[DailySummary] Checking for billings between ${start} and ${end}`)

        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                id, start_time, title, price,
                student:students (
                    full_name
                )
            `)
            .eq('billing_status', 'approved')
            .gte('billing_scheduled_at', start)
            .lte('billing_scheduled_at', end)

        if (error) {
            console.error('Error fetching schedules:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!schedules || schedules.length === 0) {
            console.log('[DailySummary] No approved billings for tomorrow.')
            return NextResponse.json({ message: 'No billings found' })
        }

        // Aggregate
        const count = schedules.length
        const totalAmount = schedules.reduce((sum, s) => sum + (s.price || 0), 0)

        // Format Items List
        const itemsList = schedules.map(s => {
            // @ts-ignore
            const studentName = s.student?.full_name || '不明'
            const price = formatCurrency(s.price || 0)
            const time = format(new Date(s.start_time), 'HH:mm')
            return `・${time} ${studentName}様: ${price} (${s.title})`
        }).join('\n')

        // Send Email
        const adminEmail = process.env.REPORT_NOTIFICATION_EMAIL || process.env.SMTP_USER
        if (adminEmail) {
            await emailService.sendTemplateEmail(
                'admin_daily_billing_summary',
                adminEmail,
                {
                    date: format(tomorrow, 'yyyy/MM/dd'),
                    count: count.toString(),
                    total_amount: formatCurrency(totalAmount),
                    items_list: itemsList
                }
            )
            console.log(`[DailySummary] Email sent to ${adminEmail}`)
        } else {
            console.error('[DailySummary] No admin email configured (REPORT_NOTIFICATION_EMAIL)')
        }

        return NextResponse.json({ success: true, count, totalAmount })

    } catch (error: any) {
        console.error('Cron Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
