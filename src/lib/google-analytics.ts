import { google } from 'googleapis';

import { getGoogleCredentials } from './google-credentials';

/**
 * Google サービスアカウント認証クライアントを取得（同期版: 環境変数またはキャッシュ）
 */
export function getGoogleAuthClient(scopes: string[], explicitKey?: string) {
    const serviceAccountJson = explicitKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountJson) {
        return null;
    }

    try {
        const credentials = JSON.parse(serviceAccountJson);
        const rawKey = credentials.private_key || '';
        const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
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

/**
 * Google サービスアカウント認証クライアントを非同期取得（Supabaseフォールバック対応）
 */
export async function getGoogleAuthClientAsync(scopes: string[]) {
    const creds = await getGoogleCredentials();
    return getGoogleAuthClient(scopes, creds.serviceAccountKey);
}

export interface GA4GeoPageItem {
    region: string;
    regionNameJa: string;
    city: string;
    cityNameJa: string;
    pagePath: string;
    pageNameJa: string;
    sessions: number;
    pageviews: number;
}

export interface RegionSummary {
    regionJa: string;
    sessions: number;
    share: string;
    topPages: Array<{ pagePath: string; pageNameJa: string; sessions: number }>;
}

export interface CitySummary {
    cityJa: string;
    regionJa: string;
    sessions: number;
    topPage: { pagePath: string; pageNameJa: string; sessions: number };
}

export interface PageGeoSummary {
    pagePath: string;
    pageNameJa: string;
    totalSessions: number;
    topRegions: Array<{ regionJa: string; sessions: number; share: string }>;
    topCities: Array<{ cityJa: string; sessions: number }>;
}

export interface GA4GeoPageAnalytics {
    items: GA4GeoPageItem[];
    regionDistribution: RegionSummary[];
    topCities: CitySummary[];
    pageGeoBreakdown: PageGeoSummary[];
    totalTrackedSessions: number;
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
    geoPageAnalytics?: GA4GeoPageAnalytics;
}

/**
 * GA4から過去30日間のセッションと流入チャネル（特にAI参照）を取得
 */
export async function fetchGA4Analytics(): Promise<GA4TrafficSummary | null> {
    const creds = await getGoogleCredentials();
    const propertyId = creds.ga4Id || process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
        return null;
    }

    const auth = await getGoogleAuthClientAsync(['https://www.googleapis.com/auth/analytics.readonly']);
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

        // 地域 ✕ ページ閲覧データの同時取得
        const geoPageAnalytics = await fetchGA4GeoPageAnalytics();

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
            geoPageAnalytics: geoPageAnalytics || undefined,
        };
    } catch (err) {
        console.error('Error fetching GA4 analytics:', err);
        return null;
    }
}

const REGION_JA_MAP: Record<string, string> = {
    'Tokyo': '東京都',
    'Kanagawa': '神奈川県',
    'Chiba': '千葉県',
    'Saitama': '埼玉県',
    'Ibaraki': '茨城県',
    'Tochigi': '栃木県',
    'Gunma': '群馬県',
    'Osaka': '大阪府',
    'Aichi': '愛知県',
    'Fukuoka': '福岡県',
    'Hokkaido': '北海道',
    'Hyogo': '兵庫県',
    'Kyoto': '京都府',
    'Shizuoka': '静岡県',
};

const CITY_JA_MAP: Record<string, string> = {
    'Shinjuku City': '新宿区',
    'Yokohama': '横浜市',
    'Funabashi': '船橋市',
    'Shibuya': '渋谷区',
    'Setagaya City': '世田谷区',
    'Chiba': '千葉市',
    'Minato City': '港区',
    'Adachi City': '足立区',
    'Chiyoda City': '千代田区',
    'Edogawa City': '江戸川区',
    'Koto City': '江東区',
    'Suginami City': '杉並区',
    'Meguro City': '目黒区',
    'Shinagawa City': '品川区',
    'Ota City': '大田区',
    'Nakano City': '中野区',
    'Toshima City': '豊島区',
    'Kita City': '北区',
    'Arakawa City': '荒川区',
    'Itabashi City': '板橋区',
    'Nerima City': '練馬区',
    'Katsushika City': '葛飾区',
    'Hachioji': '八王子市',
    'Machida': '町田市',
    'Kawasaki': '川崎市',
    'Sagamihara': '相模原市',
    'Matsudo': '松戸市',
    'Ichikawa': '市川市',
    'Kashiwa': '柏市',
    'Saitama': 'さいたま市',
    'Kawaguchi': '川口市',
    '(not set)': 'エリア未特定',
};

export function getRegionNameJa(region: string): string {
    return REGION_JA_MAP[region] || region;
}

export function getCityNameJa(city: string): string {
    return CITY_JA_MAP[city] || city;
}

export function getPageNameJa(path: string): string {
    if (!path || path === '/') return 'トップページ（公式LP）';
    if (path.startsWith('/personal_swim/chiba')) return '千葉エリア個別指導LP';
    if (path.startsWith('/personal_swim/meguro')) return '目黒エリア個別指導LP';
    if (path.startsWith('/personal_swim')) return '個人レッスン総合LP';
    if (path.startsWith('/zUHb45xV/swimming_tips_up')) return '進級の早い子ノウハウ記事';
    if (path.startsWith('/zUHb45xV/adult-private-swimming')) return '大人向け水泳ノウハウ記事';
    if (path.startsWith('/trial')) return '体験レッスン予約ページ';
    if (path.startsWith('/trio')) return 'トリオグループレッスン';
    if (path.startsWith('/enroll')) return '入会手続きフォーム';
    return path;
}

/**
 * GA4から過去30日間の地域 ✕ 閲覧ページ（Region x City x PagePath）の実測データを取得
 */
