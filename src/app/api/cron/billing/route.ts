import { runMonthlyBilling } from '@/lib/billing'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Basic Authorization check (e.g. CRON_SECRET)
    // For Vercel Cron, check header or param.
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const logs = await runMonthlyBilling()
        return NextResponse.json({ success: true, logs })
    } catch (error) {
        console.error('Billing Job Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
