/**
 * 毎日キーワード分析＆STUDIO CMS最適化記事自動生成エンジン
 * 
 * 1. 日次キーワード分析: GSC順位、24商圏SEO診断、戦略的高CVRキーワードから未対策クエリをスコアリング
 * 2. 本日の最優先キーワード決定（Top 1）
 * 3. Gemini 3.8 Flash（または高品質ローカルエンジン）でSTUDIO CMSに最適化した記事を自動執筆
 * 4. STUDIO CMSのリッチテキストエディタ・カスタムコード（JSON-LD）用に整形・保存
 * 5. Google Chat / STUDIO Webhook への自動連携
 */

import { StudioCmsArticle } from './studio-cms-types';
import { buildStudioOptimizedBody, buildStudioJsonLd, syncArticleToStudioCms } from './studio-cms-service';
import { syncArticleToNotionDatabase, NotionSyncResult } from './notion-service';
import { getGeneratedArticles, saveGeneratedArticle, GeneratedArticle } from './generated-articles-storage';
import { AREA_SEO_AUDIT_DATA, AreaPublicFacility } from './area-seo-audit';
import { generateArticleWithGeminiFlash, enrichArticleWithCompetitorIntelligence } from './gemini-article-service';
import { generateSeoAioArticle } from './article-generator-engine';
import { getSeedKeywordIntelligence, buildComparisonMarkdownTable } from './competitor-benchmark-data';

export interface KeywordCandidate {
    keyword: string;
    slug: string;
    category: 'adult' | 'junior' | 'phobia' | 'pricing' | 'area';
    categoryLabel: string;
    monthlySearchVolume: number;
    estimatedCvrScore: number; // 1.0 〜 5.0
    searchIntent: string;
    targetAudience: string;
    reasonForSelection: string;
    competitorWeakness: string;
    ourWinningAngle: string;
    priorityScore: number;
}

/**
 * 戦略的SEOキーワード候補プール（水泳個人指導の購買意欲・CVR直結クエリ群）
 */
