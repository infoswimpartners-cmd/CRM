/**
 * 競合ベンチマーク監視・他社分析システム 型定義
 * 
 * 対象競合3社:
 * 1. Swimmy株式会社 ('swimmy')
 * 2. ベースプラス ('base_plus')
 * 3. スイサポ ('suisapo')
 */

/**
 * 監視対象の競合3社の一意識別子
 */
export type CompetitorId = 'swimmy' | 'base_plus' | 'suisapo';

/**
 * 競合各社の料金モデル定義
 */
export interface CompetitorPricingModel {
  /** 入会金・初期登録手数料 */
  admissionFee: string;
  /** レッスン料金の目安・価格帯 */
  lessonFeeRange: string;
  /** 追加で発生する諸費用（交通費、指名料、施設利用料、年会費等） */
  additionalCosts: string[];
  /** 料金の透明性評価 ('high' | 'medium' | 'low') */
  transparencyRating: 'high' | 'medium' | 'low';
  /** 隠れコストや実質総額に関する注意点 */
  hiddenCostsNotice?: string;
}

/**
 * 自社（スイムパートナーズ）の差別化ポジショニング
 */
export interface CompetitorDifferentiationMap {
  /** 差別化の主軸（例: 完全明朗会計、動画カルテ、生体力学アプローチ） */
  axis: string;
  /** 対競合の訴求ピッチ */
  pitch: string;
  /** 根拠となるファクト・証明ポイント */
  proofPoints: string[];
  /** Google 1位奪取および成約に向けた勝てる切り口 */
  winningAngle?: string;
}

/**
 * 競合企業の監視マスタプロファイル
 */
export interface CompetitorProfile {
  /** 競合識別子 */
  id: CompetitorId;
  /** 表示名 */
  name: string;
  /** 正式法人・団体名 */
  corporateName: string;
  /** 公式WebサイトURL */
  officialUrl: string;
  /** 提供サービスの特徴 */
  serviceFeatures: string[];
  /** 料金体系モデル */
  pricingModel: CompetitorPricingModel;
  /** 主要対象エリア */
  targetArea: string;
  /** コアターゲット層 */
  targetAudience: string;
  /** 競合の強み */
  strengths: string[];
  /** 競合の弱点・自社対比の盲点 */
  weaknesses: string[];
  /** 自社（スイムパートナーズ）の必勝差別化マッピング */
  ourDifferentiation: CompetitorDifferentiationMap;
}

/**
 * 特定キーワードに対する競合各社の個別分析アイテム
 */
export interface CompetitorAnalysisItem {
  /** 競合識別子 */
  competitorId: CompetitorId;
  /** 競合企業名 */
  competitorName: string;
  /** このキーワードにおける想定ポジショニング・上位表示の傾向 */
  assumedPositioning: string;
  /** このキーワードの上位記事・競合コンテンツにおける弱点・盲点 */
  topRankWeakness: string;
  /** 自社（スイムパートナーズ）が勝てる論理的切り口 */
  ourWinningAngle: string;
  /** 料金・サービス形態の直接対比 */
  priceComparison?: string;
}

/**
 * 推奨CTA（Call To Action）定義
 */
export interface CompetitorRecommendedCta {
  /** CTAキャッチコピー（見出し） */
  headline: string;
  /** 補足サブコピー */
  subheadline: string;
  /** アクションボタン文言 */
  buttonText: string;
  /** ターゲット読者層 */
  targetAudience: string;
  /** 推奨アクション種別 */
  actionType?: 'trial_lesson' | 'line_consult' | 'pool_schedule';
}

/**
 * キーワード単位の競合3社ベンチマーク総合インテリジェンス
 */
export interface KeywordCompetitorIntelligence {
  /** 分析対象キーワード（例: '水泳 息継ぎ コツ 大人'） */
  keyword: string;
  /** 対象LP・記事パス（任意） */
  targetPath?: string;
  /** 分析実行日時（ISO8601形式） */
  analyzedAt: string;
  /** 競合状況および検索意図の総合要約 */
  summary: string;
  /** 競合3社それぞれの分析結果（Swimmy, ベースプラス, スイサポ） */
  competitorAnalyses: Record<CompetitorId, CompetitorAnalysisItem>;
  /** 3社共通の盲点（上位記事で言及されていない重要ポイント） */
  blindSpots: string[];
  /** 自社（スイムパートナーズ）が1位・高成約を獲得するための総合勝ち筋 */
  ourWinningStrategy: string;
  /** 最適化された推奨CTA */
  recommendedCta: CompetitorRecommendedCta;
  /** 4社徹底比較表（自社 vs Swimmy vs ベースプラス vs スイサポ）のMarkdownテーブル */
  comparisonMarkdownTable: string;
  /** Gemini AIによる動的生成フラグ */
  isDynamicAiGenerated?: boolean;
}

/**
 * 競合ベンチマーク監視データセット（UI・連携用）
 */
export interface CompetitorBenchmarkDataset {
  /** 競合3社の基本マスタ一覧 */
  masters: Record<CompetitorId, CompetitorProfile>;
  /** キャッシュ済みキーワード分析一覧 */
  cachedAnalyses: Record<string, KeywordCompetitorIntelligence>;
}
