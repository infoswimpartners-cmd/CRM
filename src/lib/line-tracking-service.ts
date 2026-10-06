/**
 * LINE / LIFF アクセストラッキングおよびタグ管理サービス層
 * 
 * 責務:
 *   1. LIFFアクセス・クリックログの安全な記録（DBテーブル＋app_configsフォールバック）
 *   2. フォーム閲覧時（trial_form_viewed）および申込完了時（trial_applied）のタグ自動付与
 *   3. ログの集計（総アクセス数、ユニーク数、申込完了数、CVR）
 *   4. タグに基づくユーザー・生徒のセグメント抽出判定
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
    LineAccessLog,
    LineUserTag,
    TrackingKpiSummary,
    TagSummaryItem,
    RecordAccessParams
} from '@/types/line-tracking';

// 定数: デフォルト標準タグ
export const STANDARD_TAGS = {
    FORM_VIEWED: 'trial_form_viewed',      // 体験申込フォーム閲覧
    FORM_APPLIED: 'trial_applied',         // 体験申込完了
    FRIEND_ONLY: 'friend_only',            // 友だち追加のみ
    REFERRAL: 'referral_lead',             // お友達紹介キャンペーン経由
} as const;

export const TAG_LABELS: Record<string, { label: string; category: string; description: string }> = {
    [STANDARD_TAGS.FORM_VIEWED]: {
        label: '体験フォーム閲覧',
        category: 'behavior',
        description: 'リッチメニュー等から体験予約フォーム（LIFF）を開いたユーザー'
    },
    [STANDARD_TAGS.FORM_APPLIED]: {
        label: '体験申込完了',
        category: 'status',
        description: '体験予約フォームから正式にレッスン申込を完了したユーザー'
    },
    [STANDARD_TAGS.REFERRAL]: {
        label: 'お友達紹介経由',
        category: 'campaign',
        description: 'ご紹介者様のお名前を入力して申し込んだ、または紹介導線から訪問したユーザー'
    },
    [STANDARD_TAGS.FRIEND_ONLY]: {
        label: '友だち追加のみ',
        category: 'status',
        description: '公式LINEを追加したがまだ申込をしていないユーザー'
    }
};

// ==============================================================================
// 1. LIFFアクセスログの記録
// ==============================================================================

/**
 * LIFFやWebフォームへのアクセスを記録し、自動タグ付与を実行します
 */
export async function recordAccessLog(params: RecordAccessParams): Promise<LineAccessLog> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const logId = crypto.randomUUID();

    const accessLog: LineAccessLog = {
        id: logId,
        created_at: now,
        line_user_id: params.lineUserId || null,
        display_name: params.displayName || null,
        form_type: params.formType || 'trial',
        referrer_name: params.referrerName || null,
        page_url: params.pageUrl || null,
        utm_source: params.utmSource || null,
        utm_medium: params.utmMedium || null,
        utm_campaign: params.utmCampaign || null,
        user_agent: params.userAgent || null,
        is_converted: false,
        metadata: params.metadata || {}
    };

    // 1. line_access_logs テーブルへの保存試行
    try {
        const { error } = await supabase
            .from('line_access_logs')
            .insert(accessLog);

        if (error) {
            // テーブル未作成エラー等の場合はapp_configsへフォールバック
            await fallbackSaveAccessLog(accessLog);
        }
    } catch {
        await fallbackSaveAccessLog(accessLog);
    }

    // 2. LINE User IDが存在する場合、自動的に閲覧タグを付与
    if (params.lineUserId) {
        try {
            await addTagToUser(params.lineUserId, STANDARD_TAGS.FORM_VIEWED, {
                category: 'behavior',
                displayName: params.displayName || undefined,
                metadata: {
                    first_viewed_at: now,
                    form_type: params.formType,
                    referrer_name: params.referrerName || null
                }
            });

            // 紹介者名がある場合は紹介タグも付与
            if (params.referrerName) {
                await addTagToUser(params.lineUserId, STANDARD_TAGS.REFERRAL, {
                    category: 'campaign',
                    displayName: params.displayName || undefined,
                    metadata: { referrer_name: params.referrerName }
                });
            }
        } catch (tagErr) {
            console.error('[LineTrackingService] Tag assign error on access:', tagErr);
        }
    }

    return accessLog;
}

