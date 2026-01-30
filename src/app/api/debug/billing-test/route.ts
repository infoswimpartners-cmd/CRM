import { NextResponse } from 'next/server'
import { runMonthlyBilling } from '@/lib/billing'

export async function GET() {
    try {
        const logs = await runMonthlyBilling()
        return NextResponse.json({ success: true, logs })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