export async function fetchGA4GeoPageAnalytics(): Promise<GA4GeoPageAnalytics | null> {
    const creds = await getGoogleCredentials();
    const propertyId = creds.ga4Id || process.env.GA4_PROPERTY_ID;
    if (!propertyId) return null;

    const auth = await getGoogleAuthClientAsync(['https://www.googleapis.com/auth/analytics.readonly']);
    if (!auth) return null;

    try {
        const analyticsData = google.analyticsdata({
            version: 'v1beta',
            auth,
        });

        const response = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [
                    { name: 'region' },
                    { name: 'city' },
                    { name: 'pagePath' },
                ],
                metrics: [
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                ],
                limit: '100',
            },
        });

        const rows = response.data.rows || [];
        const items: GA4GeoPageItem[] = [];
        let totalSessions = 0;

        const regionSessionMap: Record<string, { sessions: number; pageMap: Record<string, number> }> = {};
        const citySessionMap: Record<string, { region: string; sessions: number; pageMap: Record<string, number> }> = {};
        const pageSessionMap: Record<string, { totalSessions: number; regionMap: Record<string, number>; cityMap: Record<string, number> }> = {};

        for (const row of rows) {
            const rawRegion = row.dimensionValues?.[0]?.value || '(not set)';
            const rawCity = row.dimensionValues?.[1]?.value || '(not set)';
            const pagePath = row.dimensionValues?.[2]?.value || '/';
            const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
            const pageviews = parseInt(row.metricValues?.[1]?.value || '0', 10);

            if (sessions <= 0) continue;
            totalSessions += sessions;

            const regionNameJa = getRegionNameJa(rawRegion);
            const cityNameJa = getCityNameJa(rawCity);
            const pageNameJa = getPageNameJa(pagePath);

            items.push({
                region: rawRegion,
                regionNameJa,
                city: rawCity,
                cityNameJa,
                pagePath,
                pageNameJa,
                sessions,
                pageviews,
            });

            // 地域別集計
            if (!regionSessionMap[regionNameJa]) {
                regionSessionMap[regionNameJa] = { sessions: 0, pageMap: {} };
            }
            regionSessionMap[regionNameJa].sessions += sessions;
            regionSessionMap[regionNameJa].pageMap[pagePath] = (regionSessionMap[regionNameJa].pageMap[pagePath] || 0) + sessions;

            // 市区町村別集計
            const cityKey = `${cityNameJa} (${regionNameJa})`;
            if (!citySessionMap[cityKey]) {
                citySessionMap[cityKey] = { region: regionNameJa, sessions: 0, pageMap: {} };
            }
            citySessionMap[cityKey].sessions += sessions;
            citySessionMap[cityKey].pageMap[pagePath] = (citySessionMap[cityKey].pageMap[pagePath] || 0) + sessions;

            // ページ別集計
            if (!pageSessionMap[pagePath]) {
                pageSessionMap[pagePath] = { totalSessions: 0, regionMap: {}, cityMap: {} };
            }
            pageSessionMap[pagePath].totalSessions += sessions;
            pageSessionMap[pagePath].regionMap[regionNameJa] = (pageSessionMap[pagePath].regionMap[regionNameJa] || 0) + sessions;
            pageSessionMap[pagePath].cityMap[cityNameJa] = (pageSessionMap[pagePath].cityMap[cityNameJa] || 0) + sessions;
        }

        const safeTotal = Math.max(totalSessions, 1);

        // 1. 都道府県別分布
        const regionDistribution: RegionSummary[] = Object.entries(regionSessionMap)
            .map(([regionJa, data]) => {
                const topPages = Object.entries(data.pageMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([p, s]) => ({ pagePath: p, pageNameJa: getPageNameJa(p), sessions: s }));

                return {
                    regionJa,
                    sessions: data.sessions,
                    share: `${Math.round((data.sessions / safeTotal) * 100)}%`,
                    topPages,
                };
            })
            .sort((a, b) => b.sessions - a.sessions);

        // 2. 市区町村別トップ
        const topCities: CitySummary[] = Object.entries(citySessionMap)
            .map(([cityKey, data]) => {
                const bestPage = Object.entries(data.pageMap).sort((a, b) => b[1] - a[1])[0] || ['/', 0];
                return {
                    cityJa: cityKey.split(' ')[0],
                    regionJa: data.region,
                    sessions: data.sessions,
                    topPage: { pagePath: bestPage[0], pageNameJa: getPageNameJa(bestPage[0]), sessions: bestPage[1] },
                };
            })
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, 10);

        // 3. ページ別地域内訳
        const pageGeoBreakdown: PageGeoSummary[] = Object.entries(pageSessionMap)
            .map(([pagePath, data]) => {
                const pageTotal = Math.max(data.totalSessions, 1);
                const topRegions = Object.entries(data.regionMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([r, s]) => ({ regionJa: r, sessions: s, share: `${Math.round((s / pageTotal) * 100)}%` }));

                const topCitiesList = Object.entries(data.cityMap)
                    .filter(([c]) => c !== 'エリア未特定')
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([c, s]) => ({ cityJa: c, sessions: s }));

                return {
                    pagePath,
                    pageNameJa: getPageNameJa(pagePath),
                    totalSessions: data.totalSessions,
                    topRegions,
                    topCities: topCitiesList,
                };
            })
            .sort((a, b) => b.totalSessions - a.totalSessions);

        return {
            items,
            regionDistribution,
            topCities,
            pageGeoBreakdown,
            totalTrackedSessions: totalSessions,
        };
    } catch (err) {
        console.error('Error fetching GA4 geo-page analytics:', err);
        return null;
    }
}