// ==============================================================================
// 2. 申込完了（コンバージョン）の記録
// ==============================================================================

/**
 * ユーザーの体験申込完了を記録し、アクセスログをCV済に更新し、タグを付与します
 */
export async function markConversionForUser(
    lineUserId: string,
    studentId?: string,
    referrerName?: string
): Promise<boolean> {
    if (!lineUserId) return false;
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 1. 直近のアクセスログを更新
    try {
        const { error } = await supabase
            .from('line_access_logs')
            .update({
                is_converted: true,
                converted_at: now,
                student_id: studentId || null
            })
            .eq('line_user_id', lineUserId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            await fallbackMarkConversion(lineUserId, studentId, now);
        }
    } catch {
        await fallbackMarkConversion(lineUserId, studentId, now);
    }

    // 2. trial_applied タグを付与
    try {
        await addTagToUser(lineUserId, STANDARD_TAGS.FORM_APPLIED, {
            category: 'status',
            studentId,
            metadata: {
                applied_at: now,
                referrer_name: referrerName || null
            }
        });

        if (referrerName) {
            await addTagToUser(lineUserId, STANDARD_TAGS.REFERRAL, {
                category: 'campaign',
                studentId,
                metadata: { referrer_name: referrerName }
            });
        }
    } catch (tagErr) {
        console.error('[LineTrackingService] Failed to assign trial_applied tag:', tagErr);
    }

    return true;
}

// ==============================================================================
// 3. ユーザータグの付与・削除・取得
// ==============================================================================

/**
 * ユーザーへタグを付与（重複時はメタデータをマージ）
 */
export async function addTagToUser(
    lineUserId: string,
    tagName: string,
    options?: {
        category?: 'behavior' | 'status' | 'campaign' | 'custom';
        displayName?: string;
        studentId?: string;
        metadata?: Record<string, any>;
    }
): Promise<LineUserTag> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const tagRecord: LineUserTag = {
        id: crypto.randomUUID(),
        created_at: now,
        line_user_id: lineUserId,
        tag_name: tagName,
        tag_category: options?.category || 'behavior',
        display_name: options?.displayName || null,
        student_id: options?.studentId || null,
        metadata: options?.metadata || {}
    };

    try {
        const { data, error } = await supabase
            .from('line_user_tags')
            .upsert(
                {
                    line_user_id: lineUserId,
                    tag_name: tagName,
                    tag_category: options?.category || 'behavior',
                    display_name: options?.displayName || null,
                    student_id: options?.studentId || null,
                    metadata: options?.metadata || {}
                },
                { onConflict: 'line_user_id,tag_name' }
            )
            .select()
            .maybeSingle();

        if (error || !data) {
            return await fallbackAddUserTag(tagRecord);
        }
        return data as LineUserTag;
    } catch {
        return await fallbackAddUserTag(tagRecord);
    }
}

/**
 * ユーザーからタグを削除
 */
export async function removeTagFromUser(lineUserId: string, tagName: string): Promise<boolean> {
    const supabase = createAdminClient();
    try {
        const { error } = await supabase
            .from('line_user_tags')
            .delete()
            .eq('line_user_id', lineUserId)
            .eq('tag_name', tagName);

        if (error) {
            await fallbackRemoveUserTag(lineUserId, tagName);
        }
        return true;
    } catch {
        await fallbackRemoveUserTag(lineUserId, tagName);
        return true;
    }
}

/**
 * 特定のLINEユーザーが持っているタグ一覧を取得
 */
