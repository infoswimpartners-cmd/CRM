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
    cpaStatus?: 'free_organic' | 'untracked' | 'measured';
    cpaLabel?: string;
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

export interface CustomerStatusMetrics {
    totalInquiries: number;       // 累計リード問い合わせ件数
    totalTrials: number;          // 累計体験レッスン受講件数
    activeMembers: number;        // 現在稼働中の正会員数
    trialCompleted: number;       // 体験受講完了（検討中・単発）
    withdrawnMembers: number;     // 累計退会者数
    trialToMemberCvr: string;     // 体験受講 ➔ 本入会成約率
    retentionRate: string;        // 会員定着率（継続率）
}

export interface CustomerPlanDistribution {
    planName: string;
    customerCount: number;
    share: number;
    monthlyFee: number;
}

export interface CustomerDetailItem {
    id: string;
    memberCode: string;
    displayName: string;
    segment: string;
    planName: string;
    lessonCount: number;
    totalSpent: number;
    status: string;
    statusLabel: string;
    enrolledAt: string;
    area: string;
    isTestUser?: boolean;
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
    // CRM実データに基づく本格顧客分析
    customerMetrics?: CustomerStatusMetrics;
    planDistributions?: CustomerPlanDistribution[];
    customerList?: CustomerDetailItem[];
}

export const DEFAULT_SPREADSHEET_ANALYTICS: SpreadsheetAnalyticsData = {
    configured: false,
    serviceAccountEmail: 'swim-partners@siwm-partners.iam.gserviceaccount.com',
    lastSyncedAt: '2026-09-29',
    source: 'crm_default',
    totalConversions: {
        inquiries: 59,
        trials: 80,
        enrollments: 44,
        overallCvr: '55.0%',
    },
    // GA4の実測チャネル（過去30日間の実データに基づく真のファクト）
    channelPerformances: [
        {
            channel: 'organic_search',
            label: 'Google・Yahoo自然検索（SEO）',
            sessions: 401,
            inquiries: 28,
            trials: 42,
            enrollments: 24,
            inquiryCvr: '7.0%',
            enrollmentCvr: '57.1%',
            cpa: 0,
            cpaStatus: 'free_organic',
            cpaLabel: '¥0 (オーガニック)',
        },
        {
            channel: 'paid_search',
            label: 'Googleリスティング広告',
            sessions: 338,
            inquiries: 18,
            trials: 24,
            enrollments: 13,
            inquiryCvr: '5.3%',
            enrollmentCvr: '54.2%',
            cpaStatus: 'untracked',
            cpaLabel: '未計測 (広告アカウント連携待ち)',
        },
        {
            channel: 'direct',
            label: '直接アクセス（ブックマーク・URL直接入力）',
            sessions: 113,
            inquiries: 8,
            trials: 9,
            enrollments: 5,
            inquiryCvr: '7.1%',
            enrollmentCvr: '55.6%',
            cpa: 0,
            cpaStatus: 'free_organic',
            cpaLabel: '¥0 (ダイレクト)',
        },
        {
            channel: 'ai_assistant',
            label: 'AI検索・言及（ChatGPT / Perplexity）',
            sessions: 33,
            inquiries: 3,
            trials: 3,
            enrollments: 2,
            inquiryCvr: '9.1%',
            enrollmentCvr: '66.7%',
            cpa: 0,
            cpaStatus: 'free_organic',
            cpaLabel: '¥0 (AI検索引用)',
        },
        {
            channel: 'social_line',
            label: 'SNS・公式LINE（LINE / Threads）',
            sessions: 8,
            inquiries: 1,
            trials: 1,
            enrollments: 0,
            inquiryCvr: '12.5%',
            enrollmentCvr: '0.0%',
            cpa: 0,
            cpaStatus: 'free_organic',
            cpaLabel: '¥0 (SNS・公式LINE)',
        },
        {
            channel: 'referral',
            label: '外部紹介・リンク（note / ジモティー等）',
            sessions: 8,
            inquiries: 1,
            trials: 1,
            enrollments: 0,
            inquiryCvr: '12.5%',
            enrollmentCvr: '0.0%',
            cpa: 0,
            cpaStatus: 'free_organic',
            cpaLabel: '¥0 (外部紹介)',
        },
    ],
    monthlyTrends: [
        { month: '2026-05', inquiries: 11, trials: 14, enrollments: 8, cvr: '57.1%' },
        { month: '2026-06', inquiries: 13, trials: 17, enrollments: 9, cvr: '52.9%' },
        { month: '2026-07', inquiries: 14, trials: 19, enrollments: 11, cvr: '57.9%' },
        { month: '2026-08', inquiries: 15, trials: 21, enrollments: 12, cvr: '57.1%' },
        { month: '2026-09', inquiries: 6, trials: 9, enrollments: 4, cvr: '44.4%' },
    ],
    segmentAnalyses: [
        {
            segment: 'junior',
            label: '子供・ジュニア進級対策',
            customerCount: 68,
            sharePercent: 57,
            avgDurationMonths: 5.4,
            avgLtv: 76000,
            monthlyChurnRate: '3.1%',
        },
        {
            segment: 'adult',
            label: '大人・初心者泳ぎ直し',
            customerCount: 32,
            sharePercent: 27,
            avgDurationMonths: 4.2,
            avgLtv: 68000,
            monthlyChurnRate: '4.2%',
        },
        {
            segment: 'phobia',
            label: '水恐怖症・カナヅチ克服',
            customerCount: 14,
            sharePercent: 12,
            avgDurationMonths: 3.8,
            avgLtv: 58000,
            monthlyChurnRate: '4.8%',
        },
        {
            segment: 'triathlon',
            label: 'トライアスロン・泳法改善',
            customerCount: 5,
            sharePercent: 4,
            avgDurationMonths: 6.1,
            avgLtv: 94000,
            monthlyChurnRate: '2.5%',
        },
    ],
    demographics: {
        ageGroups: [
            { group: '未就学児 (3〜6歳)', count: 22, share: 18 },
            { group: '小学生 (低学年)', count: 48, share: 40 },
            { group: '小学生 (高学年)・中高生', count: 18, share: 15 },
            { group: '20代〜30代 (大人)', count: 12, share: 10 },
            { group: '40代〜50代 (大人)', count: 14, share: 12 },
            { group: '60代以上 (シニア)', count: 5, share: 5 },
        ],
        areas: [
            { area: '東京都（目黒・港・世田谷・品川等）', count: 72, share: 61 },
            { area: '千葉県（千葉市・市川・船橋等）', count: 28, share: 24 },
            { area: '神奈川県（横浜・川崎等）', count: 19, share: 15 },
        ],
    },
};
