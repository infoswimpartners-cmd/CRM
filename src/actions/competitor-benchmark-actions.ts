'use server';

/**
 * 競合ベンチマーク監視・他社分析 Server Actions
 * 
 * 管理画面UI（BenchmarkCompetitorPanel 等）および記事生成・LP改善連携から
 * 競合3社マスタの取得、任意キーワードに対するリアルタイム他社分析、
 * および保存済み分析データの読み出し・永続化を担います。
 */

import {
  CompetitorId,
  CompetitorProfile,
  KeywordCompetitorIntelligence,
} from '@/types/competitor-benchmark';
import {
  getBenchmarkCompetitors,
  getBenchmarkCompetitorById,
  analyzeKeywordCompetitors,
  getSavedCompetitorAnalysis,
  getAllSavedCompetitorAnalyses,
  saveCompetitorAnalysis,
} from '@/lib/competitor-analysis-engine';

/**
 * 競合3社の基本マスタ一覧を取得
 */
export async function getBenchmarkCompetitorsAction(): Promise<{
  success: boolean;
  data: Record<CompetitorId, CompetitorProfile>;
  error?: string;
}> {
  try {
    const masters = getBenchmarkCompetitors();
    return {
      success: true,
      data: masters,
    };
  } catch (err: any) {
    console.error('[getBenchmarkCompetitorsAction] エラー:', err);
    return {
      success: false,
      data: {} as Record<CompetitorId, CompetitorProfile>,
      error: err?.message || '競合マスタの取得に失敗しました。',
    };
  }
}

/**
 * 特定の競合1社のマスタ情報を取得
 */
export async function getBenchmarkCompetitorAction(
  id: CompetitorId
): Promise<{
  success: boolean;
  data?: CompetitorProfile;
  error?: string;
}> {
  try {
    const competitor = getBenchmarkCompetitorById(id);
    if (!competitor) {
      return {
        success: false,
        error: `指定された競合ID（${id}）が見つかりません。`,
      };
    }
    return {
      success: true,
      data: competitor,
    };
  } catch (err: any) {
    console.error('[getBenchmarkCompetitorAction] エラー:', err);
    return {
      success: false,
      error: err?.message || '競合情報の取得に失敗しました。',
    };
  }
}

/**
 * 任意キーワードに対して競合3社ベンチマーク分析を実行
 * 
 * @param keyword 対象キーワード
 * @param targetPath 対象URLパス（任意）
 * @param forceRefresh キャッシュを無視してGeminiで再分析するかどうか
 */
export async function analyzeKeywordCompetitorsAction(
  keyword: string,
  targetPath?: string,
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  data?: KeywordCompetitorIntelligence;
  error?: string;
  source?: 'cache' | 'gemini' | 'rule_fallback';
}> {
  try {
    const cleanKw = keyword?.trim();
    if (!cleanKw) {
      return {
        success: false,
        error: '分析対象のキーワードを入力してください。',
      };
    }

    const result = await analyzeKeywordCompetitors(cleanKw, targetPath, forceRefresh);
    const source: 'cache' | 'gemini' | 'rule_fallback' = result.isDynamicAiGenerated
      ? 'gemini'
      : forceRefresh
      ? 'rule_fallback'
      : 'cache';

    return {
      success: true,
      data: result,
      source,
    };
  } catch (err: any) {
    console.error('[analyzeKeywordCompetitorsAction] エラー:', err);
    return {
      success: false,
      error: err?.message || '競合分析の実行中にエラーが発生しました。',
    };
  }
}

/**
 * 特定キーワードの保存済み分析結果を取得
 */
export async function getSavedCompetitorAnalysisAction(
  keyword: string
): Promise<{
  success: boolean;
  data?: KeywordCompetitorIntelligence | null;
  error?: string;
}> {
  try {
    const cleanKw = keyword?.trim();
    if (!cleanKw) {
      return {
        success: false,
        data: null,
        error: 'キーワードが指定されていません。',
      };
    }

    const data = await getSavedCompetitorAnalysis(cleanKw);
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[getSavedCompetitorAnalysisAction] エラー:', err);
    return {
      success: false,
      data: null,
      error: err?.message || '保存済み分析データの取得に失敗しました。',
    };
  }
}

/**
 * 保存済みの全分析結果一覧を取得
 */
export async function getAllSavedCompetitorAnalysesAction(): Promise<{
  success: boolean;
  data: KeywordCompetitorIntelligence[];
  error?: string;
}> {
  try {
    const list = await getAllSavedCompetitorAnalyses();
    return {
      success: true,
      data: list,
    };
  } catch (err: any) {
    console.error('[getAllSavedCompetitorAnalysesAction] エラー:', err);
    return {
      success: false,
      data: [],
      error: err?.message || '分析データ一覧の取得に失敗しました。',
    };
  }
}

/**
 * 分析結果を手動保存・更新
 */
export async function saveCompetitorAnalysisAction(
  data: KeywordCompetitorIntelligence
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!data || !data.keyword) {
      return {
        success: false,
        error: '保存対象のデータが不正です。',
      };
    }

    const success = await saveCompetitorAnalysis(data);
    return {
      success,
      error: success ? undefined : 'データの保存に失敗しました。',
    };
  } catch (err: any) {
    console.error('[saveCompetitorAnalysisAction] エラー:', err);
    return {
      success: false,
      error: err?.message || '分析データの保存中にエラーが発生しました。',
    };
  }
}
