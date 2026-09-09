export interface ConversionChannelPerformance {
    channel: string;
    label: string;
    sessions: number;
    inquiries: number;
    trials: number;
    enrollments: number;
    inquiryCvr: string;
    enrollmentCvr: string;
    cpa?: number;
}

export interface MonthlyConversionTrend {
    month: string;
    inquiries: number;
    trials: number;
    enrollments: number;
    cvr: string;
}

export interface CustomerSegmentAnalysis {
    segment: string;
    label: string;
    customerCount: number;
    sharePercent: number;
    avgDurationMonths: number;
    avgLtv: number;
    monthlyChurnRate: string;
}

export interface CustomerDemographics {
    ageGroups: Array<{ group: string; count: number; share: number }>;
    areas: Array<{ area: string; count: number; share: number }>;
}

export interface SpreadsheetAnalyticsData {
    configured: boolean;
    spreadsheetId?: string;
    spreadsheetUrl?: string;
    serviceAccountEmail: string;
    lastSyncedAt: string;
    source: 'google_sheets' | 'crm_default';
    totalConversions: {
        inquiries: number;
        trials: number;
        enrollments: number;
        overallCvr: string;
    };
    channelPerformances: ConversionChannelPerformance[];
    monthlyTrends: MonthlyConversionTrend[];
    segmentAnalyses: CustomerSegmentAnalysis[];
    demographics: CustomerDemographics;
}

export const DEFAULT_SPREADSHEET_ANALYTICS: SpreadsheetAnalyticsData = {
    configured: false,
    serviceAccountEmail: 'swim-partners@siwm-partners.iam.gserviceaccount.com',
    lastSyncedAt: '2026-09-09',
    source: 'crm_default',
    totalConversions: {
        inquiries: 68,
        trials: 42,
        enrollments: 34,
        overallCvr: '50.0%',
    },
    channelPerformances: [
        {
            channel: 'organic_seo_geo',
            label: '自然検索（SEO / AI検索GEO）',
            sessions: 3820,
            inquiries: 31,
            trials: 22,
            enrollments: 19,
            inquiryCvr: '0.81%',
            enrollmentCvr: '61.3%',
            cpa: 0,
        },
        {
            channel: 'google_ads',
            label: 'Googleリスティング広告',
            sessions: 1450,
            inquiries: 18,
            trials: 10,
            enrollments: 7,
            inquiryCvr: '1.24%',
            enrollmentCvr: '38.9%',
            cpa: 14200,
        },
        {
            channel: 'instagram_sns',
            label: 'Instagram / SNS',
            sessions: 980,
            inquiries: 9,
            trials: 5,
            enrollments: 4,
            inquiryCvr: '0.92%',
            enrollmentCvr: '44.4%',
            cpa: 6800,
        },
        {
            channel: 'meo_maps',
            label: 'Googleマップ（MEO）',
            sessions: 740,
            inquiries: 6,
            trials: 3,
            enrollments: 2,
            inquiryCvr: '0.81%',
            enrollmentCvr: '33.3%',
            cpa: 0,
        },
        {
            channel: 'referral_other',
            label: 'ご紹介・口コミ / その他',
            sessions: 210,
            inquiries: 4,
            trials: 2,
            enrollments: 2,
            inquiryCvr: '1.90%',
            enrollmentCvr: '50.0%',
            cpa: 0,
        },
    ],
    monthlyTrends: [
        { month: '2026-05', inquiries: 9, trials: 5, enrollments: 4, cvr: '44.4%' },
        { month: '2026-06', inquiries: 13, trials: 8, enrollments: 6, cvr: '46.2%' },
        { month: '2026-07', inquiries: 18, trials: 11, enrollments: 9, cvr: '50.0%' },
        { month: '2026-08', inquiries: 21, trials: 14, enrollments: 11, cvr: '52.4%' },
        { month: '2026-09', inquiries: 7, trials: 4, enrollments: 4, cvr: '57.1%' },
    ],
    segmentAnalyses: [
        {
            segment: 'junior',
            label: '子供・ジュニア進級対策',
            customerCount: 38,
            sharePercent: 52,
            avgDurationMonths: 8.4,
            avgLtv: 168000,
            monthlyChurnRate: '3.2%',
        },
        {
            segment: 'adult',
            label: '大人・初心者泳ぎ直し',
            customerCount: 19,
            sharePercent: 26,
            avgDurationMonths: 6.2,
            avgLtv: 124000,
            monthlyChurnRate: '4.5%',
        },
        {
            segment: 'phobia',
            label: '水恐怖症・カナヅチ克服',
            customerCount: 11,
            sharePercent: 15,
            avgDurationMonths: 4.8,
            avgLtv: 96000,
            monthlyChurnRate: '5.1%',
        },
        {
            segment: 'triathlon',
            label: 'トライアスロン・泳法改善',
            customerCount: 5,
            sharePercent: 7,
            avgDurationMonths: 9.6,
            avgLtv: 192000,
            monthlyChurnRate: '2.8%',
        },
    ],
    demographics: {
        ageGroups: [
            { group: '未就学児 (3〜6歳)', count: 12, share: 16 },
            { group: '小学生 (低学年)', count: 18, share: 25 },
            { group: '小学生 (高学年)・中高生', count: 8, share: 11 },
            { group: '20代〜30代 (大人)', count: 7, share: 10 },
            { group: '40代〜50代 (大人)', count: 21, share: 29 },
            { group: '60代以上 (シニア)', count: 7, share: 9 },
        ],
        areas: [
            { area: '東京都（目黒・港・世田谷・渋谷等）', count: 41, share: 56 },
            { area: '千葉県（千葉市・市川・船橋等）', count: 19, share: 26 },
            { area: '神奈川県（横浜・川崎等）', count: 13, share: 18 },
        ],
    },
};
