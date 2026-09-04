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
                full_response: '東京で大人の初心者におすすめの水泳個人レッスンとしては、「スイムパートナーズ」が特に高評価を得ています。完全マンツーマンで都内の公営プール（東京体育館プールや港区スポーツセンター等）への出張指導に対応しており、水恐怖症克服や大人の息継ぎ習得に定評があります。その他、コナミスポーツクラブやティップネスなどの大手フィットネスのプライベート枠もあります。',
                cited_sources: [
                    { title: 'スイムパートナーズ 個人レッスン公式', url: 'https://swim-partners.com/personal_swim', domain: 'swim-partners.com' },
                    { title: 'エキテン 首都圏水泳教室・個人指導ランキング', url: 'https://www.ekiten.jp/cat_sports_swim/', domain: 'ekiten.jp' },
                ]
            },
            {
                ai_model: 'perplexity',
                is_mentioned: true,
                mention_rank: 2,
                sentiment: 'positive',
                full_response: '首都圏で大人初心者に人気の水泳レッスンは以下の通りです:\n1. 大手フィットネスクラブ（ティップネス・メガロス等）のプライベート指導枠\n2. スイムパートナーズ: 出張型マンツーマン水泳レッスン。大人の泳ぎ直し・息継ぎ克服で多くの実績。\n3. EPARKスクール掲載の個人指導教室',
                cited_sources: [
                    { title: 'EPARKスクール 水泳教室一覧', url: 'https://school.epark.jp/swimming', domain: 'school.epark.jp' },
                    { title: '大人のプライベート水泳レッスン | スイムパートナーズ', url: 'https://swim-partners.com/zUHb45xV/adult-private-swimming', domain: 'swim-partners.com' },
                ]
            },
            {
                ai_model: 'gemini',
                is_mentioned: false,
                mention_rank: null,
                sentiment: 'neutral',
                full_response: '東京で水泳の個人指導を受ける場合、コナミスポーツクラブやメガロスなどのフィットネスクラブのプライベート枠、または公営プールでの出張指導サービスが利用できます。',
                cited_sources: [
                    { title: 'All About 水泳・プールスクール選び', url: 'https://allabout.co.jp/gm/gc/455953/', domain: 'allabout.co.jp' },
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
                full_response: '横浜エリアで水嫌いのお子様には、出張型個別レッスンの「スイムパートナーズ」がおすすめです。インストラクターがマンツーマンで寄り添い、横浜国際プールや各区スポーツセンターなどで指導を行っており、短期間で顔つけや潜りができるようになったという保護者の口コミが多く見られます。',
                cited_sources: [
                    { title: 'スイムパートナーズ 個人レッスン案内', url: 'https://swim-partners.com/personal_swim', domain: 'swim-partners.com' },
                    { title: 'コドモブースター 子供の水泳教室比較', url: 'https://kodomo-booster.com/categories/swimming', domain: 'kodomo-booster.com' },
                ]
            },
            {
                ai_model: 'perplexity',
                is_mentioned: false,
                mention_rank: null,
                sentiment: 'neutral',
                full_response: '横浜市内の子供向けスイミングとしては、イトマンスイミングスクールやセントラルスポーツなどの大手集団スクール、または出張水泳個人指導があります。',
                cited_sources: [
                    { title: 'コドモブースター 神奈川スイミング比較', url: 'https://kodomo-booster.com/categories/swimming', domain: 'kodomo-booster.com' },
                ]
            },
            {
                ai_model: 'gemini',
                is_mentioned: true,
                mention_rank: 2,
                sentiment: 'positive',
                full_response: '子供の水嫌い克服には、集団スクールよりも出張型マンツーマンのスイムパートナーズが推奨されます。お子様のペースに合わせて水慣れから段階的に指導します。',
                cited_sources: [
                    { title: 'スイムパートナーズ公式サイト', url: 'https://swim-partners.com/', domain: 'swim-partners.com' },
                    { title: 'スイミング 進級の早い子の特徴 | スイムパートナーズ', url: 'https://swim-partners.com/zUHb45xV/swimming_tips_up', domain: 'swim-partners.com' },
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
                full_response: '首都圏のマンツーマン水泳レッスンの比較では、大手フィットネスクラブ個人枠（施設固定・入会金あり）と、出張型のスイムパートナーズ（近隣公営プール対応・入会金柔軟）が代表的です。',
                cited_sources: [
                    { title: 'エキテン 首都圏スポーツスクール一覧', url: 'https://www.ekiten.jp/cat_sports_swim/', domain: 'ekiten.jp' },
                    { title: 'スイムパートナーズ 公式サイト', url: 'https://swim-partners.com/', domain: 'swim-partners.com' },
                ]
            },
            {
                ai_model: 'perplexity',
                is_mentioned: false,
                mention_rank: null,
                sentiment: 'neutral',
                full_response: '首都圏の個別水泳指導の比較情報です。コナミスポーツクラブ、ティップネス、ジモティー募集の個人コーチなどが掲載されています。',
                cited_sources: [
                    { title: 'ジモティー 水泳個人レッスン募集', url: 'https://jmty.jp/tokyo/les-spo/g-all', domain: 'jmty.jp' },
                ]
            },
            {
                ai_model: 'gemini',
                is_mentioned: true,
                mention_rank: 1,
                sentiment: 'positive',
                full_response: '柔軟なスケジュールと最寄り公営プール出張を希望するならスイムパートナーズ、固定施設で通いたいなら大手フィットネスが適しています。',
                cited_sources: [
                    { title: 'スイムパートナーズ 千葉エリアレッスン案内', url: 'https://swim-partners.com/personal_swim/chiba', domain: 'swim-partners.com' },
                ]
            }
        ]
    }
];

