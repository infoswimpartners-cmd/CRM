
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkColumn() {
    const { data, error } = await supabase
        .from('membership_types')
        .select('max_rollover_limit')
        .limit(1);

    if (error) {
        console.error('Error checking column:', error);
    } else {
        console.log('Column max_rollover_limit exists. Sample:', data);
    }
}

checkColumn();
