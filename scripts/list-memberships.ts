
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listMemberships() {
    const { data, error } = await supabase
        .from('membership_types')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Membership Types:', data);
}

listMemberships();
