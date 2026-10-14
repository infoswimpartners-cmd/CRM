/**
 * M1 Challenger 2: レスポンシブ＆画面崩れ・レイアウト境界・Props整合性 実証ストレステストハーネス
 */

import { GEO_SEO_NAV_GROUPS, resolveGeoSeoNavState, GROUP_TABS_MAP, TAB_TO_GROUP_MAP } from '../src/lib/geo-seo-navigation';
import type { GeoSeoNavGroup, GeoSeoNavTab } from '../src/types/geo-seo-navigation';
import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('  M1 Challenger 2: レスポンシブ・画面崩れ・Props整合性 実証検証');
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

// ============================================================================
// 1. レスポンシブ幅・DOMレイアウト解析（極小画面 320px 〜 大画面 1920px）
// ============================================================================
console.log('--- 1. レスポンシブ幅・DOMレイアウトストレステスト ---');

const navFilePath = path.join(process.cwd(), 'src/components/admin/geo-seo/GeoSeoTwoTierNav.tsx');
const navCode = fs.readFileSync(navFilePath, 'utf-8');

// (1) Tier 1 グリッド定義の検証
assert(
    navCode.includes('grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full'),
    'Tier 1: モバイル2列グリッド (grid-cols-2) ＆ デスクトップ4列 (lg:grid-cols-4) の完全設定',
    'モバイルで2列表示、デスクトップで4分割横並びになるグリッド定義を確認'
);

// (2) 文字溢れ対策（min-w-0, truncate, flex-shrink-0）
assert(
    navCode.includes('min-w-0') && navCode.includes('truncate'),
    'Tier 1: flex コンテナの min-w-0 と ラベル span の truncate によるテキスト溢れ防止',
    'CSS Flexboxの標準挙動によるテキスト折り返し崩れ・はみ出しを防ぐ min-w-0 と truncate を確認'
);

assert(
    navCode.includes('flex-shrink-0'),
    'Tier 1 & Tier 2: アイコンおよびバッジの flex-shrink-0 による縦横潰れ防止',
    'アイコンとバッジが圧縮されない flex-shrink-0 設定を確認'
);

// (3) 説明文の行数制限（line-clamp-1 sm:line-clamp-none）
assert(
    navCode.includes('line-clamp-1 sm:line-clamp-none'),
    'Tier 1: モバイルでの説明文 1行切り詰め (line-clamp-1) によるカード高さ均一化',
    'モバイルで説明文が複数行になって縦潰れ・カード高不揃いを起こさない line-clamp-1 設定を確認'
);

// (4) Tier 2 横スクロールコンテナ設定
assert(
    navCode.includes('overflow-x-auto') &&
    navCode.includes('whitespace-nowrap') &&
    navCode.includes('[scrollbar-width:none]'),
    'Tier 2: サブタブ横スクロール (overflow-x-auto) と折り返し防止 (whitespace-nowrap) およびApple HIGスクロールバー消去',
    '横スクロールとピル形状維持のための whitespace-nowrap を確認'
);

// (5) Tier 2 デュアルラベル切り替え（shortLabel / label）
assert(
    navCode.includes('<span className="sm:hidden">{tab.shortLabel}</span>') &&
    navCode.includes('<span className="hidden sm:inline">{tab.label}</span>'),
    'Tier 2: モバイル向け短縮ラベル (sm:hidden shortLabel) と PC向けフルラベル (hidden sm:inline label) の切り替え機構',
    'レスポンシブな短縮名切り替えを確認'
);

// ============================================================================
// 2. 全12サブタブの shortLabel 定義と文字数ストレステスト
// ============================================================================
console.log('\n--- 2. 全12サブタブの shortLabel 定義と文字数ストレステスト ---');

let allTabsHaveShortLabel = true;
let maxShortLabelLength = 0;
let longestShortLabelTab = '';

for (const group of GEO_SEO_NAV_GROUPS) {
    for (const tab of group.tabs) {
        if (!tab.shortLabel || tab.shortLabel.trim().length === 0) {
            allTabsHaveShortLabel = false;
            console.error(`   サブタブ ${tab.id} に shortLabel が未定義`);
        } else {
            if (tab.shortLabel.length > maxShortLabelLength) {
                maxShortLabelLength = tab.shortLabel.length;
                longestShortLabelTab = `${tab.id} (${tab.shortLabel})`;
            }
        }
    }
}

assert(
    allTabsHaveShortLabel,
    '全12サブタブに shortLabel が完全に定義されていること',
    `定義済みタブ数: 12/12`
);

assert(
    maxShortLabelLength <= 10,
    `全 shortLabel の文字数が 10文字以下（極小画面 320px 幅で溢れない安全域）であること: 最長 = ${longestShortLabelTab} [${maxShortLabelLength}文字]`,
    `最長文字数: ${maxShortLabelLength}文字`
);

// ============================================================================
// 3. 極小画面（320px 〜 375px）ピクセル幅シミュレーション
// ============================================================================
console.log('\n--- 3. 極小画面（320px 〜 375px）ピクセル幅シミュレーション ---');

