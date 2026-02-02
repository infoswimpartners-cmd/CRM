
import { checkStudentLessonStatus } from '../src/actions/lesson_schedule'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Mock Supabase environment for the server action
// (Note: server actions usually run in Next.js context, but this might work if it only uses supabase-js)
// Actually, 'checkStudentLessonStatus' uses 'createClient' from '@/lib/supabase/server' which relies on cookies/headers.
// This might fail in a script. 
// Instead, I will copy the logic of checkStudentLessonStatus into this script to simulate it 1:1.

import { createClient } from '@supabase/supabase-js'
import { startOfMonth, endOfMonth, addMonths } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const studentId = '4718c96d-fca9-46c6-b47d-21c52d1058aa'
const dateStr = '2026-02-01T10:00:00.000Z' // e.g. Trying to book for Feb 1st

async function runDebug() {
    console.log(`Checking status for ${studentId} on ${dateStr}`)

    // 1. Fetch Student like the action does
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
            id,
            membership_started_at,
            created_at,
            membership_types!students_membership_type_id_fkey (
                name,
                monthly_lesson_limit,
                max_rollover_limit
            )
        `).eq('id', studentId)
        .single()

    if (studentError) {
        console.error('Student Error:', studentError)
        return
    }

    console.log('Student Info:', {
        started_at: student.membership_started_at,
        created_at: student.created_at,
        membership: student.membership_types
    })

    // 2. Run Calculation Logic
    // @ts-ignore
    const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
    const limit = membership?.monthly_lesson_limit || 0
    const maxRollover = membership?.max_rollover_limit || 0
    const targetDate = new Date(dateStr)

    // Re-implement calculateMonthlyUsage logic here to match exactly what is on server
    const calculateUsage = async () => {
        // ... (The exact logic I deployed)
        // 2. Previous Month Rollover calculation
        let rollover = 0
        if (limit > 0 && maxRollover > 0) {
            const prevDate = addMonths(targetDate, -1)
            const prevStart = startOfMonth(prevDate).toISOString()
            const prevEnd = endOfMonth(prevDate).toISOString()

            let canHaveRollover = true
            const effectiveStartDateStr = student.membership_started_at || student.created_at

            if (effectiveStartDateStr) {
                const JST_OFFSET = 9 * 60 * 60 * 1000
                const startUtcTime = new Date(effectiveStartDateStr).getTime()
                const startJstTime = startUtcTime + JST_OFFSET
                const startJstDate = new Date(startJstTime)

                const targetUtcTime = targetDate.getTime()
                const targetJstTime = targetUtcTime + JST_OFFSET
                const targetJstDate = new Date(targetJstTime)

                const startMonthCode = startJstDate.getUTCFullYear() * 100 + startJstDate.getUTCMonth()
                const targetMonthCode = targetJstDate.getUTCFullYear() * 100 + targetJstDate.getUTCMonth()

                console.log(`[Debug] JST Compare: Start ${startMonthCode} vs Target ${targetMonthCode}`)

                if (startMonthCode >= targetMonthCode) {
                    canHaveRollover = false
                    console.log('Rollover DISABLED')
                } else {
                    console.log('Rollover ENABLED')
                }
            }

            return { rollover: canHaveRollover ? 1 : 0 } // simplified
        }
        return { rollover: 0 }
    }

    const res = await calculateUsage()
    console.log('Result:', res)
}

runDebug()
