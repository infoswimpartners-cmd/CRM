
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplate() {
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('key', 'trial_payment_request');

    if (error) {
        console.error('Error fetching template:', error);
    } else {
        console.log('Template found:', data);
    }
}

checkTemplate();