export async function getUserTags(lineUserId: string): Promise<string[]> {
    if (!lineUserId) return [];
    const supabase = createAdminClient();

    try {
        const { data, error } = await supabase
            .from('line_user_tags')
            .select('tag_name')
            .eq('line_user_id', lineUserId);

        if (error || !data) {
            return await fallbackGetUserTags(lineUserId);
        }
        return data.map((t: any) => t.tag_name);
    } catch {
        return await fallbackGetUserTags(lineUserId);
    }
}

/**
 * 全タグの一覧および各タグの保有ユーザー数を集計
 */
export async function getTagsSummary(): Promise<TagSummaryItem[]> {
    const supabase = createAdminClient();
    const tagCountMap = new Map<string, number>();

    try {
        const { data, error } = await supabase
            .from('line_user_tags')
            .select('tag_name');

        if (error || !data) {
            const fallbackTags = await fallbackGetAllUserTags();
            fallbackTags.forEach(t => {
                tagCountMap.set(t.tag_name, (tagCountMap.get(t.tag_name) || 0) + 1);
            });
        } else {
            data.forEach((row: any) => {
                tagCountMap.set(row.tag_name, (tagCountMap.get(row.tag_name) || 0) + 1);
            });
        }
    } catch {
        const fallbackTags = await fallbackGetAllUserTags();
        fallbackTags.forEach(t => {
            tagCountMap.set(t.tag_name, (tagCountMap.get(t.tag_name) || 0) + 1);
        });
    }

    // 標準タグをベースにマージして返却
    const result: TagSummaryItem[] = [];
    const standardKeys = Object.values(STANDARD_TAGS);

    for (const key of standardKeys) {
        const info = TAG_LABELS[key] || { label: key, category: 'behavior', description: '' };
        result.push({
            tagName: key,
            tagLabel: info.label,
            tagCategory: info.category,
            userCount: tagCountMap.get(key) || 0,
            description: info.description
        });
    }

    // 標準外のカスタムタグを追加
    for (const [tag, count] of tagCountMap.entries()) {
        if (!standardKeys.includes(tag as any)) {
            result.push({
                tagName: tag,
                tagLabel: tag,
                tagCategory: 'custom',
                userCount: count,
                description: 'カスタム付与タグ'
            });
        }
    }

    return result;
}

// ==============================================================================
// 4. アクセス集計・KPI
// ==============================================================================

/**
 * アクセスログのKPI（総PV、UU、CV、CVR）および直近ログを取得
 */
export async function getTrackingKpiSummary(limit = 100): Promise<TrackingKpiSummary> {
    const supabase = createAdminClient();

    try {
        const { data: logs, error } = await supabase
            .from('line_access_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !logs) {
            return await fallbackGetTrackingKpiSummary(limit);
        }

        const totalViews = logs.length;
        const uniqueUserIds = new Set(
            logs.map(l => l.line_user_id).filter(Boolean)
        );
        const uniqueUsers = uniqueUserIds.size;
        const totalConverted = logs.filter(l => l.is_converted).length;
        const conversionRate = totalViews > 0
            ? Math.round((totalConverted / totalViews) * 1000) / 10
            : 0;

        return {
            totalViews,
            uniqueUsers,
            totalConverted,
            conversionRate,
            recentLogs: logs as LineAccessLog[]
        };
    } catch {
        return await fallbackGetTrackingKpiSummary(limit);
    }
}

// ==============================================================================
// 5. タグによる生徒フィルタリング判定ヘルパー
// ==============================================================================

/**
 * 生徒一覧に対して、タグ条件（含むタグ、除外タグ、閲覧未申込）を適用して抽出
 */
