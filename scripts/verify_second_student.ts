
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudent() {
    const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('contact_email', 'test_second_student_curl@example.com')
        .single();

    if (error) {
        console.error('Error fetching student:', error);
    } else {
        console.log('Student found:', student);
        console.log('Second Student Name:', student.second_student_name);
        console.log('Second Student Kana:', student.second_student_name_kana);
    }
}

checkStudent();
