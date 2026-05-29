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
  
  // membership_types からアクティブなプランを取得（月次・パッケージ両方）
  const { data: dbPlans } = await supabase
    .from('membership_types')
    .select('id, name, fee, stripe_price_id, active, display_order, is_package, ticket_count')
    .eq('active', true)
    .order('display_order', { ascending: true });

  // 月次プランの対象名称
  const targetNames = [
    '月4回（60分）',
    '月4回（90分）',
    '月4回 (120分)',
    '月2回（60分）',
    '月2回（90分）',
    '月2回 (120分)',
    '単発'
  ];

  // 月次プラン（名称で絞り込み） + パッケージプラン（is_package=true）を統合
  const filteredPlans = (dbPlans || [])
    .filter((plan: any) => targetNames.includes(plan.name) || plan.is_package === true);

  return <EnrollmentForm dbPlans={filteredPlans} />;
}
