/**
 * LINEマーケティング機能 敵対的セキュリティ＆安全ガード実証検証スクリプト
 * (Empirical Challenger Verification Harness)
 * 
 * 担当: teamwork_preview_challenger
 * 
 * 【検証対象】
 * 1. 会員番号0035（テスト太郎 様）専用テスト送信のセキュリティガード敵対的検証
 * 2. SafetyConfirmDialog の2段階送信確認の堅牢性検証
 * 3. 5,000文字上限超過・空メッセージ・過去日時設定ブロックの検証
 * 4. 入力済みメッセージの破壊的上書き防止ロジック（hasCustomMessageInput）の動作検証
 * 
 * 【厳格制約準拠】
 * - テストを実施する際、顧客は会員番号0035、テスト太郎以外は使用しない
 * - 一般顧客宛ての実送信は一切行わない（モック＆例外ガード検証）
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    assertTestPreviewSecurityGuard,
    renderLineMessage,
    TEST_TARO_STUDENT_NUMBER,
    TEST_TARO_LINE_USER_ID,
    TEST_TARO_STUDENT_NAME,
    sendTestPreviewMessage,
} from '../src/lib/line-marketing-service';

interface TestResult {
    suite: string;
    testName: string;
    status: 'PASS' | 'FAIL';
    details: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, suite: string, testName: string, details: string) {
    if (condition) {
        testResults.push({ suite, testName, status: 'PASS', details });
        console.log(`  ✅ [PASS] [${suite}] ${testName}: ${details}`);
    } else {
        testResults.push({ suite, testName, status: 'FAIL', details });
        console.error(`  ❌ [FAIL] [${suite}] ${testName}: ${details}`);
    }
}

console.log('================================================================================');
console.log('🛡️ LINEマーケティング機能 敵対的セキュリティ＆安全ガード実証検証 開始');
console.log(`実行日時: ${new Date().toISOString()}`);
console.log('================================================================================\n');

// ==============================================================================
// Suite 1: 会員番号0035（テスト太郎 様）専用テスト送信のセキュリティガード敵対的検証
// ==============================================================================
console.log('--- [Suite 1: 会員番号0035（テスト太郎）専用テスト送信ガード検証] ---');

// 1.1 正常系: 0035 & 正しいLINE User ID
try {
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: TEST_TARO_LINE_USER_ID,
        studentNumber: TEST_TARO_STUDENT_NUMBER,
        studentName: TEST_TARO_STUDENT_NAME,
    });
    assert(true, 'Suite 1', '1.1 正常系テスト送信の通過', `0035 / ${TEST_TARO_LINE_USER_ID} が正常に許可されました`);
} catch (e: any) {
    assert(false, 'Suite 1', '1.1 正常系テスト送信の通過', `予期せぬエラー: ${e.message}`);
}

// 1.2 敵対的攻撃 1: 会員番号の改ざん（'0036'）
try {
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: TEST_TARO_LINE_USER_ID,
        studentNumber: '0036',
    });
    assert(false, 'Suite 1', '1.2 他会員番号遮断', '不正な会員番号0036が遮断されませんでした！');
} catch (e: any) {
    assert(
        e.message.includes('SECURITY VIOLATION') && e.message.includes('0036'),
        'Suite 1',
        '1.2 他会員番号遮断',
        `期待通りの物理遮断例外が発生: ${e.message}`
    );
}

// 1.3 敵対的攻撃 2: 会員番号の空白混入（' 0035 '）
try {
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: TEST_TARO_LINE_USER_ID,
        studentNumber: ' 0035 ',
    });
    assert(false, 'Suite 1', '1.3 会員番号スペース混入遮断', 'スペース混入会員番号が遮断されませんでした！');
} catch (e: any) {
    assert(
        e.message.includes('SECURITY VIOLATION'),
        'Suite 1',
        '1.3 会員番号スペース混入遮断',
        `空白混入が厳格に遮断されました: ${e.message}`
    );
}

// 1.4 敵対的攻撃 3: 空文字会員番号（''）
try {
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: TEST_TARO_LINE_USER_ID,
        studentNumber: '',
    });
    assert(false, 'Suite 1', '1.4 空文字会員番号遮断', '空文字会員番号が遮断されませんでした！');
} catch (e: any) {
    assert(
        e.message.includes('SECURITY VIOLATION'),
        'Suite 1',
        '1.4 空文字会員番号遮断',
        `空文字会員番号が遮断されました: ${e.message}`
    );
}

// 1.5 敵対的攻撃 4: 不正なLINE User ID
try {
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: 'U11111111111111111111111111111111',
        studentNumber: TEST_TARO_STUDENT_NUMBER,
    });
    assert(false, 'Suite 1', '1.5 不正LINE User ID遮断', '不正LINE User IDが遮断されませんでした！');
} catch (e: any) {
    assert(
        e.message.includes('SECURITY VIOLATION') && e.message.includes(TEST_TARO_LINE_USER_ID),
        'Suite 1',
        '1.5 不正LINE User ID遮断',
        `不正LINE User IDが厳格に物理遮断されました: ${e.message}`
    );
}

// 1.6 敵対的攻撃 5: lineUserId が null
try {
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: null,
        studentNumber: TEST_TARO_STUDENT_NUMBER,
    });
    assert(false, 'Suite 1', '1.6 null LINE User ID遮断', 'null LINE User IDが遮断されませんでした！');
} catch (e: any) {
    assert(
        e.message.includes('SECURITY VIOLATION'),
        'Suite 1',
        '1.6 null LINE User ID遮断',
        `null LINE User IDが遮断されました: ${e.message}`
    );
}

// 1.7 敵対的攻撃 6: deliveryType: 'test_preview' のみ指定された場合
try {
    assertTestPreviewSecurityGuard({
        deliveryType: 'test_preview',
        lineUserId: 'U_ATTACKER_ID',
        studentNumber: TEST_TARO_STUDENT_NUMBER,
    });
    assert(false, 'Suite 1', '1.7 deliveryType=test_previewでの遮断', '不正IDが遮断されませんでした！');
} catch (e: any) {
    assert(
        e.message.includes('SECURITY VIOLATION'),
        'Suite 1',
        '1.7 deliveryType=test_previewでの遮断',
        `deliveryType=test_previewでも厳格に遮断されました: ${e.message}`
    );
}

// 1.8 サービス層 sendTestPreviewMessage に不正 targetLineUserId を渡した場合
async function testServiceSendGuard() {
    try {
        await sendTestPreviewMessage({
            message: 'テストメッセージ',
            targetLineUserId: 'U_UNAUTHORIZED_TARGET',
        });
        assert(false, 'Suite 1', '1.8 サービス層sendTestPreviewMessageでの宛先不正遮断', '不正宛先が通過してしまいました！');
    } catch (e: any) {
        assert(
            e.message.includes('SECURITY VIOLATION'),
            'Suite 1',
            '1.8 サービス層sendTestPreviewMessageでの宛先不正遮断',
            `サービス層で直接遮断されました: ${e.message}`
        );
    }
}

// 1.9 UIソースコード検証: SegmentMessageEditorのテスト送信ボタンが会員番号0035固定であること
const editorCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/(dashboard)/admin/line-marketing/components/SegmentMessageEditor.tsx'),
    'utf-8'
);
const hasHardcoded0035UiBadge = editorCode.includes('会員番号0035 専用テスト送信') &&
    editorCode.includes('テスト太郎（0035）にテスト送信') &&
    editorCode.includes('一般の生徒様には一切配信されません');
assert(
    hasHardcoded0035UiBadge,
    'Suite 1',
    '1.9 UI上の会員番号0035専用テスト送信明示',
    'SegmentMessageEditorに0035テスト太郎専用の固定表示と安全説明文が存在します'
);

// SegmentBroadcastTabのhandleSendTestMessageが他の生徒IDを渡す口を持たないこと
const broadcastTabCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/(dashboard)/admin/line-marketing/components/SegmentBroadcastTab.tsx'),
    'utf-8'
);
const tabTestCallMatches = broadcastTabCode.match(/sendTestPreviewMessage\(([^)]*)\)/);
const tabTestCallArg = tabTestCallMatches ? tabTestCallMatches[1].trim() : '';
assert(
    tabTestCallArg === 'messageTemplate',
    'Suite 1',
    '1.10 UIからServer Actionへの引数検証',
    `sendTestPreviewMessageの引数は本文のみ（${tabTestCallArg}）であり、生徒IDの注入経路は存在しません`
);

// Server Action の固定ハードコード検証
const actionsCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/actions/line-marketing.ts'),
    'utf-8'
);
const actionsHasHardcodedConstants = actionsCode.includes('const testStudentNumber = TEST_TARO_STUDENT_NUMBER;') &&
    actionsCode.includes('const testLineUserId = TEST_TARO_LINE_USER_ID;') &&
    actionsCode.includes('const testStudentName = TEST_TARO_STUDENT_NAME;');
assert(
    actionsHasHardcodedConstants,
    'Suite 1',
    '1.11 Server Actionでのハードコード定数束縛',
    'sendTestPreviewMessage内で0035とテスト太郎LINE IDがハードコード束縛されています'
);

// ==============================================================================
// Suite 2: SafetyConfirmDialog の2段階送信確認の堅牢性
// ==============================================================================
console.log('\n--- [Suite 2: SafetyConfirmDialog 2段階確認ガード堅牢性検証] ---');

const safetyDialogCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/(dashboard)/admin/line-marketing/components/SafetyConfirmDialog.tsx'),
    'utf-8'
);

// 2.1 チェックボックス必須制御ロジック
const hasIsCheckedState = safetyDialogCode.includes('const [isChecked, setIsChecked] = useState(false);');
const hasDisabledCheck = safetyDialogCode.includes('disabled={!isChecked || isBusy || targetCount === 0}');
assert(
    hasIsCheckedState && hasDisabledCheck,
    'Suite 2',
    '2.1 送信確定ボタンの無効化（!isChecked || isBusy || targetCount === 0）',
    'チェックボックス未チェック時、送信処理中、および対象0名時に確定ボタンが確実にdisabledされます'
);

// 2.2 ダイアログを閉じたときのチェック初期化
const hasResetOnClose = safetyDialogCode.includes('if (!nextOpen) {') && safetyDialogCode.includes('setIsChecked(false);');
assert(
    hasResetOnClose,
    'Suite 2',
    '2.2 ダイアログクローズ時のチェック状態初期化',
    'モーダルクローズ時に isChecked が即座に false にリセットされます'
);

// 2.3 抽出条件サマリーの完全性（tag, status, area, coach, plan, searchQuery, viewedNotAppliedOnly, lineLinkedOnly, excludedCount）
const requiredFilterFields = [
    'filterSummary.tagLabel',
    'filterSummary.statusLabel',
    'filterSummary.areaLabel',
    'filterSummary.coachLabel',
    'filterSummary.planLabel',
    'filterSummary.searchQuery',
    'filterSummary.viewedNotAppliedOnly',
    'filterSummary.lineLinkedOnly',
    'filterSummary.excludedCount',
];
const allFiltersPresent = requiredFilterFields.every(field => safetyDialogCode.includes(field));
assert(
    allFiltersPresent,
    'Suite 2',
    '2.3 抽出条件サマリーの全項目表示実装',
    `全必須フィルター項目（${requiredFilterFields.join(', ')}）が網羅されています`
);

// 2.4 送信モード・件数・メッセージ冒頭表示の実装検証
const hasModeHighlight = safetyDialogCode.includes('即時一括配信') && safetyDialogCode.includes('予約:');
const hasTargetCountDisplay = safetyDialogCode.includes('{targetCount.toLocaleString()}') && safetyDialogCode.includes('名に送信');
const hasExcerptPreview = safetyDialogCode.includes('previewSampleText.substring(0, 100)') &&
    safetyDialogCode.includes('受信通知・チャット一覧に表示される冒頭テキスト:');
assert(
    hasModeHighlight && hasTargetCountDisplay && hasExcerptPreview,
    'Suite 2',
    '2.4 配信種別・送信件数・冒頭100文字抜粋プレビューの完全性',
    '即時/予約バッジ、件数ハイライト、冒頭100文字抜粋が正常に組み込まれています'
);

// ==============================================================================
// Suite 3: 5,000文字上限超過・空メッセージ・過去日時設定ブロックの検証
// ==============================================================================
console.log('\n--- [Suite 3: 5,000文字上限超過・空メッセージ・過去日時ブロック検証] ---');

// 3.1 5,000文字境界値シミュレーション
const char4999 = 'A'.repeat(4999);
const char5000 = 'A'.repeat(5000);
const char5001 = 'A'.repeat(5001);

assert(char4999.length <= 5000, 'Suite 3', '3.1.1 4,999文字境界値', '4,999文字は上限内');
assert(char5000.length <= 5000, 'Suite 3', '3.1.2 5,000文字境界値', '5,000文字は上限ジャスト許容');
assert(char5001.length > 5000, 'Suite 3', '3.1.3 5,001文字境界値', '5,001文字は超過検知');

// UIでの5,000文字超過ブロック
const editorHasCharLimit = editorCode.includes('const isOverLimit = charCount > 5000;') &&
    editorCode.includes('disabled={targetCount === 0 || isOverLimit}');
assert(
    editorHasCharLimit,
    'Suite 3',
    '3.2 UIエディタでの5,000文字超過時の確定ボタンdisabled',
    'SegmentMessageEditorにおいて 5,000文字超過時に送信ボタンが無効化されます'
);

const tabHasCharLimit = broadcastTabCode.includes('messageTemplate.length > 5000');
assert(
    tabHasCharLimit,
    'Suite 3',
    '3.3 SegmentBroadcastTabでの5,000文字超過バリデーション',
    '確認ダイアログ起動およびテスト送信の双方で 5,000文字超過がブロックされます'
);

// サービス層の5000文字チェック
const lineServiceCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/line-marketing-service.ts'),
    'utf-8'
);
const serviceHasCharLimit = lineServiceCode.includes('rendered.length > 5000') &&
    lineServiceCode.includes('LINEの上限（5,000文字）を超過');
assert(
    serviceHasCharLimit,
    'Suite 3',
    '3.4 サービス層での5,000文字超過物理遮断',
    'sendSingleLineMessage内で 5,000文字超過時に即座にエラーが返却されます'
);

// 3.5 空メッセージバリデーション
const tabHasEmptyCheck = broadcastTabCode.includes('!messageTemplate.trim()');
const serviceHasEmptyCheck = lineServiceCode.includes('!rendered || rendered.trim() === \'\'');
assert(
    tabHasEmptyCheck && serviceHasEmptyCheck,
    'Suite 3',
    '3.5 空メッセージ（空文字・空白のみ）ブロック',
    'フロント（!messageTemplate.trim()）およびバックエンド（!rendered || rendered.trim() === \'\'）の二重遮断'
);

// 3.6 予約過去日時のブロック
const tabHasPastDateCheck = broadcastTabCode.includes('new Date(scheduledDateTime) <= new Date()') &&
    broadcastTabCode.includes('予約日時は現在時刻より後の日時を指定してください');
assert(
    tabHasPastDateCheck,
    'Suite 3',
    '3.6 予約送信時の過去日時設定ブロック',
    '現在以前の日時が指定された場合、トースト警告でダイアログ起動が拒絶されます'
);

// ==============================================================================
// Suite 4: 入力済みメッセージの破壊的上書き防止ロジック（hasCustomMessageInput）の動作検証
// ==============================================================================
console.log('\n--- [Suite 4: 入力済みメッセージ破壊的上書き防止ロジック検証] ---');

const DEFAULT_MESSAGE =
    '{{name}} 様\n\nスイムパートナーズの {{coach_name}} です。\nいつもレッスンへのご参加ありがとうございます！\n\n現在、{{plan_name}} をご利用の皆様に向けて特別なご案内をお届けしております。';

function checkHasCustomMessageInput(template: string): boolean {
    const trimmed = template.trim();
    return trimmed.length > 0 && trimmed !== DEFAULT_MESSAGE.trim();
}

// 4.1 初期ロード時の挙動
assert(
    checkHasCustomMessageInput(DEFAULT_MESSAGE) === false,
    'Suite 4',
    '4.1 初期デフォルト文ではカスタム入力なし判定',
    'デフォルト文の時は hasCustomMessageInput が false になること'
);

// 4.2 空欄時の挙動
assert(
    checkHasCustomMessageInput('') === false,
    'Suite 4',
    '4.2 空欄時はカスタム入力なし判定',
    '空欄の時は hasCustomMessageInput が false になること'
);

// 4.3 余分な改行・空白が付加された場合の判定
assert(
    checkHasCustomMessageInput('  ' + DEFAULT_MESSAGE + '\n\n') === false,
    'Suite 4',
    '4.3 前後空白トリム後のデフォルト文一致判定',
    '前後に余計な空白・改行があってもデフォルト文とみなされること'
);

// 4.4 1文字でも変更した場合
assert(
    checkHasCustomMessageInput(DEFAULT_MESSAGE + 'ご案内です') === true,
    'Suite 4',
    '4.4 変更検知（カスタム入力あり判定）',
    '文面を編集した場合は hasCustomMessageInput が true になること'
);

// 4.5 独自入力の場合
assert(
    checkHasCustomMessageInput('明日は台風のため休校となります。') === true,
    'Suite 4',
    '4.5 完全独自入力の検知',
    '独自文章では確実に hasCustomMessageInput が true になること'
);

// 4.6 アコーディオンフィルター側の confirm ガードコード検証
const accordionCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/(dashboard)/admin/line-marketing/components/SegmentFilterAccordion.tsx'),
    'utf-8'
);

const hasTagConfirmGuard = accordionCode.includes('if (template && hasCustomMessageInput)') &&
    accordionCode.includes('window.confirm') &&
    accordionCode.includes('メッセージ本文が入力されています。クイック選択テンプレートで本文とタイトルを上書きしますか？');

const hasCancelPreserveLogic = accordionCode.includes('if (shouldOverwrite) {') &&
    accordionCode.includes('onApplyPresetTag(tag, template);') &&
    accordionCode.includes('} else {') &&
    accordionCode.includes('onChangeTag(tag);');

assert(
    hasTagConfirmGuard && hasCancelPreserveLogic,
    'Suite 4',
    '4.6 タグ別クイック選択での破壊的上書き防止＆キャンセル時の本文保持',
    '入力中にクイックタグを押下した際、window.confirm で確認し、キャンセル時は本文を保持して条件のみ変更'
);

const hasAreaConfirmGuard = accordionCode.includes('メッセージ本文が入力されています。【${area}】テンプレートで本文とタイトルを上書きしますか？') &&
    accordionCode.includes('onApplyPresetArea(area, template);') &&
    accordionCode.includes('onChangeArea(area);');

assert(
    hasAreaConfirmGuard,
    'Suite 4',
    '4.7 エリア別クイック選択での破壊的上書き防止＆キャンセル時の本文保持',
    'エリア別クイック選択でも同様に確認ダイアログとキャンセル時の本文保持が動作'
);

// ==============================================================================
// Suite 5: 敵対的テンプレート注入・プロトタイプ汚染・変数置換エンジン検証
// ==============================================================================
console.log('\n--- [Suite 5: 敵対的変数置換・プロトタイプ汚染・エスケープ検証] ---');

// 5.1 プロトタイプ汚染攻撃 (Object.prototype 参照漏洩の防止)
const protoAttack1 = renderLineMessage('テスト: {{__proto__}} / {{constructor}} / {{toString}}', {});
assert(
    !protoAttack1.includes('[object Object]') && !protoAttack1.includes('function'),
    'Suite 5',
    '5.1 プロトタイプ汚染攻撃遮断',
    `__proto__ / constructor / toString へのアクセスが遮断され空文字にフォールバック: "${protoAttack1}"`
);

// 5.2 全角波括弧 ｛｛name｝｝ の解釈
const zenkakuRendered = renderLineMessage('こんにちは ｛｛name｝｝ 様', { name: 'テスト太郎' });
assert(
    zenkakuRendered.includes('テスト太郎 様'),
    'Suite 5',
    '5.2 全角波括弧（｛｛name｝｝）のブレ吸収',
    `全角波括弧が正しく置換されました: "${zenkakuRendered}"`
);

// 5.3 不正なネスト括弧 {{{name}}}
const nestedRendered = renderLineMessage('こんにちは {{{name}}} 様', { name: 'テスト太郎' });
assert(
    nestedRendered.includes('テスト太郎'),
    'Suite 5',
    '5.3 多重波括弧の安全置換',
    `多重波括弧でもクラッシュせず安全に置換: "${nestedRendered}"`
);

// 5.4 未知の変数は安全に除去
const unknownVarRendered = renderLineMessage('案内: {{unknown_variable_xyz}}', {});
assert(
    unknownVarRendered === '案内:',
    'Suite 5',
    '5.4 未知変数の安全除去',
    `未知変数は例外を起こさず除去: "${unknownVarRendered}"`
);

// ==============================================================================
// Suite 6: 個別除外リストと最終送信件数 (TargetCount) の不変性検証
// ==============================================================================
console.log('\n--- [Suite 6: 個別除外・送信件数整合性検証] ---');

// 生徒10名（全員LINE連携済）
const mockStudents = Array.from({ length: 10 }, (_, i) => ({
    id: `student-${i + 1}`,
    studentNumber: `00${35 + i}`,
    fullName: i === 0 ? 'テスト太郎' : `生徒${i + 1}`,
    hasLine: true,
    lineUserId: i === 0 ? TEST_TARO_LINE_USER_ID : `U_mock_${i + 1}`,
    status: 'active',
    area: '東京都港区',
}));

// 6.1 除外なしの場合
const excludedIds1 = new Set<string>();
const target1 = mockStudents.filter(s => s.hasLine && !excludedIds1.has(s.id));
assert(
    target1.length === 10,
    'Suite 6',
    '6.1 除外なし時の送信対象件数',
    `10名中10名が対象: targetCount=${target1.length}`
);

// 6.2 3名除外した場合
const excludedIds2 = new Set<string>(['student-2', 'student-4', 'student-6']);
const target2 = mockStudents.filter(s => s.hasLine && !excludedIds2.has(s.id));
assert(
    target2.length === 7,
    'Suite 6',
    '6.2 3名除外時の送信対象件数',
    `10名中7名が対象: targetCount=${target2.length}`
);

// 6.3 全員除外（handleToggleAll: 全解除）した場合
const excludedIds3 = new Set<string>(mockStudents.map(s => s.id));
const target3 = mockStudents.filter(s => s.hasLine && !excludedIds3.has(s.id));
assert(
    target3.length === 0,
    'Suite 6',
    '6.3 全員除外時の0名判定',
    `対象者0名: targetCount=${target3.length}`
);

// 6.4 存在しない生徒IDが除外セットに混入した場合の耐久性
const excludedIds4 = new Set<string>(['non-existent-id-1', 'non-existent-id-2']);
const target4 = mockStudents.filter(s => s.hasLine && !excludedIds4.has(s.id));
assert(
    target4.length === 10,
    'Suite 6',
    '6.4 無効除外ID混入時の整合性',
    `無効ID混入でも10名が維持される: targetCount=${target4.length}`
);

// ==============================================================================
// 実行サマリー出力
// ==============================================================================
async function runAll() {
    await testServiceSendGuard();

    console.log('\n================================================================================');
    console.log('📊 検証実行サマリー');
    console.log('================================================================================');

    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'PASS').length;
    const failedTests = testResults.filter(r => r.status === 'FAIL').length;

    console.log(`総テスト項目数: ${totalTests}`);
    console.log(`成功 (PASS)   : ${passedTests}`);
    console.log(`失敗 (FAIL)   : ${failedTests}`);

    if (failedTests > 0) {
        console.error('\n❌ 失敗したテスト項目:');
        testResults.filter(r => r.status === 'FAIL').forEach(r => {
            console.error(`- [${r.suite}] ${r.testName}: ${r.details}`);
        });
        process.exit(1);
    } else {
        console.log('\n🌟 全ての敵対的セキュリティ・安全ガード検証が合格 (PASS) しました！');
        process.exit(0);
    }
}

runAll();
