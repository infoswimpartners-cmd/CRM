/**
 * ==============================================================================
 * Challenger M1-2 敵対的ストレステスト & 境界値破壊検証スクリプト
 * ==============================================================================
 * 
 * 担当: Challenger 1 (Empirical Challenger: critic, specialist)
 * 
 * 【検証目的】
 * 1. 不正入力耐性 (null, undefined, 型不正, プロトタイプ汚染, 空文字, 空白)
 * 2. 極端な入力耐性 (100,000文字の長大文字列, 10,000個の置換変数)
 * 3. ReDoS (正規表現DoS) 脆弱性検証 (多重ネスト括弧, 未完結括弧)
 * 4. XSS / インジェクション文字列の安全サニタイズ
 * 5. 安全セキュリティガード (会員番号0035・テスト太郎以外への誤送信100%遮断)
 * 
 * 【安全ルール厳格遵守】
 * - テスト対象顧客: 会員番号0035、テスト太郎のみ使用
 * - 外部送信APIはモックまたは dryRun で実行し、実送信は行わない
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
    renderLineMessage,
    replaceTemplateVariables,
    assertTestPreviewSecurityGuard,
    sendSingleLineMessage,
    DEFAULT_VARIABLE_FALLBACKS,
    TEST_TARO_STUDENT_NUMBER,
    TEST_TARO_LINE_USER_ID,
    TEST_TARO_STUDENT_NAME,
    TEST_TARO_STUDENT_ID,
} from '../src/lib/line-marketing-service';

interface StressTestResult {
    id: string;
    category: string;
    description: string;
    passed: boolean;
    durationMs: number;
    details: string;
}

const results: StressTestResult[] = [];

function record(result: StressTestResult) {
    results.push(result);
    const badge = result.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${badge} ${result.id}: ${result.description} (${result.durationMs.toFixed(2)}ms)`);
    if (!result.passed) {
        console.error(`   └─ 失敗理由: ${result.details}`);
    }
}

async function runAdversarialStressTests() {
    console.log('======================================================================');
    console.log(' Challenger M1-2 敵対的入力・境界値・ReDoS・極限負荷ストレステスト');
    console.log('======================================================================\n');

    // --------------------------------------------------------------------------
    // カテゴリ 1: テンプレート・変数の null / undefined / 型不正耐性
    // --------------------------------------------------------------------------
    console.log('--- 1. Null / Undefined / 型不正耐性テスト ---');

    // 1-1. template が null / undefined / 空文字
    const invalidTemplates = [null, undefined, '', '   '];
    for (let i = 0; i < invalidTemplates.length; i++) {
        const t = invalidTemplates[i];
        const t0 = performance.now();
        try {
            const res = renderLineMessage(t as any, { name: TEST_TARO_STUDENT_NAME });
            const passed = res === '';
            record({
                id: `NULL-TMPL-0${i + 1}`,
                category: 'Null Safety',
                description: `無効なテンプレート (${JSON.stringify(t)}) に対する空文字安全返却`,
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '正常' : `期待値: ""、実際: ${JSON.stringify(res)}`,
            });
        } catch (err: any) {
            record({
                id: `NULL-TMPL-0${i + 1}`,
                category: 'Null Safety',
                description: `無効なテンプレート (${JSON.stringify(t)}) に対する空文字安全返却`,
                passed: false,
                durationMs: performance.now() - t0,
                details: `例外発生: ${err.message}`,
            });
        }
    }

    // 1-2. variables が null / undefined / プリミティブ / 配列 / 関数
    const invalidVariables = [
        null,
        undefined,
        'string_instead_of_object',
        12345,
        true,
        false,
        [1, 2, 3],
        () => { },
    ];
    for (let i = 0; i < invalidVariables.length; i++) {
        const v = invalidVariables[i];
        const t0 = performance.now();
        try {
            const template = 'こんにちは、{{name}}様！担当は{{coach_name}}です。';
            const res = renderLineMessage(template, v as any);
            // フォールバック値が安全に適用されるべき
            const passed = res.includes('お客様') && res.includes('担当コーチ');
            record({
                id: `INVALID-VARS-0${i + 1}`,
                category: 'Variable Type Resilience',
                description: `不正なvariables型 (${typeof v}) 渡し時のフォールバック動作`,
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '安全にフォールバック適用' : `予期せぬ出力: ${res}`,
            });
        } catch (err: any) {
            record({
                id: `INVALID-VARS-0${i + 1}`,
                category: 'Variable Type Resilience',
                description: `不正なvariables型 (${typeof v}) 渡し時のフォールバック動作`,
                passed: false,
                durationMs: performance.now() - t0,
                details: `クラッシュ例外発生: ${err.message}`,
            });
        }
    }

    // 1-3. 変数値内の null / undefined / 空文字 / 空白
    const nullishValues = [
        { key: 'null', val: null },
        { key: 'undefined', val: undefined },
        { key: 'empty', val: '' },
        { key: 'spaces', val: '    ' },
    ];
    for (let i = 0; i < nullishValues.length; i++) {
        const item = nullishValues[i];
        const t0 = performance.now();
        try {
            const res = renderLineMessage('生徒様: {{name}}', { name: item.val as any });
            const passed = res.includes('お客様'); // デフォルトフォールバックが機能すること
            record({
                id: `NULL-VAL-0${i + 1}`,
                category: 'Nullish Values',
                description: `変数値が ${item.key} の場合の安全フォールバック適用`,
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '安全フォールバック成功' : `実際: ${res}`,
            });
        } catch (err: any) {
            record({
                id: `NULL-VAL-0${i + 1}`,
                category: 'Nullish Values',
                description: `変数値が ${item.key} の場合の安全フォールバック適用`,
                passed: false,
                durationMs: performance.now() - t0,
                details: `クラッシュ例外: ${err.message}`,
            });
        }
    }

    // 1-4. 変数値がオブジェクトや配列などの非文字列型
    const nonStringValues = [
        { type: 'number', val: 12345, expected: '12345' },
        { type: 'boolean', val: true, expected: 'true' },
        { type: 'object', val: { custom: 'data' }, expected: '[object Object]' },
    ];
    for (let i = 0; i < nonStringValues.length; i++) {
        const item = nonStringValues[i];
        const t0 = performance.now();
        try {
            const res = renderLineMessage('情報: {{custom_var}}', { custom_var: item.val as any });
            const passed = res.includes(item.expected);
            record({
                id: `NON-STR-0${i + 1}`,
                category: 'Non-String Value Safe Coercion',
                description: `変数値が非文字列 (${item.type}) の安全な文字列変換`,
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '正常変換' : `出力: ${res}`,
            });
        } catch (err: any) {
            record({
                id: `NON-STR-0${i + 1}`,
                category: 'Non-String Value Safe Coercion',
                description: `変数値が非文字列 (${item.type}) の安全な文字列変換`,
                passed: false,
                durationMs: performance.now() - t0,
                details: `例外発生: ${err.message}`,
            });
        }
    }

    // --------------------------------------------------------------------------
    // カテゴリ 2: 未定義キー・未知の変数・プロトタイプ汚染耐性
    // --------------------------------------------------------------------------
    console.log('\n--- 2. 未定義キー & プロトタイプ汚染耐性テスト ---');

    // 2-1. デフォルトフォールバックが存在しない未定義変数は空文字で除去されるか
    {
        const t0 = performance.now();
        try {
            const res = renderLineMessage('本文: 前{{unknown_variable_xyz}}後', {});
            const passed = res === '本文: 前後';
            record({
                id: 'UNDEF-KEY-01',
                category: 'Undefined Key',
                description: '未定義のカスタム変数は安全に空文字に除去される',
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '安全に空文字除去' : `出力: "${res}"`,
            });
        } catch (err: any) {
            record({
                id: 'UNDEF-KEY-01',
                category: 'Undefined Key',
                description: '未定義のカスタム変数は安全に空文字に除去される',
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // 2-2. プロトタイプ汚染（__proto__, constructor, toString）
    const protoKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'];
    for (let i = 0; i < protoKeys.length; i++) {
        const pk = protoKeys[i];
        const t0 = performance.now();
        try {
            const tmpl = `テスト {{${pk}}}`;
            const res = renderLineMessage(tmpl, {});
            // プロトタイプ汚染を起こさず、オブジェクト内部関数が展開されたりクラッシュしたりしないこと
            const passed = !res.includes('function') && !res.includes('[native code]');
            record({
                id: `PROTO-POLLUTION-0${i + 1}`,
                category: 'Prototype Pollution Defense',
                description: `危険なオブジェクトプロパティ名 ({{${pk}}}) の無害化`,
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '正常に無害化' : `漏洩出力: ${res}`,
            });
        } catch (err: any) {
            record({
                id: `PROTO-POLLUTION-0${i + 1}`,
                category: 'Prototype Pollution Defense',
                description: `危険なオブジェクトプロパティ名 ({{${pk}}}) の無害化`,
                passed: false,
                durationMs: performance.now() - t0,
                details: `クラッシュ例外: ${err.message}`,
            });
        }
    }

    // --------------------------------------------------------------------------
    // カテゴリ 3: 長大文字列 & ReDoS (正規表現サービス拒否) 耐性
    // --------------------------------------------------------------------------
    console.log('\n--- 3. 長大文字列 & ReDoS 耐性テスト ---');

    // 3-1. 100,000文字の長大テンプレート処理時間 (100ms以内)
    {
        const t0 = performance.now();
        try {
            const longTemplate = 'あ'.repeat(100000) + '{{name}}' + 'い'.repeat(100000);
            const res = renderLineMessage(longTemplate, { name: TEST_TARO_STUDENT_NAME });
            const elapsed = performance.now() - t0;
            const passed = res.includes(TEST_TARO_STUDENT_NAME) && elapsed < 300;
            record({
                id: 'STRESS-LEN-01',
                category: 'Extreme Length',
                description: '200,000文字超の長大テンプレートの高速展開 (< 300ms)',
                passed,
                durationMs: elapsed,
                details: `処理時間: ${elapsed.toFixed(2)}ms (結果長: ${res.length})`,
            });
        } catch (err: any) {
            record({
                id: 'STRESS-LEN-01',
                category: 'Extreme Length',
                description: '200,000文字超の長大テンプレートの高速展開 (< 300ms)',
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // 3-2. 10,000個の連続変数置換
    {
        const t0 = performance.now();
        try {
            const manyVarsTemplate = '{{name}} '.repeat(10000);
            const res = renderLineMessage(manyVarsTemplate, { name: 'A' });
            const elapsed = performance.now() - t0;
            const passed = elapsed < 300 && res.startsWith('A A A');
            record({
                id: 'STRESS-VARS-02',
                category: 'Massive Substitutions',
                description: '10,000個の同一変数連続置換 (< 300ms)',
                passed,
                durationMs: elapsed,
                details: `処理時間: ${elapsed.toFixed(2)}ms`,
            });
        } catch (err: any) {
            record({
                id: 'STRESS-VARS-02',
                category: 'Massive Substitutions',
                description: '10,000個の同一変数連続置換 (< 300ms)',
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // 3-3. ReDoS パス: 多重波括弧の大量ネスト
    {
        const t0 = performance.now();
        try {
            // ネストされた波括弧: {{{{{{{{{{name}}}}}}}}}}
            const nestedBraces = '{'.repeat(500) + 'name' + '}'.repeat(500);
            const res = renderLineMessage(nestedBraces, { name: TEST_TARO_STUDENT_NAME });
            const elapsed = performance.now() - t0;
            const passed = elapsed < 50; // ReDoSを起こさず50ms未満で即座に完了すること
            record({
                id: 'REDOS-01',
                category: 'ReDoS Resistance',
                description: '多重ネスト波括弧 (500重) の非指数バックトラック検証 (< 50ms)',
                passed,
                durationMs: elapsed,
                details: `処理時間: ${elapsed.toFixed(2)}ms (出力: ${res.substring(0, 30)}...)`,
            });
        } catch (err: any) {
            record({
                id: 'REDOS-01',
                category: 'ReDoS Resistance',
                description: '多重ネスト波括弧 (500重) の非指数バックトラック検証 (< 50ms)',
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // 3-4. ReDoS パス: 未完結の波括弧 5,000個連続
    {
        const t0 = performance.now();
        try {
            const unclosedBraces = '{{{{'.repeat(2500) + 'unclosed_name';
            const res = renderLineMessage(unclosedBraces, { name: TEST_TARO_STUDENT_NAME });
            const elapsed = performance.now() - t0;
            const passed = elapsed < 50;
            record({
                id: 'REDOS-02',
                category: 'ReDoS Resistance',
                description: '未完結波括弧 10,000文字の非指数バックトラック検証 (< 50ms)',
                passed,
                durationMs: elapsed,
                details: `処理時間: ${elapsed.toFixed(2)}ms`,
            });
        } catch (err: any) {
            record({
                id: 'REDOS-02',
                category: 'ReDoS Resistance',
                description: '未完結波括弧 10,000文字の非指数バックトラック検証 (< 50ms)',
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // --------------------------------------------------------------------------
    // カテゴリ 4: XSS & HTMLインジェクション サニタイズ
    // --------------------------------------------------------------------------
    console.log('\n--- 4. XSS & HTMLインジェクション サニタイズテスト ---');

    const xssPayloads = [
        { id: 'XSS-01', name: 'Script tag', payload: '<script>alert("XSS")</script>' },
        { id: 'XSS-02', name: 'Image onerror', payload: '<img src=x onerror=alert(1)>' },
        { id: 'XSS-03', name: 'Iframe injection', payload: '<iframe src="javascript:alert(1)"></iframe>' },
        { id: 'XSS-04', name: 'Anchor javascript:', payload: '<a href="javascript:alert(1)">click</a>' },
    ];
    for (const item of xssPayloads) {
        const t0 = performance.now();
        try {
            // テンプレート自体に注入された場合
            const res1 = renderLineMessage(`こんにちは！${item.payload}様`, {});
            // 変数値に注入された場合
            const res2 = renderLineMessage('こんにちは！{{name}}様', { name: item.payload });

            const passed =
                !res1.includes('<script>') && !res1.includes('<img') && !res1.includes('<iframe') && !res1.includes('<a>') &&
                !res2.includes('<script>') && !res2.includes('<img') && !res2.includes('<iframe') && !res2.includes('<a>');

            record({
                id: item.id,
                category: 'XSS Sanitization',
                description: `${item.name} の除去・無害化 (テンプレート & 変数経由)`,
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '正常にHTMLタグ除去' : `res1: "${res1}", res2: "${res2}"`,
            });
        } catch (err: any) {
            record({
                id: item.id,
                category: 'XSS Sanitization',
                description: `${item.name} の除去・無害化`,
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // --------------------------------------------------------------------------
    // カテゴリ 5: 5,000文字LINE上限超過拒絶テスト
    // --------------------------------------------------------------------------
    console.log('\n--- 5. 5,000文字超過拒絶 & 安全性テスト ---');
    {
        const t0 = performance.now();
        try {
            const textOverLimit = 'あ'.repeat(5001);
            const sendRes = await sendSingleLineMessage({
                lineUserId: TEST_TARO_LINE_USER_ID,
                studentId: TEST_TARO_STUDENT_ID,
                studentNumber: TEST_TARO_STUDENT_NUMBER,
                studentName: TEST_TARO_STUDENT_NAME,
                rawMessage: textOverLimit,
                deliveryType: 'test_preview',
                isTestPreview: true,
                dryRun: true,
            });
            const passed = !sendRes.success && (sendRes.error?.includes('5,000文字') || false);
            record({
                id: 'LINE-LIMIT-01',
                category: 'Line Message Limit',
                description: '5,001文字のメッセージがLINE上限エラーで送信前拒絶されるか',
                passed,
                durationMs: performance.now() - t0,
                details: passed ? '期待通り拒絶' : `結果: ${JSON.stringify(sendRes)}`,
            });
        } catch (err: any) {
            record({
                id: 'LINE-LIMIT-01',
                category: 'Line Message Limit',
                description: '5,001文字のメッセージがLINE上限エラーで送信前拒絶されるか',
                passed: false,
                durationMs: performance.now() - t0,
                details: err.message,
            });
        }
    }

    // --------------------------------------------------------------------------
    // カテゴリ 6: 安全テストガード（会員0035・テスト太郎専用の絶対的物理遮断）
    // --------------------------------------------------------------------------
    console.log('\n--- 6. 会員番号0035・テスト太郎以外の絶対的物理遮断テスト ---');

    // 6-1. 実在・ダミー問わず他の会員番号でのテスト送信
    const forbiddenStudentNumbers = ['0001', '0034', '0036', '9999', 'TEST', ''];
    for (let i = 0; i < forbiddenStudentNumbers.length; i++) {
        const sn = forbiddenStudentNumbers[i];
        const t0 = performance.now();
        try {
            assertTestPreviewSecurityGuard({
                isTestPreview: true,
                lineUserId: TEST_TARO_LINE_USER_ID,
                studentNumber: sn,
            });
            record({
                id: `SEC-GUARD-SN-0${i + 1}`,
                category: 'Security Guard Restriction',
                description: `会員番号 "${sn}" のテスト送信物理遮断`,
                passed: false,
                durationMs: performance.now() - t0,
                details: '例外が発生せず遮断されませんでした！重大インシデントです。',
            });
        } catch (err: any) {
            const isExpected = err.message.includes('SECURITY VIOLATION');
            record({
                id: `SEC-GUARD-SN-0${i + 1}`,
                category: 'Security Guard Restriction',
                description: `会員番号 "${sn}" のテスト送信物理遮断`,
                passed: isExpected,
                durationMs: performance.now() - t0,
                details: isExpected ? '正しく物理遮断' : `予期せぬエラー: ${err.message}`,
            });
        }
    }

    // 6-2. 他の LINE User ID でのテスト送信
    const forbiddenLineIds = [
        'U11111111111111111111111111111111',
        'U0e5a7654874369ca5e38deb47fd783ab', // 最後の1文字違い
        'u0e5a7654874369ca5e38deb47fd783aa', // 小文字
        null,
        undefined,
        '',
    ];
    for (let i = 0; i < forbiddenLineIds.length; i++) {
        const lid = forbiddenLineIds[i];
        const t0 = performance.now();
        try {
            assertTestPreviewSecurityGuard({
                isTestPreview: true,
                lineUserId: lid as any,
                studentNumber: TEST_TARO_STUDENT_NUMBER,
            });
            record({
                id: `SEC-GUARD-LID-0${i + 1}`,
                category: 'Security Guard Restriction',
                description: `不正LINE ID "${lid}" のテスト送信物理遮断`,
                passed: false,
                durationMs: performance.now() - t0,
                details: '例外が発生せず遮断されませんでした！重大インシデントです。',
            });
        } catch (err: any) {
            const isExpected = err.message.includes('SECURITY VIOLATION');
            record({
                id: `SEC-GUARD-LID-0${i + 1}`,
                category: 'Security Guard Restriction',
                description: `不正LINE ID "${lid}" のテスト送信物理遮断`,
                passed: isExpected,
                durationMs: performance.now() - t0,
                details: isExpected ? '正しく物理遮断' : `予期せぬエラー: ${err.message}`,
            });
        }
    }

    // 6-3. sendSingleLineMessage におけるテスト送信ガード
    {
        const t0 = performance.now();
        try {
            await sendSingleLineMessage({
                lineUserId: 'U_ILLEGAL_TARGET_99999',
                studentId: TEST_TARO_STUDENT_ID,
                studentNumber: '0001', // 不正な会員番号
                studentName: '不正太郎',
                message: 'テストメッセージ',
                deliveryType: 'test_preview',
                isTestPreview: true,
                dryRun: true,
            });
            record({
                id: 'SEC-GUARD-SEND-01',
                category: 'Security Guard Send Protection',
                description: 'sendSingleLineMessage 経由での不正宛先テスト送信の物理遮断',
                passed: false,
                durationMs: performance.now() - t0,
                details: '送信処理が呼び出され、例外がスローされませんでした！',
            });
        } catch (err: any) {
            const isSecurity = err.message.includes('SECURITY VIOLATION');
            record({
                id: 'SEC-GUARD-SEND-01',
                category: 'Security Guard Send Protection',
                description: 'sendSingleLineMessage 経由での不正宛先テスト送信の物理遮断',
                passed: isSecurity,
                durationMs: performance.now() - t0,
                details: isSecurity ? 'SECURITY VIOLATION 例外で完全遮断' : `予期せぬエラー: ${err.message}`,
            });
        }
    }

    // --------------------------------------------------------------------------
    // サマリー表示
    // --------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log(' ストレステスト結果サマリー');
    console.log('======================================================================');
    const total = results.length;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = total - passedCount;

    console.log(`総テストケース数: ${total}`);
    console.log(`  ✅ 合格 (PASS): ${passedCount}`);
    console.log(`  ❌ 失敗 (FAIL): ${failedCount}`);

    if (failedCount === 0) {
        console.log('\n🎉 [ALL ADVERSARIAL STRESS TESTS PASSED] 全ての敵対的・極限負荷テストに合格しました！');
    } else {
        console.log('\n🚨 [TESTS FAILED] 一部のテストで不具合が検出されました。');
    }

    return { total, passedCount, failedCount, results };
}

runAdversarialStressTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
