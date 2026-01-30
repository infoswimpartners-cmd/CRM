
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkEnrollmentTemplate() {
    console.log("Checking for 'enrollment_complete' template...");
    const { data, error } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('key', 'enrollment_complete')
        .maybeSingle();

    if (error) {
        console.error('Error fetching template:', error);
    } else if (!data) {
        console.log('Template NOT FOUND.');
    } else {
        console.log('Template FOUND:', data.subject);
    }
}

checkEnrollmentTemplate();
