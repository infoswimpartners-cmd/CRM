import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('trio_slots')
    .select(`
      *,
      entries:trio_entries(
        id,
        payment_status,
        student:students(
          id,
          full_name,
          contact_email,
          contact_phone
        )
      )
    `);

  console.log('Result:', JSON.stringify(data?.[0], null, 2), error);
}

run();
