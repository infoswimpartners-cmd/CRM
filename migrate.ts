import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { error } = await supabase.rpc('execute_sql', { 
    sql: 'ALTER TABLE trio_entries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;' 
  });
  if (error) {
    console.error('Migration failed:', error);
    // If execute_sql is not available, we might need another way or just assume the user will run it.
    // However, I can try to run it via a direct raw query if I have the right permissions.
  } else {
    console.log('Migration successful: expires_at added to trio_entries');
  }
}

run();
