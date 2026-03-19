import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%テスト太郎%')
        .single();

    if (error) {
        console.error(error)
        return
    }

    console.log(JSON.stringify(student, null, 2));
}
main()
