'use server';

import {
    GeneratedArticle,
    ArticleType,
    ArticleStatus,
    getGeneratedArticles,
    saveGeneratedArticle,
    updateArticleStatus,
    deleteGeneratedArticle,
} from '@/lib/generated-articles-storage';
import { generateSeoAioArticle, GenerateArticleParams } from '@/lib/article-generator-engine';

export interface CompetitorAnalysis {
    topCompetitorSites: string[];
    competitorWeakness: string; // 他社記事の弱点・不足している視点
    differentiationStrategy: string; // 当教室ならではの必勝差別化ポイント
}

export interface KeywordIntelligence {
    monthlySearchVolume: number; // 推定月間検索数
    searchIntent: string; // 読者のリアルな悩み・検索意図
    seoDifficulty: 'Low' | 'Medium' | 'High'; // 競合難易度
    conversionPotential: number; // 1.0 〜 5.0 (CVR直結度)
    conversionReason: string; // 体験予約に直結する理由
}

export interface ArticleSuggestion {
    id: string;
    keyword: string;
    category: 'adult' | 'junior' | 'phobia' | 'pricing' | 'form';
    categoryLabel: string;
    isNewOpportunity: boolean; // 既存サイトに未作成の完全新規キーワード
    recommendedType: ArticleType;
    recommendedTypeLabel: string;
    suggestedSlug: string;
    actionTitle: string;
    keywordIntel: KeywordIntelligence;
    competitorAnalysis: CompetitorAnalysis;
    estimatedImpact: string;
}

