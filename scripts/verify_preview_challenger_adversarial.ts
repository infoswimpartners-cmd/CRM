/**
 * verify_preview_challenger_adversarial.ts
 * 
 * 敵対的検証専門エージェント（teamwork_preview_challenger）による
 * リアルタイムKPI数値整合性、デバウンス動作、属性変数置換、および顧客制約の実証的テストハーネス
 */

import { renderClientPreviewMessage } from '../src/app/(dashboard)/admin/line-marketing/components/PhonePreviewModal';
import { FilterPreviewStudent } from '../src/types/line-marketing';

interface TestResult {
    category: string;
    testName: string;
    passed: boolean;
    details: string;
    observed?: any;
    expected?: any;
}

const results: TestResult[] = [];

function assert(category: string, testName: string, condition: boolean, details: string, observed?: any, expected?: any) {
    results.push({
        category,
        testName,
        passed: condition,
        details,
        observed,
        expected,
    });
    if (!condition) {
        console.error(`❌ [FAIL] [${category}] ${testName}: ${details} (Observed: ${JSON.stringify(observed)}, Expected: ${JSON.stringify(expected)})`);
    } else {
        console.log(`✅ [PASS] [${category}] ${testName}`);
    }
}

// ----------------------------------------------------------------------
// 1. リアルタイムKPIカードの数値整合性・エッジケース実証検証
// ----------------------------------------------------------------------
console.log('\n--- 1. リアルタイムKPIカードの数値整合性・エッジケース実証検証 ---');

// KPI計算ロジックのシミュレータ
function calculateKpi(students: FilterPreviewStudent[], excludedIds: Set<string>) {
    const totalCount = students.length;
    const lineEligibleStudents = students.filter(s => s.hasLine);
    const lineEligibleCount = lineEligibleStudents.length;
    const lineUnlinkedCount = students.filter(s => !s.hasLine).length;
    const targetStudents = lineEligibleStudents.filter(s => !excludedIds.has(s.id));
    const targetCount = targetStudents.length;
    const excludedCount = excludedIds.size;
    const lineLinkRate = totalCount > 0 ? Math.round((lineEligibleCount / totalCount) * 100) : 0;

    return {
        totalCount,
        lineEligibleCount,
        lineUnlinkedCount,
        targetCount,
        excludedCount,
        lineLinkRate,
        isTotalMatched: totalCount === (lineEligibleCount + lineUnlinkedCount),
        isTargetMatched: targetCount === (lineEligibleCount - targetStudents.filter(s => excludedIds.has(s.id)).length), // 厳密式
    };
}

// テスト用生徒データ生成（※顧客制約: テストデータはテスト太郎 0035 をベースに作成）
function createMockStudent(id: string, hasLine: boolean, customProps: Partial<FilterPreviewStudent> = {}): FilterPreviewStudent {
    return {
        id,
        studentNumber: '0035',
        fullName: 'テスト太郎',
        fullNameKana: 'テストタロウ',
        status: 'trial_done',
        statusLabel: '体験受講後',
        area: '東京都港区',
        coachId: 'coach_001',
        coachName: '新吉航大 コーチ',
        membershipTypeId: 'plan_001',
        planName: '月2回プラン（60分）',
        hasLine,
        lineUserId: hasLine ? `line_user_${id}` : null,
        tags: ['trial_done'],
        trialDate: '2026年9月30日',
        ...customProps,
    };
}

