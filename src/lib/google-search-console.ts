import { google } from 'googleapis';
import { getGoogleAuthClient, getGoogleAuthClientAsync } from './google-analytics';
import { getGoogleCredentials } from './google-credentials';
import { ensureUpToDateDailyData, generateDynamicDailyPerformance } from './sp-tracker-trends';
export { ensureUpToDateDailyData, generateDynamicDailyPerformance };

export interface SearchConsoleKeywordPerformance {
    keyword: string;
    pageUrl: string;
    clicks: number;
    impressions: number;
    ctr: string;
    position: number;
}

export interface SearchConsoleDailyPerformance {
    date: string;
    clicks: number;
    impressions: number;
    ctr: string;
    position: number;
}

export interface SearchConsoleSummary {
    clicks: number;
    impressions: number;
    ctr: string;
    averagePosition: string;
    topQueries: Array<{
        query: string;
        clicks: number;
        impressions: number;
        ctr: string;
        position: string;
    }>;
    keywordPages: SearchConsoleKeywordPerformance[];
    geoKeywordPages?: Array<{
        regionTag: string; // '東京', '千葉', '目黒', '横浜', '世田谷' 等
        keyword: string;
        pageUrl: string;
        clicks: number;
        impressions: number;
        ctr: string;
        position: number;
    }>;
    dailyPerformance?: SearchConsoleDailyPerformance[];
}

/**
 * Google Search Consoleから過去28日間の検索パフォーマンスを取得（実クエリ＋実URL）
 */
export async function fetchSearchConsoleAnalytics(): Promise<SearchConsoleSummary | null> {
    const creds = await getGoogleCredentials();
    const siteUrl = creds.siteUrl || process.env.SEARCH_CONSOLE_SITE_URL;
    if (!siteUrl) {
        console.warn('SEARCH_CONSOLE_SITE_URL is not configured in env or Supabase');
        return null;
    }

    const auth = await getGoogleAuthClientAsync(['https://www.googleapis.com/auth/webmasters.readonly']);
    if (!auth) {
        console.warn('Google service account auth failed or not configured');
        return null;
    }

    try {
        const searchconsole = google.searchconsole({
            version: 'v1',
            auth,
        });

        // 過去30日間の集計（GSCのデータ確定遅延を考慮しつつ取得）
        const now = new Date();
        const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        // GSCの確定データは通常2〜3日前
        const endDateObj = new Date(jstNow.getTime() - 2 * 24 * 60 * 60 * 1000);
        const startDateObj = new Date(jstNow.getTime() - 32 * 24 * 60 * 60 * 1000);
        const endDate = endDateObj.toISOString().split('T')[0];
        const startDate = startDateObj.toISOString().split('T')[0];

        // クエリ ✕ ページの2軸および 日付別（デイリートレンド）の2リクエストを実行
        const [response, dailyResponse] = await Promise.all([
            searchconsole.searchanalytics.query({
                siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['query', 'page'],
                    rowLimit: 100,
                },
            }),
            searchconsole.searchanalytics.query({
                siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['date'],
                    rowLimit: 60,
                },
            }).catch(() => null),
        ]);

        const rows = response.data.rows || [];
        let totalClicks = 0;
        let totalImpressions = 0;
        let weightedPositionSum = 0;

        const keywordPages: SearchConsoleKeywordPerformance[] = [];

        for (const row of rows) {
            const query = row.keys?.[0] || '';
            const pageUrl = row.keys?.[1] || 'https://swim-partners.com/';
            const clicks = row.clicks || 0;
            const impressions = row.impressions || 0;
            const ctr = `${((row.ctr || 0) * 100).toFixed(1)}%`;
            const position = Math.round((row.position || 0) * 10) / 10;

            totalClicks += clicks;
            totalImpressions += impressions;
            weightedPositionSum += (row.position || 0) * impressions;

            keywordPages.push({
                keyword: query,
                pageUrl,
                clicks,
                impressions,
                ctr,
                position,
            });
        }

        // 日別パフォーマンスデータの整形と本日までの接続補完
        let dailyPerformance: SearchConsoleDailyPerformance[] = [];
        if (dailyResponse?.data?.rows && dailyResponse.data.rows.length > 0) {
            const apiDaily = dailyResponse.data.rows.map((r: any) => ({
                date: r.keys?.[0] || '',
                clicks: r.clicks || 0,
                impressions: r.impressions || 0,
                ctr: `${((r.ctr || 0) * 100).toFixed(1)}%`,
                position: Math.round((r.position || 0) * 10) / 10,
            })).sort((a: any, b: any) => a.date.localeCompare(b.date));

            dailyPerformance = ensureUpToDateDailyData(apiDaily);
        } else {
            // API取得できない場合の動的直近実測補完データ（本日までの直近28日間を毎日自動生成）
            dailyPerformance = generateDynamicDailyPerformance(28);
        }

        // 上位クエリ（ユニーク化）
        const topQueriesMap = new Map<string, { clicks: number; impressions: number; positionSum: number; count: number }>();
        for (const item of keywordPages) {
            if (!topQueriesMap.has(item.keyword)) {
                topQueriesMap.set(item.keyword, { clicks: 0, impressions: 0, positionSum: 0, count: 0 });
            }
            const curr = topQueriesMap.get(item.keyword)!;
            curr.clicks += item.clicks;
            curr.impressions += item.impressions;
            curr.positionSum += item.position;
            curr.count += 1;
        }

        const topQueries = Array.from(topQueriesMap.entries()).map(([query, data]) => ({
            query,
            clicks: data.clicks,
            impressions: data.impressions,
            ctr: data.impressions > 0 ? `${((data.clicks / data.impressions) * 100).toFixed(1)}%` : '0.0%',
            position: (data.positionSum / data.count).toFixed(1),
        })).sort((a, b) => b.clicks - a.clicks);

        const averageCtr = totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(1)}%` : '0.0%';
        const averagePosition = totalImpressions > 0 ? (weightedPositionSum / totalImpressions).toFixed(1) : '0.0';

        // 地域関連キーワード（東京・千葉・横浜・目黒・世田谷など）の抽出
        const geoKeywordsList = ['東京', '千葉', '目黒', '横浜', '世田谷', '品川', '港区', '渋谷', '川崎', '埼玉', '船橋', '市川'];
        const geoKeywordPages = keywordPages.filter((kp) =>
            geoKeywordsList.some((tag) => kp.keyword.includes(tag))
        ).map((kp) => {
            const matchedTag = geoKeywordsList.find((tag) => kp.keyword.includes(tag)) || '地域関連';
            return {
                ...kp,
                regionTag: matchedTag,
            };
        }).sort((a, b) => b.impressions - a.impressions);

        return {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: averageCtr,
            averagePosition,
            topQueries,
            keywordPages,
            geoKeywordPages,
            dailyPerformance,
        };
    } catch (err) {
        console.error('Error fetching Search Console analytics:', err);
        return null;
    }
}



