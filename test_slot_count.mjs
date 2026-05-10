import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const slotId = '1640d845-1c62-4527-be58-f475369d4ed0';
  
  const { data: slot } = await supabase
    .from('trio_slots')
    .select('id, reserved_count, status')
    .eq('id', slotId)
    .single();
    
  const { count } = await supabase
    .from('trio_entries')
    .select('*', { count: 'exact', head: true })
    .eq('slot_id', slotId);

  console.log("Slot Data:", slot);
  console.log("Actual Entry Count:", count);
}
test();
