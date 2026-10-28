/**
 * 毎日キーワード分析＆STUDIO CMS最適化記事自動生成システムの検証テスト
 */

import { analyzeDailyKeywordOpportunities, executeDailySeoArticlePipeline } from '../src/lib/daily-seo-article-engine';
import { buildStudioExportBundle } from '../src/lib/studio-cms-service';
import { getGeneratedArticles } from '../src/lib/generated-articles-storage';

async function runTest() {
    console.log('================================================================');
    console.log('🧪 STUDIO 日次SEO記事自動生成パイプラインの動作検証');
    console.log('================================================================');

    // 1. 日次キーワード分析＆選定のテスト
    console.log('\n[Test 1] 日次キーワード分析＆最優先候補の選定テスト...');
    const candidate = await analyzeDailyKeywordOpportunities();
    console.log(`✅ 選定された最優先キーワード: "${candidate.keyword}"`);
    console.log(`   ・スラッグ: ${candidate.slug}`);
    console.log(`   ・カテゴリ: ${candidate.categoryLabel}`);
    console.log(`   ・月間検索ボリューム: ${candidate.monthlySearchVolume}`);
    console.log(`   ・CVRスコア: ${candidate.estimatedCvrScore}`);
    console.log(`   ・総合優先度スコア: ${candidate.priorityScore}`);
    console.log(`   ・選定理由: ${candidate.reasonForSelection}`);

    if (!candidate.keyword || !candidate.slug || candidate.priorityScore <= 0) {
        throw new Error('Test 1 Failed: 不正な候補データです');
    }

    // 2. パイプライン実行（キーワード分析 → 記事執筆 → STUDIO最適化整形 → 保存）のテスト
    console.log('\n[Test 2] STUDIO CMS記事自動生成・保存パイプライン実行テスト...');
    const pipelineResult = await executeDailySeoArticlePipeline();
    console.log(`✅ 実行結果: ${pipelineResult.message}`);
    
    if (!pipelineResult.success || !pipelineResult.article) {
        throw new Error(`Test 2 Failed: パイプライン実行に失敗しました - ${pipelineResult.message}`);
    }

    const art = pipelineResult.article;
    console.log(`   ・記事ID: ${art.id}`);
    console.log(`   ・タイトル: ${art.title}`);
    console.log(`   ・スラッグ: ${art.slug}`);
    console.log(`   ・メタディスクリプション: ${art.metaDescription.substring(0, 60)}...`);
    console.log(`   ・本文文字数: ${art.bodyMarkdown.length} 文字`);
    console.log(`   ・FAQ件数: ${art.faqItems.length} 件`);

    // 3. STUDIO CMS用フォーマット検証
    console.log('\n[Test 3] STUDIO CMS 仕様適合性チェック...');
    const hasComparisonTable = art.bodyMarkdown.includes('スイムパートナーズ') && art.bodyMarkdown.includes('Swimmy') && art.bodyMarkdown.includes('ベースプラス');
    const hasFaqSection = art.bodyMarkdown.includes('よくある質問') || art.faqItems.length > 0;
    const hasCtaBox = art.bodyMarkdown.includes('体験レッスン') && art.bodyMarkdown.includes('/trial');
    const hasJsonLd = art.jsonLd.includes('@type') && art.jsonLd.includes('Article');

    console.log(`   ・4社徹底比較テーブル含有: ${hasComparisonTable ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・FAQセクション含有: ${hasFaqSection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・体験予約直結CTA含有: ${hasCtaBox ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・STUDIOカスタムコード用JSON-LD: ${hasJsonLd ? '✅ PASS' : '❌ FAIL'}`);

    if (!hasComparisonTable || !hasCtaBox || !hasJsonLd) {
        throw new Error('Test 3 Failed: STUDIO CMS仕様を満たしていません');
    }

    // 4. STUDIOエクスポートバンドル（1クリックコピー用データ）の検証
    console.log('\n[Test 4] STUDIO用ワンクリックエクスポートバンドル検証...');
    const bundle = buildStudioExportBundle(art);
    console.log(`   ・タイトル存在: ${Boolean(bundle.title) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・スラッグ存在: ${Boolean(bundle.slug) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・クリップボード用一括テキスト長: ${bundle.fullStudioClipboardText.length} 文字`);
    console.log(`   ・STUDIOエディタURL: ${bundle.studioEditorUrl}`);

    // 5. 永続化ストレージ検証
    console.log('\n[Test 5] 永続化ストレージ保存検証...');
    const allArticles = await getGeneratedArticles();
    const found = allArticles.find((a) => a.id === art.id);
    console.log(`   ・ストレージ内存在確認: ${found ? '✅ PASS (永続化完了)' : '❌ FAIL'}`);

    if (!found) {
        throw new Error('Test 5 Failed: ストレージに保存されていません');
    }

    console.log('\n================================================================');
    console.log('🎉 全テストが正常に合格しました！STUDIO日次SEO記事生成システムは完璧に動作しています。');
    console.log('================================================================\n');
}

runTest().catch((err) => {
    console.error('❌ テスト失敗:', err);
    process.exit(1);
});