const STRATEGIC_CANDIDATE_POOL: Omit<KeywordCandidate, 'priorityScore'>[] = [
    {
        keyword: '水泳 息継ぎ コツ 大人',
        slug: 'adult-swimming-breathing-tips',
        category: 'adult',
        categoryLabel: '大人・泳ぎ直し',
        monthlySearchVolume: 1600,
        estimatedCvrScore: 4.9,
        searchIntent: '健康維持やジムで泳ぎ始めた40〜60代。息継ぎで足が沈んで苦しくなる悩みを解決したい。',
        targetAudience: 'ジムに通う大人・水泳初心者',
        reasonForSelection: '息継ぎは独学での改善が極めて困難なため、個別指導への成約率（CVR）が全水泳クエリ中最高。',
        competitorWeakness: '他社の上位記事は「リラックスして吐く」等の精神論が多く、成人の生体力学的な沈み込み理由が不足。',
        ourWinningAngle: '頭を上げない片耳水面呼吸法と脱力法を解説し、初日60分で改善する専任コーチングを提示。',
    },
    {
        keyword: 'スイミング スクール 伸び悩み 小学生',
        slug: 'junior-swimming-progress-plateau',
        category: 'junior',
        categoryLabel: 'ジュニア・進級対策',
        monthlySearchVolume: 1200,
        estimatedCvrScore: 4.8,
        searchIntent: '集団スクールで半年以上同じ級で停滞している保護者。月謝や子供のモチベーションに悩む。',
        targetAudience: '小学生の保護者',
        reasonForSelection: '集団スクール（1対15）への不満が高まっているため、スポット個別指導の需要が極めて高い。',
        competitorWeakness: '大手スクール側は自社の退会防止の言い訳に終始し、具体的なテスト合格基準や癖の直し方に踏み込まない。',
        ourWinningAngle: '動画分析によるフォームの癖特定と、1〜2回の個別指導で合格した実績を提示。',
    },
    {
        keyword: '水泳 個人レッスン 費用 相場',
        slug: 'private-swim-lesson-price-comparison',
        category: 'pricing',
        categoryLabel: '価格比較・高購買意向',
        monthlySearchVolume: 720,
        estimatedCvrScore: 5.0,
        searchIntent: '個人レッスンを検討しているが、相場や総額がわからず損をしたくない比較検討層。',
        targetAudience: '水泳個別指導を検討中の大人・保護者',
        reasonForSelection: '検索意図が料金であり購買ファネル最下層。費用対効果を論理的に解説すれば即日予約に直結。',
        competitorWeakness: '表面的なレッスン費用の羅列のみで、施設利用料や交通費、目標達成までの総支払額の比較がない。',
        ourWinningAngle: '集団に1年通う総額（約15万円）vs 個別で3ヶ月完泳の総額（約8万円）の総額比較表と明朗会計を提示。',
    },
    {
        keyword: '水泳 息継ぎ 沈む',
        slug: 'swimming-breathing-sinking-solution',
        category: 'adult',
        categoryLabel: '大人・フォーム改善',
        monthlySearchVolume: 880,
        estimatedCvrScore: 4.7,
        searchIntent: 'クロールで息継ぎした瞬間に下半身が沈んで足が着いてしまう。',
        targetAudience: '25m完泳を目指す初心者・マスターズ',
        reasonForSelection: '沈む原因が骨盤の角度や目線にあるため、プロの客観的視線と動画撮影が即効解決になる。',
        competitorWeakness: 'バタ足を強く打てと書いてあるが、かえって体力を消耗し沈み込みを悪化させている。',
        ourWinningAngle: '重心移動と体幹のフラットキープ、息を吸おうとしない脱力呼吸メカニズムを解説。',
    },
    {
        keyword: '大人 カナヅチ 水泳教室',
        slug: 'adult-water-phobia-beginner-class',
        category: 'phobia',
        categoryLabel: '水恐怖症・完全初心者',
        monthlySearchVolume: 590,
        estimatedCvrScore: 4.9,
        searchIntent: '子どもの頃から水が怖くて顔もつけられない。大人の集団教室に行くのは恥ずかしい。',
        targetAudience: '水恐怖症・カナヅチの成人（20代〜60代）',
        reasonForSelection: '「他人に泳げない姿を見られたくない」という心理的障壁から、1対1の出張個別指導が唯一の解決策。',
        competitorWeakness: '大手スクールはグループレッスンの告知ばかりで、水恐怖症に対する心理的ケアや個別配慮が弱い。',
        ourWinningAngle: '公営プールの浅いエリアで足が着く安心指導、怒らない優しい専任コーチの伴走をアピール。',
    },
    {
        keyword: 'クロール バタ足 進まない 大人',
        slug: 'flutter-kick-technique-adult',
        category: 'adult',
        categoryLabel: '大人・フォーム改善',
        monthlySearchVolume: 750,
        estimatedCvrScore: 4.5,
        searchIntent: '一生懸命バタ足をしているのに足が疲れるだけで前に進まない。',
        targetAudience: '大人スイマー・ジム会員',
        reasonForSelection: '膝が曲がった自転車こぎキックが原因。陸上とお風呂での簡単なセルフチェックでCVR向上。',
        competitorWeakness: '足首の柔軟性の話ばかりで、股関節からのしなりとしなりを生む脱力タイミングが書かれていない。',
        ourWinningAngle: '股関節始動のむち打ちキックの生体力学と、水面を叩かない効率的推進力を解説。',
    },
    {
        keyword: 'スイミング 進級テスト 落ちた 対策',
        slug: 'swimming-test-failure-tips',
        category: 'junior',
        categoryLabel: 'ジュニア・進級対策',
        monthlySearchVolume: 650,
        estimatedCvrScore: 4.8,
        searchIntent: '進級テストに連続で落ちてしまい、子どもが泣いたりスイミングを辞めたがっている。',
        targetAudience: '進級テストに悩む親御様',
        reasonForSelection: '親が今すぐ何とかしてあげたい最も強い痛みを持つタイミング。即日申し込みに繋がりやすい。',
        competitorWeakness: '「親は励ましましょう」という感情論にとどまり、減点対象の減点箇所（呼吸時の頭上げ等）の技術的解説がない。',
        ourWinningAngle: 'テストの採点員が見ている「減点ポイント」を公開し、ピンポイント修正で1回で受かる個別指導を案内。',
    },
    {
        keyword: 'スイミングスクール マンツーマン 個人指導 違い',
        slug: 'swimming-school-vs-private-lesson',
        category: 'pricing',
        categoryLabel: 'スクール比較・乗換検討',
        monthlySearchVolume: 510,
        estimatedCvrScore: 4.9,
        searchIntent: '集団スクールと個人レッスンで何が違うのか、費用対効果を知りたい。',
        targetAudience: 'スクール通学中または検討中の保護者・大人',
        reasonForSelection: 'まさに自社サービスのコア価値そのものを検索している決定意向層。',
        competitorWeakness: '自社集団スクールの擁護に偏っており、個人レッスンの上達速度の優位性を公正に比較していない。',
        ourWinningAngle: '「1レッスンで泳げる本数（集団50m vs 個人500m）」と指導密度（2分 vs 60分）の徹底比較データを提示。',
    },
];

