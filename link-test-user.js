const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// 1. 環境変数の読み込み
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Service Role Key missing in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const email = 'shinshin980312kodai@gmail.com';
    console.log('Searching for users by email:', email);

    // 2. auth.users からユーザーを取得
    const { data: usersData, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
        console.error('Error fetching users:', authErr);
        return;
    }

    const user = usersData?.users.find(u => u.email === email);
    if (!user) {
        console.log('No user found in auth.users with email:', email);
        return;
    }
    console.log('Found Auth User:', user.id);

    // 3. students テーブルからメールアドレスで検索
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, full_name, contact_email, auth_user_id')
        .ilike('contact_email', email);

    if (sErr) {
        console.error('Error fetching students:', sErr);
        return;
    }

    console.log('Students with email:', students);

    if (students && students.length > 0) {
        const student = students[0];
        console.log('Current student auth_user_id:', student.auth_user_id);

        if (student.auth_user_id !== user.id) {
            console.log(`Linking student ID: ${student.id} to user ID: ${user.id}`);

            const { error: updErr } = await supabase
                .from('students')
                .update({ auth_user_id: user.id })
                .eq('id', student.id);

            if (updErr) {
                console.error('Failed to update student:', updErr);
            } else {
                console.log('Successfully linked the student record!');
            }
        } else {
            console.log('The student record is already correctly linked!');
        }
    } else {
        console.log('No student record found with this email in the "students" table. Creating a dummy record...');

        const { data: newStudent, error: createError } = await supabase
            .from('students')
            .insert({
                full_name: 'Shinyoshi Kodai',
                contact_email: email,
                auth_user_id: user.id,
                status: 'active'
            })
            .select()
            .single();

        if (createError) {
            console.error('Failed to create student:', createError);
        } else {
            console.log('Successfully created and linked new student:', newStudent);
        }
    }
}

run();
