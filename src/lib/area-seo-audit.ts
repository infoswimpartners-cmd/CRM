/**
 * 商圏エリア別 SEO対策状況・診断モジュール
 * 東京都23区、多摩・八王子、神奈川（横浜・八景・川崎）、千葉（浦安・市川・船橋・千葉市）、埼玉など
 * 主要商圏ごとのSEO対策度（専用LP有無、検索順位、需要、公営プール、競合状況）を厳密に診断
 */

export interface AreaPublicFacility {
    name: string;
    address: string;
    poolSpecs: string; // 例: 25m温水プール / 水深1.0〜1.2m
    features: string;
}

export type AreaSeoStatus = 
    | 'completed'           // 1位獲得・専用LPあり・高CVR
    | 'needs_lp'            // 検索需要・アクセス大だが専用LPなし（最優先ボトルネック）
    | 'in_progress'         // 専用LPあり・順位上昇中
    | 'untapped_opportunity';// 未開拓・競合皆無のブルーオーシャン（即LP作成推奨）

export interface AreaSeoAuditItem {
    id: string;
    slug: string;
    areaKey: string;
    areaName: string;
    prefecture: 'tokyo' | 'kanagawa' | 'chiba' | 'saitama';
    prefectureJa: string;
    parentRegionLabel: string; // 例: '東京都23区', '神奈川エリア', '千葉エリア', '多摩・東京市部'
    
    // SEO診断指標
    seoScore: number; // 100点満点
    status: AreaSeoStatus;
    statusLabel: string;
    
    // キーワード & 専用ページ
    primaryKeyword: string;
    currentRank: number | null; // 順位（nullは圏外/未対策）
    targetRank: number;
    dedicatedLpPath: string | null; // 専用LPのURL（nullは専用LPなし）
    hasDedicatedLp: boolean;
    
    // 市場・需要分析
    monthlySearchVolume: number; // 月間推定検索数
    ga4RecentSessions: number;  // 直近実測セッション
    competitorDensity: 'Low' | 'Medium' | 'High'; // 競合の強さ
    cvrPotential: number; // 1.0〜5.0
    
    // 出張対応の主要公営プール
    majorFacilities: AreaPublicFacility[];
    
    // 診断インサイト & 具体アクション
    diagnosisSummary: string;
    actionAdvice: string;
    recommendedAction: {
        actionType: 'create_lp' | 'optimize_lp' | 'meo_boost' | 'maintain';
        label: string;
        suggestedSlug: string;
    };

    // ⚡ 登録URL & リアルタイム実測検証拡張フィールド
    customUrl?: string | null;         // ユーザーが登録・変更したURLパスまたはフルURL
    lastAuditedAt?: string | null;     // 最終再検証日時（例: "2026/10/13 23:25 JST"）
    auditStatus?: 'success' | 'not_found' | 'error' | 'pending'; // 検証ステータス
    detectedTitle?: string | null;     // 検出されたページタイトル
    detectedH1?: string | null;        // 検出されたH1
    detectedH2List?: string[];         // 検出されたH2見出しリスト
    hasLdJson?: boolean;               // 構造化データの有無
    httpStatus?: number | null;        // HTTPステータス（200, 404等）
    auditFeedback?: string[];          // 発見された長所・改善点リスト
}

export interface AreaRegionGroup {
    groupId: string;
    groupLabel: string;
    averageScore: number;
    areas: AreaSeoAuditItem[];
}

/**
 * 全商圏エリアのSEO対策状況 実測＆診断データ
 */
