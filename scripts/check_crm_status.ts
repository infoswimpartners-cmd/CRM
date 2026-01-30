import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkPaymentStatus() {
    console.log('Checking for recent payment confirmations...')

    // Look for students updated recently to 'trial_confirmed'
    const { data: confirmed, error } = await supabase
        .from('students')
        .select('id, full_name, status, updated_at')
        .eq('status', 'trial_confirmed')
        .order('updated_at', { ascending: false })
        .limit(1)

    if (confirmed && confirmed.length > 0) {
        console.log('✅ Found confirmed payment:', confirmed[0])
    } else {
        console.log('No confirmed payments found yet. Checking pending...')
        // Check pending
        const { data: pending } = await supabase
            .from('students')
            .select('id, full_name, status, updated_at')
            .eq('status', 'trial_pending')
            .order('updated_at', { ascending: false })
            .limit(1)

        if (pending && pending.length > 0) {
            console.log('⏳ Still Pending:', pending[0])
        } else {
            console.log('No pending trials found.')
        }
    }
}

checkPaymentStatus()
