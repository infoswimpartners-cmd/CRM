import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkSchedules() {
    const { data: schedules, error } = await supabaseAdmin
        .from('lesson_schedules')
        .select(`
            id,
            student_id,
            title,
            start_time,
            end_time,
            billing_status,
            profiles(full_name)
        `)
        .order('start_time', { ascending: false })

    if (error) {
        console.error("Error fetching schedules:", error)
    } else {
        console.log(`Total schedules: ${schedules?.length}`)
        if (schedules && schedules.length > 0) {
            console.log("Sample schedules:", schedules.slice(0, 3))
        }

        // どの生徒に何件あるか集計
        const counts: Record<string, number> = {}
        schedules?.forEach(s => {
            const sid = s.student_id ? s.student_id : 'null'
            counts[sid] = (counts[sid] || 0) + 1
        })
        console.log("Schedules per student_id:", counts)
    }
}

checkSchedules()
