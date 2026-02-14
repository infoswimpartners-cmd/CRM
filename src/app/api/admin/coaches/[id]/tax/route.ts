
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

    // Check permissions (Admin only for now to see settings?)
    // Actually coaches might want to see it too.
    // Let's allow admin or self.
    if (user.id !== coachId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    const key = `coach_tax:${coachId}`
    const { data: config } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', key)
        .single()

    if (!config) {
        // Default: Enabled, 10.21%
        return NextResponse.json({ enabled: true, rate: 10.21 })
    }

    try {
        const taxInfo = JSON.parse(config.value)
        return NextResponse.json(taxInfo)
    } catch {
        return NextResponse.json({ enabled: true, rate: 10.21 })
    }
}

export async function PUT(request: Request, { params }: Params) {
    const supabase = await createClient()
    const { id: coachId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only Admin can change tax settings
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const key = `coach_tax:${coachId}`
    const value = JSON.stringify({
        enabled: !!body.enabled,
        rate: 10.21 // Fixed rate for now, but stored in JSON for future flexibility
    })

    const { error } = await supabase
        .from('app_configs')
        .upsert({
            key,
            value,
            description: `Tax settings for coach ${coachId}`
        }, { onConflict: 'key' })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