/**
 * 毎日のキーワード分析を実行し、本日作成すべき「最優先キーワード（Top 1）」を自動選定
 */
export async function analyzeDailyKeywordOpportunities(): Promise<KeywordCandidate> {
    // 1. 既存の作成済み記事を取得
    const existingArticles = await getGeneratedArticles();
    const existingKeywords = new Set(
        existingArticles.map((a) => a.keyword.toLowerCase().trim().replace(/\s+/g, ''))
    );
    const existingSlugs = new Set(
        existingArticles.map((a) => a.target_path.split('/').pop()?.toLowerCase().trim())
    );

    // 2. 商圏エリアデータから未作成エリアを候補に追加
    const areaCandidates: Omit<KeywordCandidate, 'priorityScore'>[] = [];
    for (const area of AREA_SEO_AUDIT_DATA) {
        const kw = `水泳 個人レッスン ${area.areaName.replace(/エリア.*$/, '').trim()}`;
        const slug = `personal-swim-${area.areaKey}`;
        const normalizedKw = kw.toLowerCase().replace(/\s+/g, '');

        if (!existingKeywords.has(normalizedKw) && !existingSlugs.has(slug)) {
            areaCandidates.push({
                keyword: kw,
                slug,
                category: 'area',
                categoryLabel: `${area.prefecture === 'tokyo' ? '東京' : area.prefecture === 'kanagawa' ? '神奈川' : area.prefecture === 'chiba' ? '千葉' : '埼玉'}商圏`,
                monthlySearchVolume: area.monthlySearchVolume || 600,
                estimatedCvrScore: 4.6,
                searchIntent: `${area.areaName}で通いやすい公営プールやマンツーマン水泳個別指導を探している。`,
                targetAudience: `${area.areaName}近隣のファミリー・大人`,
                reasonForSelection: `${area.areaName}の地域SEOで未開拓の直接受け皿記事を作成し、地域1位を獲得するため。`,
                competitorWeakness: `大手集団スクールの情報が多く、${area.majorFacilities.map((f: AreaPublicFacility) => f.name).join('・')}での出張マンツーマン情報がない。`,
                ourWinningAngle: `${area.majorFacilities[0]?.name || '近隣公営プール'}対応を明記し、入会金無料の明朗会計を訴求。`,
            });
        }
    }

    // 3. 全候補プールを統合し、未作成のものだけにフィルタ
    const allPool = [...STRATEGIC_CANDIDATE_POOL, ...areaCandidates];
    const availablePool = allPool.filter((c) => {
        const norm = c.keyword.toLowerCase().replace(/\s+/g, '');
        return !existingKeywords.has(norm) && !existingSlugs.has(c.slug.toLowerCase());
    });

    // 4. スコアリング計算（検索ボリューム ✕ CVR直結度 ✕ 優先度補正）
    const scoredPool: KeywordCandidate[] = (availablePool.length > 0 ? availablePool : STRATEGIC_CANDIDATE_POOL).map((c) => {
        // スコア算出ロジック: (CVRスコア * 20) + (月間検索数 / 50) + カテゴリ優先度
        let categoryBonus = 0;
        if (c.category === 'pricing') categoryBonus = 15;
        if (c.category === 'adult') categoryBonus = 10;
        if (c.category === 'junior') categoryBonus = 10;

        const priorityScore = (c.estimatedCvrScore * 20) + (c.monthlySearchVolume / 50) + categoryBonus;
        return {
            ...c,
            priorityScore: Math.round(priorityScore * 10) / 10,
        };
    });

    // 5. 最高スコアのキーワードをソートして1位を選定
    scoredPool.sort((a, b) => b.priorityScore - a.priorityScore);

    return scoredPool[0];
}

