import { createAdminClient } from './src/lib/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert([{
      full_name: 'Test Taro',
      full_name_kana: 'テスト タロウ',
      contact_email: 'test@example.com',
      contact_phone: '09000000000',
      birth_date: '2000-01-01',
      status: 'active',
      is_trio: false
    }])
    .select('id')
    .single();

  console.log('Result:', data, error);
}

run();
