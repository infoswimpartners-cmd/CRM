
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudent() {
    console.log('Checking for student with email: test_second_student_curl@example.com');
    const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('contact_email', 'test_second_student_curl@example.com')
        .single();

    if (error) {
        console.error('Error fetching student:', error);
    } else {
        console.log('--- Student Found ---');
        console.log('ID:', student.id);
        console.log('Name:', student.full_name);
        console.log('2nd Name:', student.second_student_name);
        console.log('2nd Kana:', student.second_student_name_kana);
        console.log('---------------------');
    }
}

checkStudent();
