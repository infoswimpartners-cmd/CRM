import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createAdminClient } from '../lib/supabase/admin'

async function checkErrors() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .or('full_name.eq.Webhook ParseError,full_name.eq.Webhook ValidationError')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching data:', error)
        return
    }

    console.log(`Found ${data?.length || 0} error records.`)
    data?.forEach(row => {
        console.log(`--- Record ID: ${row.id} | Created: ${row.created_at} ---`)
        console.log(`Name: ${row.full_name}`)
        console.log(`Email: ${row.contact_email}`)
        console.log(`Notes:\n${row.notes}`)
    })
}

checkErrors()
