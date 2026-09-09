'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
    fetchSpreadsheetAnalytics,
    extractSpreadsheetId,
    getServiceAccountEmail,
    SpreadsheetAnalyticsData,
    DEFAULT_SPREADSHEET_ANALYTICS,
} from '@/lib/google-sheets';

const CONFIG_SPACE_NAME = 'SP_TRACKER_SPREADSHEET_CONFIG';

/**
 * 保存されたスプレッドシート設定を取得
 */
async function getPersistedSpreadsheetConfig(supabase: any): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
    try {
        const { data } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url')
            .eq('space_name', CONFIG_SPACE_NAME)
            .limit(1)
            .maybeSingle();

        if (data?.webhook_url) {
            return JSON.parse(data.webhook_url);
        }
    } catch (e) {
        console.error('getPersistedSpreadsheetConfig error:', e);
    }
    return null;
}

/**
 * スプレッドシート設定をDBに保存
 */
async function savePersistedSpreadsheetConfig(supabase: any, config: { spreadsheetId: string; spreadsheetUrl: string }): Promise<boolean> {
    try {
        const jsonStr = JSON.stringify(config);
        const { data: existing } = await supabase
            .from('google_chat_webhooks')
            .select('id')
            .eq('space_name', CONFIG_SPACE_NAME)
            .limit(1)
            .maybeSingle();

        if (existing?.id) {
            await supabase
                .from('google_chat_webhooks')
                .update({ webhook_url: jsonStr, active: true })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('google_chat_webhooks')
                .insert({
                    space_name: CONFIG_SPACE_NAME,
                    webhook_url: jsonStr,
                    active: true,
                });
        }
        return true;
    } catch (e) {
        console.error('savePersistedSpreadsheetConfig error:', e);
        return false;
    }
}

/**
 * スプレッドシート連携データおよび顧客・CV分析データを取得（CRM実データ常時連動）
 */
export async function getSpreadsheetAnalyticsAction(): Promise<SpreadsheetAnalyticsData> {
    try {
        const supabase = createAdminClient();
        const persisted = await getPersistedSpreadsheetConfig(supabase);

        // 1. CRMデータベース（students, lessons, leads, membership_types）から実測値を常時集計
        const { calculateRealCrmAnalytics } = await import('@/lib/crm-analytics-engine');
        const realData = await calculateRealCrmAnalytics(supabase);

        // 2. スプレッドシート連携があれば取得してマージ
        const spreadsheetId = persisted?.spreadsheetId || process.env.SPREADSHEET_ANALYTICS_ID || '';
        if (spreadsheetId) {
            const sheetData = await fetchSpreadsheetAnalytics(spreadsheetId);
            realData.spreadsheetId = spreadsheetId;
            realData.spreadsheetUrl = persisted?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
            realData.source = 'google_sheets';
            if (sheetData.totalConversions.inquiries > 0) {
                realData.totalConversions = sheetData.totalConversions;
            }
        }

        return realData;
    } catch (err) {
        console.error('getSpreadsheetAnalyticsAction error:', err);
        return DEFAULT_SPREADSHEET_ANALYTICS;
    }
}

/**
 * スプレッドシートURL/IDを保存
 */
export async function saveSpreadsheetConfigAction(urlOrId: string) {
    try {
        const trimmed = urlOrId.trim();
        const spreadsheetId = extractSpreadsheetId(trimmed);

        if (!spreadsheetId) {
            return { success: false, message: '有効なスプレッドシートURLまたはIDを入力してください。' };
        }

        const supabase = createAdminClient();
        const fullUrl = trimmed.startsWith('http') ? trimmed : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        const saved = await savePersistedSpreadsheetConfig(supabase, {
            spreadsheetId,
            spreadsheetUrl: fullUrl,
        });

        if (!saved) {
            return { success: false, message: '設定の保存に失敗しました。' };
        }

        return {
            success: true,
            spreadsheetId,
            spreadsheetUrl: fullUrl,
            message: 'スプレッドシート連携設定を保存しました。',
        };
    } catch (err: any) {
        console.error('saveSpreadsheetConfigAction error:', err);
        return { success: false, message: err.message || 'エラーが発生しました。' };
    }
}

/**
 * スプレッドシート設定を解除
 */
export async function removeSpreadsheetConfigAction() {
    try {
        const supabase = createAdminClient();
        await supabase
            .from('google_chat_webhooks')
            .update({ active: false, webhook_url: '' })
            .eq('space_name', CONFIG_SPACE_NAME);

        return { success: true, message: 'スプレッドシート連携設定を解除しました。' };
    } catch (err: any) {
        console.error('removeSpreadsheetConfigAction error:', err);
        return { success: false, message: err.message || '解除中にエラーが発生しました。' };
    }
}