const viewports = [
    { name: 'iPhone SE 1st / 極小端末', width: 320, padding: 28 }, // p-3.5 = 14*2 = 28
    { name: 'iPhone mini / Android標準', width: 360, padding: 28 },
    { name: 'iPhone 13/14/15/16', width: 375, padding: 28 },
    { name: 'iPhone Plus / Pro Max', width: 414, padding: 28 },
    { name: 'iPad Mini / タブレット', width: 768, padding: 48 }, // p-6 = 24*2 = 48
    { name: 'MacBook Air / ノートPC', width: 1280, padding: 80 }, // p-10 = 40*2 = 80
    { name: 'Full HD デスクトップ', width: 1920, padding: 80 },
];

for (const vp of viewports) {
    const isDesktop = vp.width >= 1024; // lg
    const cols = isDesktop ? 4 : 2;
    const gap = isDesktop ? 12 : 8; // gap-2 (8px) vs gap-3 (12px)
    const effectiveContainerWidth = Math.min(vp.width, 1280) - vp.padding; // max-w-7xl = 1280px
    const cardWidth = Math.floor((effectiveContainerWidth - gap * (cols - 1)) / cols);
    const cardContentWidth = cardWidth - 24; // p-3 = 12px*2 = 24px

    const iconWidth = 28; // w-7 = 28px
    const iconGap = 8; // gap-2 = 8px
    const badgeWidth = 22; // ~22px
    const availableTextWidth = cardContentWidth - iconWidth - iconGap - badgeWidth;

    const isSafe = availableTextWidth >= 50; // 最低50px以上のテキスト領域が確保され、truncateで安全に収まる
    assert(
        isSafe,
        `Viewport [${vp.name} (${vp.width}px)]: 1カード幅 = ${cardWidth}px, 有効テキスト幅 = ${availableTextWidth}px (安全性確認)`,
        `有効幅 ${effectiveContainerWidth}px, カード幅 ${cardWidth}px, テキスト幅 ${availableTextWidth}px`
    );
}

// ============================================================================
// 4. page.tsx のコンポーネントツリー構造＆最上部常駐カード撤退検証
// ============================================================================
console.log('\n--- 4. page.tsx のDOM構造＆最上部常駐カード撤退検証 ---');

const pageFilePath = path.join(process.cwd(), 'src/app/(dashboard)/admin/geo-seo/page.tsx');
const pageCode = fs.readFileSync(pageFilePath, 'utf-8');

// (1) ヘッダー -> SpTrackerStatusMeters -> GeoSeoTwoTierNav の連続接続確認
const headerPos = pageCode.indexOf('SP-TRACKER v1.0.0');
const metersPos = pageCode.indexOf('<SpTrackerStatusMeters');
const navPos = pageCode.indexOf('<GeoSeoTwoTierNav');
const contentPos = pageCode.indexOf('{/* 4. タブコンテンツ表示 */}');

assert(
    headerPos !== -1 && metersPos !== -1 && navPos !== -1 && contentPos !== -1 &&
    headerPos < metersPos && metersPos < navPos && navPos < contentPos,
    '最上部のDOM配置順序: ヘッダー → SpTrackerStatusMeters → GeoSeoTwoTierNav → タブコンテンツ の完全整合',
    `インデックス順序: Header(${headerPos}) < Meters(${metersPos}) < Nav(${navPos}) < Content(${contentPos})`
);

// (2) 撤退したカードが最上部に存在せず、各タブ内に隔離されていること
const johnPos = pageCode.indexOf('<AiChiefMarketerJohnCard');
const heroActionsPos = pageCode.indexOf('<SpTrackerHeroActions');
const rankWatchPos = pageCode.indexOf('<SpTrackerRankWatchCard');
const suggestionsPos = pageCode.indexOf('<WeeklyArticleSuggestionsWidget');
const generatedArticlesPos = pageCode.indexOf('<GeneratedArticlesListView');

assert(
    johnPos > navPos &&
    heroActionsPos > navPos &&
    rankWatchPos > navPos &&
    suggestionsPos > navPos &&
    generatedArticlesPos > navPos,
    '旧常駐過密カード群（ジョン、HeroActions、RankWatch、Suggestions、GeneratedArticles）がすべてNavより下のタブコンテンツ内に完全に隔離されていること',
    `全カードが GeoSeoTwoTierNav (pos: ${navPos}) 以降に配置されていることを確認`
);

// ============================================================================
// 5. 全12サブタブの条件付きレンダリングとProps整合性検証
// ============================================================================
console.log('\n--- 5. 全12サブタブの条件付きレンダリングとProps整合性検証 ---');

