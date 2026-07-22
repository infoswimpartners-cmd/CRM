import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log("--- lesson_masters ---");
  const { data: lm } = await supabase.from('lesson_masters').select('id, name, unit_price, pair_unit_price, is_trial').order('name');
  console.log(lm);

  console.log("--- membership_types ---");
  const { data: mt } = await supabase.from('membership_types').select('id, name, fee, pair_fee, is_package, active').order('name');
  console.log(mt);
}

main().catch(console.error);
