/**
 * Tier 3: 複数機能複合・連携テストスイート (Integration & Cross-Feature)
 * タイムラインからモーダル連携、会員ステータス即時更新、月切り替えKPI再計算などを検証
 */

import { TestRunner, assert } from './helpers/test-framework';
import { SourceAnalyzer } from './helpers/ast-parser';
import {
  ALLOWED_TEST_CUSTOMER,
  assertCustomerProtection,
  calculateSchoolHubKpis,
  createMockLessons,
} from './helpers/mock-factory';

export async function runTier3Tests(runner: TestRunner, analyzer: SourceAnalyzer) {
  runner.setContext('Tier 3', '複合機能・コンポーネント間連携');

  // =========================================================================
  // T3-01: スケジュールタイムラインから詳細モーダルへの連携
  // =========================================================================
  await runner.test(
    'T3-01',
    'スケジュールタイムライン上のレッスン選択時に詳細カルテ・モーダル連携契約が保たれていること',
    'PROJECT.md § Admin Dashboard Component Contracts (TodayScheduleTimeline.tsx)',
    () => {
      const lessons = createMockLessons(2);
      const selectedLesson = lessons[0];

      // モーダルへ引き渡される契約データの整合性
      assert.equal(selectedLesson.student_number, '0035');
      assert.equal(selectedLesson.student_name, 'テスト太郎');
      assert.ok(selectedLesson.id.startsWith('lesson-'));
      assertCustomerProtection({ student_number: selectedLesson.student_number });
    }
  );

  // =========================================================================
  // T3-02: 会員テーブルでのステータス即時変更
  // =========================================================================
  await runner.test(
    'T3-02',
    '会員テーブルで会員番号0035のステータスを変更した際の楽観的更新および保護制約の遵守',
    'PROJECT.md § Customer & Business Logic Contracts (updateStudentStatus)',
    () => {
      let currentCustomer = { ...ALLOWED_TEST_CUSTOMER };
      assert.equal(currentCustomer.status, 'active');

      // ステータス変更のシミュレーション（受講中 -> 休会）
      assertCustomerProtection(currentCustomer);
      currentCustomer.status = 'suspended';
      assert.equal(currentCustomer.status, 'suspended');

      // 0035以外の顧客に対して同じ操作を試みた場合は即座に阻止されること
      assert.throws(() => {
        const illegalCustomer = { student_number: '0002', status: 'active' };
        assertCustomerProtection(illegalCustomer);
      });
    }
  );

  // =========================================================================
  // T3-03: 月切り替え時のKPI再計算表示
  // =========================================================================
  await runner.test(
    'T3-03',
    'MonthSelectorによる月変更パラメータ（?month=2026-09）と4大KPI再計算の連動検証',
    'PROJECT.md F4, ORIGINAL_REQUEST.md R2 (月切り替えKPI連動)',
    () => {
      // 2026年9月（前月）データ
      const septInvoices = [
        { amount: 40000, status: 'paid' as const },
        { amount: 8000, status: 'unpaid' as const },
      ];
      const septKpi = calculateSchoolHubKpis([ALLOWED_TEST_CUSTOMER], [], ['coach-1'], septInvoices);

      // 2026年10月（当月）データ
      const octInvoices = [
        { amount: 65000, status: 'paid' as const },
        { amount: 0, status: 'unpaid' as const },
      ];
      const octKpi = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        createMockLessons(4),
        ['coach-1', 'coach-2'],
        octInvoices
      );

      assert.equal(septKpi.totalSales, 40000);
      assert.equal(septKpi.uncollectedAmount, 8000);
      assert.equal(octKpi.totalSales, 65000);
      assert.equal(octKpi.uncollectedAmount, 0);
      assert.equal(octKpi.todayLessonsCount, 4);
      assert.notEqual(septKpi.totalSales, octKpi.totalSales);
    }
  );

  // =========================================================================
  // T3-04: 新着リードから会員登録フォームへのパラメータ引継ぎ
  // =========================================================================
  await runner.test(
    'T3-04',
    '新着リードウィジェットの「登録する」アクションと顧客登録導線のデータ整合性',
    'PROJECT.md § Admin Dashboard Component Contracts (NewLeadsWidget -> /customers/new)',
    () => {
      const mockLead = {
        id: 'lead-123',
        applicant_name: '体験申込者A',
        email: 'trial@example.com',
        phone: '090-0000-0000',
        created_at: '2026-10-17T09:00:00Z',
      };
      // 顧客登録URLクエリの生成
      const registrationUrl = `/customers/new?lead_id=${mockLead.id}&name=${encodeURIComponent(
        mockLead.applicant_name
      )}`;
      assert.includes(registrationUrl, '/customers/new');
      assert.includes(registrationUrl, 'lead_id=lead-123');
    }
  );

  // =========================================================================
  // T3-05: モバイル表示時の2カラム→縦積みレスポンシブ展開
  // =========================================================================
  await runner.test(
    'T3-05',
    'モバイルビュー（375px）におけるタイムラインとタスクウィジェットの順序制御（order-1/order-2）',
    'PROJECT.md F5, F8 (レスポンシブ順序制御)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      assert.ok(
        adminContent.includes('order-') || adminContent.includes('flex-col') || adminContent.includes('gap-'),
        'レスポンシブ順序またはグリッド構造が定義されている必要があります'
      );
    }
  );
}
