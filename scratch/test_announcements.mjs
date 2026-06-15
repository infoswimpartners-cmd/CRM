import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// .env.local をロード
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Anon key exists:', !!supabaseAnonKey)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log('\n--- 1. Fetching announcements with profiles join ---')
    const { data, error } = await supabase
        .from('announcements')
        .select(`
            *,
            profiles:created_by ( full_name )
        `)
    
    if (error) {
        console.error('Error fetching announcements:', error)
    } else {
        console.log('Announcements fetched successfully:', data.length, 'records')
        console.log(JSON.stringify(data, null, 2))
    }

    console.log('\n--- 2. Fetching announcements directly ---')
    const { data: rawData, error: rawError } = await supabase
        .from('announcements')
        .select('*')
    if (rawError) {
        console.error('Raw Error:', rawError)
    } else {
        console.log('Raw announcements count:', rawData.length)
        if (rawData.length > 0) {
            console.log(JSON.stringify(rawData, null, 2))
        }
    }
}

test()
