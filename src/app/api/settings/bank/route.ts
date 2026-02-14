
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js' // Or createServerClient with service key
// Actually easiest is to use createClient() for AUTH check, then a separate admin client for DB write.
// But wait, server.ts creates a client with cookies.
// We should import our admin client if available.

import { NextResponse } from 'next/server'

// Service Role Client for bypassing RLS
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Common keys for bank info
export const BANK_KEYS = [
    'bank_name',
    'branch_name',
    'account_type',
    'account_number',
    'account_holder_name'
]

export async function GET(request: Request) {
    const supabase = await createClient()

    // 1. Get Current User (Check Auth)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch Configs (Use Service Role if `app_configs` has RLS blocking reads? Or use normal client if read is allowed)
    // Assuming read is allowed for Authenticated users, let's use normal client first.
    // If read fails, we switch to admin.
    // But since we are changing key structure to `coach_bank:${user.id}`, let's be consistent.

    const key = `coach_bank:${user.id}`

    // Using Admin client for safety against RLS blocking
    const { data: config } = await supabaseAdmin
        .from('app_configs')
        .select('value')
        .eq('key', key)
        .single()

    if (!config) {
        return NextResponse.json({})
    }

    try {
        const bankInfo = JSON.parse(config.value)
        return NextResponse.json(bankInfo)
    } catch {
        return NextResponse.json({})
    }
}

export async function PUT(request: Request) {
    const supabase = await createClient()

    // 1. Get Current User (Check Auth)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const key = `coach_bank:${user.id}`

    // 2. Prepare Data
    const safeBody: Record<string, string> = {}
    BANK_KEYS.forEach(k => {
        if (body[k] !== undefined) safeBody[k] = body[k]
    })
    const value = JSON.stringify(safeBody)

    // 3. Upsert using Admin Client (Bypass RLS)
    const { error } = await supabaseAdmin
        .from('app_configs')
        .upsert({
            key,
            value,
            description: `Bank info for coach ${user.id} (Self-update)`
        }, { onConflict: 'key' })

    if (error) {
        console.error('Error updating bank info:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
