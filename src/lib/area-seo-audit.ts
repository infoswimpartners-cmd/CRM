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
        diagnosisSummary: '専用LP（/personal_swim/meguro）が稼働中。検索順位2位をキープし、閲覧者のCVRも良好。あと1見出しの改善で1位奪取可能。',
        actionAdvice: '「港区・品川区出張」のキーワード見出しを既存目黒LPに追記することで、周辺区の取りこぼしを防止。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '目黒LPを1位へ最適化',
            suggestedSlug: '/personal_swim/meguro',
        },
    },
    {
        id: 'area_tokyo_setagaya_shibuya',
        areaKey: 'setagaya_shibuya',
        areaName: '世田谷・渋谷・新宿',
        prefecture: 'tokyo',
        prefectureJa: '東京都',
        parentRegionLabel: '東京都23区（城西・都心）',
        seoScore: 58,
        status: 'needs_lp',
        statusLabel: '要改善（専用LP未作成・離脱大）',
        primaryKeyword: '水泳 個人レッスン 世田谷',
        currentRank: 8,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 1400,
        ga4RecentSessions: 89,
        competitorDensity: 'High',
        cvrPotential: 4.8,
        majorFacilities: [
            { name: '世田谷区総合運動場温水プール', address: '世田谷区大蔵4-6-1', poolSpecs: '50m公認温水', features: '駐車場完備・ファミリー層最多' },
            { name: '渋谷区スポーツセンタープール', address: '渋谷区西原1-40-1', poolSpecs: '25m温水', features: '幡ヶ谷駅近' },
            { name: '新宿コズミックスポーツセンター', address: '新宿区大久保3-1-2', poolSpecs: '25m温水（8コース）', features: 'アクセス抜群' },
        ],
        diagnosisSummary: 'GA4アクセスは新宿54回・渋谷19回・世田谷16回と最大規模だが、全員が総合トップページに着地しており専用LPがないため離脱が発生中。',
        actionAdvice: '世田谷・新宿のファミリー層向けに「世田谷総合運動場・区内プール出張」を明記した世田谷特化LPを作成すれば月4〜5件の即時CV増が見込めます。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '世田谷専用LPを作成する',
            suggestedSlug: '/personal_swim/setagaya',
        },
    },

    // --- 2. 神奈川エリア（横浜、八景など） ---
    {
        id: 'area_kanagawa_yokohama',
        areaKey: 'yokohama',
        areaName: '横浜エリア（都筑・港北・西区・青葉）',
        prefecture: 'kanagawa',
        prefectureJa: '神奈川県',
        parentRegionLabel: '神奈川エリア',
        seoScore: 45,
        status: 'needs_lp',
        statusLabel: '最優先改善（アクセス第2位・LPなし）',
        primaryKeyword: '水泳 マンツーマン 横浜',
        currentRank: 2,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 1200,
        ga4RecentSessions: 45,
        competitorDensity: 'Medium',
        cvrPotential: 5.0,
        majorFacilities: [
            { name: '横浜国際プール', address: '横浜市都筑区北山田7-3-1', poolSpecs: '50m国際公認・サブ25m', features: '日本屈指のメガ施設・駐車場豊富' },
            { name: '保土ケ谷プール', address: '横浜市保土ケ谷区狩場町223-2', poolSpecs: '25m温水', features: 'アットホームで水深調節あり' },
            { name: '都筑・港北・西スポーツセンター', address: '横浜市各区', poolSpecs: '各25m温水', features: '区民に身近な出張拠点' },
        ],
        diagnosisSummary: '「水泳 マンツーマン 横浜」がGoogle検索2位（CTR 6.4%）でアクセス第2位（45回）を誇るが、専用LP（/personal_swim/yokohama）がないため成約を取りこぼしている最大の急所。',
        actionAdvice: '千葉LPと同じ構成で「横浜専用LP」をSTUDIOで公開し、横浜国際プールや各区スポーツセンター対応を明記すれば、千葉と同等以上の収益柱に成長します。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '横浜専用LPを即時作成する',
            suggestedSlug: '/personal_swim/yokohama',
        },
    },
    {
        id: 'area_kanagawa_hakkei',
        areaKey: 'hakkei_kanazawa',
        areaName: '八景・金沢・磯子・横須賀エリア',
        prefecture: 'kanagawa',
        prefectureJa: '神奈川県',
        parentRegionLabel: '神奈川エリア（南部・ベイサイド）',
        seoScore: 28,
        status: 'untapped_opportunity',
        statusLabel: '未開拓・ブルーオーシャン（競合ゼロ）',
        primaryKeyword: '水泳 個人レッスン 金沢八景 横浜',
        currentRank: null,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 350,
        ga4RecentSessions: 8,
        competitorDensity: 'Low',
        cvrPotential: 4.8,
        majorFacilities: [
            { name: '横浜プールセンター（本牧・磯子）', address: '横浜市中区・磯子区', poolSpecs: '屋外・温水併設', features: '南部エリアの拠点' },
            { name: '金沢スポーツセンター温水プール', address: '横浜市金沢区泥亀2-14-1', poolSpecs: '25m温水', features: '金沢文庫・八景至近' },
            { name: '横須賀市温水プール（すこやかん）', address: '横須賀市西逸見町1-38-11', poolSpecs: '25m温水（リハビリ対応）', features: 'シニア・大人の健康志向最多' },
        ],
        diagnosisSummary: '金沢八景・磯子・横須賀方面は個人指導スイミングの競合がほぼゼロ。大手の集団スクールしか選択肢がないため、個別指導の需要が潜在的に極めて高いブルーオーシャン。',
        actionAdvice: '「金沢八景・磯子・横須賀出張対応」の地域特化コラム記事を作成することで、少ない労力で地域独占1位を獲得可能。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '八景・南部特化記事を作成する',
            suggestedSlug: '/articles/kanagawa-hakkei-private-swim',
        },
    },
    {
        id: 'area_kanagawa_kawasaki',
        areaKey: 'kawasaki_kosugi',
        areaName: '川崎・武蔵小杉・中原区',
        prefecture: 'kanagawa',
        prefectureJa: '神奈川県',
        parentRegionLabel: '神奈川エリア（多摩川沿い）',
        seoScore: 42,
        status: 'needs_lp',
        statusLabel: '要改善（タワマン子育て層需要大）',
        primaryKeyword: '水泳 個人レッスン 武蔵小杉 川崎',
        currentRank: 14,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 790,
        ga4RecentSessions: 14,
        competitorDensity: 'Medium',
        cvrPotential: 4.9,
        majorFacilities: [
            { name: '川崎市とどろきアリーナプール', address: '川崎市中原区等々力1-3', poolSpecs: '25m温水（6コース）', features: '武蔵小杉駅近・駐車場完備' },
            { name: '中原市民館・高津スポーツセンター', address: '川崎市中原区・高津区', poolSpecs: '25m温水', features: 'ファミリー層密集体幹' },
        ],
        diagnosisSummary: '武蔵小杉周辺のタワーマンション子育てファミリーによる進級対策需要が急増中。現状は14位と出遅れているため、専用コンテンツでの巻き返しが必要。',
        actionAdvice: '「武蔵小杉・とどろきアリーナ出張個別水泳」の専用記事を作成し、進級テスト対策を訴求。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '武蔵小杉・川崎記事を作成する',
            suggestedSlug: '/articles/musashikosugi-swim-lesson',
        },
    },

    // --- 3. 多摩・東京市部（八王子など） ---
    {
        id: 'area_tokyo_hachioji',
        areaKey: 'hachioji_machida',
        areaName: '八王子・町田・多摩エリア',
        prefecture: 'tokyo',
        prefectureJa: '東京都',
        parentRegionLabel: '多摩・東京市部',
        seoScore: 35,
        status: 'untapped_opportunity',
        statusLabel: '未開拓・高需要（多摩最大商圏）',
        primaryKeyword: '水泳 個人レッスン 八王子',
        currentRank: null,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 650,
        ga4RecentSessions: 11,
        competitorDensity: 'Low',
        cvrPotential: 4.7,
        majorFacilities: [
            { name: '八王子市富士森公園温水プール', address: '八王子市台町2-3-7', poolSpecs: '25m温水（可動床あり）', features: '八王子最大の拠点・水深調整可能' },
            { name: '町田市立室内プール', address: '町田市図師町199-1', poolSpecs: '50m温水・25m温水', features: '広大・初心者専用レーン完備' },
            { name: '多摩市立温水プール（アクアブルー多摩）', address: '多摩市南野3-3', poolSpecs: '50m/流れるプール', features: '水恐怖症克服に最適' },
        ],
        diagnosisSummary: '八王子市は人口56万人の多摩最大中核都市。大手スクールは定員飽和でキャンセル待ちが多発しており、出張個別指導への転換余地が極めて大。',
        actionAdvice: '「八王子富士森プール出張」を明記した特化ページを作成することで、多摩地区の独占シェアを獲得できます。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '八王子特化LP/記事を作成する',
            suggestedSlug: '/articles/hachioji-private-swim',
        },
    },

    // --- 4. 千葉エリア（浦安、市川、船橋、千葉市） ---
    {
        id: 'area_chiba_city',
        areaKey: 'chiba_city',
        areaName: '千葉市エリア（美浜・中央・稲毛）',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア',
        seoScore: 90,
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
        areaKey: 'funabashi',
        areaName: '船橋市エリア',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア',
        seoScore: 74,
        status: 'in_progress',
        statusLabel: '要強化（GA4アクセス第3位）',
        primaryKeyword: '水泳 個人レッスン 船橋',
        currentRank: 5,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/chiba',
        hasDedicatedLp: true,
        monthlySearchVolume: 710,
        ga4RecentSessions: 23,
        competitorDensity: 'Medium',
        cvrPotential: 4.8,
        majorFacilities: [
            { name: '船橋市運動公園プール', address: '船橋市夏見台6-4-1', poolSpecs: '屋外・屋内温水ドーム', features: '船橋市民のメイン拠点' },
            { name: 'グラスポ（法典公園プール）', address: '船橋市藤原5-9-10', poolSpecs: '25m温水', features: '西船橋・法典至近' },
        ],
        diagnosisSummary: 'GA4で船橋市から23セッション（市区町村別第3位）と極めてアクセスが多い。千葉総合LPで受けているが、船橋市独自の施設情報が不足。',
        actionAdvice: '千葉LP内に「船橋運動公園プール対応セクション」を追記するか、船橋特化記事を作成してCVRを向上。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '船橋対応コンテンツを強化',
            suggestedSlug: '/articles/funabashi-swim-lesson',
        },
    },
    {
        id: 'area_chiba_ichikawa',
        areaKey: 'ichikawa',
        areaName: '市川市エリア（本八幡・行徳）',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア',
        seoScore: 68,
        status: 'in_progress',
        statusLabel: '要強化（東京通勤・ファミリー層）',
        primaryKeyword: '水泳 マンツーマン 市川市',
        currentRank: 6,
        targetRank: 1,
        dedicatedLpPath: '/personal_swim/chiba',
        hasDedicatedLp: true,
        monthlySearchVolume: 580,
        ga4RecentSessions: 9,
        competitorDensity: 'Low',
        cvrPotential: 4.7,
        majorFacilities: [
            { name: '市川市市民プール温水館', address: '市川市北方町4-2270-3', poolSpecs: '25m温水', features: '本八幡・下総中山エリア' },
            { name: '塩浜市民体育館温水プール', address: '市川市塩浜4-9-1', poolSpecs: '25m温水', features: '行徳・南行徳至近' },
        ],
        diagnosisSummary: '東京に隣接する市川市は、都内通勤者や子育て層の需要が高い。千葉LPで拾えているが「市川市内のプール」の記載を厚くすることで成約率向上が可能。',
        actionAdvice: '市川市民プールでの受講フローを明記したコラムを追記。',
        recommendedAction: {
            actionType: 'optimize_lp',
            label: '市川対応コンテンツを強化',
            suggestedSlug: '/articles/ichikawa-swim-lesson',
        },
    },
    {
        id: 'area_chiba_urayasu',
        areaKey: 'urayasu',
        areaName: '浦安市エリア（新浦安・舞浜）',
        prefecture: 'chiba',
        prefectureJa: '千葉県',
        parentRegionLabel: '千葉エリア（ベイサイド富裕層）',
        seoScore: 32,
        status: 'untapped_opportunity',
        statusLabel: '未開拓・高購買力（新浦安ファミリー）',
        primaryKeyword: '水泳 個人レッスン 浦安 新浦安',
        currentRank: null,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 620,
        ga4RecentSessions: 6,
        competitorDensity: 'Low',
        cvrPotential: 5.0,
        majorFacilities: [
            { name: '浦安市運動公園総合体育館プール', address: '浦安市舞浜2-27', poolSpecs: '屋内50m/25m温水・健康プール', features: '舞浜駅近・設備最高峰・リゾート感' },
            { name: '浦安市中央武道館プール', address: '浦安市猫実1-18-15', poolSpecs: '25m温水', features: '元町エリアの拠点' },
        ],
        diagnosisSummary: '新浦安エリアは高所得子育てファミリーが密集し、ディズニー周辺の「浦安市運動公園プール（舞浜）」は都内高級ホテル並みの充実設備。競合が手薄で最高確度の未開拓市場。',
        actionAdvice: '「浦安市運動公園プール出張対応・新浦安個別指導」の特化ページを即時作成し、地域1位を独占すべき。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '浦安専用LP/記事を作成する',
            suggestedSlug: '/articles/urayasu-private-swim',
        },
    },

    // --- 5. 提案エリア: 埼玉・城北 ---
    {
        id: 'area_saitama_central',
        areaKey: 'saitama_kawaguchi',
        areaName: 'さいたま市・川口市エリア',
        prefecture: 'saitama',
        prefectureJa: '埼玉県',
        parentRegionLabel: '提案エリア（埼玉・京浜東北線）',
        seoScore: 38,
        status: 'untapped_opportunity',
        statusLabel: '次期拡大推奨エリア（人口過密）',
        primaryKeyword: '水泳 個人レッスン さいたま市 川口',
        currentRank: null,
        targetRank: 1,
        dedicatedLpPath: null,
        hasDedicatedLp: false,
        monthlySearchVolume: 840,
        ga4RecentSessions: 16,
        competitorDensity: 'Low',
        cvrPotential: 4.6,
        majorFacilities: [
            { name: 'さいたま市下落合プール（与野）', address: 'さいたま市中央区下落合5-11-10', poolSpecs: '25m温水', features: '大宮・浦和からアクセス良' },
            { name: '川口市青木町公園総合運動場プール', address: '川口市西青木4-8-1', poolSpecs: '50m公認温水', features: '京浜東北線沿線最大' },
        ],
        diagnosisSummary: 'GA4で埼玉県から既に16セッションあり。川口・浦和・大宮は東京へのアクセスも良く、公営プール出張の需要が十分に顕在化。',
        actionAdvice: '都内コーチの出張可能範囲として「さいたま・川口対応」のパイロット記事を作成。',
        recommendedAction: {
            actionType: 'create_lp',
            label: '埼玉対応コンテンツを企画',
            suggestedSlug: '/articles/saitama-swim-lesson',
        },
    },
];

/**
 * 地域グループ別の集計データを算出
 */
export function getAreaRegionGroups(): AreaRegionGroup[] {
    const groupMap: Record<string, { label: string; areas: AreaSeoAuditItem[] }> = {
        'tokyo_23': { label: '東京都23区（都心・城南・城西）', areas: [] },
        'kanagawa': { label: '神奈川エリア（横浜・八景・川崎）', areas: [] },
        'chiba': { label: '千葉エリア（浦安・市川・船橋・千葉市）', areas: [] },
        'tokyo_tama': { label: '多摩・東京市部（八王子・町田）', areas: [] },
        'saitama': { label: '提案エリア（さいたま・川口）', areas: [] },
    };

    for (const item of AREA_SEO_AUDIT_DATA) {
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
