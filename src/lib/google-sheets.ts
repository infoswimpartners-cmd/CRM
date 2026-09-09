import { google } from 'googleapis';
import { getGoogleAuthClient } from './google-analytics';
import {
    SpreadsheetAnalyticsData,
    DEFAULT_SPREADSHEET_ANALYTICS,
} from './spreadsheet-types';

export * from './spreadsheet-types';

/**
 * スプレッドシートURLまたはIDから純粋なスプレッドシートIDを抽出
 */
export function extractSpreadsheetId(urlOrId: string): string {
    if (!urlOrId) return '';
    const trimmed = urlOrId.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return trimmed;
}

/**
 * サービスアカウントのメールアドレスを取得（共有権限付与の案内用）
 */
export function getServiceAccountEmail(): string | null {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed.client_email || null;
    } catch {
        return null;
    }
}

/**
 * Googleスプレッドシートからデータを取得
 */
export async function fetchSpreadsheetAnalytics(spreadsheetId?: string): Promise<SpreadsheetAnalyticsData> {
    const serviceAccountEmail = getServiceAccountEmail() || 'swim-partners@siwm-partners.iam.gserviceaccount.com';
    const cleanId = spreadsheetId ? extractSpreadsheetId(spreadsheetId) : '';

    if (!cleanId) {
        return {
            ...DEFAULT_SPREADSHEET_ANALYTICS,
            configured: false,
            serviceAccountEmail,
        };
    }

    const auth = getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    if (!auth) {
        return {
            ...DEFAULT_SPREADSHEET_ANALYTICS,
            configured: true,
            spreadsheetId: cleanId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
            serviceAccountEmail,
        };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // シート情報を取得（タイトルやシート一覧）
        const spreadsheetMeta = await sheets.spreadsheets.get({
            spreadsheetId: cleanId,
        });

        const sheetNames = (spreadsheetMeta.data.sheets || []).map(s => s.properties?.title || '');
        console.log(`📊 スプレッドシート接続成功: [${spreadsheetMeta.data.properties?.title}], シート: ${sheetNames.join(', ')}`);

        // A1表記で最初のシートまたは「CV」「顧客」を含むシートから値を取得
        const targetSheet = sheetNames.find(n => n.includes('CV') || n.includes('コンバージョン') || n.includes('顧客')) || sheetNames[0] || 'Sheet1';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: cleanId,
            range: `${targetSheet}!A1:Z100`,
        });

        const rows = response.data.values || [];
        console.log(`📊 スプレッドシートから ${rows.length} 行を取得しました。`);

        // 行データが存在すればパースを試行（ヘッダー解析）
        const result: SpreadsheetAnalyticsData = {
            ...DEFAULT_SPREADSHEET_ANALYTICS,
            configured: true,
            spreadsheetId: cleanId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
            serviceAccountEmail,
            lastSyncedAt: new Date().toISOString().split('T')[0],
            source: 'google_sheets',
        };

        // スプレッドシートの行から動的に集計可能な数値があれば反映
        if (rows.length > 1) {
            let totalInquiries = 0;
            let totalTrials = 0;
            let totalEnrollments = 0;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const inq = parseInt(row[1] || '0', 10);
                const tri = parseInt(row[2] || '0', 10);
                const enr = parseInt(row[3] || '0', 10);
                if (!isNaN(inq) && inq > 0) totalInquiries += inq;
                if (!isNaN(tri) && tri > 0) totalTrials += tri;
                if (!isNaN(enr) && enr > 0) totalEnrollments += enr;
            }

            if (totalInquiries > 0) {
                result.totalConversions = {
                    inquiries: totalInquiries,
                    trials: totalTrials,
                    enrollments: totalEnrollments,
                    overallCvr: totalInquiries > 0 ? `${((totalEnrollments / totalInquiries) * 100).toFixed(1)}%` : '50.0%',
                };
            }
        }

        return result;
    } catch (err: any) {
        console.warn('⚠️ Google Sheets API 取得エラー (フォールバックデータを使用します):', err.message);
        return {
            ...DEFAULT_SPREADSHEET_ANALYTICS,
            configured: true,
            spreadsheetId: cleanId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
            serviceAccountEmail,
        };
    }
}
