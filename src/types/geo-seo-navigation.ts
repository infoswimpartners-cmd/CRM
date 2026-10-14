import type { LucideIcon } from 'lucide-react';

/**
 * 4大目的別グループ (Tier 1)
 */
export type GeoSeoNavGroup = 'traffic' | 'diagnostics' | 'ai_cockpit' | 'settings';

/**
 * サブタブ一覧 (Tier 2, 計12タブ)
 */
export type GeoSeoNavTab =
    // 📊 流入・広告分析 (traffic)
    | 'google_ads'
    | 'ga4_gsc'
    | 'conversion'
    // ⚔️ 競合・SEO診断 (diagnostics)
    | 'seo_rank'
    | 'competitors'
    | 'geo_ai'
    | 'citation_gap'
    // 🤖 AI施策コックピット (ai_cockpit)
    | 'ai_hub'
    | 'rank_sniper'
    | 'content_studio'
    // ⚙️ 設定 (settings)
    | 'settings_master'
    | 'api_status';

/**
 * 過去の9タブ識別子（旧パラメータ後方互換用）
 */
export type OldGeoSeoTab =
    | 'seo'
    | 'google_ads'
    | 'competitors'
    | 'articles'
    | 'conversion'
    | 'geo'
    | 'citation_gap'
    | 'analytics'
    | 'settings';

/**
 * ナビゲーション解決後の状態
 */
export interface GeoSeoNavState {
    group: GeoSeoNavGroup;
    tab: GeoSeoNavTab;
}

/**
 * バッジのスタイル種別
 */
export type NavBadgeType = 'default' | 'success' | 'indigo' | 'pulse';

/**
 * Tier 2 サブタブアイテム定義
 */
export interface NavTabItem {
    id: GeoSeoNavTab;
    label: string;
    shortLabel: string; // モバイル用省略表記（幅375px対策）
    icon: LucideIcon;
    badge?: string;
    badgeType?: NavBadgeType;
    description?: string;
}

/**
 * Tier 1 グループアイテム定義
 */
export interface NavGroupItem {
    id: GeoSeoNavGroup;
    label: string;
    emoji: string;
    icon: LucideIcon;
    description: string;
    defaultTab: GeoSeoNavTab;
    tabs: NavTabItem[];
}
