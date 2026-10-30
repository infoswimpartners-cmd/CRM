/**
 * SEO記事 Googleスプレッドシート自動追加サービス
 * 毎日自動生成される記事（タイトル、本文、サムネイル画像URL等）を
 * 指定のGoogleスプレッドシートに行として自動追記（append）します。
 */

import { google } from 'googleapis';
import { getGoogleAuthClient } from './google-analytics';
import { extractSpreadsheetId, getServiceAccountEmail } from './google-sheets';
import { createAdminClient } from './supabase/admin';
import { StudioCmsArticle } from './studio-cms-types';

export interface ArticleSpreadsheetRow {
    articleId: string;
    title: string;
    keyword: string;
    bodyMarkdown: string;
    thumbnailUrl: string;
    slug: string;
    metaDescription: string;
    categoryLabel?: string;
    createdAt?: string;
}

export interface SpreadsheetConfigStatus {
    configured: boolean;
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    serviceAccountEmail: string | null;
    targetSheetName: string;
}

const CONFIG_KEY = 'SEO_ARTICLES_SPREADSHEET_ID';
const DEFAULT_SHEET_NAME = 'SEO記事一覧';

/**
 * 記事用スプレッドシートIDを解決（app_configs優先 ➔ 環境変数フォールバック）
 */
export async function getArticleSpreadsheetId(): Promise<string | null> {
    try {
        const supabase = createAdminClient();
        if (supabase) {
            const { data } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', CONFIG_KEY)
                .maybeSingle();

            if (data?.value && data.value.trim()) {
                return extractSpreadsheetId(data.value.trim());
            }
        }
    } catch (e) {
        console.warn('[getArticleSpreadsheetId] app_configs lookup failed:', e);
    }

    const envId = process.env.SEO_ARTICLES_SPREADSHEET_ID || process.env.GOOGLE_ANALYTICS_SPREADSHEET_ID;
    return envId ? extractSpreadsheetId(envId) : null;
}

/**
 * 記事用スプレッドシートIDを保存
 */
export async function saveArticleSpreadsheetId(spreadsheetUrlOrId: string): Promise<{ success: boolean; cleanId: string }> {
    const cleanId = extractSpreadsheetId(spreadsheetUrlOrId);
    if (!cleanId) {
        throw new Error('有効なスプレッドシートURLまたはIDを入力してください。');
    }

    const supabase = createAdminClient();
    if (supabase) {
        const { error } = await supabase.from('app_configs').upsert({
            key: CONFIG_KEY,
            value: cleanId,
        }, { onConflict: 'key' });

        if (error) {
            throw new Error(`スプレッドシートIDの保存に失敗しました: ${error.message}`);
        }
    }

    return { success: true, cleanId };
}

/**
 * スプレッドシート連携の設定状況を取得
 */
export async function getSpreadsheetConfigStatus(): Promise<SpreadsheetConfigStatus> {
    const spreadsheetId = await getArticleSpreadsheetId();
    const serviceAccountEmail = getServiceAccountEmail() || 'swim-partners@siwm-partners.iam.gserviceaccount.com';

    return {
        configured: Boolean(spreadsheetId),
        spreadsheetId,
        spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null,
        serviceAccountEmail,
        targetSheetName: DEFAULT_SHEET_NAME,
    };
}

/**
 * スプレッドシートへ記事データを追記（タイトル、本文、サムネイル画像）
 */
export async function appendArticleToSpreadsheet(
    row: ArticleSpreadsheetRow,
    explicitSpreadsheetId?: string
): Promise<{
    success: boolean;
    rowNumber?: number;
    spreadsheetUrl?: string;
    message: string;
}> {
    const spreadsheetId = explicitSpreadsheetId || (await getArticleSpreadsheetId());

    if (!spreadsheetId) {
        return {
            success: false,
            message: 'スプレッドシートIDが未設定です。管理画面からスプレッドシートのURLを登録してください。',
        };
    }

    const auth = getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    if (!auth) {
        return {
            success: false,
            message: 'Google認証クライアント（GOOGLE_SERVICE_ACCOUNT_KEY）の取得に失敗しました。',
        };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. シートメタデータの取得
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const existingSheets = (meta.data.sheets || []).map(s => s.properties?.title || '');

        let targetSheet = existingSheets.find(title => title === DEFAULT_SHEET_NAME || title.includes('記事') || title.includes('SEO'));

        // ターゲットシートが存在しない場合は自動作成
        if (!targetSheet) {
            try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: DEFAULT_SHEET_NAME,
                                    },
                                },
                            },
                        ],
                    },
                });
                targetSheet = DEFAULT_SHEET_NAME;
            } catch {
                // シート追加権限等で失敗した場合は最初のシートをフォールバック
                targetSheet = existingSheets[0] || 'Sheet1';
            }
        }

        // 2. 1行目（ヘッダー行）の確認・自動挿入
        const headerCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${targetSheet}!A1:I1`,
        });

        const hasHeader = headerCheck.data.values && headerCheck.data.values.length > 0 && headerCheck.data.values[0].length > 0;

        if (!hasHeader) {
            const headers = [
                '作成日時',
                '記事タイトル',
                'ターゲットキーワード',
                'サムネイル画像URL',
                'サムネイル画像プレビュー',
                'スラッグ',
                'メタディスクリプション',
                '記事内容（本文Markdown）',
                'カテゴリ',
            ];
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${targetSheet}!A1:I1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headers],
                },
            });
        }

        // 3. 追加する行データの作成
        const dateStr = row.createdAt
            ? new Date(row.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
            : new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

        const values = [
            dateStr,
            row.title,
            row.keyword,
            row.thumbnailUrl,
            `=IMAGE("${row.thumbnailUrl}")`, // スプレッドシート内で直接画像としてプレビュー表示
            row.slug,
            row.metaDescription,
            row.bodyMarkdown,
            row.categoryLabel || '水泳個人レッスン',
        ];

        // 4. 行を追記 (append)
        const appendRes = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${targetSheet}!A:I`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [values],
            },
        });

        const updatedRange = appendRes.data.updates?.updatedRange || '';
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        console.log(`📊 スプレッドシート追記成功: [${targetSheet}] ${row.title} (${updatedRange})`);

        return {
            success: true,
            spreadsheetUrl,
            message: `スプレッドシートに記事「${row.title}」とサムネイル画像を正常に追加しました。`,
        };
    } catch (err: any) {
        console.error('[appendArticleToSpreadsheet Exception]:', err);
        return {
            success: false,
            message: `スプレッドシートへの追加に失敗しました: ${err.message}`,
        };
    }
}
