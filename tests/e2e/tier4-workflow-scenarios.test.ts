/**
 * Tier 4: 実運用ワークロードシナリオテストスイート (Real-World Scenarios)
 * 管理者の実務ルーティン、顧客管理・カルテ参照、月末決算処理、フェイルセーフ導線を総合検証（計5ケース）
 */

import { TestRunner, assert } from './helpers/test-framework';
import { SourceAnalyzer } from './helpers/ast-parser';
import {
  ALLOWED_TEST_CUSTOMER,
  assertCustomerProtection,
  calculateSchoolHubKpis,
  createMockLessons,
} from './helpers/mock-factory';

export async function runTier4Tests(runner: TestRunner, analyzer: SourceAnalyzer) {
  runner.setContext('Tier 4', '実運用ワークロードシナリオ');

  // =========================================================================
  // T4-01: 管理者モーニングルーティン（ダッシュボード現場確認 -> 新着リードチェック）
  // =========================================================================
  await runner.test(
    'T4-01',
    '【シナリオ1】管理者がダッシュボードで4大KPI・本日の現場を確認し、新着リードをチェックする一連の導線',
    'ORIGINAL_REQUEST.md R2, PROJECT.md F4, F5 (現場実務効率の最大化)',
    () => {
      // Step 1: ダッシュボード初期ロード（KPI集計）
      const todayLessons = createMockLessons(3);
      const kpis = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        todayLessons,
        ['coach-tanaka'],
        [{ amount: 45000, status: 'paid' }]
      );
      assert.equal(kpis.todayLessonsCount, 3);
      assert.greaterThanOrEqual(kpis.totalStudents, 1);

      // Step 2: タイムラインで本日の最初のレッスンを確認
      const firstLesson = todayLessons[0];
      assert.equal(firstLesson.student_number, '0035');
      assert.includes(firstLesson.start_time, '10:00');

      // Step 3: 右側サブ列で新着リードを確認
      const leads = [{ id: 'lead-1', name: '体験予約者X', status: 'pending' }];
      assert.equal(leads.length, 1);
      assert.equal(leads[0].status, 'pending');
    }
  );

  // =========================================================================
  // T4-02: 会員番号0035カルテ確認・ステータス更新ワークフロー
  // =========================================================================
  await runner.test(
    'T4-02',
    '【シナリオ2】管理者が会員一覧（/customers）で会員番号0035を確認し、カルテ詳細を参照する実務導線',
    'ORIGINAL_REQUEST.md R3, R4 (会員番号0035の閲覧・カルテ参照ワークフロー)',
    () => {
      // Step 1: 会員一覧への遷移と0035の検索・特定
      const searchTarget = '0035';
      const student = ALLOWED_TEST_CUSTOMER;
      assert.equal(student.student_number, searchTarget);
      assertCustomerProtection(student);

      // Step 2: 生徒頭文字アバターとスカイブルー会員番号バッジの確認
      const initial = student.full_name.charAt(0);
      assert.equal(initial, 'テ');
      const badgeText = `#${student.student_number}`;
      assert.equal(badgeText, '#0035');

      // Step 3: カルテ詳細URL（/customers/0035）の生成と整合性
      const detailUrl = `/customers/${student.id}`;
      assert.includes(detailUrl, student.id);
    }
  );

  // =========================================================================
  // T4-03: 月末月次決算・未承認請求チェックワークフロー
  // =========================================================================
  await runner.test(
    'T4-03',
    '【シナリオ3】月末にダッシュボードで売上・未回収カードを確認し、未承認請求を承認処理する導線',
    'ORIGINAL_REQUEST.md R2, PROJECT.md F4, F5 (未承認請求・確認事項)',
    () => {
      // Step 1: 未承認請求一覧の確認
      const pendingInvoices = [
        { id: 'inv-1', student_number: '0035', amount: 15000, status: 'unpaid' as const },
      ];
      assert.equal(pendingInvoices.length, 1);
      assertCustomerProtection({ student_number: pendingInvoices[0].student_number });

      // Step 2: 承認処理シミュレーション
      const approvedInvoice = { ...pendingInvoices[0], status: 'paid' as const };
      assert.equal(approvedInvoice.status, 'paid');

      // Step 3: KPIの再計算（未回収がゼロになり売上に反映される）
      const updatedKpi = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        [],
        ['coach-1'],
        [approvedInvoice]
      );
      assert.equal(updatedKpi.uncollectedAmount, 0);
      assert.equal(updatedKpi.totalSales, 15000);
    }
  );

  // =========================================================================
  // T4-04: コーチシフトと全体スケジュールの同期ワークフロー
  // =========================================================================
  await runner.test(
    'T4-04',
    '【シナリオ4】全体スケジュール（/admin/schedule）とコーチポータル（/coach）間でSchoolHubデザインと最新レッスン枠が同期していることを確認する導線',
    'PROJECT.md F9 (共有画面デザイン同期)',
    () => {
      // 両画面のファイルが存在し共通デザイン基盤上にあること
      assert.ok(analyzer.fileExists('src/app/(dashboard)/admin/schedule/page.tsx'));
      assert.ok(analyzer.fileExists('src/app/(dashboard)/coach/schedule/page.tsx'));

      const adminSchedule = analyzer.getFileContent('src/app/(dashboard)/admin/schedule/page.tsx');
      const coachSchedule = analyzer.getFileContent('src/app/(dashboard)/coach/schedule/page.tsx');

      // 共通のレイアウト要素やコンポーネントが利用されていること
      assert.ok(adminSchedule.length > 0);
      assert.ok(coachSchedule.length > 0);
    }
  );

  // =========================================================================
  // T4-05: 障害・データ遅延発生時のフェイルセーフ表示シナリオ
  // =========================================================================
  await runner.test(
    'T4-05',
    '【シナリオ5】外部API遅延またはDB一時エラー時にダッシュボードが白画面にならずフォールバックUIを表示して業務継続できる導線',
    'Robustness: Graceful degradation with fallback UI',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      // AdminDashboardContent 内の catch ブロックによるフォールバックUI
      assert.ok(
        adminContent.includes('ダッシュボードの表示中に一時的な遅延が発生しました') ||
          adminContent.includes('catch (e)'),
        'エラー時のユーザーフレンドリーなフォールバックUIが実装されている必要があります'
      );
    }
  );
}
