import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // admin/page.tsx のクエリのテスト
  const { data: adminData, error: adminError } = await supabase
    .from('membership_change_requests')
    .select(`
        *,
        student:students ( id, full_name, student_number ),
        requested:membership_types!requested_membership_type_id ( name )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  console.log('Admin dashboard query error:', adminError);
  console.log('Admin data count:', adminData ? adminData.length : 0);

  // customers/[id]/page.tsx のクエリテスト
  const { data: customerData, error: customerError } = await supabase
    .from('membership_change_requests')
    .select('*, requested:membership_types!requested_membership_type_id(name)')
    .eq('student_id', 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff')
    .eq('status', 'pending')
    .limit(1);

  console.log('Customer page query error:', customerError);
  console.log('Customer data count:', customerData ? customerData.length : 0);

  // membership.ts のクエリテスト
  const { data: approveData, error: approveError } = await supabase
    .from('membership_change_requests')
    .select('*, requested:membership_types!requested_membership_type_id ( lock_period_months )')
    .eq('id', '99999999-9999-9999-9999-999999999999')
    .single();

  console.log('Approve action query error:', approveError);
  console.log('Approve data:', approveData ? 'found' : 'not found');

  // member/billing/page.tsx のクエリテスト
  const { data: billingData, error: billingError } = await supabase
    .from('membership_change_requests')
    .select('*, requested:membership_types!requested_membership_type_id(name)')
    .eq('student_id', 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff')
    .eq('status', 'pending')
    .limit(1);

  console.log('Billing page query error:', billingError);
  console.log('Billing data count:', billingData ? billingData.length : 0);
}

run();
