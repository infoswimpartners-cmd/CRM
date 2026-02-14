
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateHistoricalPayments } from '@/lib/rewards'

export async function GET(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is coach or admin (admin might want to see specific coach?)
    // This route is primarily for the logged-in coach to see their own payments.
    // If admin wants to see, they should probably use a dynamic route or query param, 
    // but for now let's assume it's for the current user (Coach Dashboard).

    try {
        const history = await calculateHistoricalPayments(supabase, user.id, 12)
        return NextResponse.json(history)
    } catch (error) {
        console.error('Error fetching payments:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
