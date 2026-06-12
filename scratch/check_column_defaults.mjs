import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    // We can run arbitrary SQL via RPC 'execute_sql' if it exists.
    // However, if we don't have SQL RPC, we can insert a student with only required fields and check what default values are assigned to apply_pair_membership_fee and apply_pair_pricing.
    // Let's perform a dry-run insert.
    console.log("Inserting a test student to inspect default values...")
    const tempStudentNumber = 'T' + Math.floor(1000 + Math.random() * 9000).toString()
    const { data: newStudent, error } = await supabase
        .from('students')
        .insert({
            full_name: 'デフォルト値テスト用',
            contact_email: 'test_default@example.com',
            student_number: tempStudentNumber,
            status: 'trial_pending'
        })
        .select('id, full_name, apply_pair_membership_fee, apply_pair_pricing')
        .single()

    if (error) {
        console.error("Insert error:", error)
        return
    }

    console.log("Inserted student successfully. Field values:")
    console.log(JSON.stringify(newStudent, null, 2))

    // Clean up
    console.log("Cleaning up test student...")
    const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', newStudent.id)
    
    if (deleteError) {
        console.error("Cleanup error:", deleteError)
    } else {
        console.log("Cleanup successful.")
    }
}
main()
