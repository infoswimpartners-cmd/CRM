import { createAdminClient } from '@/lib/supabase/admin';
import EnrollmentForm from '@/components/forms/EnrollmentForm';
import { getAppConfig } from '@/actions/app_configs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'オンライン入会お手続き | Swim Partners',
  description: 'Swim Partners のオンライン入会お手続きフォームです。ご希望のプランを選択し、利用規約に同意の上、クレジットカード決済登録へお進みください。',
};

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; preview?: string }>;
}) {
  const params = await searchParams;
  const defaultPlanId = params.plan || '';
  const isPreview = params.preview === 'true';
  const supabase = createAdminClient();

  // 入会フォーム用同意事項チェックリスト設定の読み込み
  const defaultTerms = [
    {
      id: "billing-monthly",
      label: "クレジットカード決済の同意 (月謝プラン用)",
      text: "利用規約およびプライバシーポリシーに同意し、クレジットカード決済による毎月の月謝の自動引き落とし（継続課金）を承諾します。",
      target: "monthly"
    },
    {
      id: "billing-package",
      label: "クレジットカード決済の同意 (パッケージプラン用)",
      text: "利用規約およびプライバシーポリシーに同意し、パッケージプランの一括決済（クレジットカード決済）を行うことに同意します。",
      target: "package"
    },
    {
      id: "cancel",
      label: "キャンセル規定の同意",
      text: "前日18:00以降のレッスンキャンセルについては、理由を問わず「受講1回分の消化（またはキャンセル料100%）」の取り扱いとなることを承諾します。",
      target: "all"
    },
    {
      id: "initial-lessons",
      label: "初回レッスン枠自動割り当ての同意",
      text: "体験レッスン後、初回月謝プランによる正式な第1回目・第2回目のレッスン枠については、コーチの手配を迅速に行うために事務局による自動割り当て（または指定手配）となることを承諾します。",
      target: "monthly"
    }
  ];
  const consentTermsJson = await getAppConfig('enroll_consent_terms') || JSON.stringify(defaultTerms);

  // 入会フォーム用受講ルールチェックリスト設定の読み込み（デフォルト値をフォールバックに設定）
  const defaultRules = [
    {
      id: "rule-facility-fee",
      label: "コーチの交通費・施設利用料",
      text: "コーチの交通費・施設利用料がすべて含まれています。",
      target: "all"
    },
    {
      id: "rule-transfer-period",
      label: "振替の有効期間 (月謝用)",
      text: "振替の有効期間は【2ヶ月間】となります。",
      target: "monthly"
    },
    {
      id: "rule-no-admission-fee",
      label: "入会金・年会費不要",
      text: "入会金・年会費は一切かかりません。",
      target: "all"
    },
    {
      id: "rule-package-guarantee",
      label: "完泳保証 (パッケージ用)",
      text: "プロの完泳保証付き（万が一12回で泳げなかった場合、最大4回分の補講レッスンを無償提供）。",
      target: "package"
    }
  ];
  const consentRulesJson = await getAppConfig('enroll_rules_terms') || JSON.stringify(defaultRules);
  
  // 単発レッスン料金表示設定の読み込み
  const showSinglePrices = await getAppConfig('enroll_show_single_prices') || 'true';

  // 1. 「単発」プランの会員区分（membership_types）をDBから取得
  const { data: singlePlanObj } = await supabase
    .from('membership_types')
    .select('id')
    .or('name.eq.単発,name.eq.単発プラン')
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  let singleLessons: { id: string; name: string; unit_price: number }[] = [];

  // 2. 単発プランが存在すれば、その「標準レッスン」チェックリスト（membership_type_lessons）から取得
  if (singlePlanObj) {
    const { data: lessonsData } = await supabase
      .from('membership_type_lessons')
      .select(`
        unit_price,
        lesson_master:lesson_masters!lesson_master_id (
          id,
          name,
          unit_price
        )
      `)
      .eq('membership_type_id', singlePlanObj.id)
      .eq('show_in_enroll', true);

    if (lessonsData) {
      singleLessons = lessonsData
        .filter((l: any) => l.lesson_master !== null)
        .map((l: any) => ({
          id: l.lesson_master.id,
          name: l.lesson_master.name,
          // 中間テーブルの上書き料金（unit_price）があれば優先し、なければマスタ単価を使用
          unit_price: l.unit_price !== null && l.unit_price !== undefined ? l.unit_price : l.lesson_master.unit_price
        }));
    }
  }

  // 3. フォールバック（チェックが0件、または単発プラン未設定の場合）: 従来通り名前部分一致でアクティブなものを全取得
  if (singleLessons.length === 0) {
    const { data: fallbackLessons } = await supabase
      .from('lesson_masters')
      .select('id, name, unit_price')
      .eq('active', true)
      .ilike('name', '%【単発】%')
      .order('display_order', { ascending: true });

    singleLessons = (fallbackLessons || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      unit_price: l.unit_price || 0
    }));
  }


  // membership_types からアクティブなプランを取得（月次・パッケージ両方）
  const { data: dbPlans } = await supabase
    .from('membership_types')
    .select('id, name, fee, stripe_price_id, active, display_order, is_package, ticket_count, description, rules')
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
    '月4回プラン【60分】',
    '月2回プラン【60分】',
    '単発',
    '単発プラン'
  ];

  // 月次プラン（名称で絞り込み） + パッケージプラン（is_package=true）を統合
  const filteredPlans = (dbPlans || [])
    .filter((plan: any) => targetNames.includes(plan.name) || plan.is_package === true);

  return (
    <EnrollmentForm
      dbPlans={filteredPlans}
      defaultPlanId={defaultPlanId}
      isPreview={isPreview}
      consentTermsJson={consentTermsJson}
      consentRulesJson={consentRulesJson}
      singleLessons={singleLessons || []}
      showSinglePrices={showSinglePrices === 'true'}
    />
  );
}
