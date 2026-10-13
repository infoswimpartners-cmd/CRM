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

export interface TrialBookingSpreadsheetRow {
    inquiryId?: string;
    inquiryDate?: string;
    membershipNumber?: string;
    customerName: string;
    channel?: string;
    searchIntent?: string;
    targetCategory?: string;
    concernPurpose?: string;
    preferredArea?: string;
    trialStatus?: string;
    trialDate?: string;
    enrollmentStatus?: string;
    initialAmount?: number;
    coachName?: string;
    notes?: string;
}

/**
 * 体験予約・問い合わせデータをGoogleスプレッドシート（ファネルシート）に自動追記する
 */
export async function appendTrialBookingToSpreadsheet(
    data: TrialBookingSpreadsheetRow,
    explicitSpreadsheetId?: string
): Promise<{ success: boolean; error?: string }> {
    const spreadsheetId = explicitSpreadsheetId || process.env.GOOGLE_ANALYTICS_SPREADSHEET_ID;
    const cleanId = spreadsheetId ? extractSpreadsheetId(spreadsheetId) : '';

    if (!cleanId) {
        return { success: false, error: 'スプレッドシートIDが設定されていません。' };
    }

    // 書き込み用スコープ
    const auth = getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    if (!auth) {
        return { success: false, error: 'Google認証クライアントの作成に失敗しました。' };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // 追記する行データ（ファネルテンプレートのカラム順に対応）
        const rowValues = [
            data.inquiryId || `INQ-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
            data.inquiryDate || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
            data.membershipNumber || '',
            data.customerName || '未入力',
            data.channel || 'WEB問い合わせ',
            data.searchIntent || '',
            data.targetCategory || '',
            data.concernPurpose || '',
            data.preferredArea || '',
            data.trialStatus || '申込済',
            data.trialDate || '',
            data.enrollmentStatus || '検討中',
            data.initialAmount ?? 0,
            data.coachName || '',
            data.notes || '',
        ];

        // ターゲットシートを検出（「02_問い合わせ・成約ファネル」または「ファネル」「問い合わせ」「Sheet1」）
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: cleanId });
        const sheetNames = (spreadsheetMeta.data.sheets || []).map(s => s.properties?.title || '');
        const targetSheet = sheetNames.find(n => n.includes('ファネル') || n.includes('問い合わせ') || n.includes('02_')) || sheetNames[0] || 'Sheet1';

        await sheets.spreadsheets.values.append({
            spreadsheetId: cleanId,
            range: `${targetSheet}!A:O`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [rowValues],
            },
        });

        console.log(`📊 スプレッドシート [${targetSheet}] へのデータ追記に成功しました: ${data.customerName}`);
        return { success: true };
    } catch (err: any) {
        console.error('⚠️ スプレッドシート追記エラー:', err.message);
        return { success: false, error: err.message };
    }
}

export interface LessonReportSpreadsheetRow {
    lessonId?: string;
    lessonDate: string;
    coachName: string;
    studentName: string;
    studentNumber?: string;
    lessonType: string;
    location: string;
    price: number;
    billingPrice?: number;
    attendanceType?: string;
    menuDescription?: string;
    createdAt?: string;
}

// レッスン報告用のデフォルトスプレッドシートID
export const DEFAULT_LESSON_REPORT_SPREADSHEET_ID = '1DLMYid10VpYGPoHWkpqXcIku92oVkZ4Y9aMMtVKxq4s';

/**
 * レッスン報告データをGoogleスプレッドシートに自動追記する
 */
export async function appendLessonReportToSpreadsheet(
    data: LessonReportSpreadsheetRow,
    explicitSpreadsheetId?: string
): Promise<{ success: boolean; error?: string }> {
    const spreadsheetId = explicitSpreadsheetId 
        || process.env.LESSON_REPORT_SPREADSHEET_ID 
        || DEFAULT_LESSON_REPORT_SPREADSHEET_ID;
    const cleanId = extractSpreadsheetId(spreadsheetId);

    if (!cleanId) {
        return { success: false, error: 'レッスン報告用スプレッドシートIDが設定されていません。' };
    }

    const auth = getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    if (!auth) {
        return { success: false, error: 'Google認証クライアントの作成に失敗しました。' };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // シート一覧を取得
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: cleanId });
        const sheetList = spreadsheetMeta.data.sheets || [];
        const sheetNames = sheetList.map(s => s.properties?.title || '');
        const targetSheet = sheetNames.find(n => n.includes('レッスン報告') || n.includes('報告') || n.includes('Lesson')) || sheetNames[0] || 'Sheet1';

        // 既存の行数を確認し、空ならヘッダー行を追加
        const checkRows = await sheets.spreadsheets.values.get({
            spreadsheetId: cleanId,
            range: `${targetSheet}!A1:L1`,
        });

        if (!checkRows.data.values || checkRows.data.values.length === 0) {
            const headers = [
                'レッスンID',
                '実施日',
                'コーチ名',
                '生徒名',
                '会員番号',
                'レッスン種別',
                '実施場所',
                'レッスン料金(円)',
                '請求金額(円)',
                '出欠区分',
                '指導内容・メニュー',
                '報告日時',
            ];
            await sheets.spreadsheets.values.append({
                spreadsheetId: cleanId,
                range: `${targetSheet}!A1:L1`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [headers],
                },
            });
        }

        const dateStr = data.lessonDate.includes('T')
            ? data.lessonDate.split('T')[0]
            : data.lessonDate;

        const rowValues = [
            data.lessonId || '',
            dateStr,
            data.coachName || '',
            data.studentName || '',
            data.studentNumber || '',
            data.lessonType || '',
            data.location || '',
            data.price ?? 0,
            data.billingPrice ?? 0,
            data.attendanceType || '通常',
            data.menuDescription || '',
            data.createdAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: cleanId,
            range: `${targetSheet}!A:L`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [rowValues],
            },
        });

        console.log(`🏊‍♂️ レッスン報告をスプレッドシート [${targetSheet}] に追記しました: ${data.studentName} (${dateStr})`);
        return { success: true };
    } catch (err: any) {
        console.error('⚠️ レッスン報告スプレッドシート追記エラー:', err.message);
        return { success: false, error: err.message };
    }
}
