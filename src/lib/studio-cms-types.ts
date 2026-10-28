/**
 * STUDIO（studio.design）CMS 連携用型定義
 * STUDIO CMSの記事モデル（Title, Slug, Body, MetaDescription, Category, CoverImage等）および
 * STUDIOエディタへのワンクリック反映用フォーマットを定義
 */

export interface StudioCmsArticle {
    id: string;
    keyword: string;
    slug: string;
    title: string;
    metaDescription: string;
    /** STUDIO CMSのリッチテキストエディタに直接貼り付け可能なMarkdown/テキスト */
    bodyMarkdown: string;
    /** STUDIO CMSカスタムコードまたはHTML埋め込み用HTML */
    bodyHtml: string;
    /** STUDIOのカスタムコード用JSON-LD（FAQPage + Article + SportsClub） */
    jsonLd: string;
    faqItems: { question: string; answer: string }[];
    /** 競合3社（Swimmy, ベースプラス, スイサポ）比較Markdownテーブル */
    comparisonTableMarkdown: string;
    category: 'adult' | 'junior' | 'phobia' | 'pricing' | 'area';
    categoryLabel: string;
    targetAudience: string;
    searchIntent: string;
    targetPath: string; // 例: /zUHb45xV/adult-swimming-breathing-tips
    status: 'draft' | 'published' | 'synced_to_studio';
    createdAt: string;
    publishedAt?: string | null;
    analysisSummary: {
        reasonForSelection: string;
        monthlySearchVolume: number;
        estimatedCvrScore: number;
        competitorWeakness: string;
        ourWinningAngle: string;
    };
}

export interface StudioExportBundle {
    title: string;
    slug: string;
    metaDescription: string;
    fullStudioClipboardText: string;
    jsonLdScript: string;
    studioEditorUrl: string;
}