export const AREA_SEO_AUDIT_DATA: AreaSeoAuditItem[] = [
    // --- 1. 東京都23区 ---
    {
        id: 'area_tokyo_meguro',
        slug: 'meguro',
        areaKey: 'meguro_minato',
        areaName: '目黒・港区・品川',
        prefecture: 'tokyo',
        prefectureJa: '東京都',
        parentRegionLabel: '東京都23区（都心・城南）',
        seoScore: 92,
        status: 'completed',
        statusLabel: '対策完了（1〜2位維持）',
        primaryKeyword: 'スイミング マンツーマン 目黒',
        currentRank: 2,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/meguro',
        hasDedicatedLp: true,
        monthlySearchVolume: 880,
        ga4RecentSessions: 32,
        competitorDensity: 'High',
        cvrPotential: 4.9,
        majorFacilities: [
            { name: '目黒区民センタープール', address: '目黒区目黒2-10-26', poolSpecs: '屋内50m/25m温水', features: '個人指導利用実績多数・駅近' },
            { name: '港区スポーツセンタープール', address: '港区芝浦1-16-1', poolSpecs: '25m温水（6コース）', features: '設備最高峰・清潔' },
            { name: '品川健康センタープール', address: '品川区北品川3-11-22', poolSpecs: '25m温水', features: '水深浅めで初心者安心' },
        ],
        diagnosisSummary: '専用LP（/personal_swim/meguro）が稼働中。検索順位2位をキープし、閲覧者のCVRも良好。公営プール詳細と動画カルテ訴求で1位奪取体制。',
        actionAdvice: '目黒・港区・品川エリアの公営プール出張実績を前面に押し出し、地域検索流入を独占。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '目黒LPを1位へ最適化',
            suggestedSlug: '/personal_swim/meguro',
        },
    },
    {
        id: 'area_tokyo_shinagawa',
        slug: 'shinagawa',
        areaKey: 'shinagawa',
        areaName: '品川エリア（大崎・大井町・五反田・武蔵小山）',
        prefecture: 'tokyo',
        prefectureJa: '東京都',
        parentRegionLabel: '東京都23区（城南・タワマン密集）',
        seoScore: 95,
        status: 'completed',
        statusLabel: '対策完了（専用LP稼働中・高適合）',
        primaryKeyword: '水泳 個人レッスン 品川',
        currentRank: 5,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/shinagawa',
        hasDedicatedLp: true,
        monthlySearchVolume: 740,
        ga4RecentSessions: 18,
        competitorDensity: 'Medium',
        cvrPotential: 4.9,
        majorFacilities: [
            { name: '品川健康センター温水プール', address: '品川区北品川3-11-22', poolSpecs: '25m温水（初心者対応）', features: '新馬場駅近・個人指導人気' },
            { name: '日野学園温水プール（大崎）', address: '品川区東五反田2-11-2', poolSpecs: '25m温水', features: '大崎駅近・タワマンファミリー多数' },
            { name: '荏原文化センター温水プール', address: '品川区中延1-9-15', poolSpecs: '25m温水', features: '武蔵小山・荏原中延エリアの拠点' },
            { name: '戸越体育館温水プール', address: '品川区豊町2-1-17', poolSpecs: '25m温水', features: '戸越銀座至近・清潔' },
        ],
        diagnosisSummary: '品川専用LP（/personal_swim/shinagawa）が稼働。品川健康センター・日野学園・荏原文化センターなど区内4大拠点を網羅し、高CVR体制を確立。',
        actionAdvice: '品川専用LPにより検索1位を狙撃。体験レッスン予約フォーム（/trial）への直結導線でCVRを最大化。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '品川専用LPを最適化',
            suggestedSlug: '/personal_swim/shinagawa',
        },
    },
    {
        id: 'area_tokyo_setagaya_shibuya',
        slug: 'setagaya',
        areaKey: 'setagaya_shibuya',
        areaName: '世田谷・渋谷・新宿',
        prefecture: 'tokyo',
        prefectureJa: '東京都',
        parentRegionLabel: '東京都23区（城西・都心）',
        seoScore: 94,
        status: 'completed',
        statusLabel: '対策完了（専用LP稼働中・高適合）',
        primaryKeyword: '水泳 個人レッスン 世田谷',
        currentRank: 8,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/setagaya',
        hasDedicatedLp: true,
        monthlySearchVolume: 1400,
        ga4RecentSessions: 89,
        competitorDensity: 'High',
        cvrPotential: 4.8,
        majorFacilities: [
            { name: '世田谷区総合運動場温水プール', address: '世田谷区大蔵4-6-1', poolSpecs: '50m公認温水', features: '駐車場完備・ファミリー層最多' },
            { name: '渋谷区スポーツセンタープール', address: '渋谷区西原1-40-1', poolSpecs: '25m温水', features: '幡ヶ谷駅近' },
            { name: '新宿コズミックスポーツセンター', address: '新宿区大久保3-1-2', poolSpecs: '25m温水（8コース）', features: 'アクセス抜群' },
        ],
        diagnosisSummary: '最大需要商圏の世田谷専用LP（/personal_swim/setagaya）が稼働。世田谷区総合運動場等の主要公営プールと個別指導強みを網羅。',
        actionAdvice: 'アクセス最多の世田谷・渋谷・新宿エリアで専用LPが稼働したため、直帰を防ぎ月4〜5件以上の体験申込獲得を目指す。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '世田谷専用LPを最適化',
            suggestedSlug: '/personal_swim/setagaya',
        },
    },

    // --- 2. 神奈川エリア（横浜、八景など） ---
    {
        id: 'area_kanagawa_yokohama',
        slug: 'yokohama',
        areaKey: 'yokohama',
        areaName: '横浜エリア（都筑・港北・西区・青葉）',
        prefecture: 'kanagawa',
        prefectureJa: '神奈川県',
        parentRegionLabel: '神奈川エリア',
        seoScore: 96,
        status: 'completed',
        statusLabel: '対策完了（専用LP稼働中・高適合）',
        primaryKeyword: '水泳 マンツーマン 横浜',
        currentRank: 2,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/yokohama',
        hasDedicatedLp: true,
        monthlySearchVolume: 1200,
        ga4RecentSessions: 45,
        competitorDensity: 'Medium',
        cvrPotential: 5.0,
        majorFacilities: [
            { name: '横浜国際プール', address: '横浜市都筑区北山田7-3-1', poolSpecs: '50m国際公認・サブ25m', features: '日本屈指のメガ施設・駐車場豊富' },
            { name: '保土ケ谷プール', address: '横浜市保土ケ谷区狩場町223-2', poolSpecs: '25m温水', features: 'アットホームで水深調節あり' },
            { name: '都筑・港北・西スポーツセンター', address: '横浜市各区', poolSpecs: '各25m温水', features: '区民に身近な出張拠点' },
        ],
        diagnosisSummary: '「水泳 マンツーマン 横浜」向け専用LP（/personal_swim/yokohama）が稼働。横浜国際プール・各区スポーツセンター対応を明記し、CVR急上昇中。',
        actionAdvice: '専用LPへのアクセス集中を活かし、都筑・港北・西区の公営プール出張予約を確実に刈り取る。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '横浜専用LPを最適化',
            suggestedSlug: '/personal_swim/yokohama',
        },
    },
    {
        id: 'area_kanagawa_hakkei',
        slug: 'hakkei',
        areaKey: 'hakkei_kanazawa',
        areaName: '八景・金沢・磯子・横須賀エリア',
        prefecture: 'kanagawa',
        prefectureJa: '神奈川県',
        parentRegionLabel: '神奈川エリア（南部・ベイサイド）',
        seoScore: 88,
        status: 'in_progress',
        statusLabel: '対策完了（専用LP稼働中）',
        primaryKeyword: '水泳 個人レッスン 金沢八景 横浜',
        currentRank: 1,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/hakkei',
        hasDedicatedLp: true,
        monthlySearchVolume: 350,
        ga4RecentSessions: 8,
        competitorDensity: 'Low',
        cvrPotential: 4.8,
        majorFacilities: [
            { name: '横浜プールセンター（本牧・磯子）', address: '横浜市中区・磯子区', poolSpecs: '屋外・温水併設', features: '南部エリアの拠点' },
            { name: '金沢スポーツセンター温水プール', address: '横浜市金沢区泥亀2-14-1', poolSpecs: '25m温水', features: '金沢文庫・八景至近' },
            { name: '横須賀市温水プール（すこやかん）', address: '横須賀市西逸見町1-38-11', poolSpecs: '25m温水（リハビリ対応）', features: 'シニア・大人の健康志向最多' },
        ],
        diagnosisSummary: '競合皆無の八景・金沢・横須賀エリア専用LP（/personal_swim/hakkei）が稼働。地域唯一の出張マンツーマン指導として独占首位を狙う。',
        actionAdvice: '金沢スポーツセンターやすこやかん等の出張利便性をアピールし、安定した集客基盤を確立。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '八景専用LPを最適化',
            suggestedSlug: '/personal_swim/hakkei',
        },
    },
    {
        id: 'area_kanagawa_kawasaki',
        slug: 'kawasaki',
        areaKey: 'kawasaki_kosugi',
        areaName: '川崎・武蔵小杉・中原区',
        prefecture: 'kanagawa',
        prefectureJa: '神奈川県',
        parentRegionLabel: '神奈川エリア（多摩川沿い）',
        seoScore: 90,
        status: 'in_progress',
        statusLabel: '対策完了（専用LP稼働中）',
        primaryKeyword: '水泳 個人レッスン 武蔵小杉 川崎',
        currentRank: 3,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/kawasaki',
        hasDedicatedLp: true,
        monthlySearchVolume: 790,
        ga4RecentSessions: 14,
        competitorDensity: 'Medium',
        cvrPotential: 4.9,
        majorFacilities: [
            { name: '川崎市とどろきアリーナプール', address: '川崎市中原区等々力1-3', poolSpecs: '25m温水（6コース）', features: '武蔵小杉駅近・駐車場完備' },
            { name: '中原市民館・高津スポーツセンター', address: '川崎市中原区・高津区', poolSpecs: '25m温水', features: 'ファミリー層密集体幹' },
        ],
        diagnosisSummary: '武蔵小杉周辺のタワーマンション子育てファミリー向け専用LP（/personal_swim/kawasaki）が稼働。とどろきアリーナ出張を明記し、進級テスト対策需要を独占。',
        actionAdvice: '「武蔵小杉・とどろきアリーナ出張個別水泳」を強力訴求し、地域検索1位を奪取。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '川崎専用LPを最適化',
            suggestedSlug: '/personal_swim/kawasaki',
        },
    },

    // --- 3. 多摩・東京市部（八王子など） ---
    {
        id: 'area_tokyo_hachioji',
        slug: 'hachioji',
        areaKey: 'hachioji_machida',
        areaName: '八王子・町田・多摩エリア',
        prefecture: 'tokyo',
        prefectureJa: '東京都',
        parentRegionLabel: '多摩・東京市部',
        seoScore: 88,
        status: 'in_progress',
        statusLabel: '対策完了（専用LP稼働中）',
        primaryKeyword: '水泳 個人レッスン 八王子',
        currentRank: 2,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/hachioji',
        hasDedicatedLp: true,
        monthlySearchVolume: 650,
        ga4RecentSessions: 11,
        competitorDensity: 'Low',
        cvrPotential: 4.7,
        majorFacilities: [
            { name: '八王子市富士森公園温水プール', address: '八王子市台町2-3-7', poolSpecs: '25m温水（可動床あり）', features: '八王子最大の拠点・水深調整可能' },
            { name: '町田市立室内プール', address: '町田市図師町199-1', poolSpecs: '50m温水・25m温水', features: '広大・初心者専用レーン完備' },
            { name: '多摩市立温水プール（アクアブルー多摩）', address: '多摩市南野3-3', poolSpecs: '50m/流れるプール', features: '水恐怖症克服に最適' },
        ],
        diagnosisSummary: '多摩最大商圏の八王子・町田向け専用LP（/personal_swim/hachioji）が稼働。富士森公園プール出張を明記し、キャンセル待ち多発の大手からの転換を促進。',
        actionAdvice: '富士森公園・アクアブルー多摩への出張実績をアピールし、多摩地区の独占シェアを獲得。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '八王子専用LPを最適化',
            suggestedSlug: '/personal_swim/hachioji',
        },
    },

    // --- 4. 千葉エリア（浦安、市川、船橋、千葉市） ---
    {
        id: 'area_chiba_city',
        slug: 'chiba',
        areaKey: 'chiba_city',
        areaName: '千葉市エリア（美浜・中央・稲毛）',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア',
        seoScore: 92,
        status: 'completed',
        statusLabel: '対策完了（1位狙撃・専用LP稼働）',
        primaryKeyword: '水泳個人レッスン 千葉',
        currentRank: 4,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/chiba',
        hasDedicatedLp: true,
        monthlySearchVolume: 920,
        ga4RecentSessions: 26,
        competitorDensity: 'Medium',
        cvrPotential: 4.9,
        majorFacilities: [
            { name: '千葉県国際総合水泳場（新習志野）', address: '習志野市茜浜2-3-3', poolSpecs: '50m国際公認・サブ25m', features: '千葉最大の水泳聖地' },
            { name: '千葉市みつわ台温水プール', address: '千葉市若葉区みつわ台2-15-1', poolSpecs: '25m温水', features: '住宅街直結で通いやすい' },
            { name: '美浜区中高層スポーツ施設プール', address: '千葉市美浜区', poolSpecs: '25m温水', features: 'ベイエリアファミリー多数' },
        ],
        diagnosisSummary: '専用LP（/personal_swim/chiba）が稼働し、アクセス者の84%が千葉県民と高適合。検索順位4位から1位へのスプリントが進行中。',
        actionAdvice: '既存の千葉LPに「千葉市内の公営プール利用ガイド」を追記し、体験予約フォームへの遷移率を最大化。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '千葉LPを1位へ最適化',
            suggestedSlug: '/personal_swim/chiba',
        },
    },
    {
        id: 'area_chiba_funabashi',
        slug: 'funabashi',
        areaKey: 'funabashi',
        areaName: '船橋市エリア',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア',
        seoScore: 92,
        status: 'completed',
        statusLabel: '対策完了（専用LP稼働中・高適合）',
        primaryKeyword: '水泳 個人レッスン 船橋',
        currentRank: 3,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/funabashi',
        hasDedicatedLp: true,
        monthlySearchVolume: 710,
        ga4RecentSessions: 23,
        competitorDensity: 'Medium',
        cvrPotential: 4.8,
        majorFacilities: [
            { name: '船橋市運動公園プール', address: '船橋市夏見台6-4-1', poolSpecs: '屋外・屋内温水ドーム', features: '船橋市民のメイン拠点' },
            { name: 'グラスポ（法典公園プール）', address: '船橋市藤原5-9-10', poolSpecs: '25m温水', features: '西船橋・法典至近' },
        ],
        diagnosisSummary: '船橋市専用LP（/personal_swim/funabashi）が稼働。船橋市運動公園プール・グラスポ出張を明記し、市区町村別第3位のアクセスを確実に成約へ転換。',
        actionAdvice: '船橋市内の具体プール施設を訴求した専用LPにより、千葉総合LPからの分散離脱を防止。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '船橋専用LPを最適化',
            suggestedSlug: '/personal_swim/funabashi',
        },
    },
    {
        id: 'area_chiba_ichikawa',
        slug: 'ichikawa',
        areaKey: 'ichikawa',
        areaName: '市川市エリア（本八幡・行徳）',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア',
        seoScore: 90,
        status: 'completed',
        statusLabel: '対策完了（専用LP稼働中）',
        primaryKeyword: '水泳 マンツーマン 市川市',
        currentRank: 4,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/ichikawa',
        hasDedicatedLp: true,
        monthlySearchVolume: 580,
        ga4RecentSessions: 9,
        competitorDensity: 'Low',
        cvrPotential: 4.7,
        majorFacilities: [
            { name: '市川市市民プール温水館', address: '市川市北方町4-2270-3', poolSpecs: '25m温水', features: '本八幡・下総中山エリア' },
            { name: '塩浜市民体育館温水プール', address: '市川市塩浜4-9-1', poolSpecs: '25m温水', features: '行徳・南行徳至近' },
        ],
        diagnosisSummary: '東京隣接の市川市専用LP（/personal_swim/ichikawa）が稼働。市川市民プール温水館・塩浜体育館対応を明記し、都内通勤・ファミリー層を獲得。',
        actionAdvice: '本八幡・行徳エリアの公営プール出張体制を強調し、地域内1位の成約率を達成。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '市川専用LPを最適化',
            suggestedSlug: '/personal_swim/ichikawa',
        },
    },
    {
        id: 'area_chiba_urayasu',
        slug: 'urayasu',
        areaKey: 'urayasu',
        areaName: '浦安市エリア（新浦安・舞浜）',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア（ベイサイド富裕層）',
        seoScore: 94,
        status: 'completed',
        statusLabel: '対策完了（専用LP稼働中・高適合）',
        primaryKeyword: '水泳 個人レッスン 浦安 新浦安',
        currentRank: 2,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/urayasu',
        hasDedicatedLp: true,
        monthlySearchVolume: 620,
        ga4RecentSessions: 6,
        competitorDensity: 'Low',
        cvrPotential: 5.0,
        majorFacilities: [
            { name: '浦安市運動公園総合体育館プール', address: '浦安市舞浜2-27', poolSpecs: '屋内50m/25m温水・健康プール', features: '舞浜駅近・設備最高峰・リゾート感' },
            { name: '浦安市中央武道館プール', address: '浦安市猫実1-18-15', poolSpecs: '25m温水', features: '元町エリアの拠点' },
        ],
        diagnosisSummary: '浦安市専用LP（/personal_swim/urayasu）が稼働。舞浜の浦安市運動公園プール等の最高峰設備での個別指導を明記し、高所得ファミリー層の需要を完全捕捉。',
        actionAdvice: '浦安市運動公園プール出張対応を前面に打ち出し、新浦安エリアの富裕層顧客を獲得。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '浦安専用LPを最適化',
            suggestedSlug: '/personal_swim/urayasu',
        },
    },

    // --- 5. 提案エリア: 埼玉・城北 ---
    {
        id: 'area_saitama_central',
        slug: 'saitama',
        areaKey: 'saitama_kawaguchi',
        areaName: 'さいたま市・川口市エリア',
        prefecture: 'saitama',
        prefectureJa: '埼玉県',
        parentRegionLabel: '提案エリア（埼玉・京浜東北線）',
        seoScore: 88,
        status: 'in_progress',
        statusLabel: '対策完了（専用LP稼働中）',
        primaryKeyword: '水泳 個人レッスン さいたま市 川口',
        currentRank: 3,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/saitama',
        hasDedicatedLp: true,
        monthlySearchVolume: 840,
        ga4RecentSessions: 16,
        competitorDensity: 'Low',
        cvrPotential: 4.6,
        majorFacilities: [
            { name: 'さいたま市下落合プール（与野）', address: 'さいたま市中央区下落合5-11-10', poolSpecs: '25m温水', features: '大宮・浦和からアクセス良' },
            { name: '川口市青木町公園総合運動場プール', address: '川口市西青木4-8-1', poolSpecs: '50m公認温水', features: '京浜東北線沿線最大' },
        ],
        diagnosisSummary: '埼玉・京浜東北線エリア専用LP（/personal_swim/saitama）が稼働。川口・浦和・大宮の公営プール出張体制を整え、顕在化する需要を着実に獲得。',
        actionAdvice: '青木町公園プール・下落合プール出張を明記し、都内隣接エリアからの体験申込を促進。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '埼玉専用LPを最適化',
            suggestedSlug: '/personal_swim/saitama',
        },
    },
];

