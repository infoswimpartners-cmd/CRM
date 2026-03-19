import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .eq('id', '33dda43e-5c57-41c4-9303-6d9d907c43ab')
        .single()

    if (error) {
        console.error(error)
        return
    }
    console.log(data)
}
main()