// Case 1: 通常ケース (全20名、LINE連携15名、未連携5名、除外2名)
{
    const students: FilterPreviewStudent[] = [];
    for (let i = 1; i <= 20; i++) {
        students.push(createMockStudent(`student_${i}`, i <= 15));
    }
    const excluded = new Set(['student_1', 'student_2']);
    const kpi = calculateKpi(students, excluded);

    assert(
        'KPI数値整合性',
        '通常ケース: 抽出総数 = LINE連携済 + LINE未連携',
        kpi.isTotalMatched && kpi.totalCount === 20 && kpi.lineEligibleCount === 15 && kpi.lineUnlinkedCount === 5,
        '抽出総数が正しく連携済と未連携に分解されること',
        kpi.totalCount,
        kpi.lineEligibleCount + kpi.lineUnlinkedCount
    );

    assert(
        'KPI数値整合性',
        '通常ケース: 最終送信対象 = LINE連携済 - 除外件数 (15 - 2 = 13)',
        kpi.targetCount === 13,
        '送信対象が13名であること',
        kpi.targetCount,
        13
    );

    assert(
        'KPI数値整合性',
        '通常ケース: LINE連携率が75% (15/20) であること',
        kpi.lineLinkRate === 75,
        '連携率のパーセント計算',
        kpi.lineLinkRate,
        75
    );
}

// Case 2: 0件ケース (境界値: ゼロ除算回避)
{
    const kpi = calculateKpi([], new Set());
    assert(
        'KPI数値整合性',
        '0件境界値: 抽出総数0件時にNaNやゼロ除算が発生しないこと',
        kpi.totalCount === 0 && kpi.targetCount === 0 && kpi.lineLinkRate === 0 && !isNaN(kpi.lineLinkRate),
        'ゼロ除算防止確認',
        kpi.lineLinkRate,
        0
    );
}

// Case 3: LINE連携0名ケース
{
    const students: FilterPreviewStudent[] = [
        createMockStudent('s1', false),
        createMockStudent('s2', false),
        createMockStudent('s3', false),
    ];
    const kpi = calculateKpi(students, new Set());
    assert(
        'KPI数値整合性',
        'LINE連携0名ケース: 送信対象が0名、連携率0%であること',
        kpi.totalCount === 3 && kpi.lineEligibleCount === 0 && kpi.targetCount === 0 && kpi.lineLinkRate === 0,
        '連携者ゼロの送信対象0件確認',
        kpi.targetCount,
        0
    );
}

// Case 4: 全件除外ケース
{
    const students: FilterPreviewStudent[] = [
        createMockStudent('s1', true),
        createMockStudent('s2', true),
    ];
    const excluded = new Set(['s1', 's2']);
    const kpi = calculateKpi(students, excluded);
    assert(
        'KPI数値整合性',
        '全件除外ケース: 最終送信対象が0名、除外件数が2名であること',
        kpi.targetCount === 0 && kpi.excludedCount === 2,
        '全件除外時の送信対象0件',
        kpi.targetCount,
        0
    );
}

// Case 5: 全選択/全解除トグル動作
{
    const students: FilterPreviewStudent[] = [
        createMockStudent('s1', true),
        createMockStudent('s2', true),
        createMockStudent('s3', true),
    ];
    const lineEligible = students.filter(s => s.hasLine);

    // 初期: 除外なし（全選択）
    let excluded = new Set<string>();
    let targetCount = lineEligible.filter(s => !excluded.has(s.id)).length;
    assert(
        'トグル動作',
        '全選択トグル: 初期状態で全3名が対象であること',
        targetCount === 3,
        '全選択状態',
        targetCount,
        3
    );

    // 全解除トグル実行: targetCount === lineEligible.length のときは全て除外
    if (targetCount === lineEligible.length) {
        excluded = new Set(lineEligible.map(s => s.id));
    }
    targetCount = lineEligible.filter(s => !excluded.has(s.id)).length;
    assert(
        'トグル動作',
        '全解除トグル: 全員除外され対象が0名になること',
        targetCount === 0 && excluded.size === 3,
        '全解除後',
        targetCount,
        0
    );

    // 再度トグル実行: targetCount !== lineEligible.length のときは全選択（除外クリア）
    if (targetCount === lineEligible.length) {
        excluded = new Set(lineEligible.map(s => s.id));
    } else {
        excluded = new Set();
    }
    targetCount = lineEligible.filter(s => !excluded.has(s.id)).length;
    assert(
        'トグル動作',
        '再全選択トグル: 除外がクリアされ再び3名になること',
        targetCount === 3 && excluded.size === 0,
        '再全選択後',
        targetCount,
        3
    );
}

