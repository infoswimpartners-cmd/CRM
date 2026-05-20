import { createClient } from '@/lib/supabase/server';
import EnrollmentForm from '@/components/forms/EnrollmentForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'オンライン入会お手続き | Swim Partners',
  description: 'Swim Partners のオンライン入会お手続きフォームです。ご希望のプランを選択し、利用規約に同意の上、クレジットカード決済登録へお進みください。',
};

export default async function EnrollPage() {
  const supabase = await createClient();
  
  // membership_types からアクティブなプランを取得
  const { data: dbPlans } = await supabase
    .from('membership_types')
    .select('id, name, fee, stripe_price_id, active, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true });

  return <EnrollmentForm dbPlans={dbPlans || []} />;
}
