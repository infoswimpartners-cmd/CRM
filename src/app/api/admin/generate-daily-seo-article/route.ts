import { NextResponse } from 'next/server';
import { executeDailySeoArticlePipeline } from '@/lib/daily-seo-article-engine';

export const maxDuration = 60; // 実行制限を60秒に設定

export async function POST() {
    try {
        const result = await executeDailySeoArticlePipeline();
        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[API generate-daily-seo-article Error]:', err);
        return NextResponse.json(
            {
                success: false,
                message: err?.message || '記事生成中にサーバーエラーが発生しました。',
            },
            { status: 500 }
        );
    }
}
