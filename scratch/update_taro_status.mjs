import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .update({ status: 'trial_confirmed' })
        .eq('id', 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff')
        .select();

    if (error) {
        console.error("Error updating status:", error)
        return
    }

    console.log("Successfully updated test taro status to trial_confirmed!");
    console.log(data);
}
main()
