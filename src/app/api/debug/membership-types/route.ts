import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: types, error } = await supabase
        .from('membership_types')
        .select('*')
        .order('id')

    return NextResponse.json({ types, error })
}
