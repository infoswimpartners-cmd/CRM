import { NextResponse } from 'next/server'
import { fetchQuestRealData } from '@/lib/quest-real-data'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const data = await fetchQuestRealData()
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[API Quest Real-Data] Error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch quest real data' },
            { status: 500 }
        )
    }
}
