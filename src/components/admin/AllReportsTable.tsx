import { createClient } from '@/lib/supabase/server'
import { AllReportsTableClient } from './AllReportsTableClient'

export async function AllReportsTable() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const isCoach = profile?.role === 'coach'

    // If coach, get assigned student IDs to show their reports too
    let assignedStudentIds: string[] = []
    if (isCoach && user) {
        const { data: assigned } = await supabase
            .from('student_coaches')
            .select('student_id')
            .eq('coach_id', user.id)
        if (assigned) {
            assignedStudentIds = assigned.map(a => a.student_id)
        }
    }

    let query = supabase
        .from('lessons')
        .select(`
            *,
            profiles (
                full_name,
                email,
                avatar_url,
                role
            ),
            lesson_masters (
                name,
                is_trial,
                unit_price
            )
        `)

    if (isCoach && user) {
        if (assignedStudentIds.length > 0) {
            query = query.or(`coach_id.eq.${user.id},student_id.in.(${assignedStudentIds.join(',')})`)
        } else {
            query = query.eq('coach_id', user.id)
        }
    }

    const { data: reports } = await query
        .order('lesson_date', { ascending: false })
        .limit(200) // Increase limit slightly as we now have filtering

    const { data: lessonMasters } = await supabase
        .from('lesson_masters')
        .select('*')
        .order('name')

    if (!reports) return <div>データがありません</div>

    return (
        <AllReportsTableClient 
            initialReports={reports} 
            lessonMasters={lessonMasters || []} 
        />
    )
}

