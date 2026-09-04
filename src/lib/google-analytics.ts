import { google } from 'googleapis';

/**
 * Google サービスアカウント認証クライアントを取得
 */
export function getGoogleAuthClient(scopes: string[]) {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountJson) {
        return null;
    }

    try {
        const credentials = JSON.parse(serviceAccountJson);
        const privateKey = (credentials.private_key || '').replace(/\\n/g, '\n');
        const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: privateKey,
            scopes,
        });
        return auth;
    } catch (err) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', err);
        return null;
    }
}

export interface GA4TrafficSummary {
    totalSessions: number;
    organicSearchSessions: number;
    aiSearchSessions: number; // ChatGPT, Perplexity, Claude, Gemini等からの参照セッション
    mapSessions: number;
    snsSessions: number;
    channelBreakdown: {
        aiSearch: { count: number; share: string };
        organicSearch: { count: number; share: string };
        maps: { count: number; share: string };
        sns: { count: number; share: string };
        other: { count: number; share: string };
    };
    aiSources: Array<{ source: string; sessions: number }>;
}

/**
 * GA4から過去30日間のセッションと流入チャネル（特にAI参照）を取得
 */
export async function fetchGA4Analytics(): Promise<GA4TrafficSummary | null> {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
        return null;
    }

    const auth = getGoogleAuthClient(['https://www.googleapis.com/auth/analytics.readonly']);
    if (!auth) {
        return null;
    }

    try {
        const analyticsData = google.analyticsdata({
            version: 'v1beta',
            auth,
        });

        // 過去30日間のセッション数を参照元 (sessionSource) と メディア (sessionMedium) 別に取得
        const response = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [
                    { name: 'sessionDefaultChannelGroup' },
                    { name: 'sessionSource' },
                ],
                metrics: [{ name: 'sessions' }],
            },
        });

        const rows = response.data.rows || [];
        let totalSessions = 0;
        let organicSearchSessions = 0;
        let aiSearchSessions = 0;
        let mapSessions = 0;
        let snsSessions = 0;
        const aiSourcesMap: Record<string, number> = {};

        // AI検索ドメインリスト
        const aiDomains = ['chatgpt.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com'];

        for (const row of rows) {
            const channel = row.dimensionValues?.[0]?.value || '';
            const source = (row.dimensionValues?.[1]?.value || '').toLowerCase();
            const count = parseInt(row.metricValues?.[0]?.value || '0', 10);

            totalSessions += count;

            // AI参照のチェック
            const isAiSource = aiDomains.some(d => source.includes(d) || source.includes('chatgpt') || source.includes('perplexity') || source.includes('anthropic'));
            if (isAiSource) {
                aiSearchSessions += count;
                aiSourcesMap[source] = (aiSourcesMap[source] || 0) + count;
            } else if (channel.toLowerCase().includes('organic search') || source.includes('google') || source.includes('yahoo')) {
                if (source.includes('maps.google') || source.includes('google-maps')) {
                    mapSessions += count;
                } else {
                    organicSearchSessions += count;
                }
            } else if (channel.toLowerCase().includes('organic social') || source.includes('instagram') || source.includes('line') || source.includes('tiktok') || source.includes('youtube')) {
                snsSessions += count;
            }
        }

        const safeTotal = Math.max(totalSessions, 1);
        const formatShare = (val: number) => `${Math.round((val / safeTotal) * 100)}%`;

        return {
            totalSessions,
            organicSearchSessions,
            aiSearchSessions,
            mapSessions,
            snsSessions,
            channelBreakdown: {
                aiSearch: { count: aiSearchSessions, share: formatShare(aiSearchSessions) },
                organicSearch: { count: organicSearchSessions, share: formatShare(organicSearchSessions) },
                maps: { count: mapSessions, share: formatShare(mapSessions) },
                sns: { count: snsSessions, share: formatShare(snsSessions) },
                other: { count: Math.max(0, totalSessions - (aiSearchSessions + organicSearchSessions + mapSessions + snsSessions)), share: formatShare(Math.max(0, totalSessions - (aiSearchSessions + organicSearchSessions + mapSessions + snsSessions))) },
            },
            aiSources: Object.entries(aiSourcesMap).map(([source, sessions]) => ({ source, sessions })),
        };
    } catch (err) {
        console.error('Error fetching GA4 analytics:', err);
        return null;
    }
}
