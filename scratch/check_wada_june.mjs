import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select(`
        id, 
        student_id, 
        student_name,
        coach_id,
        lesson_date,
        price,
        billing_price,
        base_price,
        base_reward,
        final_billing_amount,
        final_reward_amount,
        lesson_master_id,
        lesson_masters (
            id,
            name
        ),
        students (
            id,
            full_name,
            membership_types:membership_types!students_membership_type_id_fkey (
                id,
                name,
                membership_type_lessons (
                    lesson_master_id,
                    reward_price
                )
            )
        )
    `)
    .eq('student_id', '54e8774b-5b5d-4975-8de8-bf835b06d644')
    .gte('lesson_date', '2026-06-01')
    .lte('lesson_date', '2026-06-30')
    
  console.log('Error:', error)
  console.log('June lessons for Wada:', JSON.stringify(lessons, null, 2))
}
run()
