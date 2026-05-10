import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing with 'slot.start_at'...");
  const res1 = await supabase
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
    .gt('slot.start_at', new Date().toISOString())
    .limit(5);
  console.log("Result 1 Error:", res1.error);

  console.log("\nTesting with 'trio_slots.start_at'...");
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
    .gt('trio_slots.start_at', new Date().toISOString())
    .limit(5);
  console.log("Result 2 Error:", res2.error);
}

test();