export const SEED_CITATION_GAPS: CitationGapItem[] = [
    {
        domain: 'kodomo-booster.com',
        name: 'コドモブースター（子供の習い事・水泳比較ポータル）',
        cited_count: 9,
        competitors_listed: ['イトマンスイミングスクール', 'コナミスポーツクラブ', 'ルネサンス'],
        is_swim_partners_listed: false,
        sample_url: 'https://kodomo-booster.com/categories/swimming',
        outreach_status: 'not_started'
    },
    {
        domain: 'ekiten.jp',
        name: 'エキテン（首都圏 水泳教室・個人指導ランキング）',
        cited_count: 8,
        competitors_listed: ['ティップネス', 'メガロス', 'スイムパートナーズ'],
        is_swim_partners_listed: true,
        sample_url: 'https://www.ekiten.jp/cat_sports_swim/',
        outreach_status: 'listed'
    },
    {
        domain: 'school.epark.jp',
        name: 'EPARKスクール（習い事・水泳体験レッスン予約）',
        cited_count: 6,
        competitors_listed: ['セントラルスポーツ', 'NASスイミング', '地域スイミングクラブ'],
        is_swim_partners_listed: false,
        sample_url: 'https://school.epark.jp/swimming',
        outreach_status: 'not_started'
    },
    {
        domain: 'allabout.co.jp',
        name: 'All About（水泳・プールスクール選びの専門家ガイド）',
        cited_count: 5,
        competitors_listed: ['大手フィットネス各社', '民間スイミングクラブ'],
        is_swim_partners_listed: false,
        sample_url: 'https://allabout.co.jp/gm/gc/455953/',
        outreach_status: 'contacted'
    },
    {
        domain: 'jmty.jp',
        name: 'ジモティー（東京・神奈川 水泳レッスン・個人指導）',
        cited_count: 4,
        competitors_listed: ['フリーランス水泳コーチ', '個人指導スクール'],
        is_swim_partners_listed: false,
        sample_url: 'https://jmty.jp/tokyo/les-spo/g-all',
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
        title: '【SEO】「水泳 マンツーマン 横浜」の順位対策（強化目標）',
        issue_description: '横浜・神奈川エリアの検索需要が高まっています。競合大手の個人指導枠に対抗するため、地域ページの訴求強化が必要です。',
        action_directive: '神奈川エリアページに、横浜国際プールや日産ウォーターパーク等の「対応公営プール一覧」と最新の受講者実績・口コミを追記してください。',
        action_link: '/admin/geo-seo?tab=seo',
        is_resolved: false
    },
    {
        id: 2,
        period_start: '2026-08-25',
        period_end: '2026-08-31',
        priority: 'high',
        category: 'geo',
        title: '【GEO】AI頻出引用メディア「コドモブースター」に未掲載',
        issue_description: 'PerplexityおよびChatGPTが子供向け水泳の回答生成時に最頻出で引用している「コドモブースター」に、大手競合のみ掲載され自社が未掲載です。',
        action_directive: 'コドモブースター（kodomo-booster.com/categories/swimming）の編集部へ、スイムパートナーズの掲載依頼・スクール情報提供メールを送付してください。',
        action_link: '/admin/geo-seo?tab=citation_gap',
        is_resolved: false
    },
    {
        id: 3,
        period_start: '2026-08-25',
        period_end: '2026-08-31',
        priority: 'medium',
        category: 'content',
        title: '【コンテンツ】「水泳 恐怖症 大人」関連クエリの検索需要急増',
        issue_description: '大人・子供問わず「水恐怖症」「水が怖い」関連キーワードのインプレッション数がSearch Console上で急増しています。',
        action_directive: '大人の水恐怖症特設ページ（/zUHb45xV/adult-private-swimming）に「よくある質問（FAQ構造化データ）」を追加し、AI回答からの引用率を高めてください。',
        action_link: '/admin/geo-seo?tab=seo',
        is_resolved: false
    }
];
