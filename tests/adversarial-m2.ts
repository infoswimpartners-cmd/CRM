/**
 * Milestone 2 アドバーサリアル検証・エッジケーステストスイート
 * 
 * 担当範囲:
 * 1. AdminKpiCards の境界値・プロパティレンダリング（未回収0/あり、トレンド正/負/0/なし、極小/極大値）
 * 2. TodayScheduleTimeline の空状態（0件、null、undefined、hideEmptyState）および複数件ソート・ステータス
 * 3. NewLeadsWidget の空状態・上限切り捨て・未アサイン判定
 * 4. PendingApprovalsWidget の空状態・リクエスト種別（Trio追加/解約/通常プラン）
 * 5. QuickActionsWidget の4大アクション・ボタングリッド
 * 6. 顧客テスト制約（会員番号0035、テスト太郎以外の使用禁止）の完全準拠
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminKpiCards } from '../src/components/admin/dashboard/AdminKpiCards';
import { TodayScheduleTimeline, TodayScheduleItem } from '../src/components/admin/dashboard/TodayScheduleTimeline';
import { NewLeadsWidget, LeadItem } from '../src/components/admin/dashboard/NewLeadsWidget';
import { PendingApprovalsWidget, PendingRequestItem } from '../src/components/admin/dashboard/PendingApprovalsWidget';
import { QuickActionsWidget } from '../src/components/admin/dashboard/QuickActionsWidget';
import { ALLOWED_TEST_CUSTOMER, assertCustomerProtection } from './e2e/helpers/mock-factory';

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestCaseResult[] = [];

function test(id: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ id, name, passed: true });
    console.log(`  ✔ [${id}] ${name}`);
  } catch (err: any) {
    results.push({ id, name, passed: false, error: err?.message || String(err) });
    console.error(`  ✖ [${id}] ${name}`);
    console.error(`    Error: ${err?.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

console.log('\n==================================================');
console.log('  MILESTONE 2: EMPIRICAL ADVERSARIAL TEST SUITE  ');
console.log('==================================================\n');

// -----------------------------------------------------------------------------
// 1. AdminKpiCards のアドバーサリアル・エッジケース検証
// -----------------------------------------------------------------------------
console.log('▶ [Section 1: AdminKpiCards]');

test('ADV-KPI-01', '未回収金額が0円の場合、¥0かつ通常カラー(text-slate-500)で表示されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 10,
      todayLessonsCount: 3,
      activeCoachesCount: 2,
      totalSales: 50000,
      uncollectedAmount: 0,
      uncollectedCount: 0,
    })
  );
  assert(html.includes('¥0'), '未回収0円が表示されること');
  assert(html.includes('text-slate-500'), '未回収0円時は警告色ではなくtext-slate-500であること');
  assert(!html.includes('(0件)'), '件数0件の場合は件数表記が省略されること');
});

test('ADV-KPI-02', '未回収金額が存在する場合、金額と件数が警告色(text-amber-600)で表示されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 10,
      todayLessonsCount: 3,
      activeCoachesCount: 2,
      totalSales: 50000,
      uncollectedAmount: 24000,
      uncollectedCount: 2,
    })
  );
  assert(html.includes('¥24,000'), '未回収金額 ¥24,000 が表示されること');
  assert(html.includes('(2件)'), '未回収件数 (2件) が表示されること');
  assert(html.includes('text-amber-600'), '警告色 text-amber-600 が適用されていること');
});

test('ADV-KPI-03', 'diffSalesが負値（マイナストレンド）の場合、TrendingDownとマイナス表記・赤系バッジになること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 10,
      todayLessonsCount: 3,
      activeCoachesCount: 2,
      totalSales: 40000,
      diffSales: -15000,
    })
  );
  assert(html.includes('lucide-trending-down'), 'TrendingDownアイコンが含まれること');
  assert(html.includes('-15,000'), 'マイナス金額表記が含まれること');
  assert(html.includes('bg-rose-50 text-rose-700'), '赤系バッジスタイルが適用されること');
});

test('ADV-KPI-04', 'diffSalesが正値（プラス傾向）の場合、TrendingUpとプラス表記・緑系バッジになること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 10,
      todayLessonsCount: 3,
      activeCoachesCount: 2,
      totalSales: 80000,
      diffSales: 20000,
    })
  );
  assert(html.includes('lucide-trending-up'), 'TrendingUpアイコンが含まれること');
  assert(html.includes('+20,000'), 'プラス金額表記が含まれること');
  assert(html.includes('bg-emerald-50 text-emerald-700'), '緑系バッジスタイルが適用されること');
});

test('ADV-KPI-05', 'diffSalesが0の場合、プラス扱い(+0)として緑系バッジで破綻せず表示されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 10,
      todayLessonsCount: 3,
      activeCoachesCount: 2,
      totalSales: 50000,
      diffSales: 0,
    })
  );
  assert(html.includes('+0'), '+0表記が含まれること');
  assert(html.includes('bg-emerald-50 text-emerald-700'), '緑系バッジが適用されること');
});

test('ADV-KPI-06', '全プロパティがゼロ境界値の場合にクラッシュせず正常レンダリングされること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 0,
      todayLessonsCount: 0,
      activeCoachesCount: 0,
      totalSales: 0,
    })
  );
  assert(html.includes('>0</span><span class="text-xs sm:text-sm font-semibold text-slate-500">名</span>'), '在籍生徒0名が表示されること');
  assert(html.includes('>0</span><span class="text-xs sm:text-sm font-semibold text-slate-500">件</span>'), '本日レッスン0件が表示されること');
  assert(html.includes('¥0'), '売上¥0が表示されること');
});

test('ADV-KPI-07', '億単位の極大値データでもカンマ区切りでレイアウト破綻なく描画されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 50000,
      todayLessonsCount: 1200,
      activeCoachesCount: 350,
      totalSales: 1250000000,
      uncollectedAmount: 88000000,
      uncollectedCount: 450,
      diffSales: 50000000,
    })
  );
  assert(html.includes('50,000'), '生徒数50,000がカンマ区切りされること');
  assert(html.includes('1,200'), 'レッスン数1,200がカンマ区切りされること');
  assert(html.includes('¥1,250,000,000'), '売上¥1,250,000,000がカンマ区切りされること');
  assert(html.includes('¥88,000,000 (450件)'), '未回収¥88,000,000 (450件)が表示されること');
});

test('ADV-KPI-08', '任意プロパティ（totalCoachesCount, grossProfit, targetMonth）の有無に応じた正常描画', () => {
  const htmlWithout = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 5,
      todayLessonsCount: 1,
      activeCoachesCount: 2,
      totalSales: 10000,
    })
  );
  assert(!htmlWithout.includes('粗利額'), '粗利額未指定時は非表示であること');

  const htmlWith = renderToStaticMarkup(
    React.createElement(AdminKpiCards, {
      totalStudents: 5,
      todayLessonsCount: 1,
      activeCoachesCount: 2,
      totalCoachesCount: 6,
      totalSales: 20000,
      grossProfit: 12000,
      targetMonth: '2026年10月',
    })
  );
  assert(htmlWith.includes('/ 6 名'), 'コーチ総数が表示されること');
  assert(htmlWith.includes('粗利額'), '粗利額セクションが表示されること');
  assert(htmlWith.includes('¥12,000'), '粗利¥12,000が表示されること');
  assert(htmlWith.includes('(2026年10月)'), '対象月が表示されること');
});

// -----------------------------------------------------------------------------
// 2. TodayScheduleTimeline のアドバーサリアル・エッジケース検証
// -----------------------------------------------------------------------------
console.log('\n▶ [Section 2: TodayScheduleTimeline]');

test('ADV-TIME-01', '当日レッスン0件（空配列）の場合、空状態UIとスケジュール確認導線が表示されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: [] })
  );
  assert(html.includes('本日の予定はありません'), '「本日の予定はありません」が表示されること');
  assert(html.includes('本日 0 件'), '「本日 0 件」バッジが表示されること');
  assert(html.includes('スケジュールを確認・追加する'), '「スケジュールを確認・追加する」ボタンが表示されること');
});

test('ADV-TIME-02', 'schedulesがnullまたはundefinedの場合に例外をスローせず安全に空状態へフォールバックすること', () => {
  const htmlNull = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: null })
  );
  assert(htmlNull.includes('本日の予定はありません'), 'null時に安全に空状態が表示されること');

  const htmlUndef = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: undefined })
  );
  assert(htmlUndef.includes('本日の予定はありません'), 'undefined時に安全に空状態が表示されること');
});

test('ADV-TIME-03', 'hideEmptyStateがtrueの場合、空状態プレースホルダーが非表示となること', () => {
  const html = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: [], hideEmptyState: true })
  );
  assert(!html.includes('本日の予定はありません'), 'hideEmptyState=true時は空状態テキストが表示されないこと');
});

test('ADV-TIME-04', '会員番号0035・テスト太郎の複数レッスンが時系列順に正しくソート描画されること', () => {
  // 顧客テスト保護チェック
  assertCustomerProtection({ student_number: ALLOWED_TEST_CUSTOMER.student_number, full_name: ALLOWED_TEST_CUSTOMER.full_name });

  // 意図的に開始時間を前後させて渡す
  const testItems: TodayScheduleItem[] = [
    {
      id: 'sched-3',
      start_time: '2026-10-17T16:00:00Z',
      end_time: '2026-10-17T17:00:00Z',
      student_id: ALLOWED_TEST_CUSTOMER.id,
      student_name: ALLOWED_TEST_CUSTOMER.full_name,
      student_number: ALLOWED_TEST_CUSTOMER.student_number,
      location: '目黒区民センタープール',
      status: 'scheduled',
      coach: { full_name: '田中コーチ', avatar_url: null },
    },
    {
      id: 'sched-1',
      start_time: '2026-10-17T10:00:00Z',
      end_time: '2026-10-17T11:00:00Z',
      student_id: ALLOWED_TEST_CUSTOMER.id,
      student_name: ALLOWED_TEST_CUSTOMER.full_name,
      student_number: ALLOWED_TEST_CUSTOMER.student_number,
      location: '目黒区民センタープール',
      status: 'completed',
      coach: { full_name: '田中コーチ', avatar_url: null },
    },
    {
      id: 'sched-2',
      start_time: '2026-10-17T13:30:00Z',
      end_time: '2026-10-17T14:30:00Z',
      student_id: ALLOWED_TEST_CUSTOMER.id,
      student_name: ALLOWED_TEST_CUSTOMER.full_name,
      student_number: ALLOWED_TEST_CUSTOMER.student_number,
      location: '品川区民プール',
      status: 'in_progress',
      coach: { full_name: '鈴木コーチ', avatar_url: null },
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: testItems })
  );

  assert(html.includes('本日 3 件'), '「本日 3 件」が表示されること');
  assert(html.includes('#0035'), '会員番号バッジ #0035 が表示されること');
  assert(html.includes('テスト太郎'), '生徒名「テスト太郎」が表示されること');
  assert(html.includes('報告済'), 'status: completed で「報告済」が表示されること');
  assert(html.includes('実施中'), 'status: in_progress で「実施中」が表示されること');
  assert(html.includes('予定'), 'status: scheduled で「予定」が表示されること');

  // 時系列ソート順（sched-1が最初、次にsched-2、最後がsched-3）の確認
  const idx1 = html.indexOf('sched-1') !== -1 ? html.indexOf('sched-1') : html.indexOf('報告済');
  const idx2 = html.indexOf('sched-2') !== -1 ? html.indexOf('sched-2') : html.indexOf('実施中');
  const idx3 = html.indexOf('sched-3') !== -1 ? html.indexOf('sched-3') : html.indexOf('予定');
  assert(idx1 < idx2 && idx2 < idx3, '開始時刻昇順に正しくソートされて描画されていること');
});

test('ADV-TIME-05', '異常な日付文字列（不正なstart_time/end_time）でも例外をスローせず「時間未定」として描画されること', () => {
  const abnormalItems: TodayScheduleItem[] = [
    {
      id: 'sched-abnormal',
      start_time: 'invalid-date-string',
      end_time: 'invalid-end-date',
      student_name: ALLOWED_TEST_CUSTOMER.full_name,
      student_number: ALLOWED_TEST_CUSTOMER.student_number,
      coach: { full_name: '佐藤コーチ' },
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: abnormalItems })
  );
  assert(html.includes('時間未定'), '例外を起こさず「時間未定」が表示されること');
});

test('ADV-TIME-06', 'student_nameやstudent_numberが欠損している場合でもフォールバック表示されること', () => {
  const missingItems: TodayScheduleItem[] = [
    {
      id: 'sched-missing',
      start_time: '2026-10-17T11:00:00Z',
      end_time: '2026-10-17T12:00:00Z',
      coach: { full_name: '高橋コーチ' },
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(TodayScheduleTimeline, { schedules: missingItems })
  );
  assert(html.includes('生徒未指定'), '生徒名欠損時に「生徒未指定」が表示されること');
});

// -----------------------------------------------------------------------------
// 3. NewLeadsWidget のアドバーサリアル・エッジケース検証
// -----------------------------------------------------------------------------
console.log('\n▶ [Section 3: NewLeadsWidget]');

test('ADV-LEAD-01', '新着リードが0件の場合、空案内メッセージと「対応完了」バッジが表示されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(NewLeadsWidget, { leads: [] })
  );
  assert(html.includes('現在、新着の体験申込はありません'), '空状態メッセージが表示されること');
  assert(html.includes('対応完了'), '対応完了バッジが表示されること');
});

test('ADV-LEAD-02', 'leadsがnull/undefinedの場合に安全にフォールバックすること', () => {
  const htmlNull = renderToStaticMarkup(
    React.createElement(NewLeadsWidget, { leads: null })
  );
  assert(htmlNull.includes('現在、新着の体験申込はありません'), 'null時に安全に空状態が表示されること');
});

test('ADV-LEAD-03', '未アサインリードがある場合、ヘッダーに「未対応 N件」バッジが表示され各項目に「未アサイン」が付くこと', () => {
  const leads: LeadItem[] = [
    {
      id: 'lead-1',
      name: '体験申込 一郎',
      area: '目黒区',
      created_at: '2026-10-17T09:30:00Z',
      assigned_coach_id: null,
      status: '新規',
    },
    {
      id: 'lead-2',
      name: '体験申込 二郎',
      area: '品川区',
      created_at: '2026-10-17T08:00:00Z',
      assigned_coach_id: 'coach-1',
      status: '対応中',
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(NewLeadsWidget, { leads })
  );
  assert(html.includes('未対応 1件'), 'ヘッダーに「未対応 1件」が表示されること');
  assert(html.includes('未アサイン'), 'lead-1 に「未アサイン」バッジが表示されること');
  assert(html.includes('対応中'), 'lead-2 に「対応中」バッジが表示されること');
  assert(html.includes('アサイン ➔'), 'アサイン導線リンクが表示されること');
});

test('ADV-LEAD-04', 'リードが5件を超える場合、最大5件に自動切り捨て（スライス）されて描画されること', () => {
  const sixLeads: LeadItem[] = Array.from({ length: 8 }, (_, i) => ({
    id: `lead-bulk-${i + 1}`,
    name: `体験申込 ${i + 1}郎`,
    created_at: '2026-10-17T10:00:00Z',
  }));

  const html = renderToStaticMarkup(
    React.createElement(NewLeadsWidget, { leads: sixLeads })
  );
  assert(html.includes('体験申込 1郎'), '1件目が表示されること');
  assert(html.includes('体験申込 5郎'), '5件目が表示されること');
  assert(!html.includes('体験申込 6郎'), '6件目以降はスライスされて非表示であること');
});

// -----------------------------------------------------------------------------
// 4. PendingApprovalsWidget のアドバーサリアル・エッジケース検証
// -----------------------------------------------------------------------------
console.log('\n▶ [Section 4: PendingApprovalsWidget]');

test('ADV-APPR-01', '未承認申請が0件の場合、「承認待ちの申請はありません」と「未承認なし」バッジが表示されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(PendingApprovalsWidget, { pendingRequests: [] })
  );
  assert(html.includes('承認待ちの申請はありません'), '空状態メッセージが表示されること');
  assert(html.includes('未承認なし'), '「未承認なし」バッジが表示されること');
});

test('ADV-APPR-02', 'pendingRequestsがnull/undefinedの場合に安全にフォールバックすること', () => {
  const html = renderToStaticMarkup(
    React.createElement(PendingApprovalsWidget, { pendingRequests: null })
  );
  assert(html.includes('承認待ちの申請はありません'), 'null時に安全に空状態が表示されること');
});

test('ADV-APPR-03', 'Trio追加・Trio解約・プラン追加・一般プラン変更の各種別が正確にバッジ色分け表示されること', () => {
  const requests: PendingRequestItem[] = [
    {
      id: 'req-trio-add',
      created_at: '2026-10-16T15:00:00Z',
      request_type: 'add_plan',
      requested_is_trio: true,
      note: '来月から開始希望',
      student: { id: ALLOWED_TEST_CUSTOMER.id, full_name: ALLOWED_TEST_CUSTOMER.full_name, student_number: ALLOWED_TEST_CUSTOMER.student_number },
    },
    {
      id: 'req-trio-cancel',
      created_at: '2026-10-16T16:00:00Z',
      request_type: 'cancel_plan',
      requested_is_trio: false,
      student: { id: ALLOWED_TEST_CUSTOMER.id, full_name: ALLOWED_TEST_CUSTOMER.full_name, student_number: ALLOWED_TEST_CUSTOMER.student_number },
    },
    {
      id: 'req-plan-add',
      created_at: '2026-10-16T17:00:00Z',
      request_type: 'add_plan',
      requested_is_trio: false,
      requested: { name: '月2回追加' },
      student: { id: ALLOWED_TEST_CUSTOMER.id, full_name: ALLOWED_TEST_CUSTOMER.full_name, student_number: ALLOWED_TEST_CUSTOMER.student_number },
    },
    {
      id: 'req-general-change',
      created_at: '2026-10-16T18:00:00Z',
      request_type: 'change_plan',
      requested: { name: '月4回コース' },
      student: { id: ALLOWED_TEST_CUSTOMER.id, full_name: ALLOWED_TEST_CUSTOMER.full_name, student_number: ALLOWED_TEST_CUSTOMER.student_number },
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(PendingApprovalsWidget, { pendingRequests: requests })
  );

  assert(html.includes('要対応 4件'), 'ヘッダーに要対応4件が表示されること');
  assert(html.includes('Trio追加'), 'Trio追加バッジが表示されること');
  assert(html.includes('Trio解約'), 'Trio解約バッジが表示されること');
  assert(html.includes('プラン追加'), 'プラン追加バッジが表示されること');
  assert(html.includes('プラン変更'), 'プラン変更バッジが表示されること');
  assert(html.includes('「来月から開始希望」'), '備考noteが引用符付きで表示されること');
  assert(html.includes('承認へ ➔'), '承認へ導線リンクが表示されること');
  assert(html.includes('承認センターを開く'), 'フッターリンクが表示されること');
});

// -----------------------------------------------------------------------------
// 5. QuickActionsWidget の検証
// -----------------------------------------------------------------------------
console.log('\n▶ [Section 5: QuickActionsWidget]');

test('ADV-ACT-01', '日常実務の4大アクションが2x2ボタングリッドとして正確な導線リンク付きで描画されること', () => {
  const html = renderToStaticMarkup(
    React.createElement(QuickActionsWidget)
  );

  assert(html.includes('クイックアクション'), 'タイトルが表示されること');
  assert(html.includes('grid grid-cols-2 gap-3'), '2x2グリッドクラスが適用されていること');
  assert(html.includes('href="/admin/leads"'), '体験リード管理リンクが存在すること');
  assert(html.includes('href="/coach/schedule"'), 'スケジュール追加リンクが存在すること');
  assert(html.includes('href="/admin/line-marketing"'), 'LINE一括配信リンクが存在すること');
  assert(html.includes('href="/customers"'), '会員カルテ検索リンクが存在すること');
});

// -----------------------------------------------------------------------------
// 6. 顧客テスト制約（会員番号0035、テスト太郎以外の保護）検証
// -----------------------------------------------------------------------------
console.log('\n▶ [Section 6: Customer Protection Violation Defense]');

test('ADV-PROT-01', '会員番号0035以外の顧客データを投入した場合にassertCustomerProtectionが拒絶すること', () => {
  let thrown = false;
  try {
    assertCustomerProtection({ student_number: '9999', full_name: '一般生徒A' });
  } catch (err: any) {
    thrown = true;
    assert(err.message.includes('[SECURITY_VIOLATION]'), 'SECURITY_VIOLATIONが検知されること');
  }
  assert(thrown, '未許可顧客の投入が確実にブロックされること');
});

test('ADV-PROT-02', '会員番号0035（#0035表記含む）およびテスト太郎のみが安全に通過すること', () => {
  assertCustomerProtection({ student_number: '0035', full_name: 'テスト太郎' });
  assertCustomerProtection({ student_number: '#0035', full_name: 'テスト太郎' });
});

// -----------------------------------------------------------------------------
// 結果集計
// -----------------------------------------------------------------------------
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log('\n==================================================');
console.log(`ADV TEST SUMMARY: Total ${total} | PASS ${passed} | FAIL ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n[SUCCESS] すべてのアドバーサリアル検証・エッジケーステストが合格しました。\n');
  process.exit(0);
}