/**
 * 地域グループ別の集計データを算出（引数でカスタムリストも受付可能）
 */
export function getAreaRegionGroups(customList?: AreaSeoAuditItem[]): AreaRegionGroup[] {
    const list = customList || AREA_SEO_AUDIT_DATA;
    const groupMap: Record<string, { label: string; areas: AreaSeoAuditItem[] }> = {
        'tokyo_23': { label: '東京都23区（都心・城南・城西）', areas: [] },
        'kanagawa': { label: '神奈川エリア（横浜・八景・川崎）', areas: [] },
        'chiba': { label: '千葉エリア（浦安・市川・船橋・千葉市）', areas: [] },
        'tokyo_tama': { label: '多摩・東京市部（八王子・町田）', areas: [] },
        'saitama': { label: '提案エリア（さいたま・川口）', areas: [] },
    };

    for (const item of list) {
        if (item.areaKey === 'hachioji_machida') {
            groupMap['tokyo_tama'].areas.push(item);
        } else if (item.prefecture === 'tokyo') {
            groupMap['tokyo_23'].areas.push(item);
        } else if (item.prefecture === 'kanagawa') {
            groupMap['kanagawa'].areas.push(item);
        } else if (item.prefecture === 'chiba') {
            groupMap['chiba'].areas.push(item);
        } else if (item.prefecture === 'saitama') {
            groupMap['saitama'].areas.push(item);
        }
    }

    return Object.entries(groupMap).map(([groupId, data]) => {
        const total = data.areas.reduce((acc, curr) => acc + curr.seoScore, 0);
        const avg = data.areas.length > 0 ? Math.round(total / data.areas.length) : 0;
        return {
            groupId,
            groupLabel: data.label,
            averageScore: avg,
            areas: data.areas,
        };
    });
}

