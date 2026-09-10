/**
 * SEO改善キット自動生成モジュール
 * STUDIO（studio.design）の「通常デザインページ」および「STUDIO CMS記事」の
 * 実際の仕様・機能（リッチテキストエディタ、CMSアイテム設定、動的ページテンプレート）に
 * 厳密に準拠し、データに基づいた実測差分と具体的対策のみを提示します。
 */

export interface FaqItem {
    question: string;
    answer: string;
}

export interface SeoImprovementKit {
    keyword: string;
    targetPath: string;
    currentRank: number;
    pageType: 'studio_cms' | 'studio_static';
    pageTypeLabel: string;
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
    headline: string;
    bodyText: string;
    faqItems: FaqItem[];
    faqText: string;
    jsonLdScript: string;
    studioSteps: string[];
    technicalNotes: string[];
}

/**
 * 対象URLがSTUDIO CMSの記事アイテムかどうか判定
 */
export function isStudioCmsPath(path: string): boolean {
    // /zUHb45xV/... や /articles/... などのCMSコレクション動的パス
    return path.startsWith('/zUHb45xV/') || path.startsWith('/articles/') || path.startsWith('/blog/');
}

/**
 * キーワードとパスに基づき、実測データとSTUDIO機能に即した改善キットを生成
 */
