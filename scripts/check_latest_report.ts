
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log('Checking latest lesson report...');
    const { data, error } = await supabase
        .from('lessons')
        .select('*, profiles(full_name), lesson_masters(name)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching latest report:', error);
    } else {
        console.log('Latest Report:', data);
    }
}

main();
