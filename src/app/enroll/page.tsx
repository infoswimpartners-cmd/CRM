import { createAdminClient } from '@/lib/supabase/admin';
import EnrollmentForm from '@/components/forms/EnrollmentForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'オンライン入会お手続き | Swim Partners',
  description: 'Swim Partners のオンライン入会お手続きフォームです。ご希望のプランを選択し、利用規約に同意の上、クレジットカード決済登録へお進みください。',
};

export default async function EnrollPage() {
  const supabase = createAdminClient();
  
  // membership_types からアクティブなプランを取得
  const { data: dbPlans } = await supabase
    .from('membership_types')
    .select('id, name, fee, stripe_price_id, active, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true });

  // 一般入会フォームに表示する標準プラン（表示順通りに定義）
  const targetNames = ['月4回（60分）', '月2回（60分）', '単発'];

  // 対象のプランのみを抽出し、指定順にソート
  const filteredPlans = (dbPlans || [])
    .filter((plan) => targetNames.includes(plan.name))
    .sort((a, b) => targetNames.indexOf(a.name) - targetNames.indexOf(b.name));

  return <EnrollmentForm dbPlans={filteredPlans} />;
}
