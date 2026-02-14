
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()

    // Allow coaches to read company info (for payment notice)
    // Check auth?
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keys = [
        'company_name',
        'company_address',
        'invoice_registration_number',
        'contact_email',
        'company_payment_bank_name'
    ]

    const { data: configs, error } = await supabase
        .from('app_configs')
        .select('*')
        .in('key', keys)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to object
    const result: Record<string, string> = {}
    configs?.forEach(c => {
        result[c.key] = c.value
    })

    return NextResponse.json(result)
}

export async function POST(request: Request) {
    const supabase = await createClient()

    // Check admin
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
