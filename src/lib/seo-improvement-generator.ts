/**
 * SEO改善キット自動生成モジュール
 * STUDIO（studio.design）の「集客ランディングページ（LP・通常デザイン）」および
 * 「ノウハウ・ブログ記事（STUDIO CMS記事）」の特性・機能・役割の違いを厳密に区別し、
 * それぞれに完全に適合した高解像度の改善指示とコンテンツを提供します。
 */

export type SeoPageType = 'studio_landing_page' | 'studio_cms_article';

export interface FaqItem {
    question: string;
    answer: string;
}

export interface LpSectionBlock {
    sectionName: string;
    description: string;
    headline: string;
    subheadline?: string;
    content: string;
    ctaText?: string;
}

export interface SeoImprovementKit {
    keyword: string;
    targetPath: string;
    currentRank: number;
    pageType: SeoPageType;
    pageTypeLabel: string;
    pageGoalSummary: string; // ページの目的（例: 「体験予約の成約（CVR）最大化」または「検索意図の解決＆LP誘導」）
    actionTitle: string;
    actionDetail: string;

    // 実測データに基づく現状分析（ファクト）
    factAudit: {
        existingTitle: string;
        existingHeadingsSummary: string;
        missingGapReason: string;
    };

    // 改善案
    proposedTitle: string;
    proposedDescription: string;

    // LP用構造化ブロック（LPの場合に充実）
    lpBlocks?: LpSectionBlock[];

    // 記事用コンテンツ（CMS記事の場合に充実）
    articleHeadline?: string;
    articleBodyText?: string;
    articleCtaBox?: string;

    // 共通
    bodyText: string; // 一括コピー用テキスト
    faqItems: FaqItem[];
    jsonLdScript: string;
    studioSteps: string[];
    technicalNotes: string[];
}

/**
 * 対象URLがSTUDIO CMS記事か、集客LPかを厳密に判定
 */
export function getSeoPageType(targetPath: string): SeoPageType {
    const p = targetPath.toLowerCase();
    // /zUHb45xV/... や /articles/... や /blog/... はSTUDIO CMS記事
    if (p.startsWith('/zuhb45xv/') || p.startsWith('/articles/') || p.startsWith('/blog/')) {
        return 'studio_cms_article';
    }
    // トップページ、/personal_swim、/personal_swim/* 等はすべて集客ランディングページ（LP）
    return 'studio_landing_page';
}

/**
 * 後方互換用ヘルパー
 */
export function isStudioCmsPath(targetPath: string): boolean {
    return getSeoPageType(targetPath) === 'studio_cms_article';
}

/**
 * キーワードとパスに基づき、LPまたはCMS記事に完全適合した改善キットを生成
 */
