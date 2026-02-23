import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve('./.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
    await supabase.from('students').delete().eq('full_name', 'Webhook ValidationError')
    await supabase.from('students').delete().eq('full_name', 'Webhook Duplicate')
    await supabase.from('students').delete().eq('full_name', 'Webhook ParseError')
    console.log('Cleared error logs from DB.')
}
main()
