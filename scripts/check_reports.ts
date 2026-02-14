
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data: reports, error } = await supabase
        .from('lessons')
        .select(`
      id,
      lesson_date,
      student_name,
      price,
      billing_price,
      lesson_master_id,
      lesson_masters ( name, is_trial )
    `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching reports:', error);
        return;
    }

    console.log('Recent Reports:');
    reports.forEach((r) => {
        // @ts-ignore
        const masterName = r.lesson_masters ? r.lesson_masters.name : 'Unknown';
        // @ts-ignore
        const isTrial = r.lesson_masters ? r.lesson_masters.is_trial : 'Unknown';
        console.log(`- Date: ${r.lesson_date}, Student: ${r.student_name}, Master: ${masterName} (Trial: ${isTrial}), ID: ${r.lesson_master_id}`);
        console.log(`  Price: ${r.price}, Billing: ${r.billing_price}`);
    });
}

main();
