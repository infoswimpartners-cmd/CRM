import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve('./.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
    const { data } = await supabase.from('students').select('*').eq('full_name', 'Webhook ValidationError').order('created_at', { ascending: false }).limit(2)
    console.log(JSON.stringify(data, null, 2))
}
main()