export async function filterStudentsWithTags<T extends { line_user_id?: string | null; lineUserId?: string | null }>(
    students: T[],
    options: {
        includeTags?: string[];
        excludeTags?: string[];
        viewedFormNotApplied?: boolean; // フォーム閲覧済かつ申込未完了
    }
): Promise<T[]> {
    const { includeTags, excludeTags, viewedFormNotApplied } = options;

    const needsTagCheck = (includeTags && includeTags.length > 0) ||
                          (excludeTags && excludeTags.length > 0) ||
                          viewedFormNotApplied;

    if (!needsTagCheck) {
        return students;
    }

    // 全ユーザーのタグをマップ化
    const allUserTags = await getAllUserTagsMap();

    return students.filter(student => {
        const lineId = student.lineUserId || student.line_user_id;
        const tags = lineId ? (allUserTags.get(lineId) || []) : [];

        // 離脱者フィルター: trial_form_viewed あり かつ trial_applied なし
        if (viewedFormNotApplied) {
            const hasViewed = tags.includes(STANDARD_TAGS.FORM_VIEWED);
            const hasApplied = tags.includes(STANDARD_TAGS.FORM_APPLIED);
            if (!hasViewed || hasApplied) {
                return false;
            }
        }

        // 含むタグの判定 (すべて含む)
        if (includeTags && includeTags.length > 0) {
            const hasAllIncludes = includeTags.every(t => tags.includes(t));
            if (!hasAllIncludes) return false;
        }

        // 除外タグの判定 (いずれかを含んでいたら除外)
        if (excludeTags && excludeTags.length > 0) {
            const hasAnyExclude = excludeTags.some(t => tags.includes(t));
            if (hasAnyExclude) return false;
        }

        return true;
    });
}

/**
 * 全てのLINEユーザーIDごとの保有タグ配列マップを取得
 */
export async function getAllUserTagsMap(): Promise<Map<string, string[]>> {
    const supabase = createAdminClient();
    const tagMap = new Map<string, string[]>();

    try {
        const { data, error } = await supabase
            .from('line_user_tags')
            .select('line_user_id, tag_name');

        if (error || !data) {
            const fallbackTags = await fallbackGetAllUserTags();
            fallbackTags.forEach(t => {
                const list = tagMap.get(t.line_user_id) || [];
                list.push(t.tag_name);
                tagMap.set(t.line_user_id, list);
            });
            return tagMap;
        }

        data.forEach((row: any) => {
            const list = tagMap.get(row.line_user_id) || [];
            list.push(row.tag_name);
            tagMap.set(row.line_user_id, list);
        });
        return tagMap;
    } catch {
        const fallbackTags = await fallbackGetAllUserTags();
        fallbackTags.forEach(t => {
            const list = tagMap.get(t.line_user_id) || [];
            list.push(t.tag_name);
            tagMap.set(t.line_user_id, list);
        });
        return tagMap;
    }
}

// ==============================================================================
// 6. app_configs テーブルを活用した安全なフォールバック機構
// ==============================================================================

const FALLBACK_LOGS_KEY = 'line_tracking_logs_v1';
const FALLBACK_TAGS_KEY = 'line_user_tags_v1';

async function fallbackSaveAccessLog(log: LineAccessLog): Promise<void> {
    const supabase = createAdminClient();
    try {
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_LOGS_KEY)
            .maybeSingle();

        let logs: LineAccessLog[] = [];
        if (data?.value) {
            logs = JSON.parse(data.value);
        }
        logs.unshift(log);
        // 最大1000件保持
        if (logs.length > 1000) logs = logs.slice(0, 1000);

        await supabase.from('app_configs').upsert({
            key: FALLBACK_LOGS_KEY,
            value: JSON.stringify(logs),
            description: 'LIFFアクセストラッキングログ（フォールバック）',
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('[LineTrackingService] Fallback save access log error:', e);
    }
}

async function fallbackMarkConversion(lineUserId: string, studentId?: string, convertedAt?: string): Promise<void> {
    const supabase = createAdminClient();
    try {
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_LOGS_KEY)
            .maybeSingle();

        if (data?.value) {
            const logs: LineAccessLog[] = JSON.parse(data.value);
            const target = logs.find(l => l.line_user_id === lineUserId);
            if (target) {
                target.is_converted = true;
                target.converted_at = convertedAt || new Date().toISOString();
                if (studentId) target.student_id = studentId;

                await supabase.from('app_configs').upsert({
                    key: FALLBACK_LOGS_KEY,
                    value: JSON.stringify(logs),
                    updated_at: new Date().toISOString()
                });
            }
        }
    } catch (e) {
        console.error('[LineTrackingService] Fallback mark conversion error:', e);
    }
}

