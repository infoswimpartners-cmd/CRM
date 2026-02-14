
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    console.log('Fetching recent lessons...')

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
            id, lesson_date, coach_id, price,
            profiles (full_name)
        `)
        .order('lesson_date', { ascending: false })
        .limit(10)

    if (error) {
        console.error(error)
        return
    }

    console.log(`Found ${lessons.length} recent lessons:`)
    lessons.forEach(l => {
        // @ts-ignore
        console.log(`- ${l.lesson_date}: Coach ${l.coach_id} (${l.profiles?.full_name}), Price: ${l.price}`)
    })

    if (lessons.length > 0) {
        const coachId = lessons[0].coach_id
        console.log(`\nChecking Profile for Coach: ${coachId}`)
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', coachId)
            .single()
        console.log('Profile:', profile)
    }
}

main()
