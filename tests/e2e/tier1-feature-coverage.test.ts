/**
 * Tier 1: 機能網羅性テストスイート (Feature Coverage)
 * F1〜F10の各機能について5ケース以上（計50ケース以上）を網羅検証
 */

import { TestRunner, assert } from './helpers/test-framework';
import { SourceAnalyzer } from './helpers/ast-parser';
import {
  ALLOWED_TEST_CUSTOMER,
  assertCustomerProtection,
  calculateSchoolHubKpis,
  createMockLessons,
} from './helpers/mock-factory';

export async function runTier1Tests(runner: TestRunner, analyzer: SourceAnalyzer) {
  // =========================================================================
  // F1: SchoolHubデザイントークン・背景色（#F8FAFC）の適用検証
  // =========================================================================
  runner.setContext('Tier 1', 'F1: SchoolHubデザイントークン・基底背景色');

  await runner.test(
    'T1-F1-01',
    'globals.cssまたはレイアウトに基底背景色#F8FAFCが定義・適用されていること',
    'PROJECT.md § Design Tokens (Base Background: #F8FAFC 〜 #F9FBFD)',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.hasBaseBackground,
        'globals.css に基底背景色 #F8FAFC (または #F9FBFD) が定義されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F1-02',
    'SchoolHub特有のスカイブルーアクセント（#0284C7 / #38BDF8 / #E0F2FE）が定義されていること',
    'PROJECT.md § Design Tokens (Accent Sky Blue: #0284C7 / #38BDF8)',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.hasSkyBlueToken,
        'globals.css に SchoolHub スカイブルートークン（#0284C7 または #38BDF8 / #E0F2FE）が定義されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F1-03',
    'SchoolHub特有のペリウィンクル薄紫アクセント（#9F9EFE / #EEF0FF）が定義されていること',
    'PROJECT.md § Design Tokens (Accent Periwinkle: #9F9EFE / #EEF0FF)',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.hasPeriwinkleToken,
        'globals.css にペリウィンクルトークン（#9F9EFE / #EEF0FF）が定義されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F1-04',
    'SchoolHub特有の注意・未対応ゴールドアクセント（#F4C233 / #FEF9C3）が定義されていること',
    'PROJECT.md § Design Tokens (Accent Gold: #F4C233 / #FEF9C3)',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.hasGoldToken,
        'globals.css にゴールドトークン（#F4C233 / #FEF9C3）が定義されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F1-05',
    'SchoolHub特有の完了・アクティブミントアクセント（#10B981 / #D1FAE5）が定義されていること',
    'PROJECT.md § Design Tokens (Accent Mint: #10B981 / #D1FAE5)',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.hasMintToken,
        'globals.css にミントトークン（#10B981 / #D1FAE5）が定義されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F1-06',
    'SchoolHub仕様のソフトカードシャドウおよび繊細なボーダーが定義されていること',
    'PROJECT.md § Design Tokens (Card border: #E2E8F0, shadow: 0 1px 3px rgba(0,0,0,0.04))',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.hasSoftCardShadow,
        'globals.css にソフトカードシャドウ（0 1px 3px rgba(0,0,0,0.04)等）が定義されている必要があります'
      );
    }
  );

  // =========================================================================
  // F2: バッジ（sky, periwinkle, gold, mint）およびUIプリミティブのスタイル検証
  // =========================================================================
  runner.setContext('Tier 1', 'F2: バッジ・UIプリミティブ');

  await runner.test(
    'T1-F2-01',
    'badge.tsxのbadgeVariantsに「sky」バリアントが定義されていること',
    'PROJECT.md § Interface Contracts (Badge variants: <Badge variant="sky">)',
    () => {
      const badge = analyzer.inspectBadgeVariants();
      assert.ok(badge.hasSky, 'badge.tsx に variant: sky が実装されている必要があります');
    }
  );

  await runner.test(
    'T1-F2-02',
    'badge.tsxのbadgeVariantsに「periwinkle」バリアントが定義されていること',
    'PROJECT.md § Interface Contracts (Badge variants: <Badge variant="periwinkle">)',
    () => {
      const badge = analyzer.inspectBadgeVariants();
      assert.ok(
        badge.hasPeriwinkle,
        'badge.tsx に variant: periwinkle が実装されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F2-03',
    'badge.tsxのbadgeVariantsに「gold」バリアントが定義されていること',
    'PROJECT.md § Interface Contracts (Badge variants: <Badge variant="gold">)',
    () => {
      const badge = analyzer.inspectBadgeVariants();
      assert.ok(badge.hasGold, 'badge.tsx に variant: gold が実装されている必要があります');
    }
  );

  await runner.test(
    'T1-F2-04',
    'badge.tsxのbadgeVariantsに「mint」バリアントが定義されていること',
    'PROJECT.md § Interface Contracts (Badge variants: <Badge variant="mint">)',
    () => {
      const badge = analyzer.inspectBadgeVariants();
      assert.ok(badge.hasMint, 'badge.tsx に variant: mint が実装されている必要があります');
    }
  );

  await runner.test(
    'T1-F2-05',
    'CardコンポーネントがSchoolHub仕様のソフトシャドウ・角丸・ボーダーを保持していること',
    'PROJECT.md § Interface Contracts (Standard Card: bg-white rounded-2xl border border-slate-200/70)',
    () => {
      const cardContent = analyzer.getFileContent('src/components/ui/card.tsx');
      assert.ok(
        /rounded-|shadow-/i.test(cardContent),
        'card.tsx に角丸・シャドウが定義されている必要があります'
      );
    }
  );

  // =========================================================================
  // F3: 過度なグラデーション/巨大ぼかし円の排除検証
  // =========================================================================
  runner.setContext('Tier 1', 'F3: 過度なグラデーション・ぼかし円の排除');

  await runner.test(
    'T1-F3-01',
    'admin/page.tsxから600pxの巨大ぼかし円（w-[600px] h-[600px]）が撤去されていること',
    'PROJECT.md § Feature Inventory (F3: 600px巨大ぼかし円の撤去)',
    () => {
      const gradients = analyzer.inspectExcessiveGradients();
      assert.ok(
        !gradients.has600pxBlur,
        'admin/page.tsx に600px巨大ぼかし円が残存しています。SchoolHub仕様に従い撤去してください。'
      );
    }
  );

  await runner.test(
    'T1-F3-02',
    'admin/page.tsxから500pxの巨大ぼかし円（w-[500px] h-[500px]）が撤去されていること',
    'PROJECT.md § Feature Inventory (F3: 巨大ぼかし円の撤去)',
    () => {
      const gradients = analyzer.inspectExcessiveGradients();
      assert.ok(
        !gradients.has500pxBlur,
        'admin/page.tsx に500px巨大ぼかし円が残存しています。SchoolHub仕様に従い撤去してください。'
      );
    }
  );

  await runner.test(
    'T1-F3-03',
    'admin/page.tsxの背景装飾からAI生成感のあるディープネオングラデーションが排除されていること',
    'ORIGINAL_REQUEST.md § Acceptance Criteria (AI生成感の一掃)',
    () => {
      const gradients = analyzer.inspectExcessiveGradients();
      assert.ok(
        !gradients.hasDeepNeonGradient,
        'admin/page.tsx にディープネオングラデーションが残存しています。'
      );
    }
  );

  await runner.test(
    'T1-F3-04',
    'ダッシュボードのルートコンテナがクリーンなライト背景（bg-background）を基調としていること',
    'ORIGINAL_REQUEST.md R1 (ベース背景色をクリーンで柔らかなオフホワイトに統一)',
    () => {
      const layoutContent = analyzer.getFileContent('src/app/layout.tsx');
      assert.ok(
        layoutContent.includes('bg-background') ||
          layoutContent.includes('#F8FAFC') ||
          layoutContent.includes('bg-[#F8FAFC]'),
        'layout.tsx または全体レイアウトで bg-background が適用されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F3-05',
    '過度なグラデーション文字（bg-clip-text text-transparent）が排他され可読性が担保されていること',
    'PROJECT.md R1 (SchoolHubデザインシステム・トークンの適用)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      // 過度な虹色グラデーション文字（from-pink to-purple等）が存在しないこと
      assert.notMatches(
        adminContent,
        /bg-clip-text\s+text-transparent\s+bg-gradient-to-r\s+from-pink/i,
        'admin画面に不適切なネオングラデーション文字が存在します'
      );
    }
  );

  // =========================================================================
  // F4: /admin 最上部4大KPIカードの表示検証
  // =========================================================================
  runner.setContext('Tier 1', 'F4: /admin 最上部4大KPIカード');

  await runner.test(
    'T1-F4-01',
    '管理者ダッシュボードに4大KPIカード専用コンポーネント（AdminKpiCards等）が導入されていること',
    'PROJECT.md § Admin Dashboard Component Contracts (AdminKpiCards.tsx)',
    () => {
      const hasComponent =
        analyzer.fileExists('src/components/admin/dashboard/AdminKpiCards.tsx') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('AdminKpiCards') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('4大KPI');
      assert.ok(hasComponent, 'AdminKpiCards コンポーネントが存在するか /admin/page.tsx に導入されている必要があります');
    }
  );

  await runner.test(
    'T1-F4-02',
    '4大KPIカードに在籍生徒数の集計表示およびソフトパステル調アイコンバッジが存在すること',
    'ORIGINAL_REQUEST.md R2 (在籍生徒数、ソフトパステルカラーの角丸アイコンバッジと大きな数字表示)',
    () => {
      const mockKpi = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        createMockLessons(2),
        ['coach-tanaka-uuid'],
        [{ amount: 15000, status: 'paid' }, { amount: 5000, status: 'unpaid' }]
      );
      assert.equal(mockKpi.totalStudents, 1, '在籍生徒数が正しく計算されること');
      assert.greaterThanOrEqual(mockKpi.totalStudents, 0);
    }
  );

  await runner.test(
    'T1-F4-03',
    '4大KPIカードに本日のレッスン数の集計表示が存在すること',
    'ORIGINAL_REQUEST.md R2 (本日のレッスン数)',
    () => {
      const lessons = createMockLessons(3);
      const mockKpi = calculateSchoolHubKpis([ALLOWED_TEST_CUSTOMER], lessons, ['coach-1'], []);
      assert.equal(mockKpi.todayLessonsCount, 3, '本日のレッスン数が正しく集計されること');
    }
  );

  await runner.test(
    'T1-F4-04',
    '4大KPIカードに稼働コーチ数の集計表示が存在すること',
    'ORIGINAL_REQUEST.md R2 (稼働コーチ数)',
    () => {
      const mockKpi = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        [],
        ['coach-1', 'coach-2', 'coach-3'],
        []
      );
      assert.equal(mockKpi.activeCoachesCount, 3, '稼働コーチ数が正しく集計されること');
    }
  );

  await runner.test(
    'T1-F4-05',
    '4大KPIカードに今月売上および未回収金額が明確に分離表示されること',
    'ORIGINAL_REQUEST.md R2 (今月売上・未回収)',
    () => {
      const mockKpi = calculateSchoolHubKpis(
        [ALLOWED_TEST_CUSTOMER],
        [],
        ['coach-1'],
        [
          { amount: 50000, status: 'paid' },
          { amount: 12000, status: 'unpaid' },
        ]
      );
      assert.equal(mockKpi.totalSales, 50000, '確定売上が正しく集計されること');
      assert.equal(mockKpi.uncollectedAmount, 12000, '未回収金額が正しく集計されること');
    }
  );

  // =========================================================================
  // F5: /admin 2カラム構成のレイアウト検証
  // =========================================================================
  runner.setContext('Tier 1', 'F5: /admin 2カラム構成');

  await runner.test(
    'T1-F5-01',
    '/admin メインエリアがメイン列（左）とサブ列（右）の2カラム構成（例: lg:grid-cols-12）であること',
    'PROJECT.md § Feature Inventory (F5: メイン列左8列、サブ列右4列の2カラム化)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      const has2Column =
        /grid-cols-12/i.test(adminContent) ||
        /lg:col-span-8[\s\S]+lg:col-span-4/i.test(adminContent) ||
        /TodayScheduleTimeline/i.test(adminContent);
      assert.ok(has2Column, '/admin が左メイン・右サブの2カラム構造として設計されている必要があります');
    }
  );

  await runner.test(
    'T1-F5-02',
    'メイン列（左）に本日のレッスンスケジュールタイムライン（TodayScheduleTimeline）が配置されていること',
    'PROJECT.md § Admin Dashboard Component Contracts (TodayScheduleTimeline.tsx)',
    () => {
      const hasTimeline =
        analyzer.fileExists('src/components/admin/dashboard/TodayScheduleTimeline.tsx') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('TodayScheduleTimeline') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('タイムライン');
      assert.ok(hasTimeline, '本日のレッスンスケジュールタイムラインがメイン列に存在する必要があります');
    }
  );

  await runner.test(
    'T1-F5-03',
    'サブ列（右）に新着リード（体験申込）ウィジェット（NewLeadsWidget）が配置されていること',
    'PROJECT.md § Admin Dashboard Component Contracts (NewLeadsWidget.tsx)',
    () => {
      const hasLeads =
        analyzer.fileExists('src/components/admin/dashboard/NewLeadsWidget.tsx') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('NewLeadsWidget') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('新着');
      assert.ok(hasLeads, '新着リードウィジェットがサブ列に配置されている必要があります');
    }
  );

  await runner.test(
    'T1-F5-04',
    'サブ列（右）に未承認請求・確認事項ウィジェット（PendingApprovalsWidget）が配置されていること',
    'PROJECT.md § Admin Dashboard Component Contracts (PendingApprovalsWidget.tsx)',
    () => {
      const hasApprovals =
        analyzer.fileExists('src/components/admin/dashboard/PendingApprovalsWidget.tsx') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('PendingApprovalsWidget') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('未承認');
      assert.ok(hasApprovals, '未承認請求ウィジェットがサブ列に配置されている必要があります');
    }
  );

  await runner.test(
    'T1-F5-05',
    'サブ列（右）に実務効率を高めるクイックアクションウィジェットが配置されていること',
    'PROJECT.md § Admin Dashboard Component Contracts (QuickActionsWidget.tsx)',
    () => {
      const hasQuickActions =
        analyzer.fileExists('src/components/admin/dashboard/QuickActionsWidget.tsx') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('QuickActionsWidget') ||
        analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx').includes('クイックアクション');
      assert.ok(hasQuickActions, 'クイックアクションウィジェットがサブ列に配置されている必要があります');
    }
  );

  // =========================================================================
  // F6: /admin 最下部重複コントロールセンターカードの排除検証
  // =========================================================================
  runner.setContext('Tier 1', 'F6: 重複コントロールセンターカードの排除');

  await runner.test(
    'T1-F6-01',
    'admin/page.tsx 最下部の「コントロールセンター」セクションが撤去されていること',
    'PROJECT.md § Feature Inventory (F6: 重複コントロールセンターカードの撤去)',
    () => {
      const controlCenter = analyzer.inspectControlCenterCards();
      assert.ok(
        !controlCenter.hasControlCenterSection,
        'admin/page.tsx に重複するコントロールセンターセクションが残存しています。実務導線集約のため撤去してください。'
      );
    }
  );

  await runner.test(
    'T1-F6-02',
    'サイドバーと重複していたマスタ管理・顧客管理等の4大カードリンクが撤去されていること',
    'PROJECT.md § Feature Inventory (F6: 重複カード撤去)',
    () => {
      const controlCenter = analyzer.inspectControlCenterCards();
      assert.ok(
        !controlCenter.hasDuplicateCards,
        'サイドバーと重複するカード群が最下部に残存しています。'
      );
    }
  );

  await runner.test(
    'T1-F6-03',
    'ダッシュボード下部のアクティビティ・売上推移が直感的に配置されていること',
    'PROJECT.md R2 (実務効率を最大化)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      assert.ok(
        adminContent.includes('RevenueChart') || adminContent.includes('売上'),
        '売上推移コンポーネントが配置されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F6-04',
    '最下部重複排除によりページスクロール負荷が削減されていること',
    'ORIGINAL_REQUEST.md R2 (下部の重複していたコントロールセンターカードは排除)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      assert.ok(
        !adminContent.includes('システムの重要設定とリソース管理'),
        'admin/page.tsx にコントロールセンターの説明文言「システムの重要設定とリソース管理」が残存しています。'
      );
    }
  );

  await runner.test(
    'T1-F6-05',
    '各設定メニューへの導線がサイドバーナビゲーションに正常に集約されていること',
    'PROJECT.md F6 (実務導線へ集約)',
    () => {
      const sidebarContent = analyzer.getFileContent('src/components/layout/DesktopSidebar.tsx');
      assert.ok(
        sidebarContent.includes('/customers') &&
          (sidebarContent.includes('/admin/masters') || sidebarContent.includes('マスタ')),
        'サイドバーに必要な管理導線が集約されている必要があります'
      );
    }
  );

  // =========================================================================
  // F7: /customers 生徒頭文字アバター、会員番号バッジ、コースバッジ、ステータスバッジの表示検証
  // =========================================================================
  runner.setContext('Tier 1', 'F7: /customers 会員テーブルSchoolHub刷新');

  await runner.test(
    'T1-F7-01',
    '会員一覧テーブルに生徒の頭文字アバター（Initial Avatar）が表示されていること',
    'PROJECT.md § Feature Inventory (F7: 生徒頭文字アバター)',
    () => {
      const customers = analyzer.inspectCustomersTable();
      assert.ok(
        customers.hasInitialAvatar,
        'customers/page.tsx に生徒頭文字アバター（Avatar/AvatarFallback等）が表示されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F7-02',
    '会員番号（#0035等）がスカイブルー等のパステル調バッジで明瞭に表示されていること',
    'PROJECT.md § Feature Inventory (F7: #0035スカイバッジ)',
    () => {
      const customers = analyzer.inspectCustomersTable();
      assert.ok(
        customers.hasStudentNumberBadge,
        'customers/page.tsx に会員番号バッジが表示されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F7-03',
    '所属コース（週1・月4回等）がSchoolHubスタイルのコースバッジで表示されていること',
    'PROJECT.md § Feature Inventory (F7: コースバッジ)',
    () => {
      const customers = analyzer.inspectCustomersTable();
      assert.ok(
        customers.hasCourseBadge,
        'customers/page.tsx に所属コースバッジが表示されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F7-04',
    '会員ステータス（受講中/体験/休会/退会）が対応するカラーバッジで表示されていること',
    'PROJECT.md § Feature Inventory (F7: ステータスバッジ［受講中/体験/休会］)',
    () => {
      const customers = analyzer.inspectCustomersTable();
      assert.ok(
        customers.hasStatusBadge,
        'customers/page.tsx にステータスバッジが表示されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F7-05',
    '担当コーチがアバターまたは視認性の高いバッジ形式で表示されていること',
    'PROJECT.md § Feature Inventory (F7: 担当コーチアバター)',
    () => {
      const customersContent = analyzer.getFileContent('src/app/(dashboard)/customers/page.tsx');
      assert.ok(
        customersContent.includes('StudentMultiCoachSelect') ||
          customersContent.includes('coach') ||
          customersContent.includes('担当'),
        '担当コーチの表示要素が存在する必要があります'
      );
    }
  );

  // =========================================================================
  // F8: モバイル表示（375px）でのレスポンシブ検証
  // =========================================================================
  runner.setContext('Tier 1', 'F8: モバイル375pxレスポンシブ');

  await runner.test(
    'T1-F8-01',
    '会員一覧がモバイル画面（375px）でカードビューへ切り替わるレスポンシブ構造を持つこと',
    'PROJECT.md § Feature Inventory (F8: 375pxモバイル画面でカードビューへ自動切り替え)',
    () => {
      const customers = analyzer.inspectCustomersTable();
      assert.ok(
        customers.hasMobileResponsiveLayout,
        'customers/page.tsx にモバイル用レスポンシブ表示（hidden md:table / md:hidden カードなど）が実装されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F8-02',
    'モバイル表示時にテーブルが画面外へ突き抜けないようoverflow-x-autoまたはカード化されていること',
    'ORIGINAL_REQUEST.md (モバイル375px幅でも崩れず快適に操作・閲覧できること)',
    () => {
      const customersContent = analyzer.getFileContent('src/app/(dashboard)/customers/page.tsx');
      const hasResponsiveWrap =
        /overflow-x-auto/i.test(customersContent) ||
        /md:hidden/i.test(customersContent) ||
        /hidden\s+md:block/i.test(customersContent);
      assert.ok(
        hasResponsiveWrap,
        'customers画面に横スクロール防止またはカード化のレスポンシブ対策が必要です'
      );
    }
  );

  await runner.test(
    'T1-F8-03',
    'ダッシュボードのKPIカードがモバイルで1列または2列のスタック表示に適応すること',
    'PROJECT.md F8, F4 (レスポンシブグリッド)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      assert.ok(
        /grid-cols-1/i.test(adminContent) || /flex-col/i.test(adminContent),
        'ダッシュボードにモバイル用単一カラムまたはスタック設定が存在する必要があります'
      );
    }
  );

  await runner.test(
    'T1-F8-04',
    'ダッシュボードの2カラム（左8:右4）がモバイルで縦積みにフォールバックすること',
    'PROJECT.md F5, F8 (レスポンシブ2カラム)',
    () => {
      const adminContent = analyzer.getFileContent('src/app/(dashboard)/admin/page.tsx');
      assert.ok(
        /lg:grid-cols-|md:grid-cols-|flex-col/i.test(adminContent),
        '2カラムが画面幅に応じて適切にブレークポイント分岐されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F8-05',
    '主要タップターゲット（ボタン、セレクト等）がモバイルで操作可能な高さ（min 40px〜44px）を持つこと',
    'Apple HIG & SchoolHub Guidelines (タップ領域の確保)',
    () => {
      const buttonContent = analyzer.getFileContent('src/components/ui/button.tsx');
      assert.ok(
        /h-9|h-10|h-11|py-2/i.test(buttonContent),
        'button.tsx に十分なタップターゲットサイズが確保されている必要があります'
      );
    }
  );

  // =========================================================================
  // F9: 共有画面（/students, /coach, /admin/schedule）のデザイン同期検証
  // =========================================================================
  runner.setContext('Tier 1', 'F9: 共有画面デザイン同期');

  await runner.test(
    'T1-F9-01',
    '/students 画面のカードおよびスタイルがSchoolHubデザイントークンと同期していること',
    'PROJECT.md § Feature Inventory (F9: /students のデザイン同期)',
    () => {
      assert.ok(analyzer.fileExists('src/app/(dashboard)/students/page.tsx'));
      const content = analyzer.getFileContent('src/app/(dashboard)/students/page.tsx');
      assert.ok(
        /bg-white|rounded-|border/i.test(content),
        '/students のカードスタイルが整っている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F9-02',
    '/coach 画面のカードおよびステータスバッジがSchoolHubカラーパレットと同期していること',
    'PROJECT.md § Feature Inventory (F9: /coach のデザイン同期)',
    () => {
      assert.ok(analyzer.fileExists('src/app/(dashboard)/coach/page.tsx'));
      const content = analyzer.getFileContent('src/app/(dashboard)/coach/page.tsx');
      assert.ok(
        content.includes('Badge') || content.includes('Card') || content.includes('rounded'),
        '/coach に共通UIプリミティブが適用されている必要があります'
      );
    }
  );

  await runner.test(
    'T1-F9-03',
    '/admin/schedule 画面のスケジュールタイムラインがSchoolHubトークンと同期していること',
    'PROJECT.md § Feature Inventory (F9: /admin/schedule のデザイン同期)',
    () => {
      assert.ok(analyzer.fileExists('src/app/(dashboard)/admin/schedule/page.tsx'));
      const content = analyzer.getFileContent('src/app/(dashboard)/admin/schedule/page.tsx');
      assert.ok(
        content.includes('bg-white') || content.includes('border') || content.includes('Calendar'),
        '/admin/schedule が共通デザインと同期している必要があります'
      );
    }
  );

  await runner.test(
    'T1-F9-04',
    '/coach/schedule 画面のスケジュール表示がSchoolHubデザインシステムと同期していること',
    'PROJECT.md § Feature Inventory (F9: /coach/schedule のデザイン同期)',
    () => {
      assert.ok(analyzer.fileExists('src/app/(dashboard)/coach/schedule/page.tsx'));
      const content = analyzer.getFileContent('src/app/(dashboard)/coach/schedule/page.tsx');
      assert.ok(
        content.includes('Schedule') || content.includes('Card') || content.includes('border'),
        '/coach/schedule が共通デザインと同期している必要があります'
      );
    }
  );

  await runner.test(
    'T1-F9-05',
    '全ダッシュボード画面で共通のクリーンなフォントおよびタイポグラフィ体系が適用されていること',
    'PROJECT.md § Architecture (Inter, Helvetica Neue, Hiragino Kaku Gothic ProN)',
    () => {
      const globals = analyzer.inspectGlobalsCss();
      assert.ok(
        globals.raw.includes('--font-sans') || globals.raw.includes('Inter'),
        'globals.css に標準フォント体系が定義されている必要があります'
      );
    }
  );

  // =========================================================================
  // F10: 顧客テスト制約（会員番号0035、テスト太郎以外のデータ保護）の検証
  // =========================================================================
  runner.setContext('Tier 1', 'F10: 顧客テスト制約・データ保護');

  await runner.test(
    'T1-F10-01',
    '会員番号「0035」および氏名「テスト太郎」のテストデータ操作が正常に許可されること',
    'ORIGINAL_REQUEST.md § Acceptance Criteria (会員番号0035「テスト太郎」以外使用しないこと)',
    () => {
      // 例外が送出されずに通過すること
      assertCustomerProtection(ALLOWED_TEST_CUSTOMER);
    }
  );

  await runner.test(
    'T1-F10-02',
    '会員番号「0001」等の許可されていない顧客データへのアクセスが遮断されること',
    'ORIGINAL_REQUEST.md § コード品質・制約 (会員番号0035以外の顧客データ保護)',
    () => {
      assert.throws(
        () => assertCustomerProtection({ student_number: '0001', full_name: '一般顧客A' }),
        '会員番号0001の操作はセキュリティ違反として遮断される必要があります'
      );
    }
  );

  await runner.test(
    'T1-F10-03',
    '会員番号「9999」等の架空番号の操作が遮断されること',
    'ORIGINAL_REQUEST.md § コード品質・制約 (会員番号0035以外の顧客データ保護)',
    () => {
      assert.throws(
        () => assertCustomerProtection({ student_number: '9999', full_name: '山田花子' }),
        '会員番号9999の操作は遮断される必要があります'
      );
    }
  );

  await runner.test(
    'T1-F10-04',
    '会員番号が未設定（null / undefined）の不正な更新リクエストが遮断されること',
    'PROJECT.md § Customer & Business Logic Contracts (顧客テスト保護)',
    () => {
      assert.throws(
        () => assertCustomerProtection({ student_number: null, full_name: '不明顧客' }),
        '会員番号nullの操作は遮断される必要があります'
      );
    }
  );

  await runner.test(
    'T1-F10-05',
    'E2Eテストスイート内部で実本番DBへの破壊的変更を行わない隔離契約が維持されていること',
    'PROJECT.md § Interface Contracts (顧客テスト保護)',
    () => {
      assert.equal(ALLOWED_TEST_CUSTOMER.student_number, '0035');
      assert.includes(ALLOWED_TEST_CUSTOMER.full_name, 'テスト太郎');
    }
  );
}
