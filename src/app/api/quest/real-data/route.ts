import { NextResponse } from 'next/server'
import { fetchQuestRealData } from '@/lib/quest-real-data'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 })
        }

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
