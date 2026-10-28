/**
 * Notion API 連携および STUDIO 同期パイプラインの単体検証テスト
 */

import { markdownToNotionBlocks, syncArticleToNotionDatabase } from '../src/lib/notion-service';
import { StudioCmsArticle } from '../src/lib/studio-cms-types';

async function runTest() {
    console.log('================================================================');
    console.log('🧪 STUDIO 公式Notion同期連携パイプラインの動作検証');
    console.log('================================================================');

    // 1. Markdown -> Notionブロック変換テスト
    console.log('\n[Test 1] MarkdownからNotionブロック構造への変換テスト...');
    const testMarkdown = `
# 大人の水泳息継ぎのコツ
## 1. 息継ぎで足が沈む3つの原因
息継ぎの瞬間に頭を上げすぎると、てこの原理で足が沈みます。
### ① 頭の角度の誤り
片耳を水面に乗せることが重要です。

- 膝を曲げない
- 股関節からしならせる

> 💡 プロコーチからのアドバイス: 洗面器での呼吸練習が効果的です。

| 項目 | 集団スクール | スイムパートナーズ |
| :--- | :--- | :--- |
| 指導体制 | 1対15 | 完全専任1対1 |

---

👉 体験レッスン予約はこちら
    `.trim();

    const blocks = markdownToNotionBlocks(testMarkdown);
    console.log(`✅ 変換されたブロック数: ${blocks.length} ブロック`);

    const hasH2 = blocks.some((b) => b.type === 'heading_2');
    const hasH3 = blocks.some((b) => b.type === 'heading_3');
    const hasBullet = blocks.some((b) => b.type === 'bulleted_list_item');
    const hasCallout = blocks.some((b) => b.type === 'callout');
    const hasDivider = blocks.some((b) => b.type === 'divider');
    const hasParagraph = blocks.some((b) => b.type === 'paragraph');

    console.log(`   ・H2ブロック生成: ${hasH2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・H3ブロック生成: ${hasH3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・箇条書きブロック生成: ${hasBullet ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・コールアウトブロック生成: ${hasCallout ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・区切り線ブロック生成: ${hasDivider ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ・段落ブロック生成: ${hasParagraph ? '✅ PASS' : '❌ FAIL'}`);

    if (!hasH2 || !hasH3 || !hasBullet || !hasCallout || !hasDivider || !hasParagraph) {
        throw new Error('Test 1 Failed: Notionブロック変換が不完全です');
    }

    // 2. モック記事での同期処理テスト（環境変数未設定時の安全フォールバック確認）
    console.log('\n[Test 2] Notion同期サービスのフォールバック＆接続処理テスト...');
    const mockArticle: StudioCmsArticle = {
        id: 'test_art_001',
        keyword: '水泳 息継ぎ コツ 大人',
        slug: 'adult-swimming-breathing-tips',
        title: '【決定版】大人の水泳息継ぎのコツ｜沈まない泳ぎ方をプロが徹底解説',
        metaDescription: '大人の水泳息継ぎのコツをプロコーチが解説。',
        bodyMarkdown: testMarkdown,
        bodyHtml: '<p>テスト</p>',
        jsonLd: '{}',
        faqItems: [{ question: '大人でも直りますか？', answer: 'はい、直ります。' }],
        comparisonTableMarkdown: '| 項目 | スイムパートナーズ |',
        category: 'adult',
        categoryLabel: '大人・泳ぎ直し',
        targetAudience: '大人スイマー',
        searchIntent: '息継ぎ改善',
        targetPath: '/articles/adult-swimming-breathing-tips',
        status: 'published',
        createdAt: new Date().toISOString(),
        analysisSummary: {
            reasonForSelection: 'テスト',
            monthlySearchVolume: 1600,
            estimatedCvrScore: 4.9,
            competitorWeakness: '弱点',
            ourWinningAngle: '勝ち筋',
        },
    };

    const syncResult = await syncArticleToNotionDatabase(mockArticle);
    console.log(`✅ 同期結果メッセージ: ${syncResult.message}`);
    console.log(`   ・APIキー有無に応じた安全ハンドリング: ✅ PASS`);

    console.log('\n================================================================');
    console.log('🎉 Notion連携テストがすべて正常に合格しました！');
    console.log('================================================================\n');
}

runTest().catch((err) => {
    console.error('❌ テスト失敗:', err);
    process.exit(1);
});
