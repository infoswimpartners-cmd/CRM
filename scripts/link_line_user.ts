
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials for reliability in this script context
const supabaseUrl = "https://svsmgjulytmhlxcaczge.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2c21nanVseXRtaGx4Y2FjemdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwOTMxOSwiZXhwIjoyMDgzODg1MzE5fQ._uhEZEQz6Rytl3_98MuvTMjfe5uXdR3apzCLz4mHDqY";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const LINE_USER_ID = 'U0e5a7654874369ca5e38deb47fd783aa';
const TARGET_FULL_NAME = 'テスト太郎';

async function linkLineId() {
    console.log('Starting re-linking process...');

    // 1. Clear existing link(s) for this LINE ID (and print who was unlinked)
    console.log(`Clearing any existing links for LINE ID: ${LINE_USER_ID}...`);
    const { data: existing, error: searchError } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('line_user_id', LINE_USER_ID);

    if (existing && existing.length > 0) {
        console.log('Found existing link(s), clearing...', existing.map(s => `${s.full_name}`));
        for (const student of existing) {
            const { error: clearError } = await supabase
                .from('students')
                .update({ line_user_id: null })
                .eq('id', student.id);
            if (clearError) console.error(`Failed to clear student ${student.id}:`, clearError);
        }
    } else {
        console.log('No existing links found (or previous script failed).');
    }

    // 2. Search for "テスト太郎"
    console.log(`Searching for student: ${TARGET_FULL_NAME}...`);
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('full_name', TARGET_FULL_NAME)
        .limit(1);

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    let targetStudent;

    // 3. Create if not exists
    if (!students || students.length === 0) {
        console.log(`Student "${TARGET_FULL_NAME}" not found. Creating...`);
        const { data: newStudent, error: createError } = await supabase
            .from('students')
            .insert({
                full_name: TARGET_FULL_NAME,
                full_name_kana: 'テストタロウ',
                contact_email: 'test_taro@example.com', // Use correct column name if needed, assuming contact_email based on prev log
                line_user_id: LINE_USER_ID, // Link immediately
                status: 'active'
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating student:', createError);
            return;
        }
        targetStudent = newStudent;
        console.log('Created and linked new student:', targetStudent);
    } else {
        targetStudent = students[0];
        console.log(`Found student: ${targetStudent.full_name} (ID: ${targetStudent.id})`);

        // 4. Link
        console.log(`Linking LINE ID to ${targetStudent.full_name}...`);
        const { data: updated, error: updateError } = await supabase
            .from('students')
            .update({ line_user_id: LINE_USER_ID })
            .eq('id', targetStudent.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating student:', updateError);
        } else {
            console.log('Successfully linked LINE ID:', updated);
        }
    }
}

linkLineId();
