
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkEnrollmentTemplateDetails() {
    console.log("Checking for 'enrollment_complete' template details...");
    const { data } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('key', 'enrollment_complete')
        .single();

    if (data) {
        console.log('Subject:', data.subject);
        console.log('Variables:', data.variables);
        console.log('Body:', data.body);
    } else {
        console.log('Template NOT FOUND');
    }
}

checkEnrollmentTemplateDetails();
