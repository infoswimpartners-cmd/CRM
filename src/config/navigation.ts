import {
    LayoutDashboard,
    Calendar,
    ClipboardCheck,
    Users,
    UserPlus,
    UserCheck,
    FileCheck,
    CreditCard,
    MessageSquare,
    MessageCircle,
    Settings,
    BookOpen,
    DollarSign,
    History,
    PlusCircle,
    Receipt,
    Sparkles,
    type LucideIcon,
} from 'lucide-react'

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    badge?: string
    exact?: boolean
    description?: string
}

export interface NavSection {
    domain: string
    title: string
    items: NavItem[]
}

export interface NavigationConfig {
    admin: {
        mainNav: NavSection[]
        footerNav: NavItem[]
    }
    coach: {
        mainNav: NavSection[]
        footerNav: NavItem[]
    }
}

/**
 * アプリケーション全体のナビゲーション単一情報源 (Single Source of Truth)
 * 管理者向け: 5大ドメイン（計10項目）＋ フッター固定設定（2項目）
 * コーチ向け: 業務ドメイン（計7項目）＋ フッター固定設定（2項目）
 */
export const navigationConfig: NavigationConfig = {
    admin: {
        mainNav: [
            {
                domain: 'dashboard',
                title: 'ダッシュボード',
                items: [
                    {
                        title: 'ダッシュボード',
                        href: '/admin',
                        icon: LayoutDashboard,
                        exact: true,
                        description: '全体KPI・アラート・最新状況',
                    },
                ],
            },
            {
                domain: 'lessons',
                title: 'レッスン・運営',
                items: [
                    {
                        title: '全体スケジュール',
                        href: '/admin/schedule',
                        icon: Calendar,
                        exact: true,
                        description: '全コーチのレッスン予定',
                    },
                    {
                        title: 'レッスン報告・記録',
                        href: '/admin/reports',
                        icon: ClipboardCheck,
                        description: 'レッスン報告閲覧・代理起票',
                    },
                ],
            },
            {
                domain: 'customers',
                title: '顧客・コーチ',
                items: [
                    {
                        title: '会員管理',
                        href: '/customers',
                        icon: Users,
                        description: '生徒カルテ・登録情報一覧',
                    },
                    {
                        title: '体験申込リード',
                        href: '/admin/leads',
                        icon: UserPlus,
                        description: '体験レッスン申込・アサイン',
                    },
                    {
                        title: 'コーチ管理',
                        href: '/admin/coaches',
                        icon: UserCheck,
                        description: 'コーチ一覧・報酬率・権限',
                    },
                ],
            },
            {
                domain: 'finance',
                title: '請求・財務',
                items: [
                    {
                        title: '請求・決済履歴',
                        href: '/admin/approvals',
                        icon: Receipt,
                        description: 'Stripe請求履歴・プラン変更管理',
                    },
                    {
                        title: '報酬・財務分析',
                        href: '/admin/finance/payouts',
                        icon: CreditCard,
                        description: '支払通知書・振込管理・売上分析',
                    },
                ],
            },
            {
                domain: 'marketing',
                title: 'マーケティング・SEO',
                items: [
                    {
                        title: 'LINEマーケティング',
                        href: '/admin/line-marketing',
                        icon: MessageSquare,
                        description: 'セグメント一括配信・ステップ配信',
                    },
                    {
                        title: 'LINE管理・個別調整',
                        href: '/admin/line-monitoring',
                        icon: MessageCircle,
                        description: 'LINEチャット履歴・日程調整検知',
                    },
                    {
                        title: 'SP-Tracker（SEO・GEO）',
                        href: '/admin/geo-seo',
                        icon: Sparkles,
                        description: 'Googleマップ・検索順位トラッキング',
                    },
                ],
            },
        ],
        footerNav: [
            {
                title: 'システム設定',
                href: '/admin/settings',
                icon: Settings,
                description: 'マスタ・Webhook・お知らせ・全体設定',
            },
            {
                title: '管理者マニュアル',
                href: '/admin/manual',
                icon: BookOpen,
                description: '運用マニュアル・社内規定',
            },
        ],
    },
    coach: {
        mainNav: [
            {
                domain: 'dashboard',
                title: 'ダッシュボード',
                items: [
                    {
                        title: 'ダッシュボード',
                        href: '/coach',
                        icon: LayoutDashboard,
                        exact: true,
                    },
                ],
            },
            {
                domain: 'operations',
                title: '運営管理',
                items: [
                    {
                        title: '生徒管理',
                        href: '/students',
                        icon: Users,
                    },
                    {
                        title: '案件紹介一覧',
                        href: '/coach/leads',
                        icon: UserPlus,
                    },
                ],
            },
            {
                domain: 'practice',
                title: '実務メニュー',
                items: [
                    {
                        title: 'スケジュール管理',
                        href: '/coach/schedule',
                        icon: Calendar,
                        exact: true,
                    },
                    {
                        title: 'レッスン報告',
                        href: '/coach/report',
                        icon: PlusCircle,
                    },
                    {
                        title: 'レッスン履歴',
                        href: '/coach/history',
                        icon: History,
                    },
                ],
            },
            {
                domain: 'finance',
                title: '財務',
                items: [
                    {
                        title: '支払通知書一覧',
                        href: '/finance',
                        icon: DollarSign,
                    },
                ],
            },
        ],
        footerNav: [
            {
                title: 'アカウント設定',
                href: '/settings',
                icon: Settings,
            },
            {
                title: 'コーチマニュアル',
                href: '/coach/manual',
                icon: BookOpen,
            },
        ],
    },
}
