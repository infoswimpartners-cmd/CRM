
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
    console.log('--- Fetching all columns from students table ---')

    // 1件取得を試みる (カラム情報を得るため)
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching students:', error)
    } else if (data && data.length > 0) {
        console.log('Columns found in a row:', Object.keys(data[0]))
    } else {
        console.log('Table is empty, but let\'s try to see if we can get structure via a broad select.')
        // 空の場合でも、見つからないカラムを指定してエラーが出れば、そのカラムは存在しないことがわかる
        const testColumns = [
            'id', 'full_name', 'second_student_name', 'second_student_birth_date',
            'stripe_customer_id', 'status'
        ]

        for (const col of testColumns) {
            const { error: colError } = await supabase.from('students').select(col).limit(0)
            if (colError) {
                console.log(`Column [${col}]: NOT FOUND (Error: ${colError.message})`)
            } else {
                console.log(`Column [${col}]: EXISTS`)
            }
        }
    }
}

checkSchema()