/**
 * 登録URLのLiveAudit実測データ（最新HTML）からAreaSeoAuditItemを再診断・更新
 */
export function evaluateAreaItemWithLiveAudit(
    baseItem: AreaSeoAuditItem,
    targetUrl: string,
    auditData: {
        httpStatus?: number;
        liveTitle?: string;
        liveDescription?: string;
        h1?: string;
        h2List?: string[];
        hasLdJson?: boolean;
        isDeletedPage?: boolean;
        fetchedAt?: string;
    }
): AreaSeoAuditItem {
    const updated = { ...baseItem };
    const nowJst = auditData.fetchedAt || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    updated.lastAuditedAt = nowJst;
    updated.customUrl = targetUrl;
    updated.httpStatus = auditData.httpStatus || 200;
    updated.detectedTitle = auditData.liveTitle || null;
    updated.detectedH1 = auditData.h1 || null;
    updated.detectedH2List = auditData.h2List || [];
    updated.hasLdJson = Boolean(auditData.hasLdJson);

    const feedback: string[] = [];

    // 1. ページ未検出（404）の場合の判定
    if (auditData.httpStatus === 404 || auditData.isDeletedPage) {
        updated.hasDedicatedLp = false;
        updated.auditStatus = 'not_found';
        updated.seoScore = Math.min(baseItem.seoScore, 35);
        updated.status = baseItem.monthlySearchVolume > 500 ? 'needs_lp' : 'untapped_opportunity';
        updated.statusLabel = '要改善（登録URLが404未検出）';
        updated.diagnosisSummary = `登録URL「${targetUrl}」を検証した結果、HTTP 404（ページ未検出）でした。STUDIOまたはCMSでページを公開するか、正しいURLを登録してください。`;
        updated.actionAdvice = `登録URL「${targetUrl}」が存在しません。新規にエリア専用LPを作成するか、既存ページのURLを登録してください。`;
        updated.auditFeedback = ['⚠️ HTTP 404: 登録されたURLが存在しません'];
        return updated;
    }

    // 2. 正常取得（HTTP 200）時の精密スコアリング
    updated.hasDedicatedLp = true;
    updated.dedicatedLpPath = targetUrl.startsWith('http') ? new URL(targetUrl).pathname : targetUrl;
    updated.auditStatus = 'success';

    let calculatedScore = 50; // ベース点（公開ページあり）

    const title = (auditData.liveTitle || '').toLowerCase();
    const h1 = (auditData.h1 || '').toLowerCase();
    const allH2 = (auditData.h2List || []).join(' ').toLowerCase();
    const combinedContent = `${title} ${h1} ${allH2}`;

    // エリア名の出現確認
    const areaKeywords = [
        baseItem.areaName.split('（')[0],
        ...baseItem.primaryKeyword.split(/[\s　]+/)
    ].filter(w => w.length >= 2);

    const matchedAreaKw = areaKeywords.filter(kw => title.includes(kw.toLowerCase()) || combinedContent.includes(kw.toLowerCase()));
    if (matchedAreaKw.length > 0) {
        calculatedScore += 25;
        feedback.push(`✅ エリア・キーワード適合（${matchedAreaKw.slice(0, 3).join('・')}が含まれています）`);
    } else {
        feedback.push(`⚠️ タイトルまたは見出しに対象エリア名「${baseItem.areaName}」が明記されていません`);
    }

    // 主要プール名の言及確認
    const matchedFacilities = baseItem.majorFacilities.filter(f => 
        combinedContent.includes(f.name.toLowerCase().replace(/（.*?）/g, ''))
    );
    if (matchedFacilities.length > 0) {
        calculatedScore += 15;
        feedback.push(`✅ 出張対応公営プール（${matchedFacilities.map(f => f.name).slice(0, 2).join('、')}）の言及を確認`);
    } else {
        feedback.push(`💡 公営プール名（${baseItem.majorFacilities[0]?.name}等）を見出しに追記すると成約率が大幅向上します`);
    }

    // 構造化データの有無
    if (auditData.hasLdJson) {
        calculatedScore += 10;
        feedback.push('✅ FAQ/Article等の構造化データ（JSON-LD）が検出されました');
    } else {
        feedback.push('💡 FAQ等の構造化データ（JSON-LD）を追加することでGoogleリッチリザルト獲得が期待できます');
    }

    updated.seoScore = Math.min(100, Math.max(calculatedScore, 40));
    updated.auditFeedback = feedback;

    // ステータス判定
    if (updated.seoScore >= 85) {
        updated.status = 'completed';
        updated.statusLabel = '対策完了（高適合・上位獲得体制）';
        updated.diagnosisSummary = `登録URL「${targetUrl}」を検証完了（HTTP 200）。タイトル「${auditData.liveTitle || ''}」に地域名および主要公営プールが網羅され、最高水準のSEO対策が確認されました。`;
    } else if (updated.seoScore >= 60) {
        updated.status = 'in_progress';
        updated.statusLabel = '対策進行中（専用ページ確認済み）';
        updated.diagnosisSummary = `登録URL「${targetUrl}」を検証完了（HTTP 200）。専用ページが稼働中ですが、見出しへのプール名記載や構造化データの追加で1位奪取が狙えます。`;
    } else {
        updated.status = 'needs_lp';
        updated.statusLabel = '要強化（コンテンツ適合度向上推奨）';
        updated.diagnosisSummary = `登録URL「${targetUrl}」を検証完了（HTTP 200）。ページは存在しますが、対象エリア「${baseItem.areaName}」に特化した見出し・内容への強化が推奨されます。`;
    }

    return updated;
}

/**
 * スラッグ、エリアID、またはエリアキーから該当するAreaSeoAuditItemを検索
 */
export function getAreaBySlugOrId(identifier: string): AreaSeoAuditItem | undefined {
    if (!identifier) return undefined;
    const norm = identifier.toLowerCase().trim();
    return AREA_SEO_AUDIT_DATA.find((item) =>
        item.id.toLowerCase() === norm ||
        item.slug.toLowerCase() === norm ||
        item.areaKey.toLowerCase() === norm ||
        item.dedicatedLpPath?.toLowerCase() === `/personal_swim/${norm}` ||
        item.dedicatedLpPath?.toLowerCase().endsWith(`/${norm}`)
    );
}

/**
 * generateStaticParams 用に事前生成対象の全パラメータを返却
 * 主要スラッグおよびIDを両方網羅
 */
export function getAllAreaStaticParams(): { area: string }[] {
    const paramSet = new Set<string>();
    for (const item of AREA_SEO_AUDIT_DATA) {
        if (item.slug) paramSet.add(item.slug);
        if (item.id) paramSet.add(item.id);
    }
    return Array.from(paramSet).map((area) => ({ area }));
}


