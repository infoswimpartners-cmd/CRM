
import { createAdminClient } from './src/lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, contact_email, is_trio, trio_ticket_balance')
    .or('student_number.eq.0035,full_name.ilike.%テスト太郎%')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Student:', data);
  }
}

main();