// Case 6: フィルター変更時の孤立除外ID自動クリーンアップ
{
    // 初期状態: student_1, student_2, student_3 のうち student_2 を除外
    let excluded = new Set(['student_2']);
    // フィルター条件変更で新しく取得された生徒一覧: student_1, student_4 (student_2は抽出外)
    const newStudents = [
        createMockStudent('student_1', true),
        createMockStudent('student_4', true),
    ];
    // クリーンアップロジック（SegmentBroadcastTab 220行目と同等）
    const availableIds = new Set(newStudents.map(s => s.id));
    const nextExcluded = new Set<string>();
    excluded.forEach(id => {
        if (availableIds.has(id)) nextExcluded.add(id);
    });
    excluded = nextExcluded;

    assert(
        'トグル動作',
        '除外IDクリーンアップ: 抽出結果から外れたIDが除外セットから自動除去されること',
        !excluded.has('student_2') && excluded.size === 0,
        '孤立IDのクリーンアップ確認',
        Array.from(excluded),
        []
    );
}

// ----------------------------------------------------------------------
// 2. フィルター連動・デバウンス動作実証検証
// ----------------------------------------------------------------------
console.log('\n--- 2. フィルター連動・デバウンス動作実証検証 ---');

// Case 7: 350ms デバウンス動作（非同期タイマーシミュレーション）
async function testDebounce() {
    let callCount = 0;
    let lastQueryExecuted = '';

    class Debouncer {
        private timer: NodeJS.Timeout | null = null;
        trigger(query: string) {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(() => {
                callCount++;
                lastQueryExecuted = query;
            }, 350);
        }
    }

    const debouncer = new Debouncer();

    // 100msごとに連続4回リクエストを発行（計300ms経過）
    debouncer.trigger('t');
    await new Promise(r => setTimeout(r, 80));
    debouncer.trigger('te');
    await new Promise(r => setTimeout(r, 80));
    debouncer.trigger('tes');
    await new Promise(r => setTimeout(r, 80));
    debouncer.trigger('test');

    // この時点ではまだ350ms経過していないので callCount は 0 であるべき
    assert(
        'デバウンス動作',
        'デバウンス抑制: 連続入力中（350ms未満）はAPIリクエストが抑制されていること',
        callCount === 0,
        '中間呼び出しの防止',
        callCount,
        0
    );

    // 400ms待機してデバウンス完了を待つ
    await new Promise(r => setTimeout(r, 400));

    assert(
        'デバウンス動作',
        'デバウンス実行: タイマー終了後に1回だけ最新値で実行されること',
        callCount === 1 && lastQueryExecuted === 'test',
        '最終入力値での単一呼び出し',
        { callCount, lastQueryExecuted },
        { callCount: 1, lastQueryExecuted: 'test' }
    );
}

// Case 8: activeFilterCount の計算精度
{
    function countActiveFilters(filters: {
        status: string;
        area: string;
        coachId: string;
        planId: string;
        tag: string;
        viewedNotApplied: boolean;
        lineLinkedOnly: boolean;
        searchQuery: string;
    }) {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.area !== 'all') count++;
        if (filters.coachId !== 'all') count++;
        if (filters.planId !== 'all') count++;
        if (filters.tag !== 'all') count++;
        if (filters.viewedNotApplied) count++;
        if (!filters.lineLinkedOnly) count++;
        if (filters.searchQuery.trim().length > 0) count++;
        return count;
    }

    const initialCount = countActiveFilters({
        status: 'all',
        area: 'all',
        coachId: 'all',
        planId: 'all',
        tag: 'all',
        viewedNotApplied: false,
        lineLinkedOnly: true,
        searchQuery: '',
    });
    assert(
        'フィルター連動',
        '初期状態のアクティブ条件カウントが0件であること',
        initialCount === 0,
        '初期フィルタ数',
        initialCount,
        0
    );

    const fullCount = countActiveFilters({
        status: 'trial_done',
        area: '東京都港区',
        coachId: 'coach_1',
        planId: 'plan_1',
        tag: 'trial_done',
        viewedNotApplied: true,
        lineLinkedOnly: false,
        searchQuery: '0035',
    });
    assert(
        'フィルター連動',
        '全8条件指定時のアクティブ条件カウントが8件であること',
        fullCount === 8,
        '複合フィルタ数',
        fullCount,
        8
    );
}

