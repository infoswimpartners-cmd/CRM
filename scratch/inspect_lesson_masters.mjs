import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("=== Lesson Masters ===")
    const { data: masters, error: mErr } = await supabase
        .from('lesson_masters')
        .select('*')
    if (mErr) console.error(mErr)
    else console.log(masters)

    console.log("\n=== Recent Lessons ===")
    const { data: lessons, error: lErr } = await supabase
        .from('lessons')
        .select('id, student_name, lesson_date, price, billing_price, lesson_master_id, stripe_invoice_item_id')
        .order('lesson_date', { ascending: false })
        .limit(5)
    if (lErr) console.error(lErr)
    else console.log(lessons)

    console.log("\n=== Recent Lesson Schedules ===")
    const { data: schedules, error: sErr } = await supabase
        .from('lesson_schedules')
        .select('id, title, start_time, price, is_reported, is_overage, stripe_invoice_item_id')
        .order('start_time', { ascending: false })
        .limit(5)
    if (sErr) console.error(sErr)
    else console.log(schedules)
}
main()
