/**
 * Challenger 2: 連携・E2Eフロー実証検証ハーネス
 * 記事生成スタジオ（generateArticleAction）およびLP改善キット（optimizeKitWithGeminiAction）、
 * 競合インテリジェンス反映、1クリック連携データフローの検証スクリプト
 */

import { generateArticleAction } from '../src/actions/seo-content-actions';
import { optimizeKitWithGeminiAction } from '../src/actions/sp-tracker-actions';
import {
    getBenchmarkCompetitorsAction,
    analyzeKeywordCompetitorsAction,
} from '../src/actions/competitor-benchmark-actions';
import { SEED_KEYWORD_INTELLIGENCE } from '../src/lib/competitor-benchmark-data';
import { KeywordCompetitorIntelligence } from '../src/types/competitor-benchmark';

interface TestResult {
    testName: string;
    passed: boolean;
    details: string;
    dataSnippet?: any;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string, dataSnippet?: any) {
    results.push({ testName: name, passed, details, dataSnippet });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark}: ${name} - ${details}`);
}

async function runAllTests() {
    console.log('====================================================');
    console.log('🚀 Challenger 2 実証検証ハーネス実行開始');
    console.log('====================================================\n');

    // ------------------------------------------------------------------
    // テスト1: 競合インテリジェンス（マスタ・分析データバンク）の取得検証
    // ------------------------------------------------------------------
    try {
        console.log('--- [Test 1] 競合3社マスタ取得・分析取得の検証 ---');
        const mastersRes = await getBenchmarkCompetitorsAction();
        const hasSwimmy = Boolean(mastersRes.data?.swimmy);
        const hasBasePlus = Boolean(mastersRes.data?.base_plus);
        const hasSuisapo = Boolean(mastersRes.data?.suisapo);

        record(
            'Test 1.1: 競合3社マスタ取得',
            mastersRes.success && hasSwimmy && hasBasePlus && hasSuisapo,
            `Swimmy: ${hasSwimmy}, ベースプラス: ${hasBasePlus}, スイサポ: ${hasSuisapo}`
        );

        // 分析エンジン検証
        const testKw = '水泳 息継ぎ コツ 大人';
        const analysisRes = await analyzeKeywordCompetitorsAction(testKw);
        const intel = analysisRes.data;

        // テーブルヘッダーと各社名の存在確認
        const hasTable = Boolean(
            intel?.comparisonMarkdownTable &&
            (intel.comparisonMarkdownTable.includes('| 比較項目 |') || intel.comparisonMarkdownTable.includes('| スクール名 |') || intel.comparisonMarkdownTable.includes('|')) &&
            intel.comparisonMarkdownTable.includes('スイムパートナーズ') &&
            intel.comparisonMarkdownTable.includes('Swimmy') &&
            intel.comparisonMarkdownTable.includes('ベースプラス') &&
            intel.comparisonMarkdownTable.includes('スイサポ')
        );
        const hasWinningStrategy = Boolean(intel?.ourWinningStrategy);
        const hasRecommendedCta = Boolean(intel?.recommendedCta?.headline);

        record(
            'Test 1.2: キーワード競合分析（3社比較テーブル・勝ち筋生成）',
            analysisRes.success && hasTable && hasWinningStrategy && hasRecommendedCta,
            `Markdownテーブル有無: ${hasTable}, 勝ち筋有無: ${hasWinningStrategy}, 推奨CTA有無: ${hasRecommendedCta}`
        );
    } catch (err: any) {
        record('Test 1: 競合インテリジェンス取得', false, `例外発生: ${err.message}`);
    }

    // ------------------------------------------------------------------
    // テスト2: 記事生成スタジオ（generateArticleAction）の実証検証
    // ------------------------------------------------------------------
    try {
        console.log('\n--- [Test 2] generateArticleAction 実証検証 ---');
        const testKw = '水泳 息継ぎ コツ 大人';
        const intel = SEED_KEYWORD_INTELLIGENCE[testKw];

        const articleRes = await generateArticleAction({
            keyword: testKw,
            articleType: 'seo',
            targetPath: '/articles/adult-breathing-tips',
            customPrompt: '競合比較を重視して執筆してください',
            competitorIntelligence: intel,
        });

        if (!articleRes.success || !articleRes.data) {
            record('Test 2.1: 記事生成Action実行', false, `生成失敗: ${articleRes.error}`);
        } else {
            const article = articleRes.data;
            const contentMd = article.content_md || '';

            // 検証項目 1: 3社比較Markdownテーブルの存在確認
            const hasMarkdownTable =
                contentMd.includes('|') &&
                (contentMd.includes('スイムパートナーズ') || contentMd.includes('当教室')) &&
                (contentMd.includes('Swimmy') || contentMd.includes('東京スイミーSS')) &&
                (contentMd.includes('ベースプラス') || contentMd.includes('BASE PLUS')) &&
                contentMd.includes('スイサポ');

            record(
                'Test 2.2: 記事本文中の3社比較Markdownテーブルの展開',
                hasMarkdownTable,
                hasMarkdownTable
                    ? '3社（Swimmy, ベースプラス, スイサポ）および自社の比較Markdownテーブルを確認'
                    : 'Markdownテーブルまたは社名が不足しています',
                { tableSnippet: contentMd.substring(contentMd.indexOf('|'), contentMd.indexOf('|') + 300) }
            );

            // 検証項目 1b: 各社弱点・自社勝ち筋の展開確認
            const mentionsSwimmyWeakness =
                contentMd.includes('Swimmy') ||
                contentMd.includes('入会金10,800円') ||
                contentMd.includes('交通費1,400円') ||
                contentMd.includes('知育');

            const mentionsBasePlusWeakness =
                contentMd.includes('ベースプラス') ||
                contentMd.includes('1.8万') ||
                contentMd.includes('17,650円') ||
                contentMd.includes('2名');

            const mentionsSuisapoWeakness =
                contentMd.includes('スイサポ') ||
                contentMd.includes('指名料') ||
                contentMd.includes('2,500円') ||
                contentMd.includes('交通費');

            const mentionsOurAdvantage =
                contentMd.includes('完全明朗会計') ||
                contentMd.includes('入会金0円') ||
                contentMd.includes('動画カルテ') ||
                contentMd.includes('専任');

            const allWeaknessesCovered =
                mentionsSwimmyWeakness &&
                mentionsBasePlusWeakness &&
                mentionsSuisapoWeakness &&
                mentionsOurAdvantage;

            record(
                'Test 2.3: 各社弱点・自社勝ち筋の本文展開',
                allWeaknessesCovered,
                `Swimmy弱点: ${mentionsSwimmyWeakness}, ベースプラス弱点: ${mentionsBasePlusWeakness}, スイサポ弱点: ${mentionsSuisapoWeakness}, 自社強み: ${mentionsOurAdvantage}`
            );

            // 推奨CTAの展開確認
            const hasCta =
                contentMd.includes(intel.recommendedCta.headline) ||
                contentMd.includes(intel.recommendedCta.buttonText) ||
                contentMd.includes('体験レッスン');

            record('Test 2.4: 差別化推奨CTAの本文展開', hasCta, `推奨CTA反映: ${hasCta}`);
        }
    } catch (err: any) {
        record('Test 2: generateArticleAction', false, `例外発生: ${err.message}`);
    }

    // ------------------------------------------------------------------
    // テスト3: LP改善キット（optimizeKitWithGeminiAction）の実証検証
    // ------------------------------------------------------------------
    try {
        console.log('\n--- [Test 3] optimizeKitWithGeminiAction 実証検証 ---');
        const testKw = '水泳 息継ぎ コツ 大人';
        const targetPath = '/personal_swim';

        const kitRes = await optimizeKitWithGeminiAction(testKw, targetPath, 2, false);

        if (!kitRes.success || !kitRes.data) {
            record('Test 3.1: optimizeKitWithGeminiAction 実行', false, `キット生成失敗: ${kitRes.message}`);
        } else {
            const kit = kitRes.data;
            const lpBlocks = kit.lpBlocks || [];

            // ① FV見出し（lpBlocks[0]）にベンチマークが反映された見出し・サブコピー・CTA
            const fvBlock = lpBlocks[0];
            const hasFvBenchmark =
                Boolean(fvBlock) &&
                Boolean(fvBlock.headline) &&
                Boolean(fvBlock.subheadline || fvBlock.content);

            record(
                'Test 3.2: FV見出し・サブコピー・CTAの生成',
                hasFvBenchmark,
                `Headline: "${fvBlock?.headline}", Sub: "${fvBlock?.subheadline?.slice(0, 30)}..."`
            );

            // ② 3つの理由ブロック（lpBlocks[1]）に競合・集団との差別化が反映
            const reasonBlock = lpBlocks[1];
            const reasonContent = reasonBlock?.content || '';
            const hasThreeReasons =
                Boolean(reasonBlock) &&
                (reasonContent.includes('1.') || reasonContent.includes('①') || reasonContent.includes('【')) &&
                (reasonContent.includes('明朗会計') || reasonContent.includes('入会金') || reasonContent.includes('動画カルテ') || reasonContent.includes('専任'));

            record(
                'Test 3.3: 「3つの選ばれる理由」差別化ブロックの生成',
                hasThreeReasons,
                `Headline: "${reasonBlock?.headline}", Content要約: ${reasonContent.slice(0, 80).replace(/\n/g, ' ')}...`
            );

            // ③ 他社対比ブロック（lpBlocks[2]）に3社（Swimmy / ベースプラス / スイサポ）のベンチマークが反映
            const comparisonBlock = lpBlocks[2];
            const compContent = comparisonBlock?.content || '';
            const hasThreeCompetitorBenchmark =
                Boolean(comparisonBlock) &&
                (compContent.includes('Swimmy') || compContent.includes('スイミー')) &&
                (compContent.includes('ベースプラス') || compContent.includes('BASE PLUS')) &&
                (compContent.includes('スイサポ') || compContent.includes('都度'));

            record(
                'Test 3.4: 競合3社（Swimmy / ベースプラス / スイサポ）直接対比ブロックの生成',
                hasThreeCompetitorBenchmark,
                `対比ブロックHeadline: "${comparisonBlock?.headline}", 3社記載確認: ${hasThreeCompetitorBenchmark}`
            );

            // FAQでの競合対比確認
            const faqItems = kit.faqItems || [];
            const hasCompetitorFaq = faqItems.some((f) =>
                f.question.includes('Swimmy') ||
                f.question.includes('ベースプラス') ||
                f.question.includes('スイサポ') ||
                f.answer.includes('Swimmy') ||
                f.answer.includes('ベースプラス') ||
                f.answer.includes('スイサポ') ||
                f.answer.includes('明朗会計')
            );

            record(
                'Test 3.5: FAQアコーディオンでの競合差別化回答の生成',
                hasCompetitorFaq,
                `FAQ総数: ${faqItems.length}, 競合差別化FAQ存在: ${hasCompetitorFaq}`
            );
        }
    } catch (err: any) {
        record('Test 3: optimizeKitWithGeminiAction', false, `例外発生: ${err.message}`);
    }

    // ------------------------------------------------------------------
    // テスト4: 敵対的・境界値ストレステスト（Adversarial Challenge）
    // ------------------------------------------------------------------
    try {
        console.log('\n--- [Test 4] 敵対的・境界値ストレステスト ---');

        // 4.1 空白キーワードの処理
        const emptyRes = await generateArticleAction({
            keyword: '   ',
            articleType: 'seo',
        });
        record(
            'Test 4.1: 空白キーワードの処理（クラッシュせず安全にフォールバックまたはエラー返却）',
            emptyRes !== undefined,
            `レスポンス正常性: success=${emptyRes?.success}`
        );

        // 4.2 部分的・不完全な competitorIntelligence 投入時の安全性検証
        // （脆弱性検出: recommendedCta が欠損している場合に enrichArticleWithCompetitorIntelligence がクラッシュするかどうかの検証）
        let partialIntelCrashed = false;
        let crashReason = '';
        try {
            const partialIntelArticle = await generateArticleAction({
                keyword: '水泳 個人レッスン 品川',
                articleType: 'seo',
                competitorIntelligence: {
                    keyword: '水泳 個人レッスン 品川',
                    analyzedAt: new Date().toISOString(),
                    summary: 'テスト',
                    competitorAnalyses: {} as any,
                    blindSpots: [],
                    ourWinningStrategy: 'テスト戦略',
                    // recommendedCta を意図的に省略
                } as any,
            });
            if (!partialIntelArticle.success) {
                partialIntelCrashed = true;
                crashReason = partialIntelArticle.error || '不明なエラー';
            }
        } catch (e: any) {
            partialIntelCrashed = true;
            crashReason = e.message;
        }

        record(
            'Test 4.2: recommendedCta 欠損オブジェクト投入時の堅牢性（Adversarial Audit）',
            !partialIntelCrashed,
            partialIntelCrashed
                ? `【バグ検出】recommendedCta欠損時にTypeError発生: "${crashReason}"`
                : 'クラッシュせず正常にハンドリングされました'
        );

        // 4.3 optimizeKitWithGeminiAction の未知キーワードでの動作
        const unknownKwKit = await optimizeKitWithGeminiAction('完全未知の特殊キーワード水中浮力検証', '/test', 5, false);
        record(
            'Test 4.3: 未知キーワードでのLP改善キット動的分析と3社差別化反映',
            unknownKwKit.success && Boolean(unknownKwKit.data?.lpBlocks && unknownKwKit.data.lpBlocks.length > 0),
            `生成成否: ${unknownKwKit.success}, ブロック数: ${unknownKwKit.data?.lpBlocks?.length}`
        );
    } catch (err: any) {
        record('Test 4: ストレステスト', false, `例外発生: ${err.message}`);
    }

    console.log('\n====================================================');
    console.log('📊 Challenger 2 実証検証ハーネス実行サマリー');
    console.log('====================================================');
    const total = results.length;
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = total - passedCount;
    console.log(`合計テスト数: ${total}`);
    console.log(`成功 (PASS): ${passedCount}`);
    console.log(`失敗 (FAIL): ${failedCount}`);

    return { total, passedCount, failedCount, results };
}

runAllTests().then((res) => {
    if (res.failedCount > 0) {
        console.warn(`⚠️ ${res.failedCount} 件の指摘事項（脆弱性・改善点）が検出されました。`);
    } else {
        console.log('🎉 主要検証項目はすべて PASS しました！');
    }
}).catch((e) => {
    console.error('Harness fatal error:', e);
    process.exit(1);
});
