/**
 * LINEマーケティング自動化システム 型定義
 * 
 * 対象テーブル:
 *   - line_broadcast_campaigns: セグメント一括配信キャンペーン
 *   - line_step_rules: 体験後ステップ配信シナリオ・カード定義
 *   - line_step_student_progress: 生徒別ステップ配信進行状態
 *   - line_delivery_logs: LINE配信ログ・トラッキング
 */

// ==============================================================================
// 1. データベーステーブルエンティティ型定義
// ==============================================================================

export interface LineBroadcastCampaign {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    message_text: string;
    message_template?: string;
    filter_conditions: SegmentFilterConditions;
    target_count: number;
    sent_count: number;
    success_count?: number;
    failed_count: number;
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';
    scheduled_at: string | null;
    executed_at: string | null;
    sent_at?: string | null;
    created_by: string | null;
    notes: string | null;
}

export interface LineStepRule {
    id: string;
    created_at: string;
    updated_at: string;
    step_order: number;
    title: string;
    delay_days: number;
    send_time: string; // "19:00" (HH:mm)
    message_text: string;
    is_active: boolean;
    created_by: string | null;
}

export interface LineStepStudentProgress {
    id: string;
    created_at: string;
    updated_at: string;
    student_id: string;
    line_user_id?: string | null;
    trial_completed_at?: string | null;
    current_step_order: number;
    status: 'in_progress' | 'sending' | 'completed' | 'skipped' | 'stopped';
    trigger_date: string; // YYYY-MM-DD
    last_sent_at: string | null;
    next_scheduled_at: string | null;
    stop_reason?: string | null;
    skip_reason?: string | null;
}

export interface SyncTrialDoneResult {
    totalEligibleCount: number;     // status=trial_done かつ LINE連携済みの総生徒数
    newlyEnrolledCount: number;     // 今回新規にエンロールされた生徒数
    alreadyEnrolledCount: number;   // 既に登録済みだった生徒数
    enrolledStudentIds: string[];   // 新規エンロールされた生徒IDリスト
    errors?: string[];
}

export interface LineDeliveryLog {
    id: string;
    created_at: string;
    delivery_type: 'broadcast' | 'step_message' | 'test_preview';
    campaign_id: string | null;
    step_id: string | null;
    step_name: string | null;
    student_id: string | null;
    student_number: string | null;
    student_name: string | null;
    line_user_id: string;
    message_body: string;
    rendered_message?: string;
    status: 'sent' | 'success' | 'failed' | 'skipped';
    error_message: string | null;
    response_status_code?: number | null;
    line_request_id?: string | null;
    is_test_preview: boolean;
    sent_at: string;
}

// ==============================================================================
// 2. コアサービス層（LineMarketingService）インターフェース
// ==============================================================================

export interface SendMessageOptions {
    studentId?: string;
    studentNumber?: string;
    studentName?: string;
    lineUserId: string;
    rawMessage: string;
    variables?: Record<string, string | null | undefined>;
    deliveryType: 'broadcast' | 'step_message' | 'test_preview';
    campaignId?: string;
    stepId?: string;
    stepName?: string;
    isTestPreview?: boolean;
}

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
    statusCode?: number;
    lineRequestId?: string;
}

// ==============================================================================
// 3. セグメント抽出・フィルタリング型定義
// ==============================================================================

export interface SegmentFilterConditions {
    statuses?: string[];       // ['applied', 'trial_done', 'active', 'withdrawn', etc.]
    areas?: string[];          // ['東京都', '神奈川県', '千葉県', '港区', etc.]
    coachIds?: string[];       // profile UUIDs
    coach_ids?: string[];      // 互換エイリアス
    membershipTypeIds?: string[]; // membership_type UUIDs
    membership_type_ids?: string[]; // 互換エイリアス
    lineLinkedOnly?: boolean;  // LINE連携者のみ (default: true)
    line_linked_only?: boolean; // 互換エイリアス
    searchQuery?: string;      // 氏名・カナ・会員番号キーワード
    search_query?: string;     // 互換エイリアス
    includeTags?: string[];    // 含むべきタグ (例: ['trial_form_viewed'])
    excludeTags?: string[];    // 除外すべきタグ (例: ['trial_applied'])
    viewedFormNotApplied?: boolean; // フォーム閲覧済かつ申込未完了（離脱者抽出フラグ）
}

export interface FilterPreviewStudent {
    id: string;
    studentNumber: string;
    fullName: string;
    fullNameKana: string | null;
    status: string;
    statusLabel: string;
    area: string;
    coachId: string | null;
    coachName: string | null;
    membershipTypeId: string | null;
    planName: string | null;
    hasLine: boolean;
    lineUserId: string | null;
    trialDate: string | null;
    tags?: string[];
}

export interface FilterPreviewResult {
    success: boolean;
    totalCount: number;
    lineEligibleCount: number;
    students: FilterPreviewStudent[];
    error?: string;
}

// ==============================================================================
// 4. Server Actions パラメータ・戻り値型定義
// ==============================================================================

export interface StepRuleItem {
    id: string;
    stepOrder: number;
    title: string;
    delayDays: number;
    sendTime: string; // "19:00"
    messageText: string;
    isActive: boolean;
    targetTag?: string; // 対象タグ (例: 'trial_done', 'trial_form_viewed', 'friend_only', 'referral_lead')
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateBroadcastParams {
    title: string;
    messageTemplate: string;
    filterConditions: SegmentFilterConditions;
    scheduledAt?: string | null; // ISO文字列。nullなら即時送信
    excludedStudentIds?: string[];
}

export interface GetDeliveryLogsParams {
    page?: number;
    pageSize?: number;
    deliveryType?: 'broadcast' | 'step_message' | 'test_preview' | 'all';
    status?: 'success' | 'sent' | 'failed' | 'skipped' | 'all';
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
}

export interface DeliveryLogsResult {
    success: boolean;
    logs: LineDeliveryLog[];
    totalCount: number;
    stats: {
        totalSent: number;
        successCount: number;
        failedCount: number;
        skippedCount: number;
    };
    error?: string;
}

export interface LineMarketingKpiSummary {
    totalSent: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    successRate: number; // 例: 98.5
    inProgressStudentsCount: number;
}

