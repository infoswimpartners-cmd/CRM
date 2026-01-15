
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { emailService } from '@/lib/email'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'
import { ja } from 'date-fns/locale'

// Prevent caching for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'

    // In a real production environment, you should verify a CRON_SECRET here
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { return new NextResponse('Unauthorized', { status: 401 }) }

    const supabase = createClient()

    // Calculate "Tomorrow" in JST context (assuming server approaches this simply)
    const now = new Date()
    const tomorrow = addDays(now, 1)
    const startOfTomorrow = startOfDay(tomorrow).toISOString()
    const endOfTomorrow = endOfDay(tomorrow).toISOString()

    try {
        // Fetch schedules for tomorrow that have a student assigned
        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                *,
                students!inner (
                    id,
                    full_name,
                    contact_email
                ),
                profiles (
                    full_name
                )
            `)
            .gte('start_time', startOfTomorrow)
            .lte('start_time', endOfTomorrow)
            .not('student_id', 'is', null) // Only booked slots

        if (error) {
            console.error('Supabase Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ message: 'No schedules found for tomorrow', count: 0 })
        }

        // Filter for students with Email
        const targetSchedules = schedules.filter(s => s.students?.contact_email)

        // Fetch email template
        const { data: config } = await supabase
            .from('app_configs')
            .select('key, value')
            .in('key', ['reminder_email_template', 'reminder_email_subject'])

        const template = config?.find(c => c.key === 'reminder_email_template')?.value || '{{student_name}}様\n\nいつもSwim Partnersをご利用いただきありがとうございます。\n\n明日 {{date}} {{time}}より、{{coach_name}}とのレッスン予約がございます。\n\n当日はお気をつけてお越しください。\nお待ちしております。\n\nSwim Partners'

        const subjectTemplate = config?.find(c => c.key === 'reminder_email_subject')?.value || '【Swim Partners】明日のレッスン予約のリマインド'

        const results = []

        for (const schedule of targetSchedules) {
            // Safe navigation for TS
            const student = schedule.students as any
            const coach = schedule.profiles as any

            const email = student.contact_email
            const timeStr = format(new Date(schedule.start_time), 'HH:mm')
            const dateStr = format(new Date(schedule.start_time), 'M月d日(E)', { locale: ja })

            const subject = subjectTemplate

            // Replace variables
            let messageText = template
                .replace('{{student_name}}', student.full_name)
                .replace('{{date}}', dateStr)
                .replace('{{time}}', timeStr)
                .replace('{{coach_name}}', coach?.full_name || '担当コーチ')

            if (dryRun) {
                console.log(`[DRY RUN] Would send Email to ${email} (${student.full_name}):\n${messageText}`)
                results.push({ student: student.full_name, status: 'dry-run', email })
            } else {
                const sent = await emailService.sendEmail({
                    to: email,
                    bcc: process.env.SMTP_FROM || process.env.SMTP_USER, // BCC to admin/sender
                    subject: subject,
                    text: messageText
                })
                results.push({ student: student.full_name, status: sent ? 'sent' : 'failed', start_time: schedule.start_time })
            }
        }

        return NextResponse.json({
            success: true,
            dry_run: dryRun,
            target_date: startOfTomorrow,
            processed: results.length,
            details: results
        })

    } catch (e: any) {
        console.error('Unexpected Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