/**
 * 毎日キーワード分析を実施し、STUDIO CMSに最適化したSEO記事を1本自動生成して保存・連携するメイン関数
 */
export async function executeDailySeoArticlePipeline(): Promise<{
    success: boolean;
    article?: StudioCmsArticle;
    message: string;
    details?: any;
}> {
    const startTime = Date.now();
    console.log('[Daily SEO Engine] Starting daily keyword analysis and STUDIO CMS article generation...');

    try {
        // ステップ 1: 本日の最優先キーワードを自律分析・選定
        const selectedCandidate = await analyzeDailyKeywordOpportunities();
        console.log(`[Daily SEO Engine] Selected Target Keyword of the day: "${selectedCandidate.keyword}" (Score: ${selectedCandidate.priorityScore})`);

        // ステップ 2: 競合3社ベンチマークインテリジェンスの取得
        const competitorIntel = getSeedKeywordIntelligence(selectedCandidate.keyword);
        const comparisonTableMarkdown = competitorIntel?.comparisonMarkdownTable || buildComparisonMarkdownTable(selectedCandidate.keyword);

        // ステップ 3: 記事自動生成（Gemini Flash or ローカル自律執筆）
        const generateParams = {
            keyword: selectedCandidate.keyword,
            articleType: 'seo' as const,
            targetPath: `/articles/${selectedCandidate.slug}`,
            customPrompt: `
【STUDIO CMS記事 執筆指示】
- 本記事はSTUDIO（studio.design）で制作された公式サイト「スイムパートナーズ（swim-partners.com）」のCMSブログ記事として公開されます。
- 対象読者: ${selectedCandidate.targetAudience}
- 検索意図: ${selectedCandidate.searchIntent}
- 競合の弱点打破: ${selectedCandidate.competitorWeakness}
- 自社の勝ち筋: ${selectedCandidate.ourWinningAngle}
- 読者の悩みを科学的・生体力学的に論理解説し、最後に出張個別指導体験レッスン（60分）へ無理なく導いてください。
            `.trim(),
            competitorIntelligence: competitorIntel,
        };

        const apiKey = process.env.GEMINI_API_KEY;
        let baseArticle: GeneratedArticle;

        if (apiKey && apiKey.trim()) {
            try {
                baseArticle = await generateArticleWithGeminiFlash(generateParams, apiKey.trim());
            } catch (aiErr) {
                console.warn('Gemini article generation failed, falling back to local engine:', aiErr);
                baseArticle = generateSeoAioArticle(generateParams);
                if (competitorIntel) {
                    baseArticle = enrichArticleWithCompetitorIntelligence(baseArticle, competitorIntel);
                }
            }
        } else {
            baseArticle = generateSeoAioArticle(generateParams);
            if (competitorIntel) {
                baseArticle = enrichArticleWithCompetitorIntelligence(baseArticle, competitorIntel);
            }
        }

        // ステップ 4: STUDIO CMS 仕様に合わせた本文および構造化データの最適化整形
        const studioBody = buildStudioOptimizedBody({
            title: baseArticle.title,
            keyword: selectedCandidate.keyword,
            bodyMarkdown: baseArticle.content_md,
            faqItems: baseArticle.faq_items || [],
            comparisonTableMarkdown,
            ctaHeadline: `${selectedCandidate.keyword}でお悩みなら、まずは60分の個別指導を体験`,
        });

        const studioJsonLd = buildStudioJsonLd({
            title: baseArticle.title,
            metaDescription: baseArticle.meta_description,
            keyword: selectedCandidate.keyword,
            slug: selectedCandidate.slug,
            faqItems: baseArticle.faq_items || [],
        });

        // ステップ 5: StudioCmsArticle オブジェクトの構築
        const studioArticle: StudioCmsArticle = {
            id: baseArticle.id,
            keyword: selectedCandidate.keyword,
            slug: selectedCandidate.slug,
            title: baseArticle.title,
            metaDescription: baseArticle.meta_description,
            bodyMarkdown: studioBody,
            bodyHtml: baseArticle.content_html,
            jsonLd: studioJsonLd,
            faqItems: baseArticle.faq_items || [],
            comparisonTableMarkdown,
            category: selectedCandidate.category,
            categoryLabel: selectedCandidate.categoryLabel,
            targetAudience: selectedCandidate.targetAudience,
            searchIntent: selectedCandidate.searchIntent,
            targetPath: `/articles/${selectedCandidate.slug}`,
            status: 'published',
            createdAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            analysisSummary: {
                reasonForSelection: selectedCandidate.reasonForSelection,
                monthlySearchVolume: selectedCandidate.monthlySearchVolume,
                estimatedCvrScore: selectedCandidate.estimatedCvrScore,
                competitorWeakness: selectedCandidate.competitorWeakness,
                ourWinningAngle: selectedCandidate.ourWinningAngle,
            },
        };

        // ステップ 6: 記事ストレージ（Supabase generated_articles & app_configs バックアップ）へ更新保存
        const updatedGeneratedArticle: GeneratedArticle = {
            ...baseArticle,
            title: studioArticle.title,
            meta_description: studioArticle.metaDescription,
            content_md: studioArticle.bodyMarkdown,
            json_ld: studioArticle.jsonLd,
            target_path: studioArticle.targetPath,
            status: 'published',
        };
        await saveGeneratedArticle(updatedGeneratedArticle);

        // ステップ 7: STUDIO CMS Webhook または API への自動同期（設定されている場合）
        const studioSyncResult = await syncArticleToStudioCms(studioArticle);

        // ステップ 8: Notion データベースへの自動投稿（STUDIO公式Notion同期連携）
        const notionResult: NotionSyncResult = await syncArticleToNotionDatabase(studioArticle);
        console.log('[Daily SEO Engine] Notion Sync Result:', notionResult.message);

        // ステップ 9: Google Chat への日次完了通知（Webhook URLがある場合）
        const gchatWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
        if (gchatWebhookUrl) {
            try {
                const notionStatusLine = notionResult.success
                    ? `📘 *Notion連携*: <${notionResult.url}|Notion DBへ自動投稿済み>（STUDIOへ自動同期）`
                    : `📘 *Notion連携*: 未設定（管理画面からワンクリックコピー可能）`;

                const message = 
`🏊‍♂️ *【日次SEO自動作成】本日のSTUDIO CMS記事が完成しました*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *分析キーワード*: *${selectedCandidate.keyword}*（月間検索: ${selectedCandidate.monthlySearchVolume} / CVRスコア: ${selectedCandidate.estimatedCvrScore}）
📝 *記事タイトル*: ${studioArticle.title}
🔗 *スラッグ*: \`${selectedCandidate.slug}\`
💡 *選定理由*: ${selectedCandidate.reasonForSelection}
${notionStatusLine}
🚀 *STUDIOエディタ*: <https://studio.design|STUDIOダッシュボードを開く>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
※管理画面「商圏SEOダッシュボード」からワンクリックでSTUDIO用テキストをコピー可能です。`;

                await fetch(gchatWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: message }),
                });
            } catch (notifyErr) {
                console.warn('[Daily SEO Engine] Google Chat notification failed:', notifyErr);
            }
        }

        const durationMs = Date.now() - startTime;
        console.log(`[Daily SEO Engine] Successfully completed daily article pipeline in ${durationMs}ms`);

        const syncMessage = notionResult.success
            ? 'Notionデータベースへ自動投稿完了（STUDIOへ同期）'
            : studioSyncResult.message;

        return {
            success: true,
            article: studioArticle,
            message: `「${selectedCandidate.keyword}」に対するSTUDIO CMS最適化記事を正常に自動生成・保存しました。(${syncMessage})`,
            details: {
                keyword: selectedCandidate.keyword,
                slug: selectedCandidate.slug,
                score: selectedCandidate.priorityScore,
                durationMs,
                notionSync: notionResult,
            },
        };
    } catch (err: any) {
        console.error('[Daily SEO Engine] Pipeline execution failed:', err);
        return {
            success: false,
            message: err?.message || '日次記事生成処理中にエラーが発生しました。',
        };
    }
}
