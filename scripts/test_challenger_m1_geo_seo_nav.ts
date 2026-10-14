/**
 * scripts/test_challenger_m1_geo_seo_nav.ts
 * 
 * M1 Challenger 1: URL同期＆後方互換リゾルバの実証的ストレステストハーネス
 */

import {
    resolveGeoSeoNavState,
    getParentGroupForTab,
    GEO_SEO_NAV_GROUPS,
    GROUP_TABS_MAP,
    TAB_TO_GROUP_MAP,
    GROUP_DEFAULT_TAB_MAP,
    OLD_TAB_MAPPING,
    DEFAULT_GROUP,
    DEFAULT_TAB,
} from '../src/lib/geo-seo-navigation';
import type {
    GeoSeoNavGroup,
    GeoSeoNavTab,
    OldGeoSeoTab,
    GeoSeoNavState,
} from '../src/types/geo-seo-navigation';

interface TestCase {
    category: string;
    description: string;
    input: [string | null | undefined, string | null | undefined];
    expected?: Partial<GeoSeoNavState>;
    allowFallback?: boolean;
}

interface TestResult {
    category: string;
    description: string;
    input: [string | null | undefined, string | null | undefined];
    output: any;
    passed: boolean;
    reason?: string;
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

const VALID_GROUPS: GeoSeoNavGroup[] = ['traffic', 'diagnostics', 'ai_cockpit', 'settings'];
const VALID_TABS: GeoSeoNavTab[] = [
    'google_ads', 'ga4_gsc', 'conversion',
    'seo_rank', 'competitors', 'geo_ai', 'citation_gap',
    'ai_hub', 'rank_sniper', 'content_studio',
    'settings_master', 'api_status',
];

// オラクル関数: 戻り値が有効な GeoSeoNavState であり、かつグループとタブが整合しているか判定
function validateNavState(res: any): { valid: boolean; reason?: string } {
    if (!res || typeof res !== 'object') {
        return { valid: false, reason: `戻り値がオブジェクトではありません: ${typeof res} (${String(res)})` };
    }
    if (typeof res.group !== 'string' || !VALID_GROUPS.includes(res.group)) {
        return { valid: false, reason: `group が不正です: ${String(res.group)} (型: ${typeof res.group})` };
    }
    if (typeof res.tab !== 'string' || !VALID_TABS.includes(res.tab)) {
        return { valid: false, reason: `tab が不正です: ${String(res.tab)} (型: ${typeof res.tab})` };
    }
    const expectedTabs = GROUP_TABS_MAP[res.group as GeoSeoNavGroup];
    if (!expectedTabs || !expectedTabs.includes(res.tab as GeoSeoNavTab)) {
        return { valid: false, reason: `グループ '${res.group}' にタブ '${res.tab}' は所属していません` };
    }
    return { valid: true };
}

const results: TestResult[] = [];

function runTest(tc: TestCase) {
    try {
        const output = resolveGeoSeoNavState(tc.input[0], tc.input[1]);
        const oracle = validateNavState(output);

        if (!oracle.valid) {
            results.push({
                category: tc.category,
                description: tc.description,
                input: tc.input,
                output,
                passed: false,
                reason: `オラクル違反: ${oracle.reason}`,
                severity: 'CRITICAL',
            });
            return;
        }

        if (tc.expected) {
            if (tc.expected.group && output.group !== tc.expected.group) {
                results.push({
                    category: tc.category,
                    description: tc.description,
                    input: tc.input,
                    output,
                    passed: false,
                    reason: `期待したgroup '${tc.expected.group}' と不一致 (実際: '${output.group}')`,
                    severity: 'HIGH',
                });
                return;
            }
            if (tc.expected.tab && output.tab !== tc.expected.tab) {
                results.push({
                    category: tc.category,
                    description: tc.description,
                    input: tc.input,
                    output,
                    passed: false,
                    reason: `期待したtab '${tc.expected.tab}' と不一致 (実際: '${output.tab}')`,
                    severity: 'HIGH',
                });
                return;
            }
        }

        results.push({
            category: tc.category,
            description: tc.description,
            input: tc.input,
            output,
            passed: true,
        });
    } catch (e: any) {
        results.push({
            category: tc.category,
            description: tc.description,
            input: tc.input,
            output: null,
            passed: false,
            reason: `例外がスローされました: ${e?.message || e}`,
            severity: 'CRITICAL',
        });
    }
}

// ==========================================
// 1. [Category A] 旧9タブ全件の後方互換マッピング
// ==========================================
const OLD_TABS: Record<OldGeoSeoTab, { group: GeoSeoNavGroup; tab: GeoSeoNavTab }> = {
    seo: { group: 'diagnostics', tab: 'seo_rank' },
    google_ads: { group: 'traffic', tab: 'google_ads' },
    competitors: { group: 'diagnostics', tab: 'competitors' },
    articles: { group: 'ai_cockpit', tab: 'content_studio' },
    conversion: { group: 'traffic', tab: 'conversion' },
    geo: { group: 'diagnostics', tab: 'geo_ai' },
    citation_gap: { group: 'diagnostics', tab: 'citation_gap' },
    analytics: { group: 'traffic', tab: 'ga4_gsc' },
    settings: { group: 'settings', tab: 'settings_master' },
};

for (const [oldTab, expected] of Object.entries(OLD_TABS)) {
    runTest({
        category: 'A. 旧9タブ後方互換',
        description: `旧パラメータ ?tab=${oldTab} の単体解決`,
        input: [null, oldTab],
        expected,
    });
    runTest({
        category: 'A. 旧9タブ後方互換',
        description: `旧パラメータ ?group=wrong&tab=${oldTab} (group不一致時でもtab優先解決)`,
        input: ['invalid_group', oldTab],
        expected,
    });
}

// ==========================================
// 2. [Category B] 新グループ単体 / 新タブ単体 / 正常ペア
// ==========================================
for (const group of VALID_GROUPS) {
    runTest({
        category: 'B. 新グループ単体',
        description: `新グループ ?group=${group} のみ指定時のデフォルトタブ補完`,
        input: [group, null],
        expected: { group, tab: GROUP_DEFAULT_TAB_MAP[group] },
    });
}

for (const tab of VALID_TABS) {
    const parentGroup = TAB_TO_GROUP_MAP[tab];
    runTest({
        category: 'B. 新タブ単体',
        description: `新タブ ?tab=${tab} のみ指定時の親グループ逆引き解決`,
        input: [null, tab],
        expected: { group: parentGroup, tab },
    });
    runTest({
        category: 'B. 正常ペア',
        description: `新グループとタブの完全一致ペア ?group=${parentGroup}&tab=${tab}`,
        input: [parentGroup, tab],
        expected: { group: parentGroup, tab },
    });
}

// ==========================================
// 3. [Category C] 不整合ペア（groupとtabの不一致自動調停）
// ==========================================
const MISMATCH_TESTS: Array<{ group: string; tab: string; expectedGroup: GeoSeoNavGroup; expectedTab: GeoSeoNavTab }> = [
    { group: 'traffic', tab: 'seo_rank', expectedGroup: 'diagnostics', expectedTab: 'seo_rank' },
    { group: 'traffic', tab: 'ai_hub', expectedGroup: 'ai_cockpit', expectedTab: 'ai_hub' },
    { group: 'diagnostics', tab: 'google_ads', expectedGroup: 'traffic', expectedTab: 'google_ads' },
    { group: 'diagnostics', tab: 'settings_master', expectedGroup: 'settings', expectedTab: 'settings_master' },
    { group: 'ai_cockpit', tab: 'conversion', expectedGroup: 'traffic', expectedTab: 'conversion' },
    { group: 'settings', tab: 'citation_gap', expectedGroup: 'diagnostics', expectedTab: 'citation_gap' },
];

for (const tc of MISMATCH_TESTS) {
    runTest({
        category: 'C. 不整合ペア調停',
        description: `不整合 ?group=${tc.group}&tab=${tc.tab} (tabの所属グループへ自動修正)`,
        input: [tc.group, tc.tab],
        expected: { group: tc.expectedGroup, tab: tc.expectedTab },
    });
}

// ==========================================
// 4. [Category D] 境界値・異常値・特殊入力
// ==========================================
const BOUNDARY_TESTS: Array<{ desc: string; input: [any, any]; expected?: Partial<GeoSeoNavState> }> = [
    { desc: 'null, null', input: [null, null], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: 'undefined, undefined', input: [undefined, undefined], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: '空文字 "", ""', input: ['', ''], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: '空白 "   ", "   "', input: ['   ', '   '], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: '不正グループ, 不正タブ', input: ['unknown_grp', 'invalid_tab'], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: '正常グループ, 不正タブ (グループのデフォルトタブに補完)', input: ['traffic', 'invalid_tab'], expected: { group: 'traffic', tab: 'google_ads' } },
    { desc: '正常グループ(diagnostics), 不正タブ', input: ['diagnostics', 'unknown'], expected: { group: 'diagnostics', tab: 'seo_rank' } },
    { desc: '不正グループ, 正常タブ (親グループ逆引き)', input: ['invalid', 'seo_rank'], expected: { group: 'diagnostics', tab: 'seo_rank' } },
    { desc: 'パストラバーサル ../../', input: ['../../', '../../'], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: 'XSSインジェクション <script>', input: ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>'], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: 'SQLインジェクション風', input: ["' OR '1'='1", "'; DROP TABLE users; --"], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: 'URLクエリ風文字列', input: ['?group=traffic', '&tab=google_ads'], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: '制御文字・改行', input: ['\n\r\t', '\0'], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
    { desc: '巨大文字列 (10,000文字)', input: ['a'.repeat(10000), 'b'.repeat(10000)], expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB } },
];

for (const b of BOUNDARY_TESTS) {
    runTest({
        category: 'D. 境界値・異常値',
        description: b.desc,
        input: b.input,
        expected: b.expected,
    });
}

// ==========================================
// 5. [Category E] 大文字小文字混在
// ==========================================
const CASE_TESTS: Array<{ desc: string; input: [any, any] }> = [
    { desc: '大文字 ?tab=SEO', input: [null, 'SEO'] },
    { desc: '大文字 ?group=TRAFFIC', input: ['TRAFFIC', null] },
    { desc: 'キャメルケース ?tab=Google_Ads', input: [null, 'Google_Ads'] },
    { desc: '大文字 ?group=AI_COCKPIT&tab=CONTENT_STUDIO', input: ['AI_COCKPIT', 'CONTENT_STUDIO'] },
];

for (const c of CASE_TESTS) {
    runTest({
        category: 'E. 大文字小文字混在',
        description: c.desc,
        input: c.input,
        // 大文字小文字はフォールバックするか正規化されるかを検証（オラクルで妥当性を判定）
    });
}

// ==========================================
// 6. [Category F] プロトタイプ汚染・予約語キー衝突攻撃
// ==========================================
const PROTOTYPE_KEYS = [
    'toString',
    'valueOf',
    'constructor',
    '__proto__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
];

for (const key of PROTOTYPE_KEYS) {
    runTest({
        category: 'F. プロトタイプ汚染・予約語',
        description: `tab に予約語 '${key}' を指定 (?tab=${key})`,
        input: [null, key],
        expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB },
    });
    runTest({
        category: 'F. プロトタイプ汚染・予約語',
        description: `group に予約語 '${key}' を指定 (?group=${key})`,
        input: [key, null],
        expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB },
    });
    runTest({
        category: 'F. プロトタイプ汚染・予約語',
        description: `group と tab 共に予約語 '${key}' を指定 (?group=${key}&tab=${key})`,
        input: [key, key],
        expected: { group: DEFAULT_GROUP, tab: DEFAULT_TAB },
    });
    runTest({
        category: 'F. プロトタイプ汚染・予約語',
        description: `正常groupと予約語tab (?group=traffic&tab=${key})`,
        input: ['traffic', key],
        expected: { group: 'traffic', tab: 'google_ads' },
    });
}

