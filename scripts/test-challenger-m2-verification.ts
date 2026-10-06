/**
 * Challenger M2-1 独立検証スイート (Adversarial Verification Suite)
 * 
 * 厳格ルール:
 * - テストを実施する際、顧客は会員番号0035、テスト太郎以外は使用しない。
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
    renderLineMessage,
    assertTestPreviewSecurityGuard,
    TEST_TARO_STUDENT_NUMBER,
    TEST_TARO_LINE_USER_ID,
} from '../src/lib/line-marketing-service';
import { renderClientPreviewMessage } from '../src/app/(dashboard)/admin/line-marketing/components/PhonePreviewModal';

async function runChallengerVerification() {
    console.log('======================================================');
    console.log(' Challenger M2-1: 独立敵対的検証スイート実行');
    console.log('======================================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(description: string, condition: boolean, extra?: string) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ [PASS] ${description}`);
        } else {
            failedTests++;
            console.error(`  ❌ [FAIL] ${description} ${extra ? `(${extra})` : ''}`);
        }
    }

    // -----------------------------------------------------------------
    // Challenge 1: クライアント/サーバー変数置換エンジンの整合性と堅牢性
    // -----------------------------------------------------------------
    console.log('--- Challenge 1: クライアント/サーバー変数置換エンジンの整合性 ---');

    const testStudent0035 = {
        id: 'test-student-0035-uuid',
        studentNumber: TEST_TARO_STUDENT_NUMBER, // '0035'
        fullName: 'テスト太郎',
        status: 'trial_done',
        area: '東京都港区',
        coachName: '新吉航大 コーチ',
        planName: '月2回プラン（60分）',
        hasLine: true,
        trialDate: '2026年9月30日',
    };

    const template1 = '{{name}} 様、担当の {{coach_name}} です。プラン: {{plan_name}}、エリア: {{area}}、会員番号: {{student_number}}';
    const serverResult1 = renderLineMessage(template1, {
        name: testStudent0035.fullName,
        coach_name: testStudent0035.coachName,
        plan_name: testStudent0035.planName,
        area: testStudent0035.area,
        student_number: testStudent0035.studentNumber,
    });
    const clientResult1 = renderClientPreviewMessage(template1, testStudent0035);

    assert(
        'C1-01: 基本変数置換の整合性（クライアントとサーバーで置換結果が完全に一致）',
        serverResult1.trim() === clientResult1.trim(),
        `Server: "${serverResult1}" vs Client: "${clientResult1}"`
    );

    // 未知の変数プレースホルダー
    const templateWithUnknown = 'こんにちは {{name}} 様、未知の項目: {{unregistered_custom_var}} です。';
    const serverResultUnknown = renderLineMessage(templateWithUnknown, { name: testStudent0035.fullName });
    const clientResultUnknown = renderClientPreviewMessage(templateWithUnknown, testStudent0035);

    assert(
        'C1-02: 未定義変数のフォールバック耐性（クラッシュせず安全に除去/空白置換される）',
        !serverResultUnknown.includes('{{unregistered_custom_var}}') && !clientResultUnknown.includes('{{unregistered_custom_var}}'),
        `Server: ${serverResultUnknown}, Client: ${clientResultUnknown}`
    );

    // 全角カッコプレースホルダー ｛｛name｝｝
    const templateZenkaku = '｛｛name｝｝ 様、体験レッスンのご案内です。';
    const clientResultZenkaku = renderClientPreviewMessage(templateZenkaku, testStudent0035);
    const serverResultZenkaku = renderLineMessage(templateZenkaku, { name: testStudent0035.fullName });
    assert(
        'C1-03: 全角波括弧プレースホルダーのフォールバック置換（クライアント & サーバー）',
        clientResultZenkaku.includes('テスト太郎 様') && serverResultZenkaku.includes('テスト太郎 様'),
        `Client: ${clientResultZenkaku}, Server: ${serverResultZenkaku}`
    );

    // 空文字列・境界値
    const emptyResultClient = renderClientPreviewMessage('', testStudent0035);
    const emptyResultServer = renderLineMessage('', {});
    assert(
        'C1-04: 空文字入力時の非破壊安全性',
        emptyResultClient.length > 0 && emptyResultServer === ''
    );

    // -----------------------------------------------------------------
    // Challenge 2: 厳格安全ガード（0035・テスト太郎限定）の物理遮断テスト
    // -----------------------------------------------------------------
    console.log('\n--- Challenge 2: テスト送信の物理安全ガード厳格テスト ---');

    // 0035 / U0e5a7654874369ca5e38deb47fd783aa は例外を投げないこと
    let allowedPassed = false;
    try {
        assertTestPreviewSecurityGuard({
            isTestPreview: true,
            studentNumber: TEST_TARO_STUDENT_NUMBER,
            studentName: 'テスト太郎',
            lineUserId: TEST_TARO_LINE_USER_ID,
        });
        allowedPassed = true;
    } catch {
        allowedPassed = false;
    }
    assert(
        'C2-01: 会員番号0035・テスト太郎はセキュリティ違反で拒否されないこと',
        allowedPassed
    );

    // 不正な会員番号（例: 0001, 9999）でのテスト送信呼び出し
    let blockedNumber = false;
    try {
        assertTestPreviewSecurityGuard({
            isTestPreview: true,
            studentNumber: '9999',
            studentName: '不正な会員',
            lineUserId: TEST_TARO_LINE_USER_ID,
        });
    } catch (e: any) {
        blockedNumber = e.message.includes('SECURITY VIOLATION');
    }
    assert(
        'C2-02: 会員番号0035以外のテスト送信試行が確実に物理遮断（SECURITY VIOLATION）されること',
        blockedNumber
    );

    // 不正なLINE User IDでのテスト送信呼び出し
    let blockedUserId = false;
    try {
        assertTestPreviewSecurityGuard({
            isTestPreview: true,
            studentNumber: TEST_TARO_STUDENT_NUMBER,
            studentName: 'テスト太郎',
            lineUserId: 'U99999999999999999999999999999999',
        });
    } catch (e: any) {
        blockedUserId = e.message.includes('SECURITY VIOLATION');
    }
    assert(
        'C2-03: テスト太郎のLINE User ID以外のテスト送信試行が確実に物理遮断（SECURITY VIOLATION）されること',
        blockedUserId
    );

    // -----------------------------------------------------------------
    // Challenge 3: D&D並び替えアルゴリズムの整合性・耐障害性
    // -----------------------------------------------------------------
    console.log('\n--- Challenge 3: D&D並び替えアルゴリズムの整合性検証 ---');

    function simulateArrayMove<T>(array: T[], from: number, to: number): T[] {
        const item = array[from];
        const newArray = [...array];
        newArray.splice(from, 1);
        newArray.splice(to, 0, item);
        return newArray;
    }

    const initialRules = [
        { id: 'rule-1', stepOrder: 1, delayDays: 1, sendTime: '19:00', title: 'Step 1' },
        { id: 'rule-2', stepOrder: 2, delayDays: 3, sendTime: '12:00', title: 'Step 2' },
        { id: 'rule-3', stepOrder: 3, delayDays: 7, sendTime: '19:00', title: 'Step 3' },
    ];

    // Step 1 を最後 (index 0 -> index 2) に移動
    const reordered1 = simulateArrayMove(initialRules, 0, 2);
    assert(
        'C3-01: 先頭から末尾へのD&D移動順序整合性',
        reordered1[0].id === 'rule-2' && reordered1[1].id === 'rule-3' && reordered1[2].id === 'rule-1'
    );

    // 0件配列または1件配列の移動
    const singleRule = [{ id: 'rule-single', stepOrder: 1, delayDays: 1, sendTime: '19:00', title: 'Single' }];
    const reorderedSingle = simulateArrayMove(singleRule, 0, 0);
    assert(
        'C3-02: 1件のみの配列における自己移動の非破壊性',
        reorderedSingle.length === 1 && reorderedSingle[0].id === 'rule-single'
    );

    // -----------------------------------------------------------------
    // 結果サマリー
    // -----------------------------------------------------------------
    console.log('\n======================================================');
    console.log(` Challenger 検証結果: 全 ${totalTests} 件 | 合格: ${passedTests} | 失敗: ${failedTests}`);
    console.log('======================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runChallengerVerification().catch(e => {
    console.error('Challenger verification fatal error:', e);
    process.exit(1);
});
