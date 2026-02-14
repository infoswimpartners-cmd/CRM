
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface Params {
    params: Promise<{
        id: string
    }>
}

export async function GET(request: Request, { params }: Params) {
    const supabase = await createClient()
    const { id: coachId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Allow admin or the coach themselves
    if (user.id !== coachId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    const key = `coach_bank:${coachId}`
    const { data: config } = await supabase
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

export async function PUT(request: Request, { params }: Params) {
    const supabase = await createClient()
    const { id: coachId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only Admin can update bank info (as per request "admin can edit")
    // Should Coach be able to edit? Usually yes, but user said "make it so admin can edit".
    // Let's allow Admin only for now to be safe, or check permissions.
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        // If strict requirement "admin can edit", maybe block coach?
        // But "edit company info... also transfer info... editable by admin"
        // Let's allow admin.
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const key = `coach_bank:${coachId}`
    const value = JSON.stringify(body)

    const { error } = await supabase
        .from('app_configs')
        .upsert({
            key,
            value,
            description: `Bank info for coach ${coachId}`
        }, { onConflict: 'key' })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
