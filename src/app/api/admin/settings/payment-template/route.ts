
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use Admin Client to bypass RLS (just in case)
    const adminClient = createAdminClient()

    const keys = [
        'payment_slip_title',
        'payment_slip_header_paid',
        'payment_slip_header_processing',
        'payment_slip_footer'
    ]

    const { data: configs, error } = await adminClient
        .from('app_configs')
        .select('*')
        .in('key', keys)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result: Record<string, string> = {}
    configs?.forEach(c => {
        result[c.key] = c.value
    })

    return NextResponse.json(result)
}

export async function POST(request: Request) {
    const supabase = await createClient()

    // Admin check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates = Object.entries(body).map(([key, value]) => ({
        key,
        value: String(value),
        description: 'Updated via Admin Settings'
    }))

    const { error } = await supabase
        .from('app_configs')
        .upsert(updates, { onConflict: 'key' })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
