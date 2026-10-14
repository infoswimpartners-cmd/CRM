/**
 * M1 Challenger 2: アドバーサリアル・フォールバック・アクセシビリティ検証
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { GeoSeoTwoTierNav } from '../src/components/admin/geo-seo/GeoSeoTwoTierNav';
import { GEO_SEO_NAV_GROUPS } from '../src/lib/geo-seo-navigation';
import type { GeoSeoNavGroup, GeoSeoNavTab } from '../src/types/geo-seo-navigation';

console.log('================================================================');
console.log('  M1 Challenger 2: アドバーサリアル・フォールバック・ARIA検証');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
        console.log(`✅ [PASS] ${testName}`);
        passCount++;
    } else {
        console.error(`❌ [FAIL] ${testName}`);
        if (detail) console.error(`   詳細: ${detail}`);
        failCount++;
    }
}

// 1. 不正な activeGroup に対するクラッシュ回避テスト
try {
    const invalidGroup = 'invalid_group_xyz' as unknown as GeoSeoNavGroup;
    const html = ReactDOMServer.renderToString(
        React.createElement(GeoSeoTwoTierNav, {
            activeGroup: invalidGroup,
            activeTab: 'google_ads',
            onGroupChange: () => {},
            onTabChange: () => {},
        })
    );
    assert(
        html.includes('流入・広告分析'),
        '不正な activeGroup に対する安全なフォールバック（GEO_SEO_NAV_GROUPS[0] に安全フォールバック）',
        'クラッシュせず初期グループが描画された'
    );
} catch (err) {
    assert(false, '不正な activeGroup に対する安全なフォールバック', String(err));
}

// 2. badgeCounts のエッジケース（0件、undefined、巨大数値）
try {
    // 0件
    const htmlZero = ReactDOMServer.renderToString(
        React.createElement(GeoSeoTwoTierNav, {
            activeGroup: 'diagnostics',
            activeTab: 'citation_gap',
            onGroupChange: () => {},
            onTabChange: () => {},
            badgeCounts: { citationGapCount: 0 },
        })
    );
    assert(
        htmlZero.includes('0件'),
        '動的バッジ: citationGapCount = 0 の場合に "0件" と正しく表示されること',
        '0件の表示を確認'
    );

    // undefined (未指定)
    const htmlUndef = ReactDOMServer.renderToString(
        React.createElement(GeoSeoTwoTierNav, {
            activeGroup: 'diagnostics',
            activeTab: 'citation_gap',
            onGroupChange: () => {},
            onTabChange: () => {},
            badgeCounts: {},
        })
    );
    assert(
        htmlUndef.includes('GAP'),
        '動的バッジ: citationGapCount が未指定の場合にデフォルトバッジ "GAP" がフォールバック表示されること',
        'GAP の表示を確認'
    );

    // 巨大数値 (9999件)
    const htmlLarge = ReactDOMServer.renderToString(
        React.createElement(GeoSeoTwoTierNav, {
            activeGroup: 'diagnostics',
            activeTab: 'citation_gap',
            onGroupChange: () => {},
            onTabChange: () => {},
            badgeCounts: { citationGapCount: 9999 },
        })
    );
    assert(
        htmlLarge.includes('9999件'),
        '動的バッジ: 巨大数値 (9999件) でもレイアウトを壊さず表示されること',
        '9999件 の表示を確認'
    );
} catch (err) {
    assert(false, '動的バッジテスト', String(err));
}

// 3. WAI-ARIA 属性の出力検証
const normalHtml = ReactDOMServer.renderToString(
    React.createElement(GeoSeoTwoTierNav, {
        activeGroup: 'ai_cockpit',
        activeTab: 'ai_hub',
        onGroupChange: () => {},
        onTabChange: () => {},
    })
);

assert(
    normalHtml.includes('role="tablist"') &&
    normalHtml.includes('role="tab"') &&
    normalHtml.includes('aria-selected="true"') &&
    normalHtml.includes('aria-selected="false"'),
    'アクセシビリティ: role="tablist", role="tab", aria-selected の正しい付与',
    'WAI-ARIA 規格準拠を確認'
);

assert(
    normalHtml.includes('aria-controls="panel-ai_cockpit"') &&
    normalHtml.includes('id="group-tab-ai_cockpit"'),
    'アクセシビリティ: aria-controls と id によるタブとパネルの相互紐付け',
    'aria-controls と id を確認'
);

// 4. 全4グループ × 全12タブのレンダリング無謬性テスト
let allRenderedWithoutCrash = true;
for (const group of GEO_SEO_NAV_GROUPS) {
    for (const tab of group.tabs) {
        try {
            const h = ReactDOMServer.renderToString(
                React.createElement(GeoSeoTwoTierNav, {
                    activeGroup: group.id,
                    activeTab: tab.id,
                    onGroupChange: () => {},
                    onTabChange: () => {},
                })
            );
            if (!h || h.length < 500) {
                allRenderedWithoutCrash = false;
            }
        } catch (err) {
            allRenderedWithoutCrash = false;
            console.error(`Render failed for group: ${group.id}, tab: ${tab.id}`, err);
        }
    }
}

assert(
    allRenderedWithoutCrash,
    '全4グループ × 全12タブの組み合わせ（12通り）ですべてSSRレンダリングが例外なく成功すること',
    '12パターンの完全描画を確認'
);

console.log('\n================================================================');
console.log(`  アドバーサリアル検証結果: PASS = ${passCount}, FAIL = ${failCount}`);
console.log('================================================================\n');

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