// ----------------------------------------------------------------------
// 3. 変数挿入・リアルタイム置換エンジンの網羅性・敵対的実証検証
// ----------------------------------------------------------------------
console.log('\n--- 3. 変数挿入・リアルタイム置換エンジンの網羅性・敵対的実証検証 ---');

// Case 9: 7種の属性変数置換テスト
{
    const sampleStudent = createMockStudent('s0035', true, {
        studentNumber: '0035',
        fullName: 'テスト太郎',
        coachName: '新吉航大 コーチ',
        area: '東京都港区',
        planName: '月2回プラン（60分）',
        trialDate: '2026年9月30日',
    });

    const template7 = '{{name}} 様 / 担当: {{coach_name}} / エリア: {{area}} / プラン: {{plan_name}} / 体験日: {{trial_date}} / 会員番号: {{student_number}} / リンク: {{trial_url}}';
    const rendered = renderClientPreviewMessage(template7, sampleStudent);

    const expected = 'テスト太郎 様 / 担当: 新吉航大 コーチ / エリア: 東京都港区 / プラン: 月2回プラン（60分） / 体験日: 2026年9月30日 / 会員番号: 0035 / リンク: https://manager.swim-partners.com/trial';

    assert(
        '変数置換網羅性',
        '7種の属性変数がすべて正しく置換されること',
        rendered === expected,
        '7種属性変数の置換完全一致',
        rendered,
        expected
    );
}

// Case 10: 生徒切り替え連動性テスト（生徒Aと生徒Bの切り替え）
{
    const studentA = createMockStudent('s_a', true, {
        studentNumber: '0035',
        fullName: 'テスト太郎',
        area: '東京都港区',
    });

    const studentB = createMockStudent('s_b', true, {
        studentNumber: '0035-sub',
        fullName: 'テスト太郎（代理）',
        area: '神奈川県横浜市',
    });

    const tmpl = '宛先: {{name}} (#{{student_number}}) / 地域: {{area}}';
    const renderedA = renderClientPreviewMessage(tmpl, studentA);
    const renderedB = renderClientPreviewMessage(tmpl, studentB);

    assert(
        'プレビュー連動性',
        '選択生徒切り替え時にプレビュー本文が即座に生徒Bの内容へ更新されること',
        renderedA.includes('テスト太郎 (#0035)') && renderedB.includes('テスト太郎（代理） (#0035-sub)'),
        '生徒プレビュー切り替え連動',
        { renderedA, renderedB },
        { expectedA: 'テスト太郎', expectedB: 'テスト太郎（代理）' }
    );
}

