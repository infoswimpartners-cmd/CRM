/**
 * LINE / LIFF アクセストラッキングおよびタグ管理システム 型定義
 */

export interface LineAccessLog {
    id: string;
    created_at: string;
    line_user_id: string | null;
    display_name?: string | null;
    form_type: string;            // 'trial' (体験申込), 'enroll' (入会), 'custom', etc.
    referrer_name?: string | null; // ご紹介者様名
    page_url?: string | null;     // アクセス元URL
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    user_agent?: string | null;
    ip_address?: string | null;
    is_converted: boolean;        // 申込完了したか
    converted_at?: string | null; // 申込完了日時
    student_id?: string | null;   // 申込後の生徒ID
    metadata?: Record<string, any>;
}

export interface LineUserTag {
    id: string;
    created_at: string;
    line_user_id: string;
    tag_name: string;             // 例: 'trial_form_viewed', 'trial_applied', 'friend_only', 'referral', 'campaign_2026'
    tag_category: 'behavior' | 'status' | 'campaign' | 'custom';
    display_name?: string | null;
    student_id?: string | null;
    metadata?: Record<string, any>;
}

export interface TrackingKpiSummary {
    totalViews: number;           // 総アクセス数 (PV)
    uniqueUsers: number;          // ユニーク訪問者数 (UU)
    totalConverted: number;       // 申込完了数 (CV)
    conversionRate: number;       // 転換率 (CVR %)
    recentLogs: LineAccessLog[];  // 直近アクセスログ
}

export interface TagSummaryItem {
    tagName: string;
    tagLabel: string;
    tagCategory: string;
    userCount: number;
    description: string;
}

export interface RecordAccessParams {
    lineUserId?: string | null;
    displayName?: string | null;
    formType: string;
    referrerName?: string | null;
    pageUrl?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any>;
}
