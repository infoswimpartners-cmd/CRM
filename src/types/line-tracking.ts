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
    tag_category: 'behavior' | 'status' | 'campaign' | 'automation' | 'audience' | 'custom';
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
    step?: 'view' | 'confirm' | 'abandon'; // フォーム内の進行ステップ（閲覧・確認画面・離脱）
    referrerName?: string | null;
    pageUrl?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any>;
}

/**
 * LINE友だち追加後の行動・アクティビティ監視 型定義
 */
export type LineActivityType =
    | 'follow'            // 友だち追加
    | 'unfollow'          // ブロック（友だち解除）
    | 'message_text'      // テキストメッセージ送信
    | 'message_sticker'   // スタンプ送信
    | 'message_media'     // 画像・動画・音声・ファイル送信
    | 'postback'          // リッチメニュー・ボタンタップ
    | 'form_view'         // フォーム閲覧 (LIFF)
    | 'form_confirm'      // フォーム確認画面到達 (LIFF)
    | 'form_apply'        // 体験レッスン申込完了 (LIFF)
    | 'form_abandon';     // フォーム離脱

export interface LineUserActivity {
    id: string;
    created_at: string;
    line_user_id: string;
    display_name?: string | null;
    activity_type: LineActivityType;
    activity_title: string;          // 表示用タイトル（例: 「友だち追加」「メッセージ送信」「リッチメニュータップ」）
    activity_detail?: string | null; // 詳細内容（メッセージ本文、スタンプ名、URL、ポストバック値など）
    metadata?: Record<string, any>;
}

export interface ActivityKpiSummary {
    totalActivities: number;
    todayActivities: number;
    followCount: number;
    messageCount: number;
    formViewCount: number;
    postbackCount: number;
}

