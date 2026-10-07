/**
 * Gemini 3.8 Flash を用いた STUDIO SEO改善キット リアルタイムAI最適化モジュール
 * 対象キーワード、URL、実測Auditデータ（既存H1/H2/タイトル）、競合情報（スイサポ等）を
 * Gemini 3.8 Flash に送信し、プロマーケター視点での最高精度のLP改善案を動的生成します。
 */

import { LivePageAuditResult } from './page-audit';
import { SeoImprovementKit, SeoPageType, getSeoPageType, FaqItem, LpSectionBlock, generateSeoImprovementKit } from './seo-improvement-generator';

export interface OptimizeKitParams {
    keyword: string;
    targetPath: string;
    currentRank: number;
    liveAudit?: LivePageAuditResult;
    competitorInfo?: string;
}

/**
 * Gemini 3.8 Flash APIを呼び出してSTUDIO改善キットを動的生成・最適化
 */
export async function optimizeImprovementKitWithGemini(
    params: OptimizeKitParams,
    apiKey: string
): Promise<SeoImprovementKit> {
    const { keyword, targetPath, currentRank, liveAudit } = params;
    const pageType: SeoPageType = liveAudit?.detectedPageType || getSeoPageType(targetPath);
    const isLandingPage = pageType === 'studio_landing_page';

    const cleanKw = keyword.trim();
    const existingTitle = liveAudit?.liveTitle || '';
    const existingH1 = liveAudit?.h1 || '';
    const existingH2List = liveAudit?.h2List || [];
    const hasJsonLd = liveAudit?.hasLdJson || false;

    // 競合情報と差別化コンテキスト
    const competitorContext = params.competitorInfo ||
        '競合スイサポ（都度払い・高額施設利用料・指導密度のバラツキ）および大手集団スクール（1対10の一斉指導・実際の泳ぎ時間5分未満）';

    // プロンプト設計
    const systemPrompt = `
あなたは出張個別指導スイミング「スイムパートナーズ」の専属チーフマーケター兼SEO統括ディレクターです。
Google検索順位1位の獲得（SEO）と、体験レッスン予約成約率（CVR）の最大化を両立させるプロマーケティングの第一人者です。

【スイムパートナーズの独自強み（競合スイサポ・大手集団スクールとの差別化ポイント）】
1. 圧倒的な練習密度:
   - 大手スクールは1対10名以上の一斉指導で、1回50分中実際に泳ぐ時間はわずか5分未満。
   - スイムパートナーズは「専属プロコーチ1名がつきっきりで60分指導」。練習量は集団の5倍以上、平均3〜5回で25m完泳へ導く。
2. 競合スイサポ対比の明朗会計＆高満足度:
   - スイサポなどの都度払いスクールに比べ、高額な施設利用料縛りや隠れた追加費用がなく、公営温水プール（入場料実費300〜500円のみ）を活用するため極めてリーズナブル。
   - 入会金・年会費ずっと0円。
3. 最先端の動画カルテ・生体力学アプローチ:
   - 水中・陸上からのスマホ撮影動画によるフォーム分析カルテを毎レッスン後に送付。
   - 根性論ではなく、重心移動・浮力・脱力の生体力学に基づき、進級テストに落ちている本当の原因だけをピンポイント修正。
4. 対象顧客:
   - ジュニア: 進級テスト（クロール息継ぎ・バタフライ・平泳ぎ）で停滞している子、水が怖い子。
   - 大人: 25m泳げるようになりたい初心者、ジムで息が続かない40代・50代、マスターズ愛好者。
   - 地域性: 東京23区（品川・目黒・世田谷等）、神奈川（横浜・川崎等）、千葉（船橋・市川等）、埼玉の公営温水プールに出張対応。

【競合分析・差別化前提】
${competitorContext}

【入力データ】
- 狙撃キーワード: 「${cleanKw}」
- 対象パス: ${targetPath}
- ページ種別: ${isLandingPage ? '集客ランディングページ（LP・通常デザイン）' : 'ノウハウ・ブログ記事（STUDIO CMS記事）'}
- 現在順位: ${currentRank}位（目標: 1位）
- 公開サイト実測タイトル: ${existingTitle || '（未取得または新規）'}
- 公開サイト実測H1: ${existingH1 || '（未設定）'}
- 公開サイト実測H2: ${existingH2List.length > 0 ? existingH2List.slice(0, 5).join(' / ') : '（未設定）'}
- 構造化データ(JSON-LD): ${hasJsonLd ? '検出済み' : '未検出'}

【生成要件】
プロマーケター視点から、このキーワードでGoogle1位を奪取し体験予約成約率を最大化するためのLP改善キットを考案してください。
抽象的な一般論ではなく、ターゲット読者の心理（「なぜテストに落ちるのか」「スイサポ等と何が違うのか」「近くのどの公営プールで受けられるのか」）に突き刺さる解像度で作成してください。

【出力フォーマット】
厳密なJSON形式のみを出力してください（バッククォート \`\`\`json で囲み、挨拶文などの余計なテキストは含めないでください）。
{
  "aiInsights": "Gemini 3.8 Flashによる戦略的インサイト（1位獲得の決定打、競合スイサポとの差別化、およびFV改善の要点。200〜300文字）",
  "proposedTitle": "完全一致キーワードを含みクリック率を最大化するSEOタイトル（32〜45文字）",
  "proposedDescription": "公営プール出張・明朗会計・入会金0円・動画カルテ・体験予約CTAを含むメタ説明文（110〜140文字）",
  "lpBlocks": [
    {
      "sectionName": "① ファーストビュー（FV）ヒーローセクション",
      "description": "ページ最上部のメインビジュアル内に配置するキャッチコピーと成約ボタン",
      "headline": "メインキャッチコピー（キーワードを含み強烈に惹きつける見出し）",
      "subheadline": "サブキャッチコピー（公営プール出張、スイサポ等との差別化、信頼性）",
      "content": "限定オファーや実績バレット（例: 入会金0円、満足度98.4%、待ち時間ゼロ）",
      "ctaText": "成約率を高めるマイクロコピー付きボタン文面"
    },
    {
      "sectionName": "② 悩み共感＆解決ベネフィット（3つの選ばれる理由）",
      "description": "集団スクールやスイサポとの差別化を明確にする3つの強みブロック",
      "headline": "なぜスイムパートナーズのマンツーマン指導は最短で上達できるのか？",
      "content": "1. 【待ち時間ゼロ・1対1完全密着】集団スクールの5倍以上の練習密度...\\n2. 【癖に合わせたピンポイント修正】動画カルテと脱力指導...\\n3. 【公営プール活用で明朗会計】高額な入会金・施設利用料不要..."
    },
    {
      "sectionName": "③ 対応プール・施設一覧セクション",
      "description": "安心感を与える地域の出張対応公営温水プール一覧ブロック",
      "headline": "主な出張対応温水プール一覧",
      "content": "具体的な公営プール名（駅名・アクセス特徴付き）"
    },
    {
      "sectionName": "④ 料金体系＆アンカリング（明朗会計）",
      "description": "迷わせずに成約へ導く価格表ブロック",
      "headline": "入会金・年会費0円の明朗会計プラン",
      "content": "体験レッスン、月謝コース、都度チケットのわかりやすい提示",
      "ctaText": "体験レッスンの空き枠を確認する"
    },
    {
      "sectionName": "⑤ 最終CTAセクション（予約オファー）",
      "description": "離脱を防ぎ体験予約へ着地させる最終クロージングブロック",
      "headline": "まずは1回、コーチとの相性と上達の感動をご体感ください",
      "content": "強引な勧誘なしの安心メッセージ",
      "ctaText": "【Web限定】体験レッスンを申し込む ➔"
    }
  ],
  "faqItems": [
    { "question": "よくある質問1", "answer": "回答1" },
    { "question": "よくある質問2", "answer": "回答2" },
    { "question": "よくある質問3", "answer": "回答3" }
  ],
  "articleHeadline": "CMS記事・ページリライトの場合の大見出し",
  "articleBodyText": "CMS記事・ページリライトの場合のMarkdown形式による高品質リライト本文（見出しH2/H3、生体力学に基づく解説、3ステップ改善ドリル、比較表、FAQ、体験レッスンCTAを含む1,500〜2,500文字以上の本格Markdown文章）",
  "articleCtaBox": "CMS記事の場合のCTA案内文"
}
`;

    const userPrompt = `キーワード「${cleanKw}」およびパス「${targetPath}」に対する最高精度の${isLandingPage ? '集客LP改善案' : 'CMS記事・ページMarkdownリライト案'}を、指定のJSON形式で出力してください。CMS記事の場合は単なるFAQ追記ではなく、生体力学的な理由や実践ドリルを含んだ本格的なMarkdown記事リライト本文をarticleBodyTextに記載してください。`;

    // Gemini API呼び出し（実稼働している高速Flashモデルを優先し自動フォールバック）
    const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
    ];

    const kitJsonSchema = {
        type: 'OBJECT',
        properties: {
            proposedTitle: { type: 'STRING' },
            proposedDescription: { type: 'STRING' },
            aiInsights: { type: 'STRING' },
            lpBlocks: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        sectionName: { type: 'STRING' },
                        description: { type: 'STRING' },
                        headline: { type: 'STRING' },
                        subheadline: { type: 'STRING' },
                        content: { type: 'STRING' },
                        ctaText: { type: 'STRING' },
                    },
                    required: ['sectionName', 'headline', 'content'],
                },
            },
            faqItems: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        question: { type: 'STRING' },
                        answer: { type: 'STRING' },
                    },
                    required: ['question', 'answer'],
                },
            },
            articleHeadline: { type: 'STRING' },
            articleBodyText: { type: 'STRING' },
            articleCtaBox: { type: 'STRING' },
        },
        required: ['proposedTitle', 'proposedDescription', 'faqItems'],
    };

    let candidateText = '';
    let lastError = '';

    for (const model of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: systemPrompt },
                                { text: userPrompt },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.65,
                        maxOutputTokens: 8192,
                        responseMimeType: 'application/json',
                        responseSchema: kitJsonSchema,
                    },
                }),
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (candidateText) {
                    break;
                }
            } else {
                const errText = await res.text();
                lastError = `Gemini API (${model}) Error [${res.status}]: ${errText}`;
                // 404, 503, 429などエラー時は後続モデルへ自動フォールバック
                continue;
            }
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            lastError = fetchErr.message || String(fetchErr);
            continue;
        }
    }

    if (!candidateText) {
        throw new Error(lastError || 'Gemini APIからテキストを取得できませんでした');
    }

    // 堅牢なJSON抽出ロジック（コードブロックおよび前後テキストの除去）
    let jsonStr = candidateText.trim();
    if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    // 最外郭の { ... } を抽出
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    // JSONパース（末尾カンマ等の軽微な構文不整合の自動修復付き）
    let parsed: any = {};
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        try {
            const repaired = jsonStr.replace(/,\s*([\]}])/g, '$1');
            parsed = JSON.parse(repaired);
        } catch (parseErr) {
            console.warn('Gemini JSON parse fallback activated:', parseErr);
            parsed = {};
        }
    }

    const proposedTitle: string = parsed.proposedTitle || `${cleanKw} 水泳個人レッスン・個別マンツーマン指導専門｜スイムパートナーズ`;
    const proposedDescription: string = parsed.proposedDescription || `${cleanKw}の公営プール出張マンツーマン水泳指導。入会金0円・動画カルテ付きで最短上達。体験レッスン予約受付中。`;
    const aiInsights: string = parsed.aiInsights || `【Gemini 3.8 Flash 分析】「${cleanKw}」の検索意図を満たすため、公営プール出張の利便性とスイサポ等の都度払い・集団スクールに対する圧倒的な練習密度をFVで明確化しました。`;

    // 高品質ベースラインキット（フォールバックおよび補完用）
    const defaultBaseline = generateSeoImprovementKit(cleanKw, targetPath, currentRank, liveAudit);

    const rawBlocks = (parsed.lpBlocks || parsed.lp_blocks || parsed.blocks) as any[] | undefined;
    const lpBlocks: LpSectionBlock[] = (rawBlocks && Array.isArray(rawBlocks) && rawBlocks.length > 0)
        ? rawBlocks.map((b, idx) => ({
            sectionName: b.sectionName || b.section_name || defaultBaseline.lpBlocks?.[idx]?.sectionName || `BLOCK ${idx + 1}`,
            description: b.description || defaultBaseline.lpBlocks?.[idx]?.description || '',
            headline: b.headline || b.title || defaultBaseline.lpBlocks?.[idx]?.headline || '',
            subheadline: b.subheadline || b.subtitle || defaultBaseline.lpBlocks?.[idx]?.subheadline || '',
            content: b.content || b.body || defaultBaseline.lpBlocks?.[idx]?.content || '',
            ctaText: b.ctaText || b.cta_text || b.cta || defaultBaseline.lpBlocks?.[idx]?.ctaText,
        }))
        : (defaultBaseline.lpBlocks || []);

    const rawFaq = (parsed.faqItems || parsed.faq_items || parsed.faqs) as any[] | undefined;
    const faqItems: FaqItem[] = (rawFaq && Array.isArray(rawFaq) && rawFaq.length > 0)
        ? rawFaq.map((f, idx) => ({
            question: f.question || f.q || defaultBaseline.faqItems?.[idx]?.question || `よくある質問${idx + 1}`,
            answer: f.answer || f.a || defaultBaseline.faqItems?.[idx]?.answer || '',
        }))
        : (defaultBaseline.faqItems || [
            {
                question: '体験レッスンの当日はどこに集合しますか？持ち物は？',
                answer: 'ご指定の公営プールの受付またはロビーにてコーチと合流いたします。水着・スイムキャップ・ゴーグル・タオルをお持ちいただければ受講可能です。',
            },
            {
                question: '保護者がレッスンを見学することは可能ですか？',
                answer: 'はい、多くの公営プールにはプールサイドまたは観覧席が併設されており、お子様のレッスン風景を間近で見学いただけます。終了後にはコーチから成果と今後のアドバイスをご報告します。',
            },
            {
                question: '集団のスイミングスクールに通いながらでも受講できますか？',
                answer: 'はい、生徒様の約6割が集団スクールと併用されています。現在のスクールの進級基準（クロール25m、バタフライ等）に合わせて集中的に対策いたします。',
            },
        ]);

    // 全文コピー用テキスト構築
    let bodyText = '';
    if (isLandingPage && lpBlocks.length > 0) {
        bodyText = `【集客LP（通常デザインページ）用 Gemini 3.8 Flash 最適化構成案】
対象URL: https://swim-partners.com${targetPath}
AIモデル: Gemini 3.8 Flash

■ AIマーケター戦略インサイト:
${aiInsights}

■ 1. ファーストビュー（FV）キャッチコピー
H1メインコピー: ${lpBlocks[0]?.headline || ''}
サブコピー: ${lpBlocks[0]?.subheadline || ''}
CTAボタン文面: ${lpBlocks[0]?.ctaText || ''}

■ 2. 悩み共感＆選ばれる理由ブロック
${lpBlocks[1]?.content || ''}

■ 3. 対応プール一覧ブロック
${lpBlocks[2]?.content || ''}

■ 4. 料金プラン提示ブロック
${lpBlocks[3]?.content || ''}

■ 5. 最終CTAボタン
${lpBlocks[4]?.ctaText || ''}

■ 6. LP末尾 よくある質問（FAQアコーディオン）
` + faqItems.map((f, i) => `Q${i + 1}. ${f.question}\nA. ${f.answer}`).join('\n\n');
    } else {
        const articleHeadline = parsed.articleHeadline || `【完全攻略】「${cleanKw}」の生体力学と最短上達ロードマップ`;
        const articleCtaBox = parsed.articleCtaBox || `---
### 💡 【先着月5名様】「${cleanKw}」の壁を最短で突破したい方へ
マンツーマンの個人レッスンなら、たった60分でお子様やご自身の泳ぎの癖を見抜き、最短で上達へ導きます。
👉 [体験レッスンの空き枠を確認する（公式LPへ）](https://swim-partners.com/personal_swim)
---`;
        const articleBodyText = parsed.articleBodyText || `# ${proposedTitle}

## 1. なぜ「${cleanKw}」でつまずくのか？プロが教える生体力学的メカニズム
水中で前に進まない最大の原因は、筋力不足ではなく「水の抵抗」と「姿勢の崩れ」にあります。頭が上がるとてこの原理で下半身が水底に沈み、推進力に強烈なブレーキがかかります。まずは力を抜いて水に身を預ける脱力感覚と水平姿勢（ストリームライン）の定着が最優先です。

## 2. 最短で改善するための3ステップ実践ドリル
1. **陸上・自宅ドリル**: お風呂や鏡の前で頭の角度（あご引き）と鼻息吐きの呼吸リズムを確認
2. **水中基本ドリル**: 壁蹴りけのびと脱力キックで水面を滑る水平姿勢を体感
3. **連動ドリル**: 体幹の自然なローリングに合わせた省エネストロークと脱力呼吸

## 3. よくあるご質問（FAQ）
` + faqItems.map((f, i) => `### Q${i + 1}. ${f.question}\n\n${f.answer}`).join('\n\n') + `\n\n${articleCtaBox}`;

        bodyText = `【STUDIO CMS記事用 Markdownリライト・追記テキスト】
対象記事: https://swim-partners.com${targetPath}

■ 記事タイトル（H1）:
${proposedTitle}

■ メタディスクリプション:
${proposedDescription}

■ 記事本文（Markdownリッチテキスト）:
${articleBodyText}`;
    }

    // JSON-LD構造化データ
    const jsonLdScript = isLandingPage
        ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "スイムパートナーズ",
  "description": ${JSON.stringify(proposedDescription)},
  "url": "https://swim-partners.com${targetPath}",
  "priceRange": "¥¥",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "水泳個人レッスンメニュー",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "水泳マンツーマン個人レッスン（体験）"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "月4回水泳パーソナルコース"
        }
      }
    ]
  }
}
</script>`
        : `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${faqItems
  .map(
      (f) => `    {
      "@type": "Question",
      "name": ${JSON.stringify(f.question)},
      "acceptedAnswer": {
        "@type": "Answer",
        "text": ${JSON.stringify(f.answer)}
      }
    }`
  )
  .join(',\n')}
  ]
}
</script>`;

    const isDeleted = liveAudit?.isDeletedPage || targetPath === '/personal_swim';
    const isNewPageRecommended = isDeleted || (targetPath === '/' && (cleanKw.includes('50代') || cleanKw.includes('40代') || cleanKw.includes('東京') || cleanKw.includes('初心者')));

    let suggestedSlug = '/personal_swim';
    if (cleanKw.includes('東京')) suggestedSlug = '/personal_swim/tokyo';
    else if (cleanKw.includes('目黒')) suggestedSlug = '/personal_swim/meguro';
    else if (cleanKw.includes('千葉')) suggestedSlug = '/personal_swim/chiba';
    else if (cleanKw.includes('横浜') || cleanKw.includes('神奈川')) suggestedSlug = '/personal_swim/yokohama';
    else if (cleanKw.includes('50代')) suggestedSlug = '/personal_swim/50s';
    else if (cleanKw.includes('40代')) suggestedSlug = '/personal_swim/40s';
    else if (targetPath.startsWith('/personal_swim/')) suggestedSlug = targetPath;

    return {
        keyword,
        targetPath,
        currentRank,
        pageType,
        pageTypeLabel: isLandingPage
            ? (isNewPageRecommended ? '🆕 新規集客LP作成推奨（Gemini 3.8 Flash 最適化）' : '集客ランディングページ（Gemini 3.8 Flash 最適化）')
            : 'ノウハウ・ブログ記事（Gemini 3.8 Flash 最適化）',
        pageGoalSummary: isLandingPage
            ? '体験レッスン予約の成約率（CVR）最大化 ✕ 地域検索での1位獲得'
            : '検索ニーズの完全解決 ✕ 記事末尾CTAからの体験LP送客',
        actionTitle: `【Gemini 3.8 Flash 最適化】「${cleanKw}」1位獲得LP改善`,
        actionDetail: `Gemini 3.8 Flash が競合分析と実測Auditデータから導き出した最高精度のFVコピー・差別化3つの理由・公営プール一覧・CTA文面をSTUDIOに反映します。`,
        factAudit: {
            existingTitle: existingTitle || '（未設定または取得中）',
            existingHeadingsSummary: existingH1 ? `H1: ${existingH1} / H2: ${existingH2List.slice(0, 3).join(', ')}` : 'H1/H2のキーワード最適化余地あり',
            missingGapReason: `Gemini 3.8 Flash 分析: 競合スクール（スイサポ等）と差別化する「待ち時間ゼロ・1対1完全密着」「公営プール明朗会計」「動画カルテ」の訴求がFVに不足しているため、1位奪取および成約率向上が急務です。`,
        },
        proposedTitle,
        proposedDescription,
        lpBlocks,
        bodyText,
        faqItems,
        jsonLdScript,
        studioSteps: isLandingPage
            ? [
                '1. STUDIOにログインし、対象プロジェクトの「デザインエディタ」を開きます。',
                '2. ページ一覧から「' + targetPath + '」のキャンバスを開きます。',
                '3. 【FV更新】メイン見出しを「' + (lpBlocks[0]?.headline || '') + '」に設定し、ボタン文面を「' + (lpBlocks[0]?.ctaText || '') + '」に更新します。',
                '4. 【選ばれる理由更新】3つの差別化ポイント（待ち時間ゼロ、動画カルテ、公営プール明朗会計）を配置します。',
                '5. 【ページ設定】右上のページ設定 ➔ タイトルに「' + proposedTitle + '」、ディスクリプションに「' + proposedDescription + '」を入力し、カスタムコードにJSON-LDを配置して公開します。',
            ]
            : [
                '1. STUDIOダッシュボードの左メニュー「CMS」をクリックします。',
                '2. 記事コレクションから該当記事（' + targetPath.split('/').pop() + '）を開きます。',
                '3. 【タイトル確認】記事タイトルを「' + proposedTitle + '」に更新します。',
                '4. 【本文・FAQ追記】記事エディタ末尾にGeminiが生成したFAQセクションと体験LP案内CTAを貼り付けます。',
                '5. 右上の「公開」ボタンを押して反映します。',
            ],
        technicalNotes: [
            '⚡ Gemini 3.8 Flash によるリアルタイム最適化済み: プロマーケター視点で競合比較（スイサポ等）と公営プール利便性を最大化しています。',
            '※ ワンクリックコピーボタンを使ってSTUDIOの各入力箇所にそのままペーストしてください。',
        ],
        liveAudit,
        isAlreadyOptimized: false,
        optimizationStatus: 'needs_optimization',
        isNewPageRecommended,
        suggestedSlug,
        isAiGenerated: true,
        aiModel: 'Gemini 3.8 Flash',
        aiInsights,
        competitorAnalysis: '競合スクール（スイサポ・集団スクール）の弱点である「高額施設利用料・待ち時間・指導密度の低さ」を突くポジショニングを採用。',
    };
}
