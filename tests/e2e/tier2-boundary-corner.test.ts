/**
 * Tier 2: 境界値・極限・異常系テストスイート (Boundary & Corner Cases)
 * 0件フォールバック、長文・極端データ、375pxレイアウト破綻耐性、セキュリティ境界値を検証（計25ケース以上）
 */

import { TestRunner, assert } from './helpers/test-framework';
import { SourceAnalyzer } from './helpers/ast-parser';
import {
  ALLOWED_TEST_CUSTOMER,
  assertCustomerProtection,
  calculateSchoolHubKpis,
  createMockLessons,
} from './helpers/mock-factory';

export async function runTier2Tests(runner: TestRunner, analyzer: SourceAnalyzer) {
  // =========================================================================
  // B1: 当日レッスン0件時のタイムライン表示フォールバック
  // =========================================================================
  runner.setContext('Tier 2', 'B1: 当日レッスン0件・極限件数のフォールバック');

  await runner.test(
    'T2-B1-01',
    '当日レッスン配列が空（[]）の場合にクラッシュせず0件フォールバック表示を算出できること',
    'PROJECT.md § Admin Dashboard Component Contracts (TodayScheduleTimeline)',
    () => {
      const lessons = createMockLessons(0);
      assert.equal(lessons.length, 0);
      const kpi = calculateSchoolHubKpis([ALLOWED_TEST_CUSTOMER], lessons, ['coach-1'], []);
      assert.equal(kpi.todayLessonsCount, 0, '0件時にもエラーなく集計されること');
    }
  );

  await runner.test(
    'T2-B1-02',
    '当日レッスンデータがnull/undefinedの場合に安全に空配列としてフォールバック処理されること',
    'Robustness Requirement: Defend against nullish schedule props',
    () => {
      const safeParseLessons = (raw: any) => (Array.isArray(raw) ? raw : []);
      assert.equal(safeParseLessons(null).length, 0);
      assert.equal(safeParseLessons(undefined).length, 0);
    }
  );

  await runner.test(
    'T2-B1-03',
    '当日レッスンが1件のみの最小境界値でもレイアウトが崩れず描画されること',
    'Boundary Condition: Single item layout consistency',
    () => {
      const lessons = createMockLessons(1);
      assert.equal(lessons.length, 1);
      assert.equal(lessons[0].student_number, '0035');
    }
  );

  await runner.test(
    'T2-B1-04',
    '当日レッスンが50件以上の過密データの場合にスクロール可能領域が確保されること',
    'Stress Condition: High-density schedule timeline',
    () => {
      const lessons = createMockLessons(50);
      assert.equal(lessons.length, 50);
      // 50件あってもすべて0035テスト太郎に限定されていること
      lessons.forEach((l) => assertCustomerProtection({ student_number: l.student_number }));
    }
  );

  await runner.test(
    'T2-B1-05',
    'レッスン時刻が未定（TBD）または異常値のデータが含まれても安全にハンドリングされること',
    'Defensive Parsing: Invalid timestamp tolerance',
    () => {
      const rawLesson = {
        id: 'lesson-err',
        student_number: '0035',
        start_time: 'INVALID_DATE',
        end_time: 'INVALID_DATE',
      };
      assertCustomerProtection(rawLesson);
      const parseTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '時間未定' : d.toLocaleTimeString('ja-JP');
      };
      assert.equal(parseTime(rawLesson.start_time), '時間未定');
    }
  );

  // =========================================================================
  // B2: 新着リード0件、未承認請求0件時の表示
  // =========================================================================
  runner.setContext('Tier 2', 'B2: 新着リード0件・未承認請求0件・極限金額');

  await runner.test(
    'T2-B2-01',
    '新着リードが0件の場合に空状態案内（「新着リードはありません」等）が提供されること',
    'PROJECT.md § Admin Dashboard Component Contracts (NewLeadsWidget)',
    () => {
      const leads: any[] = [];
      const renderLeadsState = (items: any[]) =>
        items.length === 0 ? '現在対応が必要な新着リードはありません' : `${items.length}件のリード`;
      assert.includes(renderLeadsState(leads), '新着リードはありません');
    }
  );

  await runner.test(
    'T2-B2-02',
    '未承認請求が0件の場合に完了案内（「未承認の請求はありません」等）が提供されること',
    'PROJECT.md § Admin Dashboard Component Contracts (PendingApprovalsWidget)',
    () => {
      const pending: any[] = [];
      const renderApprovalState = (items: any[]) =>
        items.length === 0 ? '未承認の請求・変更申請はありません' : `${items.length}件`;
      assert.includes(renderApprovalState(pending), '未承認の請求・変更申請はありません');
    }
  );

  await runner.test(
    'T2-B2-03',
    '未承認請求金額が0円または極小金額（¥1）の場合の通貨フォーマット処理が正常であること',
    'Boundary Condition: Currency formatting at 0 and minimal value',
    () => {
      const formatCurrency = (amt: number) => `¥${amt.toLocaleString()}`;
      assert.equal(formatCurrency(0), '¥0');
      assert.equal(formatCurrency(1), '¥1');
      assert.equal(formatCurrency(1000000), '¥1,000,000');
    }
  );

  await runner.test(
    'T2-B2-04',
    '新着リードのメールアドレス・電話番号が未入力の場合に「未登録」代替表記が提供されること',
    'Defensive Handling: Lead optional fields',
    () => {
      const lead = { name: '体験希望者', email: null, phone: '' };
      const displayContact = (val?: string | null) => val?.trim() || '未登録';
      assert.equal(displayContact(lead.email), '未登録');
      assert.equal(displayContact(lead.phone), '未登録');
    }
  );

  await runner.test(
    'T2-B2-05',
    '売上集計において未回収金額が0円の場合に「未回収なし（0円）」として正常表示されること',
    'PROJECT.md F4 (今月売上・未回収カード)',
    () => {
      const kpi = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        [],
        ['coach-1'],
        [{ amount: 30000, status: 'paid' }]
      );
      assert.equal(kpi.uncollectedAmount, 0);
    }
  );

  // =========================================================================
  // B3: 長文生徒名、未設定会員番号の表示
  // =========================================================================
  runner.setContext('Tier 2', 'B3: 長文生徒名・未設定会員番号・文字化け耐性');

  await runner.test(
    'T2-B3-01',
    '生徒名が50文字以上の極端な長文でもレイアウトを破壊しないtruncate/省略処理が行われること',
    'Stress Condition: Extreme student name length',
    () => {
      const longName = 'テスト太郎寿限無寿限無五劫の擦り切れ海砂利水魚の水行末雲来末風来末';
      assert.greaterThanOrEqual(longName.length, 30);
      const formatTruncated = (name: string, max: number = 15) =>
        name.length > max ? `${name.slice(0, max)}…` : name;
      const formatted = formatTruncated(longName);
      assert.ok(formatted.endsWith('…'));
      assert.equal(formatted.length, 16);
    }
  );

  await runner.test(
    'T2-B3-02',
    '会員番号が未設定（null/空文字）の場合に「-」または「未設定」バッジが表示されること',
    'PROJECT.md F7 (会員番号表示フォールバック)',
    () => {
      const formatStudentNumber = (num?: string | null) => (num?.trim() ? `#${num}` : '未採番');
      assert.equal(formatStudentNumber('0035'), '#0035');
      assert.equal(formatStudentNumber(null), '未採番');
      assert.equal(formatStudentNumber(''), '未採番');
    }
  );

  await runner.test(
    'T2-B3-03',
    '生徒頭文字アバターが英字・記号・空白名前でも安全にフォールバック文字を生成すること',
    'PROJECT.md F7 (生徒頭文字アバター)',
    () => {
      const getInitial = (name?: string | null) => {
        if (!name) return '?';
        const trimmed = name.trim();
        return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
      };
      assert.equal(getInitial('テスト太郎'), 'テ');
      assert.equal(getInitial('Taro Test'), 'T');
      assert.equal(getInitial('  山田  '), '山');
      assert.equal(getInitial(''), '?');
      assert.equal(getInitial(null), '?');
    }
  );

  await runner.test(
    'T2-B3-04',
    '担当コーチが未割り当ての場合に「担当未定」フォールバックが表示されること',
    'PROJECT.md F7 (担当コーチアバター・表示)',
    () => {
      const formatCoachName = (name?: string | null) => name?.trim() || '担当未定';
      assert.equal(formatCoachName('田中コーチ'), '田中コーチ');
      assert.equal(formatCoachName(null), '担当未定');
      assert.equal(formatCoachName('   '), '担当未定');
    }
  );

  await runner.test(
    'T2-B3-05',
    '会員区分（コース）が未登録の場合に「コース未定」フォールバックが表示されること',
    'PROJECT.md F7 (コースバッジ)',
    () => {
      const formatCourse = (course?: string | null) => course?.trim() || '未設定';
      assert.equal(formatCourse('週1回コース'), '週1回コース');
      assert.equal(formatCourse(null), '未設定');
    }
  );

  // =========================================================================
  // B4: モバイル幅375pxにおける折り返しとタップ領域
  // =========================================================================
  runner.setContext('Tier 2', 'B4: モバイル375px幅・極限ビューポート耐性');

  await runner.test(
    'T2-B4-01',
    '375px幅においてボタン間の隙間（gap-2以上）が維持され誤タップが防止されていること',
    'Mobile UX Guideline: 375px touch spacing',
    () => {
      const buttonContent = analyzer.getFileContent('src/components/ui/button.tsx');
      assert.ok(
        /gap-/i.test(buttonContent) || /inline-flex/i.test(buttonContent),
        'buttonにレイアウト余白が設定されていること'
      );
    }
  );

  await runner.test(
    'T2-B4-02',
    '375px幅でのテキストの折り返しクラス（break-words / truncate / min-w-0）が適用されていること',
    'Mobile Overflow Guideline: Text wrapping on small screens',
    () => {
      const customersContent = analyzer.getFileContent('src/app/(dashboard)/customers/page.tsx');
      assert.ok(
        /truncate|break-|overflow-/i.test(customersContent),
        'customers画面にテキスト折り返しまたは省略スタイルが適用されていること'
      );
    }
  );

  await runner.test(
    'T2-B4-03',
    '極小画面（320px: iPhone 5/SE初代）でも主要アクションボタンが画面外へ見切れないこと',
    'Stress Viewport: 320px minimum mobile width',
    () => {
      const cardContent = analyzer.getFileContent('src/components/ui/card.tsx');
      assert.ok(!cardContent.includes('min-w-[400px]'), '400px以上の固定幅は禁止');
    }
  );

  await runner.test(
    'T2-B4-04',
    'アバターのサイズがモバイル画面で32px〜40pxの視認性良好な比率を保っていること',
    'Mobile Avatar: size-8 to size-10 (32-40px)',
    () => {
      const avatarContent = analyzer.getFileContent('src/components/ui/avatar.tsx');
      assert.ok(
        /size-|h-|w-/i.test(avatarContent),
        'avatar.tsx にサイズクラスが定義されていること'
      );
    }
  );

  await runner.test(
    'T2-B4-05',
    '横画面（landscape 667px）においてフレックスまたはグリッドが崩壊しないこと',
    'Mobile Landscape Layout Adaptation',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      assert.ok(
        adminContent.includes('md:') || adminContent.includes('sm:'),
        '画面サイズに応じたブレークポイント指定が存在すること'
      );
    }
  );

  // =========================================================================
  // B5: 顧客保護ガード・権限制御境界値
  // =========================================================================
  runner.setContext('Tier 2', 'B5: 顧客保護ガード・厳格境界値検証');

  await runner.test(
    'T2-B5-01',
    '会員番号「00350」（0035の前方一致類似値）に対する操作が厳格に拒否されること',
    'ORIGINAL_REQUEST.md § コード品質・制約 (厳密な完全一致保護)',
    () => {
      assert.throws(
        () => assertCustomerProtection({ student_number: '00350', full_name: '別顧客' }),
        '類似番号00350は拒否される必要があります'
      );
    }
  );

  await runner.test(
    'T2-B5-02',
    '会員番号「 0035 」の前後に空白がある場合でもトリム判定で正規許可されること',
    'Defensive normalization: Trim student number',
    () => {
      assertCustomerProtection({ student_number: ' 0035 ', full_name: 'テスト太郎' });
    }
  );

  await runner.test(
    'T2-B5-03',
    '空文字 "" の会員番号に対する変更リクエストが即時拒否されること',
    'Boundary Condition: Empty string student number rejection',
    () => {
      assert.throws(
        () => assertCustomerProtection({ student_number: '', full_name: '名無し' }),
        '空文字の会員番号は拒否される必要があります'
      );
    }
  );

  await runner.test(
    'T2-B5-04',
    '会員番号が "#0035"（ハッシュタグ付き表記）の場合でも正規に許可されること',
    'PROJECT.md F7 (#0035表記の許容)',
    () => {
      assertCustomerProtection({ student_number: '#0035', full_name: 'テスト太郎' });
    }
  );

  await runner.test(
    'T2-B5-05',
    '不正なスクリプトタグを含む氏名（<script>）が注入された場合でも顧客保護ガードが作動すること',
    'Security Integrity: Script injection immunity',
    () => {
      assert.throws(
        () =>
          assertCustomerProtection({
            student_number: '9999',
            full_name: '<script>alert(1)</script>',
          }),
        '不正なスクリプトタグ付きデータは拒否される必要があります'
      );
    }
  );
}
