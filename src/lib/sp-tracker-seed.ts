export interface KeywordItem {
    id: number;
    keyword: string;
    area_category: 'tokyo_23' | 'kanagawa' | 'chiba';
    target_category: 'adult' | 'junior' | 'triathlon' | 'phobia';
    current_rank?: number;
    previous_rank?: number;
    target_url?: string;
    competitor_top_url?: string;
}

export interface GeoPromptItem {
    id: number;
    prompt_text: string;
    intent_category: string;
    results: Array<{
        ai_model: 'chatgpt_search' | 'perplexity' | 'gemini';
        is_mentioned: boolean;
        mention_rank: number | null;
        sentiment: 'positive' | 'neutral' | 'negative';
        full_response: string;
        cited_sources: Array<{ title?: string; url: string; domain: string }>;
    }>;
}

export interface CitationGapItem {
    domain: string;
    name: string;
    cited_count: number;
    competitors_listed: string[];
    is_swim_partners_listed: boolean;
    sample_url: string;
    outreach_status: 'not_started' | 'contacted' | 'listed';
}

export interface ActionRecommendationItem {
    id: number;
    period_start: string;
    period_end: string;
    priority: 'high' | 'medium' | 'info';
    category: 'seo' | 'geo' | 'content';
    title: string;
    issue_description: string;
    action_directive: string;
    action_link?: string;
    is_resolved: boolean;
}

