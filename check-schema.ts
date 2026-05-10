import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'trio_entries' });
  if (error) {
    // If rpc not available, just try to select 1
    const { data: cols } = await supabase.from('trio_entries').select('*').limit(1);
    console.log('Columns:', Object.keys(cols?.[0] || {}));
  } else {
    console.log('Schema:', data);
  }
}

run();
