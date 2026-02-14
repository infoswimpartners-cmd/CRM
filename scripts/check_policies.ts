
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'lessons')

    if (error) {
        console.error('Error fetching policies:', error);
    } else {
        console.log('Policies on lessons table:');
        data.forEach((p: any) => {
            console.log(`- ${p.policyname} (${p.cmd}): ${p.qual} / ${p.with_check}`);
        })
    }
}

main();
