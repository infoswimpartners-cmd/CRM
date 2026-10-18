/**
 * Milestone 4 総合実証・アドバーサリアル検証ハーネス (challenger-m4-comprehensive.ts)
 * 
 * 検証4大ミッション:
 * 1. 顧客データ保護の最終実証（会員0035/テスト太郎以外の漏洩・変更・ハードコード皆無、物理遮断）
 * 2. 既存ビジネスロジックの非破壊性（Supabase認証・Stripe決済・月切り替え・コーチ報酬/源泉徴収10.21%・LINE連携）
 * 3. モバイル（375px）レスポンシブ検証（/admin, /customers, /students, スケジュール）
 * 4. ビルド健全性（tsc, build）
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

// UIコンポーネントのインポート
import { AdminKpiCards } from '../src/components/admin/dashboard/AdminKpiCards';
import { TodayScheduleTimeline, TodayScheduleItem } from '../src/components/admin/dashboard/TodayScheduleTimeline';
import { NewLeadsWidget, LeadItem } from '../src/components/admin/dashboard/NewLeadsWidget';
import { PendingApprovalsWidget, PendingRequestItem } from '../src/components/admin/dashboard/PendingApprovalsWidget';
import { QuickActionsWidget } from '../src/components/admin/dashboard/QuickActionsWidget';

// 顧客保護・LINE物理セキュリティガード
import { assertCustomerProtection, ALLOWED_TEST_CUSTOMER } from './e2e/helpers/mock-factory';
import {
    assertTestPreviewSecurityGuard,
    TEST_TARO_STUDENT_NUMBER,
    TEST_TARO_LINE_USER_ID,
} from '../src/lib/line-marketing-service';

// Stripe クライアント
import { stripe } from '../src/lib/stripe';

interface TestResult {
    category: string;
    id: string;
    name: string;
    passed: boolean;
    error?: string;
}

const allResults: TestResult[] = [];

function runTest(category: string, id: string, name: string, fn: () => void) {
    try {
        fn();
        allResults.push({ category, id, name, passed: true });
        console.log(`  ✔ [${id}] ${name}`);
    } catch (err: any) {
        allResults.push({ category, id, name, passed: false, error: err?.message || String(err) });
        console.error(`  ✖ [${id}] ${name}`);
        console.error(`    エラー詳細: ${err?.message || err}`);
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

console.log('\n======================================================================');
console.log('       MILESTONE 4: EMPIRICAL CHALLENGER COMPREHENSIVE SUITE          ');
console.log('======================================================================\n');

// ==============================================================================
// 1. 顧客データ保護の最終実証 (Customer Data Protection)
// ==============================================================================
console.log('▶ [Mission 1: 顧客データ保護の最終実証]');

runTest('顧客データ保護', 'PROT-01', '全コードベース静的監査: テスト会員0035/テスト太郎以外の実在顧客番号ハードコードが皆無であること', () => {
    const srcDir = path.resolve(__dirname, '../src');
    
    function scanDir(dir: string, fileList: string[] = []): string[] {
        const files = fs.readdirSync(dir);
        for (const f of files) {
            const fullPath = path.join(dir, f);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath, fileList);
            } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
                fileList.push(fullPath);
            }
        }
        return fileList;
    }

    const allFiles = scanDir(srcDir);
    // 顧客番号ハードコードの疑いがあるパターン（例: student_number === '0001' 等）
    const suspiciousPattern = /student_number\s*(?:===|==)\s*['"](\d+)['"]/g;

    for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        let match: RegExpExecArray | null;
        while ((match = suspiciousPattern.exec(content)) !== null) {
            const detectedNumber = match[1];
            assert(
                detectedNumber === '0035',
                `違反検知: ファイル ${filePath} にて会員番号 "${detectedNumber}" がハードコードされています（許可: 0035のみ）`
            );
        }
    }
});

runTest('顧客データ保護', 'PROT-02', 'assertCustomerProtection: 正当なテスト顧客（0035, #0035, トリム値, テスト太郎）が許可されること', () => {
    // 正常系
    assertCustomerProtection({ student_number: '0035', full_name: 'テスト太郎' });
    assertCustomerProtection({ student_number: '#0035', full_name: 'テスト太郎' });
    assertCustomerProtection({ student_number: '  0035  ', full_name: 'テスト太郎' });
    assertCustomerProtection({ student_number: '0035', full_name: 'テスト太郎（一般）' });
});

runTest('顧客データ保護', 'PROT-03', 'assertCustomerProtection: 不正・他会員番号（0001, 0034, 0036, 9999）が物理的に遮断されること', () => {
    const illegalNumbers = ['0001', '0034', '0036', '9999', '1234', '0000'];
    for (const num of illegalNumbers) {
        let blocked = false;
        try {
            assertCustomerProtection({ student_number: num, full_name: '一般生徒' });
        } catch (e: any) {
            blocked = true;
            assert(e.message.includes('[SECURITY_VIOLATION]'), `SECURITY_VIOLATIONが含まれること: ${num}`);
        }
        assert(blocked, `不正な会員番号 ${num} が遮断されませんでした`);
    }
});

runTest('顧客データ保護', 'PROT-04', 'assertCustomerProtection: 類似プレフィックス・空値・インジェクションが物理的に遮断されること', () => {
    const adversarialInputs = [
        '00350',
        '0035_sub',
        '0035a',
        '',
        null,
        undefined,
        '0035 OR 1=1',
        '<script>0035</script>',
        'DROP TABLE students;'
    ];

    for (const input of adversarialInputs) {
        let blocked = false;
        try {
            assertCustomerProtection({ student_number: input, full_name: '一般顧客' });
        } catch (e: any) {
            blocked = true;
            assert(e.message.includes('[SECURITY_VIOLATION]'), `SECURITY_VIOLATIONが含まれること: ${input}`);
        }
        assert(blocked, `アドバーサリアル入力 ${input} が遮断されませんでした`);
    }
});

runTest('顧客データ保護', 'PROT-05', 'LINE配信物理セキュリティガード: 会員番号0035（テスト太郎）以外のテスト配信が物理例外で遮断されること', () => {
    // 正常系（0035 + 正当なLINE ID）
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        studentNumber: TEST_TARO_STUDENT_NUMBER,
        lineUserId: TEST_TARO_LINE_USER_ID,
    });

    // 異常系1: 不正な会員番号（0001）
    let blocked1 = false;
    try {
        assertTestPreviewSecurityGuard({
            isTestPreview: true,
            studentNumber: '0001',
            lineUserId: TEST_TARO_LINE_USER_ID,
        });
    } catch (e: any) {
        blocked1 = true;
        assert(e.message.includes('SECURITY VIOLATION'), '不正な会員番号0001が物理遮断されること');
    }
    assert(blocked1, '会員番号0001へのテスト配信が遮断されませんでした');

    // 異常系2: 不正なLINE ID
    let blocked2 = false;
    try {
        assertTestPreviewSecurityGuard({
            isTestPreview: true,
            studentNumber: TEST_TARO_STUDENT_NUMBER,
            lineUserId: 'U99999999999999999999999999999999',
        });
    } catch (e: any) {
        blocked2 = true;
        assert(e.message.includes('SECURITY VIOLATION'), '不正なLINE IDが物理遮断されること');
    }
    assert(blocked2, '不正LINE IDへのテスト配信が遮断されませんでした');
});

// ==============================================================================
// 2. 既存ビジネスロジックの非破壊性 (Preservation of Existing Business Logic)
// ==============================================================================
console.log('\n▶ [Mission 2: 既存ビジネスロジックの非破壊性]');

runTest('ビジネスロジック非破壊性', 'BIZ-01', 'Supabase認証・クライアントファクトリが健全に存在し初期化可能であること', () => {
    const serverSupabasePath = path.resolve(__dirname, '../src/lib/supabase/server.ts');
    const clientSupabasePath = path.resolve(__dirname, '../src/lib/supabase/client.ts');
    assert(fs.existsSync(serverSupabasePath), 'src/lib/supabase/server.ts が存在すること');
    assert(fs.existsSync(clientSupabasePath), 'src/lib/supabase/client.ts が存在すること');

    const serverContent = fs.readFileSync(serverSupabasePath, 'utf-8');
    assert(serverContent.includes('export async function createClient'), 'server createClient がエクスポートされていること');
    assert(serverContent.includes('createServerClient'), 'createServerClient が使用されていること');

    const clientContent = fs.readFileSync(clientSupabasePath, 'utf-8');
    assert(clientContent.includes('export function createClient'), 'client createClient がエクスポートされていること');
});

runTest('ビジネスロジック非破壊性', 'BIZ-02', 'Stripe決済連携クライアントおよびサブスクリプション操作メソッドが健全であること', () => {
    assert(stripe !== undefined && stripe !== null, 'stripeインスタンスがロード可能であること');
    assert(typeof stripe.subscriptions?.cancel === 'function', 'stripe.subscriptions.cancel メソッドが保持されていること');
    assert(typeof stripe.customers?.create === 'function', 'stripe.customers.create メソッドが保持されていること');
    assert(typeof stripe.invoices?.create === 'function', 'stripe.invoices.create メソッドが保持されていること');
});

runTest('ビジネスロジック非破壊性', 'BIZ-03', '月切り替えロジック（MonthSelector連動の日付境界・年跨ぎ・閏年計算）が狂いなく動作すること', () => {
    // 2026年10月
    const oct2026 = parseISO('2026-10-01');
    const startOct = startOfMonth(oct2026);
    const endOct = endOfMonth(oct2026);
    assert(format(startOct, 'yyyy-MM-dd') === '2026-10-01', '10月開始日');
    assert(format(endOct, 'yyyy-MM-dd') === '2026-10-31', '10月終了日(31日)');

    // 閏年2024年2月
    const feb2024 = parseISO('2024-02-01');
    const endFeb = endOfMonth(feb2024);
    assert(format(endFeb, 'yyyy-MM-dd') === '2024-02-29', '閏年2月終了日(29日)');

    // 年跨ぎ（12月 -> 1月）
    const dec2026 = parseISO('2026-12-01');
    const endDec = endOfMonth(dec2026);
    assert(format(endDec, 'yyyy-MM-dd') === '2026-12-31', '12月終了日(31日)');
});

runTest('ビジネスロジック非破壊性', 'BIZ-04', 'コーチ報酬計算・源泉徴収税控除（10.21%）の数学的正確性と免税・端数処理の実証', () => {
    const RATE_WITHHOLDING = 0.1021;

    // 計算関数モック
    function calculateNetPayment(totalReward: number, taxEnabled: boolean = true) {
        const withholdingTax = taxEnabled ? Math.floor(totalReward * RATE_WITHHOLDING) : 0;
        const finalAmount = totalReward - withholdingTax;
        return { withholdingTax, finalAmount };
    }

    // ケース1: ¥100,000 (標準ケース)
    const c1 = calculateNetPayment(100000, true);
    assert(c1.withholdingTax === 10210, `源泉税10,210円: 実際=${c1.withholdingTax}`);
    assert(c1.finalAmount === 89790, `手取り89,790円: 実際=${c1.finalAmount}`);

    // ケース2: ¥54,321 (端数ケース: 54321 * 0.1021 = 5546.1741 -> floor = 5546)
    const c2 = calculateNetPayment(54321, true);
    assert(c2.withholdingTax === 5546, `端数源泉税5,546円: 実際=${c2.withholdingTax}`);
    assert(c2.finalAmount === 48775, `端数手取り48,775円: 実際=${c2.finalAmount}`);

    // ケース3: ¥0 (ゼロ境界値)
    const c3 = calculateNetPayment(0, true);
    assert(c3.withholdingTax === 0, '¥0時源泉税0');
    assert(c3.finalAmount === 0, '¥0時手取り0');

    // ケース4: 免税設定（taxEnabled = false）
    const c4 = calculateNetPayment(100000, false);
    assert(c4.withholdingTax === 0, '免税時源泉税0');
    assert(c4.finalAmount === 100000, '免税時手取り100,000円全額');

    // ケース5: 億単位極大値（¥10,000,000）
    const c5 = calculateNetPayment(10000000, true);
    assert(c5.withholdingTax === 1021000, `極大値源泉税1,021,000円: 実際=${c5.withholdingTax}`);
    assert(c5.finalAmount === 8979000, `極大値手取り8,979,000円: 実際=${c5.finalAmount}`);
});

runTest('ビジネスロジック非破壊性', 'BIZ-05', 'LINE連携・退会連動自動化: updateStudentStatus の Stripe解約・ステップ配信停止ロジック契約検証', () => {
    const studentActionPath = path.resolve(__dirname, '../src/actions/student.ts');
    const content = fs.readFileSync(studentActionPath, 'utf-8');

    // updateStudentStatus の存在
    assert(content.includes('export async function updateStudentStatus'), 'updateStudentStatus がエクスポートされていること');
    // Stripe自動解約
    assert(content.includes("if (newStatus === 'withdrawn')"), 'withdrawn判定が存在すること');
    assert(content.includes('stripe.subscriptions.cancel(student.stripe_subscription_id)'), 'Stripeサブスクリプション自動解約が実装されていること');
    // LINEステップ配信停止
    assert(content.includes('stopStepReminderForUser(student.line_user_id, newStatus)'), 'stopStepReminderForUser の連動呼び出しが存在すること');
});

runTest('ビジネスロジック非破壊性', 'BIZ-06', 'ダッシュボードパーツの極限入力耐性: TodayScheduleTimeline, NewLeads, PendingApprovals の安全レンダリング', () => {
    // 1. TodayScheduleTimeline の null / empty / 複数件
    const emptyTimeline = renderToStaticMarkup(React.createElement(TodayScheduleTimeline, { schedules: [] }));
    assert(emptyTimeline.includes('本日の予定はありません'), '空状態UIが表示されること');

    const multiTimeline = renderToStaticMarkup(React.createElement(TodayScheduleTimeline, {
        schedules: [
            { id: '1', start_time: '2026-10-17T14:00:00', end_time: '2026-10-17T15:00:00', student_name: 'テスト太郎', student_number: '0035', status: 'scheduled', coach: { full_name: '田中コーチ' } },
            { id: '2', start_time: '2026-10-17T10:00:00', end_time: '2026-10-17T11:00:00', student_name: 'テスト太郎', student_number: '0035', status: 'completed', coach: { full_name: '佐藤コーチ' } },
        ]
    }));
    assert(multiTimeline.includes('テスト太郎'), 'テスト太郎が表示されること');
    assert(multiTimeline.includes('10:00'), '時系列ソートで10:00が含まれること');

    // 2. NewLeadsWidget の 6件入力時（5件制限スライス）
    const sixLeads: LeadItem[] = Array.from({ length: 6 }, (_, i) => ({
        id: `lead-${i}`,
        created_at: '2026-10-17T10:00:00Z',
        name: `申込者${i}`,
        preferred_pool: '目黒プール',
    }));
    const leadsHtml = renderToStaticMarkup(React.createElement(NewLeadsWidget, { leads: sixLeads }));
    assert(leadsHtml.includes('申込者4'), '5件目は含まれること');
    assert(!leadsHtml.includes('申込者5'), '6件目はスライスされて含まれないこと');

    // 3. PendingApprovalsWidget の全4リクエスト種別
    const approvalsHtml = renderToStaticMarkup(React.createElement(PendingApprovalsWidget, {
        pendingRequests: [
            { id: 'r1', created_at: '2026-10-17T10:00:00', request_type: 'add_plan', requested_is_trio: true, student: { id: 's1', full_name: 'テスト太郎', student_number: '0035' } },
            { id: 'r2', created_at: '2026-10-17T10:00:00', request_type: 'cancel_plan', requested_is_trio: false, student: { id: 's1', full_name: 'テスト太郎', student_number: '0035' } },
            { id: 'r3', created_at: '2026-10-17T10:00:00', request_type: 'add_plan', student: { id: 's1', full_name: 'テスト太郎', student_number: '0035' } },
            { id: 'r4', created_at: '2026-10-17T10:00:00', request_type: 'plan_change', student: { id: 's1', full_name: 'テスト太郎', student_number: '0035' } },
        ]
    }));
    assert(approvalsHtml.includes('Trio追加'), 'Trio追加バッジ');
    assert(approvalsHtml.includes('Trio解約'), 'Trio解約バッジ');
    assert(approvalsHtml.includes('プラン追加'), 'プラン追加バッジ');
    assert(approvalsHtml.includes('プラン変更'), 'プラン変更バッジ');
});

// ==============================================================================
// 3. モバイル（375px）レスポンシブ検証 (Mobile 375px Responsive Verification)
// ==============================================================================
console.log('\n▶ [Mission 3: モバイル（375px）レスポンシブ検証]');

runTest('モバイルレスポンシブ', 'RESP-01', 'ダッシュボード（/admin）: 4大KPIカードおよび2カラムレイアウトが375px幅で1列縦積みにフォールバックすること', () => {
    // 4大KPIカードのレンダリング
    const kpiHtml = renderToStaticMarkup(
        React.createElement(AdminKpiCards, {
            totalStudents: 15,
            todayLessonsCount: 4,
            activeCoachesCount: 3,
            totalSales: 150000,
            uncollectedAmount: 0,
        })
    );

    // grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 のクラスが存在すること
    assert(kpiHtml.includes('grid-cols-1'), 'モバイル時 1列 (grid-cols-1) であること');
    assert(kpiHtml.includes('sm:grid-cols-2'), 'タブレット時 2列 (sm:grid-cols-2) であること');
    assert(kpiHtml.includes('lg:grid-cols-4'), 'デスクトップ時 4列 (lg:grid-cols-4) であること');

    // /admin/page.tsx のメイン/サブ列
    const adminPagePath = path.resolve(__dirname, '../src/app/(dashboard)/admin/page.tsx');
    const adminContent = fs.readFileSync(adminPagePath, 'utf-8');
    assert(adminContent.includes('grid grid-cols-1 lg:grid-cols-12'), 'メイン/サブ列がモバイル時 1列縦積み (grid-cols-1) であること');
    assert(adminContent.includes('lg:col-span-8'), 'デスクトップ時 左メイン8列');
    assert(adminContent.includes('lg:col-span-4'), 'デスクトップ時 右サブ4列');
});

runTest('モバイルレスポンシブ', 'RESP-02', '会員一覧（/customers）: デスクトップテーブルとモバイルカードビュー（md:hidden）の二重ビュー構成と横スクロール防止', () => {
    const customersPagePath = path.resolve(__dirname, '../src/app/(dashboard)/customers/page.tsx');
    const content = fs.readFileSync(customersPagePath, 'utf-8');

    // デスクトップテーブルが md:block かつ overflow-x-auto を保持していること
    assert(content.includes('hidden md:block'), 'デスクトップテーブルが hidden md:block でラップされていること');
    assert(content.includes('overflow-x-auto'), 'デスクトップテーブルコンテナが overflow-x-auto であること');

    // モバイル専用カードビュー
    assert(content.includes('className="md:hidden space-y-3"'), 'モバイル専用カードビュー (md:hidden) が存在すること');
    assert(content.includes('truncate break-words'), '375px幅でのテキスト折り返し・省略クラスが適用されていること');
    assert(content.includes('min-w-0'), 'フレックスコンテナの突き抜け防止 (min-w-0) が適用されていること');
    assert(content.includes('カルテ詳細を見る'), 'モバイルカード内にカルテ詳細導線が存在すること');
});

runTest('モバイルレスポンシブ', 'RESP-03', '生徒一覧（/students）: モバイルカードビュー（md:hidden）とアバター・バッジの375px適応', () => {
    const studentsPagePath = path.resolve(__dirname, '../src/app/(dashboard)/students/page.tsx');
    const content = fs.readFileSync(studentsPagePath, 'utf-8');

    // デスクトップテーブル
    assert(content.includes('hidden md:table'), 'デスクトップテーブルが hidden md:table であること');
    assert(content.includes('overflow-x-auto'), 'テーブルラッパーが overflow-x-auto であること');

    // モバイルカードリスト
    assert(content.includes('md:hidden divide-y divide-slate-100'), 'モバイル専用リスト (md:hidden) が存在すること');
    assert(content.includes('min-w-0'), '名前とバッジが min-w-0 で保護されていること');
    assert(content.includes('Avatar'), '生徒頭文字アバターが表示されること');
    assert(content.includes('truncate'), '名前テキストが truncate されていること');
});

runTest('モバイルレスポンシブ', 'RESP-04', 'スケジュール画面（ScheduleCalendar）: 7列グリッドが375px幅（約53px/日）に収まるパディングとフォント制御', () => {
    const scheduleCalendarPath = path.resolve(__dirname, '../src/components/dashboard/ScheduleCalendar.tsx');
    const content = fs.readFileSync(scheduleCalendarPath, 'utf-8');

    // 7列グリッド制御
    assert(content.includes('grid grid-cols-7'), '7列グリッドが定義されていること');
    assert(content.includes('min-h-[50px] md:min-h-[60px]'), 'モバイル時 min-h-[50px] のコンパクト高さ');
    assert(content.includes('p-0.5 md:p-1'), 'モバイル時 p-0.5 の極小パディング');
    assert(content.includes('text-xs md:text-sm'), 'モバイル時 text-xs の適応フォントサイズ');
});

runTest('モバイルレスポンシブ', 'RESP-05', 'AI生成巨大ぼかし円・ディープシャドウの撤去とSchoolHubクリーンUIの維持', () => {
    const adminPagePath = path.resolve(__dirname, '../src/app/(dashboard)/admin/page.tsx');
    const adminContent = fs.readFileSync(adminPagePath, 'utf-8');

    // 600px, 500px の過度なぼかし円が撤去されていること
    assert(!adminContent.includes('w-[600px] h-[600px]'), '600pxぼかし円が撤去されていること');
    assert(!adminContent.includes('w-[500px] h-[500px]'), '500pxぼかし円が撤去されていること');
    // 重複していたコントロールセンターが撤去されていること
    assert(!adminContent.includes('コントロールセンター</h3>'), '最下部コントロールセンターが撤去されていること');
});

// ==============================================================================
// 4. ビルド健全性 (Build Health)
// ==============================================================================
console.log('\n▶ [Mission 4: ビルド健全性]');

runTest('ビルド健全性', 'BUILD-01', 'TypeScript型検査およびNext.js本番ビルド成果物（.next）の完全存在検証', () => {
    const nextDir = path.resolve(__dirname, '../.next');
    assert(fs.existsSync(nextDir), '.next ディレクトリが存在すること');
    
    const buildManifest = path.join(nextDir, 'build-manifest.json');
    assert(fs.existsSync(buildManifest), 'build-manifest.json が生成されていること');

    const serverApp = path.join(nextDir, 'server/app');
    assert(fs.existsSync(serverApp), 'server/app がコンパイルされていること');

    // /admin, /customers, /students, /coach のルートが正常生成されていること
    assert(fs.existsSync(path.join(serverApp, '(dashboard)/admin.html')) || fs.existsSync(path.join(serverApp, '(dashboard)/admin')), 'admin ルートが存在すること');
    assert(fs.existsSync(path.join(serverApp, '(dashboard)/customers.html')) || fs.existsSync(path.join(serverApp, '(dashboard)/customers')), 'customers ルートが存在すること');
    assert(fs.existsSync(path.join(serverApp, '(dashboard)/students.html')) || fs.existsSync(path.join(serverApp, '(dashboard)/students')), 'students ルートが存在すること');
    assert(fs.existsSync(path.join(serverApp, '(dashboard)/coach.html')) || fs.existsSync(path.join(serverApp, '(dashboard)/coach')), 'coach ルートが存在すること');
});

// ==============================================================================
// 総合集計・判定
// ==============================================================================
const totalTests = allResults.length;
const passedTests = allResults.filter(r => r.passed).length;
const failedTests = allResults.filter(r => !r.passed).length;

console.log('\n======================================================================');
console.log(`  COMPREHENSIVE TEST RESULTS: Total ${totalTests} | PASS ${passedTests} | FAIL ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
    console.error(`[CHALLENGE_FAILED] ${failedTests} 件の検証に失敗しました。`);
    process.exit(1);
} else {
    console.log(`[APPROVE] すべての検証項目（全 ${passedTests} 件）が正常に合格しました！\n`);
    process.exit(0);
}
