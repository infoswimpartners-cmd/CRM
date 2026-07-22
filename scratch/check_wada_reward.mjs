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
        price,
        billing_price,
        base_price,
        base_reward,
        final_billing_amount,
        final_reward_amount,
        lesson_masters (
            id,
            name
        ),
        profiles (
            id,
            full_name
        )
    `)
    .eq('student_id', '54e8774b-5b5d-4975-8de8-bf835b06d644')
    .order('created_at', { ascending: false })
    .limit(5)
    
  console.log('Error:', error)
  console.log('Recent lessons for Wada:', JSON.stringify(lessons, null, 2))
}
run()
