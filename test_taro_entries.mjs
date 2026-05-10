import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: student } = await supabase.from('students').select('id, full_name').ilike('full_name', '%テスト太郎%').single();
  console.log("Student:", student);

  if (student) {
    const { data: entries } = await supabase
      .from('trio_entries')
      .select(`
        id,
        slot_id,
        slot:trio_slots (
          id,
          start_at,
          reserved_count,
          status
        )
      `)
      .eq('student_id', student.id);
    
    console.log("Entries for Test Taro:", JSON.stringify(entries, null, 2));
  }
}
test();