// ==========================================
// 7. [Category G] getParentGroupForTab のテスト
// ==========================================
for (const tab of VALID_TABS) {
    const parent = getParentGroupForTab(tab);
    const expected = TAB_TO_GROUP_MAP[tab];
    if (parent !== expected) {
        results.push({
            category: 'G. getParentGroupForTab',
            description: `タブ '${tab}' の親グループ判定`,
            input: [null, tab],
            output: parent,
            passed: false,
            reason: `期待: ${expected}, 実際: ${parent}`,
            severity: 'HIGH',
        });
    } else {
        results.push({
            category: 'G. getParentGroupForTab',
            description: `タブ '${tab}' の親グループ判定`,
            input: [null, tab],
            output: parent,
            passed: true,
        });
    }
}

// 予約語を渡した場合の getParentGroupForTab
for (const key of PROTOTYPE_KEYS) {
    const parent = getParentGroupForTab(key as any);
    if (!VALID_GROUPS.includes(parent)) {
        results.push({
            category: 'G. getParentGroupForTab',
            description: `予約語 '${key}' 渡下時の親グループ判定`,
            input: [null, key],
            output: parent,
            passed: false,
            reason: `無効な親グループ返却: ${String(parent)} (型: ${typeof parent})`,
            severity: 'CRITICAL',
        });
    } else {
        results.push({
            category: 'G. getParentGroupForTab',
            description: `予約語 '${key}' 渡下時の親グループ判定`,
            input: [null, key],
            output: parent,
            passed: true,
        });
    }
}

// ==========================================
// 結果集計とサマリー出力
// ==========================================
const totalTests = results.length;
const passedTests = results.filter((r) => r.passed).length;
const failedTests = results.filter((r) => !r.passed);

console.log('====================================================');
console.log(`STRESS TEST HARNESS COMPLETED: Total ${totalTests} tests`);
console.log(`PASSED: ${passedTests} / ${totalTests}`);
console.log(`FAILED: ${failedTests.length} / ${totalTests}`);
console.log('====================================================');

if (failedTests.length > 0) {
    console.log('\n❌ DETECTED FAILURES:');
    for (const fail of failedTests) {
        console.log(`[${fail.severity}] [${fail.category}] ${fail.description}`);
        console.log(`  Input:    group=${JSON.stringify(fail.input[0])}, tab=${JSON.stringify(fail.input[1])}`);
        console.log(`  Output:   ${typeof fail.output === 'function' ? fail.output.toString().slice(0, 40) + '...' : JSON.stringify(fail.output)}`);
        console.log(`  Reason:   ${fail.reason}\n`);
    }
    process.exit(1);
} else {
    console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
}
