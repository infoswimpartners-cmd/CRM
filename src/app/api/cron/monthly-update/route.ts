import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignMembership } from '@/actions/stripe'

export async function GET(req: NextRequest) {
    // Basic Auth or Secret Check (Optional but recommended)
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const log: string[] = []

    log.push(`Starting Monthly Membership Update: ${new Date().toISOString()}`)

    try {
        // 1. Fetch reservations
        const { data: students, error } = await supabase
            .from('students')
            .select('id, full_name, next_membership_type_id')
            .not('next_membership_type_id', 'is', null)

        if (error) throw error

        if (!students || students.length === 0) {
            log.push('No pending membership updates found.')
            return NextResponse.json({ success: true, log })
        }

        log.push(`Found ${students.length} students to update.`)

        // 2. Process each
        for (const student of students) {
            log.push(`Processing: ${student.full_name} -> Type: ${student.next_membership_type_id}`)

            // Call assignMembership (Immediate mode)
            // This will:
            // - Create/Update Stripe Subscription
            // - Clear next_membership_type_id
            // - Update membership_type_id

            const result = await assignMembership(student.id, student.next_membership_type_id, false)

            if (result.success) {
                log.push(`  - Success`)
            } else {
                log.push(`  - Failed: ${result.error}`)
            }
        }

    } catch (error: any) {
        console.error('Monthly Update Error:', error)
        log.push(`Critical Error: ${error.message}`)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, log })
}
