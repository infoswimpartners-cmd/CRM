import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createAdminClient } from '../lib/supabase/admin'

async function listStudents() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching data:', error)
        return
    }

    console.log(`Found ${data?.length || 0} recent student records.`)
    data?.forEach(row => {
        console.log(`--- Student ID: ${row.id} | Created: ${row.created_at} ---`)
        console.log(`Name: ${row.full_name} (${row.full_name_kana || 'No Kana'})`)
        console.log(`Email: ${row.contact_email} | Phone: ${row.contact_phone}`)
        console.log(`Status: ${row.status}`)
        console.log(`Notes:\n${row.notes}`)
    })
}

listStudents()