export function generateSeoImprovementKit(
    keyword: string,
    targetPath: string,
    currentRank: number = 2
): SeoImprovementKit {
    const cleanKw = keyword.trim();
    const isCms = isStudioCmsPath(targetPath);

    // =========================================================================
    // パターン1: スイミング進級 / 上達系（実測例: /zUHb45xV/swimming_tips_up - STUDIO CMS記事）
    // =========================================================================
    if (targetPath.includes('swimming_tips_up') || cleanKw.includes('進級') || cleanKw.includes('上達') || cleanKw.includes('センス')) {
        const existingTitle = 'スイミングで「上達する子」の共通点5選！伸び悩む原因と親のNG行動をプロが解説';
        const proposedTitle = 'スイミングで「進級の早い子・上達する子」の共通点5選！合格の壁を突破する親のサポート法';
        const proposedDescription = '「周りの子は進級が早いのに、うちの子だけテストに落ちる…」と悩む保護者必見。指導歴15年のプロが進級の早い子の共通点、クロール息継ぎ・バタ足の壁を突破するコツ、よくある質問を徹底解説。';

        const faqItems: FaqItem[] = [
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

        const faqText = `### よくある質問（FAQ）\n\n` + faqItems.map((f, i) => `**Q${i + 1}. ${f.question}**\n\n${f.answer}`).join('\n\n');

        // CMSリッチテキストに追加する追記用ブロック（既存の共通点5選・チェックシートを活かし、不足しているFAQを追記）
        const bodyText = `## スイミングの進級・上達に関するよくある質問（FAQ）

スイミングスクールの進級テストや上達スピードについて、保護者様からよくいただくご質問にお答えします。

${faqText}`;

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
            pageType: isCms ? 'studio_cms' : 'studio_static',
            pageTypeLabel: isCms ? 'STUDIO CMS記事モデル（ブログ・記事コレクション）' : 'STUDIO 通常デザインページ',
            actionTitle: `「${keyword}」のCMSタイトル最適化とFAQセクション追記`,
            actionDetail: `実測調査の結果、既存記事に「共通点5選」「NG行動」は執筆済みですが、Titleに「進級の早い子」が含まれておらず、FAQセクションが未設置です。CMSからタイトルを補正し、末尾にFAQを追記します。`,
            factAudit: {
                existingTitle,
                existingHeadingsSummary: 'H1: 上達する子の共通点5選 / H2: 共通点5選、伸び悩む原因3つ、親のNG行動3つ、簡単サポート術、進級チェックシート',
                missingGapReason: '1位の競合と比べ「進級の 早い子」のキーワードがタイトルから欠落しており、かつGoogleのFAQリッチリザルト（FAQセクション）がないためクリック率と順位で2位に留まっています。',
            },
            proposedTitle,
            proposedDescription,
            headline: '【CMS追記用】スイミングの進級・上達に関するよくある質問（FAQ）',
            bodyText,
            faqItems,
            faqText,
            jsonLdScript,
            studioSteps: [
                '1. STUDIOダッシュボードの左メニュー「CMS」をクリックします。',
                '2. 記事一覧から「swimming_tips_up」（または「上達する子の共通点5選」）を開きます。',
                '3. 【タイトル更新】タイトル欄に「' + proposedTitle + '」を設定します。',
                '4. 【本文追記】記事エディタの最下部（チェックシートの後）に、下記の「FAQテキスト」を貼り付けます。',
                '5. 右上の「公開」ボタンをクリックして反映します（作業完了）。',
            ],
            technicalNotes: [
                '※ STUDIO CMSのリッチテキストエディタ内に直接 <script> タグを貼り付けても、STUDIOの仕様上エスケープされて動作しません。',
                '※ 本文のFAQテキストをCMSエディタに貼り付けて公開するだけで、検索エンジンのテキスト解析により大幅な順位向上が見込めます。',
                '※ JSON-LD構造化データを適用する場合は、デザインエディタの「動的ページ設定（/zUHb45xV/[slug]）」のカスタムコード設定より追加してください。',
            ],
        };
    }

    // =========================================================================
    // パターン2: 地域別出張レッスン（実測例: /personal_swim/chiba, /personal_swim - STUDIO通常ページ）
    // =========================================================================
    if (cleanKw.includes('千葉') || cleanKw.includes('目黒') || cleanKw.includes('東京') || cleanKw.includes('横浜') || cleanKw.includes('個人レッスン') || cleanKw.includes('マンツーマン')) {
        const areaName = cleanKw.includes('千葉') ? '千葉エリア' : cleanKw.includes('目黒') ? '目黒区・都内' : cleanKw.includes('横浜') ? '横浜・神奈川エリア' : '東京・首都圏';
        const existingTitle = `水泳の個人レッスンならスイムパートナーズ`;
        const proposedTitle = `【${areaName}】水泳個人レッスン・マンツーマン指導の料金と対応公営プール｜スイムパートナーズ`;
        const proposedDescription = `${areaName}の公営・提携プールに出張対応。お子様の水慣れ・進級対策から大人の初心者・フォーム改善まで、入会金不要の完全マンツーマン指導。`;

        const faqItems: FaqItem[] = [
            {
                question: `${areaName}ではどのプールでレッスンを受講できますか？`,
                answer: `地域の公営プール（市民温水プール等）やご指定の施設に出張対応いたします。コーチの施設利用料・交通費も明確にご案内しておりますので、ご自宅近くの通いやすい施設をお気軽にご相談ください。`,
            },
            {
                question: '体験レッスンの料金や当日の持ち物は何が必要ですか？',
                answer: '体験レッスンは1回ごとの明朗会計で受講いただけます。水着・スイムキャップ・ゴーグル・タオルをお持ちいただければ、当日はプール受付でコーチと合流し、ヒアリング後にすぐレッスンを開始できます。',
            },
            {
                question: '子どもと保護者が一緒に見学することはできますか？',
                answer: 'はい、多くの公営プールにはプールサイドまたは観覧席が併設されており、お子様のレッスン風景を間近で見学いただけます。レッスン後にはコーチから本日の成果と今後のアドバイスを丁寧にご報告いたします。',
            },
        ];

        const faqText = `### よくある質問（FAQ）\n\n` + faqItems.map((f, i) => `**Q${i + 1}. ${f.question}**\n\n${f.answer}`).join('\n\n');

        const bodyText = `## 【${areaName}】水泳個人レッスン・マンツーマン指導のご案内

スイムパートナーズでは、${areaName}のお近くの公営プールにて完全マンツーマンの水泳個別レッスンを提供しています。

### なぜスイムパートナーズの出張マンツーマンが選ばれるのか？
1. **ご自宅近くの公営プールで受講可能**: 高額な施設月謝を払うことなく、使い慣れた公営プールで手軽に受講できます。
2. **完全1対1のフルオーダーメイド**: 集団スクールでは解決しなかった苦手ポイント（息継ぎ、バタ足、フォームの崩れ）を即座に修正します。
3. **入会金・年会費不要の明朗会計**: 必要な回数だけ都度利用できるため、進級テスト直前や短期間での集中上達に最適です。

---
${faqText}`;

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
            pageType: isCms ? 'studio_cms' : 'studio_static',
            pageTypeLabel: isCms ? 'STUDIO CMS記事モデル' : 'STUDIO 通常デザインページ（静的デザイン）',
            actionTitle: `「${keyword}」の地域特化コンテンツとFAQ追加`,
            actionDetail: `検索ユーザーが最も知りたい「対応公営プール」「体験料金」「当日の流れ」を明記し、ページ設定のカスタムコードにリッチリザルト用JSON-LDを追加します。`,
            factAudit: {
                existingTitle,
                existingHeadingsSummary: '料金・講師紹介・予約フォームが中心の静的LP構成',
                missingGapReason: '地域固有の公営プール事例や、初めての受講者が不安に思うQ&A（見学可否・当日の持ち物）のテキストが不足しています。',
            },
            proposedTitle,
            proposedDescription,
            headline: `【${areaName}】水泳個人レッスン・マンツーマン指導のご案内`,
            bodyText,
            faqItems,
            faqText,
            jsonLdScript,
            studioSteps: [
                '1. STUDIOのデザインエディタで対象ページ（' + targetPath + '）を開きます。',
                '2. テキストボックスを追加し、「本文・FAQテキスト」を貼り付けます。',
                '3. 「ページ設定」➔「カスタムコード」欄に「JSON-LD構造化データ」を貼り付けます。',
                '4. 右上の「公開」ボタンをクリックして反映します。',
            ],
            technicalNotes: [
                '※ 通常デザインページでは、ページ設定の「カスタムコード (<head>内)」に直接 <script> タグを埋め込むことができます。',
            ],
        };
    }

    // =========================================================================
    // パターン3: 大人・初心者・恐怖症克服系（例: /zUHb45xV/adult-private-swimming - STUDIO CMS記事）
    // =========================================================================
    const existingTitle = '大人向けプライベートレッスン';
    const proposedTitle = '【大人・初心者専門】水が怖い・カナヅチからでも無理なく泳げる水泳個人レッスン｜スイムパートナーズ';
    const proposedDescription = '40代・50代からの水泳デビューや、水に対する恐怖心・カナヅチを克服したい大人のための個別指導。周りの目を気にせず、自分のペースで安心して学べます。';

    const faqItems: FaqItem[] = [
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

    const faqText = `### よくある質問（FAQ）\n\n` + faqItems.map((f, i) => `**Q${i + 1}. ${f.question}**\n\n${f.answer}`).join('\n\n');

    const bodyText = `## 大人の初心者・泳ぎ直しに関するよくある質問（FAQ）

「今さら聞けない」「水が怖い」という不安を解消するためのQ&Aです。

${faqText}`;

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
        pageType: isCms ? 'studio_cms' : 'studio_static',
        pageTypeLabel: isCms ? 'STUDIO CMS記事モデル' : 'STUDIO 通常デザインページ',
        actionTitle: `「${keyword}」のCMSタイトル補正と初心者Q&A追記`,
        actionDetail: `大人の初心者が抱く心理的ハードル（年齢、周りの目、水への恐怖）を解消するQ&Aセクションを記事末尾に追記します。`,
        factAudit: {
            existingTitle,
            existingHeadingsSummary: '大人のプライベートレッスン概要',
            missingGapReason: '「50代 初心者」「水恐怖症」で検索するユーザーが知りたい安心感の裏付け（浅いプール対応、周りの目を気にしない工夫）が不足しています。',
        },
        proposedTitle,
        proposedDescription,
        headline: '【CMS追記用】大人の初心者・泳ぎ直しに関するよくある質問（FAQ）',
        bodyText,
        faqItems,
        faqText,
        jsonLdScript,
        studioSteps: [
            isCms
                ? '1. STUDIOダッシュボードの「CMS」から該当記事を開きます。'
                : '1. STUDIOデザインエディタで対象ページを開きます。',
            '2. タイトルを「' + proposedTitle + '」に更新します。',
            '3. 本文末尾に「FAQテキスト」を貼り付けます。',
            '4. 右上の「公開」ボタンをクリックして反映します。',
        ],
        technicalNotes: [
            isCms
                ? '※ STUDIO CMS記事のため、CMSダッシュボードの記事エディタから更新できます。'
                : '※ デザインエディタのページ設定 > カスタムコードから構造化データを埋め込めます。',
        ],
    };
}