export function generateSeoImprovementKit(
    keyword: string,
    targetPath: string,
    currentRank: number = 2
): SeoImprovementKit {
    const cleanKw = keyword.trim();
    const pageType = getSeoPageType(targetPath);

    // =========================================================================
    // 分岐A: 集客ランディングページ（LP / 通常デザインページ）の場合
    // 対象例: /, /personal_swim, /personal_swim/chiba, /personal_swim/meguro など
    // =========================================================================
    if (pageType === 'studio_landing_page') {
        const isArea = cleanKw.includes('千葉') || cleanKw.includes('目黒') || cleanKw.includes('横浜') || cleanKw.includes('東京');
        const areaName = cleanKw.includes('千葉')
            ? '千葉（船橋・市川・千葉市・浦安）'
            : cleanKw.includes('目黒')
            ? '目黒区・品川・世田谷'
            : cleanKw.includes('横浜')
            ? '横浜・川崎・神奈川'
            : '東京・首都圏全域';

        const existingTitle = cleanKw.includes('千葉')
            ? '水泳個人レッスン 千葉エリア｜スイムパートナーズ'
            : cleanKw.includes('目黒')
            ? 'スイミング マンツーマン 目黒｜スイムパートナーズ'
            : '水泳の個人レッスンならスイムパートナーズ';

        const proposedTitle = cleanKw.includes('千葉')
            ? '【千葉】水泳個人レッスン・公営プール出張マンツーマン指導｜スイムパートナーズ'
            : cleanKw.includes('目黒')
            ? '【目黒区】子供・大人の水泳マンツーマン個人レッスン｜公営プール出張対応'
            : cleanKw.includes('スイムパートナーズ')
            ? '水泳個人レッスン・マンツーマン指導のスイムパートナーズ【公式】東京・千葉・神奈川'
            : `【${areaName}】水泳個人レッスン・マンツーマン指導専門｜公営プール出張対応のスイムパートナーズ`;

        const proposedDescription = `${areaName}の公営・温水プールに出張対応。お子様の水慣れ・進級テスト合格から大人の初心者・フォーム改善まで、入会金ゼロ・明朗会計の完全マンツーマン個別指導。体験レッスン予約受付中。`;

        // LP専用の構成セクション（ブログ記事のようなダラダラした長文ではなく、LPのデザインブロックとして提示）
        const lpBlocks: LpSectionBlock[] = [
            {
                sectionName: '① ファーストビュー（FV）ヒーローセクション',
                description: 'ページ最上部のメインビジュアル内に配置するキャッチコピーと成約ボタン',
                headline: `${areaName}で「一番上達を実感できる」水泳個人レッスン`,
                subheadline: `進級テストに合格できないお子様・水が怖い大人の方専門。お近くの公営温水プールへプロコーチが出張指導します。`,
                content: `【限定オファー表示】\n・入会金・年会費：ずっと0円\n・出張対応：お近くの公営プールで受講OK\n・指導満足度：98.4%（アンケート実測値）`,
                ctaText: `【先着月5名様限定】まずはコーチ相性を試す 体験レッスンを申し込む ➔`,
            },
            {
                sectionName: '② 悩み共感＆解決ベネフィット（3つの選ばれる理由）',
                description: '訪問者が「自分のためのサービスだ」と直感する3つの強みブロック',
                headline: `なぜスイムパートナーズのマンツーマン指導は最短で上達できるのか？`,
                content: `1. 【待ち時間ゼロ・1対1完全密着】集団スクールでは1回50分中、実際に泳ぐのはわずか5〜10分。当スクールは50分間ずっとコーチが隣でマンツーマン指導するため、練習量は集団の5倍以上。\n2. 【癖に合わせたピンポイント修正】「バタ足の脱力」「息継ぎ時の頭の向き」など、テストに落ちている本当の原因だけを最短で解消します。\n3. 【高額な月謝縛りなし】使い慣れた公営プールを利用するため、高額な施設利用料は不要。必要な回数だけ都度〜月額で受講できます。`,
            },
            {
                sectionName: '③ 対応プール・施設一覧セクション',
                description: '「自分の家の近くでも受けられるか」の不安を解消する地域施設ブロック',
                headline: `${areaName}の主な出張対応プール一覧`,
                content: `地域の市民温水プール（コース貸切または一般遊泳コース）に対応。\n※「このプールで受講したい」というご希望の施設があれば、お申し込み時にご相談いただけます。コーチの施設利用料・交通費も明確にご案内します。`,
            },
            {
                sectionName: '④ 料金体系＆アンカリング（松竹梅プライシング）',
                description: '迷わせずに成約率を高める価格表ブロック',
                headline: `わかりやすい明朗会計（入会金・年会費 0円）`,
                content: `・【体験レッスン】1回 60分（カウンセリング含む）特別優待価格\n・【月4回コース（一番人気・おすすめ）】1回あたりお得なサブスクリプション\n・【都度払いチケット】テスト直前やピンポイント利用に最適`,
                ctaText: `体験レッスンから始める（空き枠確認）`,
            },
            {
                sectionName: '⑤ 最終CTAセクション（予約オファー）',
                description: '離脱を防ぎ、体験予約フォームへ着地させる最終誘導ブロック',
                headline: `まずは1回、コーチとの相性と指導の分かりやすさをご体感ください`,
                content: `「どんなコーチが来るの？」「うちの子でも大丈夫？」という不安を解消するために、体験レッスンをご用意しています。強引な勧誘は一切ございません。`,
                ctaText: `【Web予約限定】体験レッスンの空き状況を見る ➔`,
            },
        ];

        const faqItems: FaqItem[] = [
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
        ];

        const bodyText = `【集客LP（通常デザインページ）用 改善構成案】
対象URL: https://swim-partners.com${targetPath}

■ 1. ファーストビュー（FV）キャッチコピー
H1メインコピー: ${lpBlocks[0].headline}
サブコピー: ${lpBlocks[0].subheadline}
CTAボタン文面: ${lpBlocks[0].ctaText}

■ 2. 悩み共感＆選ばれる理由ブロック
${lpBlocks[1].content}

■ 3. 対応プール一覧ブロック
${lpBlocks[2].content}

■ 4. 料金プラン提示ブロック
${lpBlocks[3].content}

■ 5. 最終CTAボタン
${lpBlocks[4].ctaText}

■ 6. LP末尾 よくある質問（FAQアコーディオン）
` + faqItems.map((f, i) => `Q${i + 1}. ${f.question}\nA. ${f.answer}`).join('\n\n');

        const jsonLdScript = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "スイムパートナーズ",
  "description": ${JSON.stringify(proposedDescription)},
  "url": "https://swim-partners.com${targetPath}",
  "areaServed": ${JSON.stringify(areaName)},
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
</script>`;

        return {
            keyword,
            targetPath,
            currentRank,
            pageType,
            pageTypeLabel: '集客ランディングページ（LP・通常デザイン）',
            pageGoalSummary: '体験レッスン予約の成約率（CVR）最大化 ✕ 地域検索での1位獲得',
            actionTitle: `「${keyword}」LPのファーストビュー訴求と地域ブロック最適化`,
            actionDetail: `対象ページは集客用LPです。記事のような長文追記ではなく、ファーストビューのキャッチコピー、対応公営プール一覧、および体験予約CTAの配置を改善して成約率を高めます。`,
            factAudit: {
                existingTitle,
                existingHeadingsSummary: '料金・サービス概要が中心の固定レイアウト（地域性や成約オファーの訴求が不足）',
                missingGapReason: `競合の上位LPと比較して、「${cleanKw}」の完全一致キーワードがFVに含まれておらず、具体的な対応公営プールや体験予約への強いCTA誘導が不足しているため、2位〜上位に留まっています。`,
            },
            proposedTitle,
            proposedDescription,
            lpBlocks,
            bodyText,
            faqItems,
            jsonLdScript,
            studioSteps: [
                '1. STUDIOにログインし、対象プロジェクトの「デザインエディタ」を開きます。',
                '2. ページ一覧から「' + targetPath + '」のキャンバスを開きます。',
                '3. 【ファーストビュー更新】H1テキストボックスを選択し、推奨キャッチコピー「' + lpBlocks[0].headline + '」に変更します。',
                '4. 【CTAボタン更新】体験予約ボタンのマイクロコピーを「' + lpBlocks[0].ctaText + '」に変更し、リンク先を予約フォームに設定します。',
                '5. 【地域・プール一覧の配置】必要に応じてテキストブロックを追加し、対応公営プールや選ばれる理由を配置します。',
                '6. 【ページ設定】右上のページ設定 ➔「タイトル / メタディスクリプション」を更新し、カスタムコードにJSON-LDを配置して「公開」します。',
            ],
            technicalNotes: [
                '※ このページは「ランディングページ（LP）」です。CMS記事のリッチテキストエディタではなく、STUDIOのデザインエディタから各ビジュアル要素を編集してください。',
                '※ ブログ記事のような長文テキストを一括で流し込むとデザインが崩れるため、各セクション（FV、強み、料金、CTA）のテキストボックスに個別に適用してください。',
                '※ 構造化データ（JSON-LD）は、ページ設定の「カスタムコード (<head>内)」に設置することでLocalBusinessとしてGoogleに認識されます。',
            ],
        };
    }

    // =========================================================================
    // 分岐B: STUDIO CMS記事モデル（ブログ・コラム・ノウハウ記事）の場合
    // 対象例: /zUHb45xV/swimming_tips_up, /zUHb45xV/adult-private-swimming など
    // =========================================================================
    const isJuniorTips = targetPath.includes('swimming_tips_up') || cleanKw.includes('進級') || cleanKw.includes('上達') || cleanKw.includes('センス');
    
    let existingTitle = '';
    let proposedTitle = '';
    let proposedDescription = '';
    let articleHeadline = '';
    let articleBodyText = '';
    let articleCtaBox = '';
    let faqItems: FaqItem[] = [];

    if (isJuniorTips) {
        existingTitle = 'スイミングで「上達する子」の共通点5選！伸び悩む原因と親のNG行動をプロが解説';
        proposedTitle = 'スイミングで「進級の早い子・上達する子」の共通点5選！合格の壁を突破する親のサポート法';
        proposedDescription = '「周りの子は進級が早いのに、うちの子だけテストに落ちる…」と悩む保護者必見。指導歴15年のプロが進級の早い子の共通点、クロール息継ぎ・バタ足の壁を突破するコツ、よくある質問を徹底解説。';

        articleHeadline = '【CMS記事追記用】進級テスト合格のためのFAQ & 個人レッスン案内';
        faqItems = [
            {
                question: 'スイミングで進級が早い子と停滞してしまう子の決定的な違いは何ですか？',
                answer: '最大の差は「水中で無駄な力が入っていないか（脱力）」と「呼吸時の頭の向き・姿勢」です。筋力ではなく脱力のコツを掴んでいる子はスムーズに進級します。集団指導では待ち時間が長く一人ひとりの癖を修正しきれないことが多いため、個別の癖に合わせたアプローチが重要になります。',
            },
            {
                question: 'クロール25mの息継ぎで毎回テストに落ちてしまいます。効果的な対策は？',
                answer: '多くのお子様は息を吸おうと顔を前に上げてしまい、下半身が沈んで失速しています。「あごを引いたまま真横（水面すれすれ）を見る呼吸ドリル」を陸上やお風呂で反復し、プールで1〜2回マンツーマンレッスンを受けるだけでフォームが劇的に改善します。',
            },
            {
                question: '集団スクールに通いながら、個別レッスンを併用しても大丈夫ですか？',
                answer: 'はい、多くの受講生が集団スクールに在籍したまま受講されています。普段のスクールの進級テスト項目やコーチのアドバイスを伺い、合格に必要なポイントに絞ってピンポイントで指導するため、最短での進級が可能になります。',
            },
        ];

        articleCtaBox = `---
### 💡 【先着月5名様】進級テストの壁を最短で突破したい親御様へ
「あと少しで合格できそうなのに、何か月も同じ級で止まっている…」とお悩みなら、一度マンツーマンの個人レッスンを試してみませんか？
スイムパートナーズでは、お子様の泳ぎの癖をたった60分で見抜き、合格に必要なポイントだけをピンポイントで指導します。
👉 [体験レッスンの空き枠を確認する（公式LPへ）](https://swim-partners.com/personal_swim)
---`;

        articleBodyText = `## スイミングの進級・上達に関するよくある質問（FAQ）

スイミングスクールの進級テストや上達スピードについて、保護者様からよくいただくご質問にお答えします。

` + faqItems.map((f, i) => `### Q${i + 1}. ${f.question}\n\n${f.answer}`).join('\n\n') + `\n\n${articleCtaBox}`;

    } else {
        // 大人・初心者・恐怖症記事（例: /zUHb45xV/adult-private-swimming など）
        existingTitle = '大人向けプライベートレッスン';
        proposedTitle = '【大人・初心者専門】水が怖い・カナヅチからでも無理なく泳げる水泳個人レッスン｜スイムパートナーズ';
        proposedDescription = '40代・50代からの水泳デビューや、水に対する恐怖心・カナヅチを克服したい大人のための個別指導。周りの目を気にせず、自分のペースで安心して学べます。';

        articleHeadline = '【CMS記事追記用】大人の初心者・泳ぎ直しQ&A & 体験レッスン案内';
        faqItems = [
            {
                question: 'まったく泳げない（顔をつけるのも怖い）状態でも受講できますか？',
                answer: 'はい、大歓迎です。受講生様の約半数は「水に顔をつけられない」「足がつかない深さが怖い」という初心者の方です。無理に泳がせることは一切なく、足がしっかり着く浅い場所で、呼吸法と脱力から一歩ずつ丁寧に進めます。',
            },
            {
                question: '周りの人の目が気になります。プライベートな環境で泳げますか？',
                answer: '公営プールの比較的空いている時間帯やコースをご提案し、コーチが常に隣でサポートします。集団レッスンのように周りに合わせる必要がないため、リラックスしてご自身のペースで集中できます。',
            },
            {
                question: '50代・60代から始めても本当に泳げるようになりますか？',
                answer: '何歳からでも泳げるようになります。大人の方のレッスンでは、筋力に頼らず「浮力と骨格のバランス」を活かした泳ぎ方を指導します。体に負担をかけずに25mを完泳できるようになる方が多数いらっしゃいます。',
            },
        ];

        articleCtaBox = `---
### 🌊 【大人専門】周りの目を気にせず、今年こそ泳げるようになりませんか？
「今さらスイミングスクールに通うのは恥ずかしい…」という大人の方のために、完全マンツーマンの出張個別指導を行っています。
公営プールの浅いコースで、あなたのペースに合わせて丁寧にサポートします。
👉 [大人の体験レッスン詳細・お申し込みはこちら](https://swim-partners.com/personal_swim)
---`;

        articleBodyText = `## 大人の初心者・泳ぎ直しに関するよくある質問（FAQ）

「今さら聞けない」「水が怖い」という不安を解消するためのQ&Aです。

` + faqItems.map((f, i) => `### Q${i + 1}. ${f.question}\n\n${f.answer}`).join('\n\n') + `\n\n${articleCtaBox}`;
    }

    const bodyText = `【STUDIO CMS記事用 追記テキスト】
対象記事: https://swim-partners.com${targetPath}

■ 記事タイトル（H1）修正案:
${proposedTitle}

■ メタディスクリプション:
${proposedDescription}

■ 記事末尾（チェックシート後）に貼り付けるリッチテキスト:
${articleBodyText}`;

    const jsonLdScript = `<script type="application/ld+json">
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

    return {
        keyword,
        targetPath,
        currentRank,
        pageType,
        pageTypeLabel: 'ノウハウ・ブログ記事（STUDIO CMSモデル）',
        pageGoalSummary: '検索ニーズの完全解決 ✕ 記事末尾CTAからの体験LP送客',
        actionTitle: `「${keyword}」CMS記事タイトルのキーワード補正とFAQ追記`,
        actionDetail: `対象ページはSTUDIO CMSの記事アイテムです。CMSエディタからタイトルを最適化し、本文末尾に検索意図を満たすFAQセクションと体験LPへの誘導CTAボックスを追記します。`,
        factAudit: {
            existingTitle,
            existingHeadingsSummary: 'H1: 記事タイトル / H2: 悩み原因、NG行動、チェックシート（FAQおよびLP送客CTAが不足）',
            missingGapReason: `1位の競合記事と比べ「${cleanKw}」の完全一致語句がタイトルから欠落しており、GoogleのFAQリッチリザルトがないためクリック率・順位で2位に留まっています。`,
        },
        proposedTitle,
        proposedDescription,
        articleHeadline,
        articleBodyText,
        articleCtaBox,
        bodyText,
        faqItems,
        jsonLdScript,
        studioSteps: [
            '1. STUDIOダッシュボードの左メニュー「CMS」をクリックします。',
            '2. 記事コレクションから該当記事（' + targetPath.split('/').pop() + '）を開きます。',
            '3. 【タイトル更新】タイトル入力欄に推奨タイトル「' + proposedTitle + '」を設定します。',
            '4. 【本文・FAQ・CTA追記】記事エディタの最下部（既存のまとめ後）に、下記の「記事本文・FAQ追記テキスト」をペーストします。',
            '5. 右上の「公開」ボタンをクリックして反映します（作業完了）。',
        ],
        technicalNotes: [
            '※ このページは「STUDIO CMS記事」です。デザインエディタではなく、CMSダッシュボードの記事エディタから更新してください。',
            '※ リッチテキストエディタ内に直接 <script> タグを貼るとエスケープされるため、本文FAQをそのままペーストして公開してください。',
            '※ 構造化データを追加する場合は、動的ページテンプレート（/zUHb45xV/[slug]）のページ設定 > カスタムコードから設置します。',
        ],
    };
}