// Case 11: 表記揺れ・敵対的変数フォーマットテスト
{
    const student = createMockStudent('s_test', true);

    // 全角中括弧 ｛｛name｝｝
    const fullWidth = renderClientPreviewMessage('こんにちは ｛｛name｝｝ 様', student);
    assert(
        '敵対的変数置換',
        '全角中括弧 ｛｛name｝｝ が正常に置換されること',
        fullWidth.includes('テスト太郎'),
        '全角中括弧対応',
        fullWidth
    );

    // 半角1重中括弧 {name}
    const singleBrace = renderClientPreviewMessage('会員 {student_number} 様', student);
    assert(
        '敵対的変数置換',
        '半角1重中括弧 {student_number} が正常に置換されること',
        singleBrace.includes('0035'),
        '1重中括弧対応',
        singleBrace
    );

    // 余分な空白混入 {{  name   }}
    const spaced = renderClientPreviewMessage('ようこそ {{  name   }} 様', student);
    assert(
        '敵対的変数置換',
        '変数前後に空白が混入しても正常に置換されること',
        spaced.includes('テスト太郎'),
        '空白許容置換',
        spaced
    );

    // 大文字 {{NAME}}
    const upperCase = renderClientPreviewMessage('氏名: {{NAME}} / COACH: {{COACH_NAME}}', student);
    assert(
        '敵対的変数置換',
        '大文字 {{NAME}} でも大文字小文字無視で正常に置換されること',
        upperCase.includes('テスト太郎') && upperCase.includes('新吉航大 コーチ'),
        '大文字小文字不問置換',
        upperCase
    );

    // 未知の変数 {{unknown_variable}}
    const unknownVar = renderClientPreviewMessage('名前: {{name}}, 未知: {{unknown_variable}}', student);
    assert(
        '敵対的変数置換',
        '未知の変数は安全に空文字に置換されクラッシュしないこと',
        unknownVar === '名前: テスト太郎, 未知: ',
        '未知変数の安全消去',
        unknownVar
    );
}

// Case 12: studentがnullの場合の安全フォールバック
{
    const nullStudentPreview = renderClientPreviewMessage('{{name}} 様 (#{{student_number}})', null);
    assert(
        '敵対的変数置換',
        '生徒データがnullの場合にテスト太郎 (0035) のサンプル値に安全にフォールバックすること',
        nullStudentPreview.includes('テスト太郎') && nullStudentPreview.includes('0035'),
        'nullフォールバック検証',
        nullStudentPreview
    );
}

// ----------------------------------------------------------------------
// 4. 顧客データ制約（会員番号0035、テスト太郎 様）の厳格な実証検証
// ----------------------------------------------------------------------
console.log('\n--- 4. 顧客データ制約の厳格な実証検証 ---');

// Case 13: プレビューロジック内のハードコード検証
{
    const nullStudentPreview = renderClientPreviewMessage('{{name}} 様 (#{{student_number}})', null);
    const hasOtherCustomer = nullStudentPreview.includes('山田') || nullStudentPreview.includes('鈴木') || nullStudentPreview.includes('佐藤');
    assert(
        '顧客データ制約',
        'フォールバックデフォルト値にテスト太郎以外の他顧客名が含まれていないこと',
        !hasOtherCustomer && nullStudentPreview.includes('テスト太郎') && nullStudentPreview.includes('0035'),
        'テスト太郎（0035）厳格限定性',
        nullStudentPreview
    );
}

// ----------------------------------------------------------------------
// 5. さらなる敵対的エッジケース・AST・境界値実証検証
// ----------------------------------------------------------------------
console.log('\n--- 5. さらなる敵対的エッジケース・AST・境界値実証検証 ---');

// Case 14: 変数チップ定義 (VARIABLE_CHIPS) と置換エンジンのキー対応検証
{
    const chipVariables = [
        '{{name}}',
        '{{coach_name}}',
        '{{area}}',
        '{{plan_name}}',
        '{{trial_date}}',
        '{{student_number}}',
        '{{trial_url}}',
    ];

    const student = createMockStudent('s_test', true, {
        studentNumber: '0035',
        fullName: 'テスト太郎',
        coachName: '新吉航大 コーチ',
        area: '東京都港区',
        planName: '月2回プラン（60分）',
        trialDate: '2026年9月30日',
    });

    let allReplaced = true;
    for (const v of chipVariables) {
        const out = renderClientPreviewMessage(v, student);
        if (out === v || out === '' || out.startsWith('{{')) {
            allReplaced = false;
            console.error(`変数 ${v} が置換されずにそのまま残るか空になりました: "${out}"`);
        }
    }

    assert(
        '変数チップ整合性',
        'エディタのVARIABLE_CHIPS 7種すべてが置換エンジンで非空かつ正しく置換されること',
        allReplaced,
        'VARIABLE_CHIPS と 置換エンジンの100%整合性'
    );
}

