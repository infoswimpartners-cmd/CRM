import { google } from 'googleapis';
import { getGoogleAuthClient } from './google-analytics';

export interface SearchConsoleKeywordPerformance {
    keyword: string;
    pageUrl: string;
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
}

/**
 * Google Search Consoleから過去28日間の検索パフォーマンスを取得（実クエリ＋実URL）
 */
export async function fetchSearchConsoleAnalytics(): Promise<SearchConsoleSummary | null> {
    const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
    if (!siteUrl) {
        return null;
    }

    const auth = getGoogleAuthClient(['https://www.googleapis.com/auth/webmasters.readonly']);
    if (!auth) {
        return null;
    }

    try {
        const searchconsole = google.searchconsole({
            version: 'v1',
            auth,
        });

        // 過去28日間の集計
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const startDate = new Date(today.setDate(today.getDate() - 28)).toISOString().split('T')[0];

        // クエリ ✕ ページの2軸で実データを取得（最大50件）
        const response = await searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['query', 'page'],
                rowLimit: 50,
            },
        });

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

        return {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: averageCtr,
            averagePosition,
            topQueries,
            keywordPages,
        };
    } catch (err) {
        console.error('Error fetching Search Console analytics:', err);
        return null;
    }
}
