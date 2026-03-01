const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing keys!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = 'shinshin980312kodai@gmail.com';
  
  // 1. Get the auth user
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  const user = usersData?.users.find(u => u.email === email);
  console.log('Auth User:', user ? { id: user.id, email: user.email } : 'Not found in auth.users');
  if (!user) return;

  // 2. See if any student matches the email
  const { data: students, error: studentErr } = await supabase
    .from('students')
    .select('id, full_name, contact_email, auth_user_id')
    .ilike('contact_email', email);
    
  console.log('Students matching email:', students);

  // 3. See if any student matches the auth_user_id
  const { data: linkedStudents } = await supabase
    .from('students')
    .select('id, full_name, contact_email, auth_user_id')
    .eq('auth_user_id', user.id);
    
  console.log('Students matching auth_user_id:', linkedStudents);

  if (students && students.length > 0) {
      // Force linking
      const { error: updateError } = await supabase.from('students').update({ auth_user_id: user.id }).eq('id', students[0].id);
      console.log('Update result:', updateError || 'Success!');
  }
}

check();