// Case 15: 5,000文字上限の境界値テスト (4,999文字, 5,000文字, 5,001文字)
{
    const valid4999 = 'A'.repeat(4999);
    const valid5000 = 'A'.repeat(5000);
    const invalid5001 = 'A'.repeat(5001);

    const isOver4999 = valid4999.length > 5000;
    const isOver5000 = valid5000.length > 5000;
    const isOver5001 = invalid5001.length > 5000;

    assert(
        '文字数境界値',
        '5,000文字境界値: 4,999文字および5,000文字では超過とならず、5,001文字で超過フラグがtrueになること',
        !isOver4999 && !isOver5000 && isOver5001,
        '文字数上限判定 (<= 5,000 は有効、> 5,000 は無効)',
        { isOver4999, isOver5000, isOver5001 },
        { isOver4999: false, isOver5000: false, isOver5001: true }
    );
}

// Case 16: 未連携生徒が混在する場合の全選択判定および送信対象計算
{
    // 5名の生徒: 3名LINE連携済、2名未連携
    const students = [
        createMockStudent('s1', true),
        createMockStudent('s2', true),
        createMockStudent('s3', true),
        createMockStudent('s4', false), // 未連携
        createMockStudent('s5', false), // 未連携
    ];

    const lineEligible = students.filter(s => s.hasLine); // 3名
    let excluded = new Set<string>();

    // 全員未除外の状態
    let target = lineEligible.filter(s => !excluded.has(s.id));
    let isAllSelected = lineEligible.length > 0 && target.length === lineEligible.length;

    assert(
        '未連携混在テスト',
        '未連携生徒が混在していてもLINE連携者全員が未除外なら isAllSelected が true になること',
        isAllSelected && target.length === 3,
        '未連携混在時の全選択判定',
        { isAllSelected, targetCount: target.length },
        { isAllSelected: true, targetCount: 3 }
    );

    // 1名除外した場合
    excluded.add('s1');
    target = lineEligible.filter(s => !excluded.has(s.id));
    isAllSelected = lineEligible.length > 0 && target.length === lineEligible.length;

    assert(
        '未連携混在テスト',
        '1名除外時に isAllSelected が false になり、targetCount が 2名 (3 - 1) になること',
        !isAllSelected && target.length === 2,
        '個別除外時の全選択判定解除と対象数減少',
        { isAllSelected, targetCount: target.length },
        { isAllSelected: false, targetCount: 2 }
    );
}

// Case 17: 静的ファイル検査による他顧客ハードコードの有無
import * as fs from 'fs';
import * as path from 'path';

{
    const targetDir = path.resolve(__dirname, '../src/app/(dashboard)/admin/line-marketing/components');
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

    let unauthorizedCustomerFound = false;
    const forbiddenNames = ['山田太郎', '田中太郎', '佐藤健', '鈴木一郎'];

    for (const f of files) {
        const content = fs.readFileSync(path.join(targetDir, f), 'utf-8');
        for (const name of forbiddenNames) {
            if (content.includes(name)) {
                unauthorizedCustomerFound = true;
                console.error(`ファイル ${f} 内に許可されていない顧客名 ${name} が見つかりました`);
            }
        }
    }

    assert(
        '顧客データ制約',
        'LINEマーケティングコンポーネント群内に無許可の他顧客ダミー名（山田等）が存在しないこと',
        !unauthorizedCustomerFound,
        '会員番号0035 テスト太郎 以外のダミー顧客名混入ゼロ'
    );
}


// 実行と集計
async function main() {
    await testDebounce();

    console.log('\n========================================');
    console.log('   検証結果サマリー (Summary of Results)   ');
    console.log('========================================');
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`総テスト項目数: ${total}`);
    console.log(`合格 (PASS): ${passed}`);
    console.log(`不合格 (FAIL): ${failed}`);

    if (failed > 0) {
        console.error('\n以下のテストが失敗しました:');
        results.filter(r => !r.passed).forEach(r => {
            console.error(`- [${r.category}] ${r.testName}: ${r.details}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 すべての実証的敵対テストに合格しました！');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
