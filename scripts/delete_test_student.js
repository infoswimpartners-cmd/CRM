
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestStudent() {
    console.log('Deleting test student...');
    const { error } = await supabase
        .from('students')
        .delete()
        .eq('contact_email', 'test_second_student_curl@example.com');

    if (error) {
        console.error('Error deleting student:', error);
    } else {
        console.log('Test student deleted successfully.');
    }
}

deleteTestStudent();