async function fallbackAddUserTag(tag: LineUserTag): Promise<LineUserTag> {
    const supabase = createAdminClient();
    try {
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_TAGS_KEY)
            .maybeSingle();

        let tags: LineUserTag[] = [];
        if (data?.value) {
            tags = JSON.parse(data.value);
        }

        const existingIdx = tags.findIndex(
            t => t.line_user_id === tag.line_user_id && t.tag_name === tag.tag_name
        );
        if (existingIdx >= 0) {
            tags[existingIdx] = {
                ...tags[existingIdx],
                ...tag,
                metadata: { ...tags[existingIdx].metadata, ...tag.metadata }
            };
        } else {
            tags.push(tag);
        }

        await supabase.from('app_configs').upsert({
            key: FALLBACK_TAGS_KEY,
            value: JSON.stringify(tags),
            description: 'LINEユーザータグ管理（フォールバック）',
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('[LineTrackingService] Fallback add user tag error:', e);
    }
    return tag;
}

async function fallbackRemoveUserTag(lineUserId: string, tagName: string): Promise<void> {
    const supabase = createAdminClient();
    try {
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_TAGS_KEY)
            .maybeSingle();

        if (data?.value) {
            let tags: LineUserTag[] = JSON.parse(data.value);
            tags = tags.filter(t => !(t.line_user_id === lineUserId && t.tag_name === tagName));

            await supabase.from('app_configs').upsert({
                key: FALLBACK_TAGS_KEY,
                value: JSON.stringify(tags),
                updated_at: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error('[LineTrackingService] Fallback remove user tag error:', e);
    }
}

async function fallbackGetUserTags(lineUserId: string): Promise<string[]> {
    const tags = await fallbackGetAllUserTags();
    return tags
        .filter(t => t.line_user_id === lineUserId)
        .map(t => t.tag_name);
}

async function fallbackGetAllUserTags(): Promise<LineUserTag[]> {
    const supabase = createAdminClient();
    try {
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_TAGS_KEY)
            .maybeSingle();

        if (data?.value) {
            return JSON.parse(data.value);
        }
    } catch (e) {
        console.error('[LineTrackingService] Fallback get all tags error:', e);
    }
    return [];
}

async function fallbackGetTrackingKpiSummary(limit: number): Promise<TrackingKpiSummary> {
    const supabase = createAdminClient();
    try {
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_LOGS_KEY)
            .maybeSingle();

        const logs: LineAccessLog[] = data?.value ? JSON.parse(data.value) : [];
        const totalViews = logs.length;
        const uniqueUserIds = new Set(logs.map(l => l.line_user_id).filter(Boolean));
        const uniqueUsers = uniqueUserIds.size;
        const totalConverted = logs.filter(l => l.is_converted).length;
        const conversionRate = totalViews > 0
            ? Math.round((totalConverted / totalViews) * 1000) / 10
            : 0;

        return {
            totalViews,
            uniqueUsers,
            totalConverted,
            conversionRate,
            recentLogs: logs.slice(0, limit)
        };
    } catch {
        return {
            totalViews: 0,
            uniqueUsers: 0,
            totalConverted: 0,
            conversionRate: 0,
            recentLogs: []
        };
    }
}
