import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read env variables from .env.local
const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
        let value = match[2] ? match[2].trim() : ''
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1)
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1)
        }
        env[match[1]] = value
    }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not found')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('=== Recent 10 Lessons (Reported) ===')
    const { data: lessons, error: err1 } = await supabase
        .from('lessons')
        .select('id, coach_id, student_id, student_name, lesson_date, location, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    if (err1) {
        console.error('Error fetching lessons:', err1)
    } else {
        lessons.forEach(l => {
            console.log(`ID: ${l.id} | Student: ${l.student_name} (${l.student_id}) | Date: ${l.lesson_date} | Coach: ${l.coach_id} | Created: ${l.created_at}`)
        })
    }

    console.log('\n=== Recent 10 Lesson Schedules ===')
    const { data: schedules, error: err2 } = await supabase
        .from('lesson_schedules')
        .select('id, coach_id, student_id, start_time, is_reported, title')
        .order('start_time', { ascending: false })
        .limit(10)

    if (err2) {
        console.error('Error fetching schedules:', err2)
    } else {
        schedules.forEach(s => {
            console.log(`ID: ${s.id} | Student ID: ${s.student_id} | Start: ${s.start_time} | Reported: ${s.is_reported} | Title: ${s.title}`)
        })
    }
}

main().catch(console.error)
