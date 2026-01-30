
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkStudent() {
    const email = 'shinshin980312kodai@gmail.com';
    console.log(`Checking for student with email: ${email}`);

    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('contact_email', email);

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Student found:', data[0]);
    } else {
        console.log('Student NOT found.');
    }
}

checkStudent();
