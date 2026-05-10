import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Admin key

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: student } = await supabase.from('students').select('id').ilike('full_name', '%テスト太郎%').single();
  
  const { data: entries, error } = await supabase
    .from('trio_entries')
    .select(`
      id,
      payment_status,
      slot:trio_slots!inner (
        id,
        start_at,
        end_at,
        status,
        reserved_count
      )
    `)
    .eq('student_id', student.id)
    .gt('slot.start_at', new Date().toISOString())
    .order('start_at', { ascending: true, foreignTable: 'slot' });

  console.log("Error:", error);
  console.log("Full Result:", JSON.stringify(entries, null, 2));
}
test();
