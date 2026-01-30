
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking database schema for second_student_name_kana...');

    // We can't query information_schema directly via JS client easily unless we have a function or direct SQL access.
    // Instead, we can try to selecting the column from students table with limit 1.
    // If column doesn't exist, it should throw an error.

    const { data, error } = await supabase
        .from('students')
        .select('second_student_name_kana')
        .limit(1);

    if (error) {
        console.error('Schema Check Failed:', error);
        if (error.code === '42703') { // Undefined column
            console.error('Column second_student_name_kana does NOT exist.');
        }
    } else {
        console.log('Schema Check Passed. Column exists.');
    }
}

checkSchema();
