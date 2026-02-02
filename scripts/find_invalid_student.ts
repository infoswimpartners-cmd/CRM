
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findStudent() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_started_at, stripe_customer_id')
        .limit(5)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Students:', data)
    }
}

findStudent()