// これからの新規SEO獲得・CVR最大化のための【未開拓戦略キーワード ✕ 他社分析データバンク】
// ※既存作成済みのページ（進級の早い子、千葉、目黒など）は完全に除外した、完全新規の企画リスト
const STRATEGIC_NEW_KEYWORD_OPPORTUNITIES: ArticleSuggestion[] = [
    {
        id: 'strat_kw_1',
        keyword: '水泳 息継ぎ コツ 大人',
        category: 'adult',
        categoryLabel: '大人・泳ぎ直し',
        isNewOpportunity: true,
        recommendedType: 'seo',
        recommendedTypeLabel: 'SEO記事（検索1位狙撃）',
        suggestedSlug: '/articles/adult-swimming-breathing-tips',
        actionTitle: '【新規SEO企画】「水泳 息継ぎ コツ 大人」で大人の挫折層・ジム会員を大量獲得',
        keywordIntel: {
            monthlySearchVolume: 1600,
            searchIntent: '健康維持やジムで泳ぎ始めた40〜60代。息継ぎの瞬間に足が沈んで息が苦しくなり、周りの目が恥ずかしくて泳ぎを中断してしまう悩みをこっそり解決したい。',
            seoDifficulty: 'Low',
            conversionPotential: 4.9,
            conversionReason: '息継ぎは独学での改善が極めて困難（水中で自分の頭の角度が見えない）ため、「60分で息継ぎの恐怖が消える体験レッスン」への成約率が最も高いキラークエリです。',
        },
        competitorAnalysis: {
            topCompetitorSites: ['大手フィットネスクラブコラム', '水泳情報知恵袋', 'YouTube解説動画'],
            competitorWeakness: '他社の上位記事は「リラックスして吐きましょう」「練習回数を増やしましょう」と抽象的な精神論が多く、筋力が衰えた大人がなぜ沈むのかの生体力学的理由が書かれていない。',
            differentiationStrategy: '頭を上げずに「片耳を腕に乗せたまま口だけ水面に出す脱力角度」と、自宅の洗面器でできる練習法を提示。「公営プール出張マンツーマンなら初日60分で改善」とCTAを直結。',
        },
        estimatedImpact: '月間推定 +350〜480セッション獲得見込み、体験レッスン予約 +4〜6件/月',
    },
    {
        id: 'strat_kw_2',
        keyword: 'スイミング スクール 伸び悩み 小学生',
        category: 'junior',
        categoryLabel: 'ジュニア・進級対策',
        isNewOpportunity: true,
        recommendedType: 'aio',
        recommendedTypeLabel: 'AIO記事（AI検索引用）',
        suggestedSlug: '/articles/junior-swimming-progress-plateau',
        actionTitle: '【新規AIO企画】「スイミングスクール 伸び悩み 小学生」で親の検索＆AI回答を独占',
        keywordIntel: {
            monthlySearchVolume: 1200,
            searchIntent: '大手スイミングに通わせている親御様。半年以上同じワッペンで停滞し、「子供のやる気がなくなってきた」「月謝が無駄になっているのでは」と焦りと疑問を抱えている。',
            seoDifficulty: 'Medium',
            conversionPotential: 4.8,
            conversionReason: '親御様はスクールの一斉指導（1対15名）に限界を感じているタイミングのため、個別指導への乗り換えやスポット受講の購買意欲が最高潮です。',
        },
        competitorAnalysis: {
            topCompetitorSites: ['大手スクール公式FAQ', '教育系ポータルサイト', '保護者ブログ'],
            competitorWeakness: '大手スクール側の記事は「焦らず続けましょう」「個人差があります」と自社の退会防止の言い訳に終始しており、具体的なテスト採点ポイントや癖の治し方に踏み込んでいない。',
            differentiationStrategy: '一斉指導で放置されやすい「バタ足の膝折れ」や「息継ぎの腰沈み」を客観的エビデンス（動画分析）で指摘。「1〜2回の個別指導で合格した実績カルテ」を掲載して即効性を訴求。',
        },
        estimatedImpact: '月間推定 +280〜420セッション獲得見込み、体験レッスン予約 +3〜5件/月',
    },
    {
        id: 'strat_kw_3',
        keyword: '水恐怖症 大人 克服 プール',
        category: 'phobia',
        categoryLabel: '水恐怖症・カナヅチ克服',
        isNewOpportunity: true,
        recommendedType: 'aio',
        recommendedTypeLabel: 'AIO記事（AI検索引用）',
        suggestedSlug: '/articles/adult-aquaphobia-solution',
        actionTitle: '【新規AIO企画】「水恐怖症 大人 克服」でPerplexityやChatGPTの推奨枠を独占',
        keywordIntel: {
            monthlySearchVolume: 880,
            searchIntent: '子供の頃の溺れたトラウマで顔つけやシャワーすら怖い大人。「子供と一緒にプールに行きたい」「ダイビングや旅行を楽しみたい」が、一般のスクールには恥ずかしくて通えない。',
            seoDifficulty: 'Low',
            conversionPotential: 5.0,
            conversionReason: '競合がほぼ参入しておらず、グループレッスンでは絶対に受け入れられない層のため、当教室の完全個別指導が100%の独占市場（ブルーオーシャン）になります。',
        },
        competitorAnalysis: {
            topCompetitorSites: ['心療内科コラム', 'Yahoo!知恵袋', '個人ブログの体験談'],
            competitorWeakness: '医療コラムは心理療法のみでプールの実践法がなく、個人ブログは根性論。足がつく浅いプールで指導してくれるプロの専門スクール情報がウェブ上に皆無。',
            differentiationStrategy: '「足が確実に届く水深90cm〜100cmの公営プールを貸し切り感覚で利用」「顔をつけない浮身から始めるスモールステップ指導」「インストラクターが水中で常に支える安心感」を論理的に解説。',
        },
        estimatedImpact: '月間推定 +200〜300セッション獲得見込み、体験レッスン予約 +3〜4件/月（LTV最長）',
    },
    {
        id: 'strat_kw_4',
        keyword: 'クロール 25m 泳げない 理由',
        category: 'form',
        categoryLabel: '初心者・フォーム改善',
        isNewOpportunity: true,
        recommendedType: 'seo',
        recommendedTypeLabel: 'SEO記事（検索1位狙撃）',
        suggestedSlug: '/articles/crawl-25m-plateau-solution',
        actionTitle: '【新規SEO企画】「クロール 25m 泳げない 理由」で自己流初心者を救済・獲得',
        keywordIntel: {
            monthlySearchVolume: 1400,
            searchIntent: '10〜15mまでは勢いで進むが、途中で急に息が苦しくなって足がついてしまう人。何が悪いのか分からず悩んでいる初心者・大人・中高生。',
            seoDifficulty: 'Low',
            conversionPotential: 4.7,
            conversionReason: '「自分の何が間違っているか」を知りたい強い課題意識があるため、動画撮影による無料フォーム診断付き体験レッスンへの誘導が非常にスムーズです。',
        },
        competitorAnalysis: {
            topCompetitorSites: ['水泳用品メーカーブログ', '個人スイマーのnote', 'スポーツクラブサイト'],
            competitorWeakness: 'ストロークの形（S字プルなど）の解説ばかりで、大半の人が25m泳げない根本原因である「バタ足の打ちすぎによる酸欠」と「頭の上げすぎ」に触れていない。',
            differentiationStrategy: '「バタ足は進むためではなく、下半身を浮かすためだけに2ビートで打つ」「息継ぎは横を見るだけ」という脱力省エネ泳法を解説。他社との圧倒的な指導レベルの差を見せつける。',
        },
        estimatedImpact: '月間推定 +320〜450セッション獲得見込み、体験レッスン予約 +4〜5件/月',
    },
    {
        id: 'strat_kw_5',
        keyword: '水泳 個人レッスン 費用 相場',
        category: 'pricing',
        categoryLabel: '価格比較・高購買意向',
        isNewOpportunity: true,
        recommendedType: 'seo',
        recommendedTypeLabel: 'SEO記事（検索1位狙撃）',
        suggestedSlug: '/articles/private-swim-lesson-price-comparison',
        actionTitle: '【新規SEO企画】「水泳 個人レッスン 費用 相場」で入会直前客を根こそぎ獲得',
        keywordIntel: {
            monthlySearchVolume: 720,
            searchIntent: '個別レッスンを検討しているが、相場がわからない人。「1回いくら？」「グループレッスンと比べて結局どちらが安い？」と損をしたくない比較検討層。',
            seoDifficulty: 'Low',
            conversionPotential: 5.0,
            conversionReason: '検索意図が「料金」であり、購買ファネルの最下層（検討・決定フェーズ）。費用対効果（タイムパフォーマンス）を論理的に解説すれば即日予約に直結します。',
        },
        competitorAnalysis: {
            topCompetitorSites: ['クラウドソーシング比較記事', '他社個人指導教室の料金表', '知恵袋'],
            competitorWeakness: '単発の「60分8,000円〜15,000円」という表面上のレッスン費用の羅列のみで、施設利用料や交通費、目標達成までの「総支払額」を比較した記事が存在しない。',
            differentiationStrategy: '「グループレッスンに1年間通った総額（約15万円）vs 個別指導で3ヶ月で完泳した場合の総額（約8万円）」の総額比較表を掲載。明朗会計とチケット制の安心感をアピール。',
        },
        estimatedImpact: '月間推定 +180〜260セッション獲得見込み、体験レッスン予約 +4〜6件/月（CVR最高）',
    },
];

