import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function repair() {
  const { data: slots } = await supabase.from('trio_slots').select('id');
  
  for (const slot of slots) {
    const { count } = await supabase
      .from('trio_entries')
      .select('*', { count: 'exact', head: true })
      .eq('slot_id', slot.id);
      
    const newStatus = (count || 0) >= 2 ? 'confirmed' : (count || 0) > 0 ? 'matching' : 'open';
    
    await supabase
      .from('trio_slots')
      .update({ reserved_count: count || 0, status: newStatus })
      .eq('id', slot.id);
      
    console.log(`Slot ${slot.id}: Updated count to ${count}`);
  }
  console.log("Repair completed.");
}
repair();
