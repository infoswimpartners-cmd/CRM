
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Not logged in</div>

    // 1. Raw Count
    const { count: rawCount, error: rawError } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)

    // 2. Filtered Count (3 months)
    const today = new Date()
    const threeMonthsAgo = startOfMonth(subMonths(today, 3))
    const { count: filteredCount, error: filteredError } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .gte('lesson_date', threeMonthsAgo.toISOString())

    // 3. Simple Fetch (First 5)
    const { data: simpleData, error: simpleError } = await supabase
        .from('lessons')
        .select('*')
        .eq('coach_id', user.id)
        .limit(5)

    // 4. Joined Fetch (as used in Dashboard)
    const { data: joinedData, error: joinedError } = await supabase
        .from('lessons')
        .select(`
            *,
            lesson_masters ( id, name ),
            students ( id, full_name, membership_types ( id ) )
        `)
        .eq('coach_id', user.id)
        .limit(5)

    return (
        <div className="p-8 space-y-4 font-mono text-sm">
            <h1 className="text-xl font-bold">Debug Info</h1>
            <div>User ID: {user.id}</div>
            
            <div className="border p-4 rounded bg-slate-50">
                <h2 className="font-bold">1. Raw Count</h2>
                <pre>{JSON.stringify({ rawCount, rawError }, null, 2)}</pre>
            </div>

            <div className="border p-4 rounded bg-slate-50">
                <h2 className="font-bold">2. Filtered Count ({threeMonthsAgo.toISOString()})</h2>
                <pre>{JSON.stringify({ filteredCount, filteredError }, null, 2)}</pre>
            </div>

            <div className="border p-4 rounded bg-slate-50">
                <h2 className="font-bold">3. Simple Data (Top 5)</h2>
                <pre>{JSON.stringify({ simpleData, simpleError }, null, 2)}</pre>
            </div>

             <div className="border p-4 rounded bg-slate-50">
                <h2 className="font-bold">4. Joined Data (Top 5)</h2>
                <pre>{JSON.stringify({ joinedData, joinedError }, null, 2)}</pre>
            </div>
        </div>
    )
}