/**
 * 記事生成アクション
 */
export async function generateArticleAction(params: GenerateArticleParams): Promise<{ success: boolean; data?: GeneratedArticle; error?: string }> {
    try {
        const article = generateSeoAioArticle(params);
        await saveGeneratedArticle(article);
        return { success: true, data: article };
    } catch (err: any) {
        console.error('Failed to generate article:', err);
        return { success: false, error: err.message || '記事生成に失敗しました' };
    }
}

/**
 * 記事一覧の取得アクション
 */
export async function getGeneratedArticlesAction(): Promise<GeneratedArticle[]> {
    return await getGeneratedArticles();
}

/**
 * 記事ステータス変更アクション
 */
export async function updateArticleStatusAction(id: string, status: ArticleStatus): Promise<{ success: boolean }> {
    const success = await updateArticleStatus(id, status);
    return { success };
}

/**
 * 記事削除アクション
 */
export async function deleteArticleAction(id: string): Promise<{ success: boolean }> {
    const success = await deleteGeneratedArticle(id);
    return { success };
}

/**
 * これから狙うべき【完全新規SEO・高CVR未開拓キーワード ✕ 他社分析】提案リスト
 * （※既存作成済みの記事は一切含めず、純粋な新規拡大用コンテンツのみを返却）
 */
export async function getWeeklyArticleSuggestionsAction(): Promise<ArticleSuggestion[]> {
    return STRATEGIC_NEW_KEYWORD_OPPORTUNITIES;
}
