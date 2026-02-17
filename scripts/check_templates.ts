
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplates() {
    const { data, error } = await supabase.from('email_templates').select('key, subject');
    if (error) {
        console.error(error);
    } else {
        console.table(data);
    }
}
checkTemplates();
