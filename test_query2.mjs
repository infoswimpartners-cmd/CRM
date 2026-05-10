import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: student } = await supabase.from('students').select('*').ilike('full_name', '%テスト太郎%').single();
  console.log("Student ID:", student?.id);

  if (student) {
    const res = await supabase
      .from('trio_entries')
      .select(`
        id,
        payment_status,
        slot:trio_slots (
          id,
          start_at,
          end_at,
          status
        )
      `)
      .eq('student_id', student.id);
    
    console.log("All entries (no filter):", JSON.stringify(res.data, null, 2));
    
    const res2 = await supabase
      .from('trio_entries')
      .select(`
        id,
        payment_status,
        slot:trio_slots!inner (
          id,
          start_at,
          end_at,
          status
        )
      `)
      .eq('student_id', student.id)
      .gt('slot.start_at', new Date().toISOString());

    console.log("Future entries (with filter):", JSON.stringify(res2.data, null, 2));
  }
}
test();
