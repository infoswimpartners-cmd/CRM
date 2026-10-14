import {
    BarChart3,
    Search,
    Cpu,
    Settings,
    Target,
    Activity,
    Users,
    Compass,
    Swords,
    Bot,
    ExternalLink,
    Sparkles,
    Crosshair,
    PenTool,
    SlidersHorizontal,
    CheckCircle2,
} from 'lucide-react';
import type {
    GeoSeoNavGroup,
    GeoSeoNavTab,
    OldGeoSeoTab,
    GeoSeoNavState,
    NavGroupItem,
} from '@/types/geo-seo-navigation';

/**
 * 2層ナビゲーションのマスター定義（4大グループ ✕ 12サブタブ）
 */
export const GEO_SEO_NAV_GROUPS: NavGroupItem[] = [
    {
        id: 'traffic',
        label: '流入・広告分析',
        emoji: '📊',
        icon: BarChart3,
        description: 'Google広告・GA4・成約データ',
        defaultTab: 'google_ads',
        tabs: [
            {
                id: 'google_ads',
                label: 'Google広告パフォーマンス',
                shortLabel: 'Google広告',
                icon: Target,
                description: 'CPA・広告費・CVキーワード',
            },
            {
                id: 'ga4_gsc',
                label: 'GA4 / GSC 統合アクセス解析',
                shortLabel: 'GA4・アクセス',
                icon: Activity,
                description: '商圏PV・検索パフォーマンス',
            },
            {
                id: 'conversion',
                label: 'CV・顧客成約分析',
                shortLabel: 'CV・顧客分析',
                icon: Users,
                description: 'スプレッドシート連携・成約経路',
            },
        ],
    },
    {
        id: 'diagnostics',
        label: '競合・SEO診断',
        emoji: '⚔️',
        icon: Search,
        description: '順位監視・3社比較・GEO',
        defaultTab: 'seo_rank',
        tabs: [
            {
                id: 'seo_rank',
                label: 'SEO順位推移 ＆ 商圏診断',
                shortLabel: 'SEO推移・順位',
                icon: Compass,
                description: '主要KW順位・エリア別スコア',
            },
            {
                id: 'competitors',
                label: '競合3社ベンチマーク監視',
                shortLabel: '競合3社分析',
                icon: Swords,
                badge: '3社監視',
                badgeType: 'indigo',
                description: 'Swimmy / ベースプラス / スイサポ比較',
            },
            {
                id: 'geo_ai',
                label: 'GEO / AI検索回答診断',
                shortLabel: 'GEO・AI回答',
                icon: Bot,
                description: 'Perplexity・Gemini言及状況',
            },
            {
                id: 'citation_gap',
                label: '被リンク・引用元ギャップ',
                shortLabel: '引用ギャップ',
                icon: ExternalLink,
                badge: 'GAP',
                badgeType: 'default',
                description: '他社掲載メディアの未獲得リスト',
            },
        ],
    },
    {
        id: 'ai_cockpit',
        label: 'AI施策コックピット',
        emoji: '🤖',
        icon: Cpu,
        description: 'CMOジョン・即時実行・内製化',
        defaultTab: 'ai_hub',
        tabs: [
            {
                id: 'ai_hub',
                label: 'AI司令ハブ（CMOジョン＆スプリント）',
                shortLabel: 'AI司令ハブ',
                icon: Sparkles,
                badge: 'LIVE',
                badgeType: 'pulse',
                description: '週次重点方針・ワンクリック改善施策',
            },
            {
                id: 'rank_sniper',
                label: 'SEO 1位狙撃スナイパー',
                shortLabel: '1位狙撃',
                icon: Crosshair,
                description: '7日間検証サイクル・集中投下施策',
            },
            {
                id: 'content_studio',
                label: 'コンテンツ内製化スタジオ',
                shortLabel: '記事内製化',
                icon: PenTool,
                badge: '週次提案',
                badgeType: 'indigo',
                description: 'AIO/SEO記事自動生成・公開管理',
            },
        ],
    },
    {
        id: 'settings',
        label: 'システム設定',
        emoji: '⚙️',
        icon: Settings,
        description: 'KW・Webhook・連携状況',
        defaultTab: 'settings_master',
        tabs: [
            {
                id: 'settings_master',
                label: '基本設定 ＆ 監視KW管理',
                shortLabel: 'KW・基本設定',
                icon: SlidersHorizontal,
                description: 'ターゲットKW・プロンプト・通知先',
            },
            {
                id: 'api_status',
                label: 'API・外部サービス連携ステータス',
                shortLabel: 'API連携状態',
                icon: CheckCircle2,
                badge: '稼働中',
                badgeType: 'success',
                description: 'GSC・GA4・Google Ads疎通検証',
            },
        ],
    },
];