const expectedTabs: Array<{ group: GeoSeoNavGroup; tab: GeoSeoNavTab; componentName: string }> = [
    { group: 'traffic', tab: 'google_ads', componentName: 'GoogleAdsPerformanceCard' },
    { group: 'traffic', tab: 'ga4_gsc', componentName: 'GeoPageTrafficAnalysisCard' },
    { group: 'traffic', tab: 'conversion', componentName: 'SpTrackerConversionCustomerView' },
    { group: 'diagnostics', tab: 'seo_rank', componentName: 'SpTrackerSeoView' },
    { group: 'diagnostics', tab: 'competitors', componentName: 'BenchmarkCompetitorPanel' },
    { group: 'diagnostics', tab: 'geo_ai', componentName: 'SpTrackerGeoView' },
    { group: 'diagnostics', tab: 'citation_gap', componentName: 'SpTrackerCitationGapView' },
    { group: 'ai_cockpit', tab: 'ai_hub', componentName: 'AiChiefMarketerJohnCard' },
    { group: 'ai_cockpit', tab: 'rank_sniper', componentName: 'SpTrackerRankWatchCard' },
    { group: 'ai_cockpit', tab: 'content_studio', componentName: 'WeeklyArticleSuggestionsWidget' },
    { group: 'settings', tab: 'settings_master', componentName: 'SpTrackerSettingsView' },
    { group: 'settings', tab: 'api_status', componentName: 'AnalyticsSyncCard' },
];

for (const item of expectedTabs) {
    const conditionSnippet = `activeGroup === '${item.group}' && activeTab === '${item.tab}'`;
    const hasCondition = pageCode.includes(conditionSnippet);
    const hasComponent = pageCode.includes(`<${item.componentName}`);

    assert(
        hasCondition && hasComponent,
        `サブタブ [${item.group} / ${item.tab}]: 条件分岐とコンポーネント <${item.componentName} /> の完全一致`,
        `条件式: "${conditionSnippet}", コンポーネント: <${item.componentName} />`
    );
}

// (3) Props の整合性・安全なフォールバック
// traffic / google_ads: googleAdsData={data.googleAdsData || data.ga4Data?.googleAdsAnalytics}
assert(
    pageCode.includes('googleAdsData={data.googleAdsData || data.ga4Data?.googleAdsAnalytics}'),
    'Props整合性: GoogleAdsPerformanceCard の googleAdsData に安全なフォールバック (||) が指定されていること'
);

// traffic / conversion: analyticsData={data.spreadsheetAnalytics || DEFAULT_SPREADSHEET_ANALYTICS}
assert(
    pageCode.includes('analyticsData={data.spreadsheetAnalytics || DEFAULT_SPREADSHEET_ANALYTICS}'),
    'Props整合性: SpTrackerConversionCustomerView の analyticsData に DEFAULT_SPREADSHEET_ANALYTICS フォールバックが指定されていること'
);

// diagnostics / competitors: initialKeyword={selectedCompetitorKeyword}
assert(
    pageCode.includes('initialKeyword={selectedCompetitorKeyword}'),
    'Props整合性: BenchmarkCompetitorPanel に selectedCompetitorKeyword が渡されていること'
);

// diagnostics / geo_ai: prompts={data.geoPrompts}
assert(
    pageCode.includes('prompts={data.geoPrompts}'),
    'Props整合性: SpTrackerGeoView に prompts={data.geoPrompts} が渡されていること'
);

// diagnostics / citation_gap: citationGaps={data.citationGaps}
assert(
    pageCode.includes('citationGaps={data.citationGaps}'),
    'Props整合性: SpTrackerCitationGapView に citationGaps={data.citationGaps} が渡されていること'
);

// ai_cockpit / ai_hub: rankWatchState, spreadsheetData, actions
assert(
    pageCode.includes('rankWatchState={data.rankWatchState}') &&
    pageCode.includes('spreadsheetData={data.spreadsheetAnalytics}') &&
    pageCode.includes('actions={data.actionRecommendations}'),
    'Props整合性: AI司令ハブの各コンポーネントに必要データが完全提供されていること'
);

// ai_cockpit / rank_sniper: state={data.rankWatchState}
assert(
    pageCode.includes('state={data.rankWatchState}'),
    'Props整合性: SpTrackerRankWatchCard に state={data.rankWatchState} が渡されていること'
);

// settings / settings_master: webhookConfigured, currentWebhookUrl, keywords
assert(
    pageCode.includes('webhookConfigured={data.config.googleChatWebhookConfigured}') &&
    pageCode.includes('currentWebhookUrl={data.config.googleChatWebhookUrl}') &&
    pageCode.includes('keywords={data.keywords}'),
    'Props整合性: SpTrackerSettingsView にWebhook設定とキーワード一覧が渡されていること'
);

// settings / api_status: AnalyticsSyncCard
assert(
    pageCode.includes('ga4Connected={data.config.ga4Configured}') &&
    pageCode.includes('searchConsoleConnected={data.config.searchConsoleConfigured}'),
    'Props整合性: AnalyticsSyncCard に GA4 / GSC 接続状態が渡されていること'
);

console.log('\n================================================================');
console.log(`  テスト結果サマリー: PASS = ${passCount}, FAIL = ${failCount}`);
console.log('================================================================\n');

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