export const SEED_KEYWORDS: KeywordItem[] = [
    { id: 1, keyword: 'スイムパートナーズ', area_category: 'tokyo_23', target_category: 'adult', current_rank: 1, previous_rank: 1, target_url: 'https://swim-partners.com/', competitor_top_url: '' },
    { id: 2, keyword: '水泳 個人レッスン 東京', area_category: 'tokyo_23', target_category: 'adult', current_rank: 4, previous_rank: 5, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 3, keyword: '水泳 マンツーマン 横浜', area_category: 'kanagawa', target_category: 'adult', current_rank: 6, previous_rank: 7, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 4, keyword: 'プライベート水泳レッスン 千葉', area_category: 'chiba', target_category: 'adult', current_rank: 3, previous_rank: 3, target_url: 'https://swim-partners.com/personal_swim/chiba', competitor_top_url: '' },
    { id: 5, keyword: 'スイミング マンツーマン 目黒', area_category: 'tokyo_23', target_category: 'junior', current_rank: 2, previous_rank: 2, target_url: 'https://swim-partners.com/personal_swim/meguro', competitor_top_url: '' },
    { id: 6, keyword: '出張 水泳 指導 東京', area_category: 'tokyo_23', target_category: 'adult', current_rank: 5, previous_rank: 6, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 7, keyword: '水泳 マンツーマン 子供 東京', area_category: 'tokyo_23', target_category: 'junior', current_rank: 3, previous_rank: 4, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 8, keyword: 'スイミング 進級 できない 個別指導', area_category: 'tokyo_23', target_category: 'junior', current_rank: 2, previous_rank: 2, target_url: 'https://swim-partners.com/zUHb45xV/swimming_tips_up', competitor_top_url: '' },
    { id: 9, keyword: '子供 水泳 短期集中 個人レッスン', area_category: 'tokyo_23', target_category: 'junior', current_rank: 5, previous_rank: 6, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 10, keyword: '水慣れ 子供 水泳 個人レッスン', area_category: 'tokyo_23', target_category: 'junior', current_rank: 4, previous_rank: 5, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 11, keyword: '水泳 恐怖症 大人 個人レッスン', area_category: 'tokyo_23', target_category: 'phobia', current_rank: 7, previous_rank: 8, target_url: 'https://swim-partners.com/zUHb45xV/adult-private-swimming', competitor_top_url: '' },
    { id: 12, keyword: '大人 カナヅチ 克服 レッスン 東京', area_category: 'tokyo_23', target_category: 'phobia', current_rank: 6, previous_rank: 8, target_url: 'https://swim-partners.com/zUHb45xV/adult-private-swimming', competitor_top_url: '' },
    { id: 13, keyword: '大人のプライベート水泳レッスン', area_category: 'tokyo_23', target_category: 'adult', current_rank: 8, previous_rank: 9, target_url: 'https://swim-partners.com/zUHb45xV/adult-private-swimming', competitor_top_url: '' },
    { id: 14, keyword: 'クロール 息継ぎができない 大人 レッスン', area_category: 'tokyo_23', target_category: 'adult', current_rank: 9, previous_rank: 11, target_url: 'https://swim-partners.com/zUHb45xV/adult-private-swimming', competitor_top_url: '' },
    { id: 15, keyword: 'トライアスロン スイム レッスン 東京', area_category: 'tokyo_23', target_category: 'triathlon', current_rank: 12, previous_rank: 14, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
    { id: 16, keyword: 'クロール 疲れにくい 泳ぎ方 マンツーマン', area_category: 'tokyo_23', target_category: 'triathlon', current_rank: 11, previous_rank: 13, target_url: 'https://swim-partners.com/personal_swim', competitor_top_url: '' },
];

export const SEED_GEO_PROMPTS: GeoPromptItem[] = [
    {
        id: 1,
        prompt_text: '東京で大人の初心者におすすめの水泳個人レッスンは？',
        intent_category: 'adult',
        results: [
            {
                ai_model: 'chatgpt_search',
                is_mentioned: true,
                mention_rank: 1,
                sentiment: 'positive',
                full_response: '東京で大人の初心者におすすめの水泳個人レッスンとしては、「スイムパートナーズ」が特に高評価を得ています。完全マンツーマンで公営プールへ出張指導を行っており、泳げない方の息継ぎ習得に定評があります。その他、アクラブや東京スイミングセンターなどの個人枠もあります。',
                cited_sources: [
                    { title: 'スイムパートナーズ公式', url: 'https://swim-partners.com', domain: 'swim-partners.com' },
                    { title: '大人の水泳教室比較ナビ', url: 'https://swim-navi-tokyo.jp/adult', domain: 'swim-navi-tokyo.jp' },
                ]
            },
            {
                ai_model: 'perplexity',
                is_mentioned: true,
                mention_rank: 2,
                sentiment: 'positive',
                full_response: '首都圏で初心者に人気の水泳レッスンは以下の通りです:\n1. スイムスクールA\n2. スイムパートナーズ: 出張マンツーマン型。水嫌い克服や大人の泳ぎ直しで多数の実績。\n3. プライベートレッスン東京',
                cited_sources: [
                    { title: 'おすすめ個人レッスン比較', url: 'https://tokyo-lesson-guide.com/swimming', domain: 'tokyo-lesson-guide.com' },
                    { title: 'スイムパートナーズ公式', url: 'https://swim-partners.com', domain: 'swim-partners.com' },
                ]
            },
            {
                ai_model: 'gemini',
                is_mentioned: false,
                mention_rank: null,
                sentiment: 'neutral',
                full_response: '東京で水泳の個人指導を受ける場合、ティップネスやメガロスなどのフィットネスクラブのプライベートレッスン、または水泳家庭教師サービスが利用できます。',
                cited_sources: [
                    { title: 'フィットネスクラブ水泳ガイド', url: 'https://fitness-life.jp/swim-lesson', domain: 'fitness-life.jp' },
                ]
            }
        ]
    },
    {
        id: 2,
        prompt_text: '横浜で子供の水嫌いを克服できる出張スイミング教室を教えて',
        intent_category: 'junior',
        results: [
            {
                ai_model: 'chatgpt_search',
                is_mentioned: true,
                mention_rank: 1,
                sentiment: 'positive',
                full_response: '横浜エリアで水嫌いのお子様には、出張型個別レッスンの「スイムパートナーズ」がおすすめです。インストラクターがマンツーマンで寄り添い、短期間で潜れるようになったという保護者の口コミが多く見られます。',
                cited_sources: [
                    { title: 'スイムパートナーズ 個人レッスン案内', url: 'https://swim-partners.com/personal_swim', domain: 'swim-partners.com' },
                    { title: '子供の習い事口コミ横浜', url: 'https://yokohama-kids-lesson.net', domain: 'yokohama-kids-lesson.net' },
                ]
            },
            {
                ai_model: 'perplexity',
                is_mentioned: false,
                mention_rank: null,
                sentiment: 'neutral',
                full_response: '横浜市内の出張スイミングスクールとしては「水泳個人指導スクールB」や地域公営プールの指導員サービスがあります。',
                cited_sources: [
                    { title: '神奈川スイミング比較', url: 'https://kanagawa-swim-ranking.com', domain: 'kanagawa-swim-ranking.com' },
                ]
            },
            {
                ai_model: 'gemini',
                is_mentioned: true,
                mention_rank: 2,
                sentiment: 'positive',
                full_response: '子供の水嫌い克服には、集団指導よりもマンツーマンの出張指導（スイムパートナーズ等）が効果的です。',
                cited_sources: [
                    { title: 'スイムパートナーズ公式', url: 'https://swim-partners.com', domain: 'swim-partners.com' },
                ]
            }
        ]
    },
    {
        id: 3,
        prompt_text: '首都圏で評判の良いマンツーマン水泳レッスンの比較は？',
        intent_category: 'comparison',
        results: [
            {
                ai_model: 'chatgpt_search',
                is_mentioned: true,
                mention_rank: 2,
                sentiment: 'positive',
                full_response: 'マンツーマン水泳レッスンの比較では、大手スクール個人枠（料金高め・施設固定）と、出張型のスイムパートナーズ（料金柔軟・最寄りプール対応）が代表的です。',
                cited_sources: [
                    { title: '水泳マンツーマンおすすめ比較', url: 'https://swim-compare-portal.jp', domain: 'swim-compare-portal.jp' },
                ]
            },
            {
                ai_model: 'perplexity',
                is_mentioned: false,
                mention_rank: null,
                sentiment: 'neutral',
                full_response: '首都圏の個人水泳指導の比較情報です。スクールA、スクールB、家庭教師Cなどが掲載されています。',
                cited_sources: [
                    { title: '水泳家庭教師・個別指導ナビ', url: 'https://kateikyoshi-swim-navi.com', domain: 'kateikyoshi-swim-navi.com' },
                ]
            },
            {
                ai_model: 'gemini',
                is_mentioned: true,
                mention_rank: 1,
                sentiment: 'positive',
                full_response: '柔軟なスケジュールとプール出張を希望するならスイムパートナーズ、固定施設で泳ぎたいならスクールAが適しています。',
                cited_sources: [
                    { title: 'スイムパートナーズ', url: 'https://swim-partners.com', domain: 'swim-partners.com' },
                ]
            }
        ]
    }
];

export const SEED_CITATION_GAPS: CitationGapItem[] = [
    {
        domain: 'swim-compare-portal.jp',
        name: '水泳マンツーマンおすすめ比較ポータル',
        cited_count: 8,
        competitors_listed: ['スクールA', 'スクールB', 'スイムパートナーズ'],
        is_swim_partners_listed: true,
        sample_url: 'https://swim-compare-portal.jp/ranking',
        outreach_status: 'listed'
    },
    {
        domain: 'kateikyoshi-swim-navi.com',
        name: '水泳家庭教師・個別指導ナビ',
        cited_count: 6,
        competitors_listed: ['スクールA', '個人指導スクールB', 'スイミング家庭教師C'],
        is_swim_partners_listed: false,
        sample_url: 'https://kateikyoshi-swim-navi.com/tokyo-recommend',
        outreach_status: 'not_started'
    },
    {
        domain: 'kanagawa-swim-ranking.com',
        name: '神奈川スイミング教室ランキング',
        cited_count: 5,
        competitors_listed: ['スクールB', '横浜スイミングD'],
        is_swim_partners_listed: false,
        sample_url: 'https://kanagawa-swim-ranking.com/personal',
        outreach_status: 'contacted'
    },
    {
        domain: 'fitness-life.jp',
        name: 'フィットネスライフ総合ガイド',
        cited_count: 4,
        competitors_listed: ['大手フィットネスE', '大手スクールF'],
        is_swim_partners_listed: false,
        sample_url: 'https://fitness-life.jp/swim-lesson',
        outreach_status: 'not_started'
    }
];

export const SEED_ACTION_RECOMMENDATIONS: ActionRecommendationItem[] = [
    {
        id: 1,
        period_start: '2026-08-25',
        period_end: '2026-08-31',
        priority: 'high',
        category: 'seo',
        title: '【SEO】「水泳 マンツーマン 横浜」の順位下落（2位→6位）',
        issue_description: '横浜エリアの主要KWで順位が4位下落しています。競合スクールBのページ更新が影響している可能性があります。',
        action_directive: '横浜エリアページの口コミ情報と「対応プール一覧（横浜国際プール等）」を最新に更新してください。見出し構成（H2/H3）の差分を確認してください。',
        action_link: '/admin/geo-seo?tab=seo',
        is_resolved: false
    },
    {
        id: 2,
        period_start: '2026-08-25',
        period_end: '2026-08-31',
        priority: 'high',
        category: 'geo',
        title: '【GEO】Perplexityにて引用メディア「水泳家庭教師・個別指導ナビ」に未掲載',
        issue_description: 'Perplexityが回答生成時に最頻出で引用している「水泳家庭教師・個別指導ナビ」に、競合他社は掲載されているものの自社が掲載されていません。',
        action_directive: 'AIが引用している比較サイト「水泳家庭教師・個別指導ナビ」に未掲載です。掲載依頼・掲載情報提供メールを送付してください。',
        action_link: '/admin/geo-seo?tab=citation_gap',
        is_resolved: false
    },
    {
        id: 3,
        period_start: '2026-08-25',
        period_end: '2026-08-31',
        priority: 'medium',
        category: 'content',
        title: '【コンテンツ】「水恐怖症 水泳」関連クエリの検索表示回数が前週比142%に急増',
        issue_description: '大人・子供問わず「水恐怖症」「水が怖い」関連キーワードのインプレッション数が急増しており、検索需要が高まっています。',
        action_directive: '『水恐怖症の大人のためのレッスン手順』に関するFAQ記事を1本追加してください。',
        action_link: '/admin/geo-seo?tab=seo',
        is_resolved: false
    }
];