/**
 * 各グループに所属するサブタブ一覧の定義
 */
export const GROUP_TABS_MAP: Record<GeoSeoNavGroup, readonly GeoSeoNavTab[]> = {
    traffic: ['google_ads', 'ga4_gsc', 'conversion'],
    diagnostics: ['seo_rank', 'competitors', 'geo_ai', 'citation_gap'],
    ai_cockpit: ['ai_hub', 'rank_sniper', 'content_studio'],
    settings: ['settings_master', 'api_status'],
} as const;

/**
 * 各サブタブから親グループへの逆引きマップ
 */
export const TAB_TO_GROUP_MAP: Record<GeoSeoNavTab, GeoSeoNavGroup> = {
    google_ads: 'traffic',
    ga4_gsc: 'traffic',
    conversion: 'traffic',
    seo_rank: 'diagnostics',
    competitors: 'diagnostics',
    geo_ai: 'diagnostics',
    citation_gap: 'diagnostics',
    ai_hub: 'ai_cockpit',
    rank_sniper: 'ai_cockpit',
    content_studio: 'ai_cockpit',
    settings_master: 'settings',
    api_status: 'settings',
};

/**
 * 各グループの初期デフォルトタブ
 */
export const GROUP_DEFAULT_TAB_MAP: Record<GeoSeoNavGroup, GeoSeoNavTab> = {
    traffic: 'google_ads',
    diagnostics: 'seo_rank',
    ai_cockpit: 'ai_hub',
    settings: 'settings_master',
};

/**
 * 全体の初期デフォルト設定
 */
export const DEFAULT_GROUP: GeoSeoNavGroup = 'traffic';
export const DEFAULT_TAB: GeoSeoNavTab = 'google_ads';

/**
 * 過去の9個の旧タブから新グループ・新タブへの後方互換マッピング表
 */
export const OLD_TAB_MAPPING: Record<OldGeoSeoTab, { group: GeoSeoNavGroup; tab: GeoSeoNavTab }> = {
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

/**
 * サブタブIDから親グループIDを取得するヘルパー関数
 */
export function getParentGroupForTab(tabId: GeoSeoNavTab): GeoSeoNavGroup {
    if (tabId && Object.hasOwn(TAB_TO_GROUP_MAP, tabId)) {
        return TAB_TO_GROUP_MAP[tabId];
    }
    return DEFAULT_GROUP;
}

/**
 * URLクエリパラメータから安全に (group, tab) を導出・解決する純粋関数
 * 
 * 優先解決フロー:
 * 1. 旧タブパラメータの検知 -> 即座に対応する新 (group, tab) へ解決
 * 2. 新タブパラメータの検知 -> 逆引きマップから正しい親 group を特定（groupとtabの矛盾も自動調停）
 * 3. groupParam のみ有効な場合 -> そのグループのデフォルトタブを補完
 * 4. クエリなし・全無効な場合 -> DEFAULT_GROUP / DEFAULT_TAB にフォールバック
 */
export function resolveGeoSeoNavState(
    groupParam: string | null | undefined,
    tabParam: string | null | undefined
): GeoSeoNavState {
    // 1. 旧パラメータの後方互換解決（安全な所有プロパティ検査）
    if (tabParam && Object.hasOwn(OLD_TAB_MAPPING, tabParam)) {
        return OLD_TAB_MAPPING[tabParam as OldGeoSeoTab];
    }

    // 2. 新タブパラメータの解決（親グループを逆引き特定）
    if (tabParam && Object.hasOwn(TAB_TO_GROUP_MAP, tabParam)) {
        const validTab = tabParam as GeoSeoNavTab;
        return {
            group: TAB_TO_GROUP_MAP[validTab],
            tab: validTab,
        };
    }

    // 3. groupParam のみ有効な場合
    if (groupParam && Object.hasOwn(GROUP_TABS_MAP, groupParam)) {
        const validGroup = groupParam as GeoSeoNavGroup;
        return {
            group: validGroup,
            tab: GROUP_DEFAULT_TAB_MAP[validGroup],
        };
    }

    // 4. デフォルトフォールバック
    return {
        group: DEFAULT_GROUP,
        tab: DEFAULT_TAB,
    };
}
