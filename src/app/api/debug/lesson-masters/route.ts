import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: masters, error } = await supabase
        .from('lesson_masters')
        .select('*')
        .limit(1)

    return NextResponse.json({ masters, error })
}
