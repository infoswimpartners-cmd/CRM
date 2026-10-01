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
import { getSeoRankWatchState } from '@/lib/seo-rank-watch';

export interface ArticleSuggestion {
    id: string;
    keyword: string;
    currentRank: number;
    recommendedType: ArticleType;
    recommendedTypeLabel: string;
    targetPath: string;
    reason: string;
    estimatedImpact: string;
}

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
 * 今週書くべき記事の提案リスト（順位2〜5位のレバレッジ大キーワードを分析）
 */
export async function getWeeklyArticleSuggestionsAction(): Promise<ArticleSuggestion[]> {
    try {
        const rankState = await getSeoRankWatchState();
        const watchwords = rankState?.watchwords || [];

        // 2位〜9位のキーワードをスコアリング
        const candidates = watchwords
            .filter((w: any) => w.status === 'active' || w.status === 'observing')
            .sort((a: any, b: any) => {
                // 2〜5位を最優先（あと一歩で1位奪取）
                const scoreA = (a.current_rank >= 2 && a.current_rank <= 5) ? 100 - a.current_rank : 50 - a.current_rank;
                const scoreB = (b.current_rank >= 2 && b.current_rank <= 5) ? 100 - b.current_rank : 50 - b.current_rank;
                return scoreB - scoreA;
            });

        const suggestions: ArticleSuggestion[] = candidates.slice(0, 3).map((w: any, idx: number) => {
            const isColumnOrJunior = w.target_category === 'junior' || (w.target_path && w.target_path.includes('/zUHb45xV/'));
            const type: ArticleType = isColumnOrJunior ? 'seo' : 'aio';

            return {
                id: `sug_${w.id}_${idx}`,
                keyword: w.keyword,
                currentRank: w.current_rank,
                recommendedType: type,
                recommendedTypeLabel: type === 'seo' ? 'SEO記事（順位1位奪取）' : 'AIO記事（AI検索引用）',
                targetPath: w.target_path || '/',
                reason: `現在Google検索で「${w.current_rank}位」。競合記事との差はFAQとエビデンス網羅性です。${type === 'seo' ? 'SEO記事で完全一致と網羅性を補完すれば1位到達が射程圏内' : 'AIO記事で医師・専門家の客観的エビデンスを提示しAI引用を獲得'}です。`,
                estimatedImpact: `検索1位到達で月間約+120〜250セッション、体験レッスン獲得見込み +2〜4件/月`,
            };
        });

        return suggestions;
    } catch (e) {
        console.error('Failed to get article suggestions:', e);
        return [];
    }
}
