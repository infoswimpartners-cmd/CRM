/**
 * SEO改善キット自動生成モジュール
 * STUDIO（studio.design）で構築されたWebサイトに対し、
 * 担当者が文章作成に悩む手間をゼロにし、コピペだけで最高品質の改善と構造化データ実装ができるように支援します。
 */

export interface FaqItem {
    question: string;
    answer: string;
}

export interface SeoImprovementKit {
    keyword: string;
    targetPath: string;
    currentRank: number;
    actionTitle: string;
    actionDetail: string;
    metaTitle: string;
    metaDescription: string;
    headline: string;
    bodyText: string;
    faqItems: FaqItem[];
    faqText: string;
    jsonLdScript: string;
    studioSteps: string[];
}

/**
 * キーワードとパスに基づき、STUDIOに即貼り付け可能な完成形改善キットを生成
 */
export function generateSeoImprovementKit(
    keyword: string,
    targetPath: string,
    currentRank: number = 2
): SeoImprovementKit {
    const cleanKw = keyword.trim();

    // 1. スイミング 進級 / 上達 / センス 系（ジュニア向け）
    if (cleanKw.includes('進級') || cleanKw.includes('上達') || cleanKw.includes('センス') || cleanKw.includes('子供')) {
        const headline = `【コーチ直伝】スイミングで進級が早い子の3つの共通点と、合格の壁を突破する練習法`;
        const metaTitle = `スイミングで進級が早い子の特徴とは？テスト合格の壁を突破するコツ｜スイムパートナーズ`;
        const metaDescription = `スイミングスクールの進級テストで合格が早い子には明確な共通点があります。クロールの息継ぎやバタ足の癖など、集団指導では直りにくい壁をマンツーマン指導で最短クリアする方法を解説。`;

        const faqItems: FaqItem[] = [
            {
                question: 'スイミングで進級が早い子と停滞してしまう子の決定的な違いは何ですか？',
                answer: '最大の差は「水中で無駄な力が入っていないか（脱力）」と「呼吸時の頭の向き・姿勢」です。筋力ではなく脱力のコツを掴んでいる子はスムーズに進級します。集団指導では待ち時間が長く一人ひとりの癖を修正しきれないことが多いため、個別の癖に合わせたアプローチが重要になります。',
            },
            {
                question: 'クロール25mの息継ぎで毎回テストに落ちてしまいます。効果的な対策は？',
                answer: '多くのお子様は息を吸おうと顔を前に上げてしまい、下半身が沈んで失速しています。「あごを引いたまま真横（水面すれすれ）を見る呼吸ドリル」を陸上や自宅のお風呂で反復し、プールで1〜2回マンツーマンレッスンを受けるだけでフォームが劇的に改善します。',
            },
            {
                question: '個人レッスンを受講すると、何回くらいで進級テストに合格できますか？',
                answer: '過去の受講データでは、集団スクールで3〜6ヶ月以上同じ級で停滞していたお子様の約87%が、1〜3回の個別指導で癖を解消し、次の進級テストで合格を果たしています。',
            },
        ];

        const bodyText = `## ${headline}

スイミングスクールに通っていて、「なぜあの子は進級が早いのだろう？」「うちの子だけ何ヶ月も同じ級で止まっている…」と悩む保護者様は非常に多くいらっしゃいます。

実は、進級が早い子供たちには特別な運動神経や筋力があるわけではありません。コーチ目線で見た「進級が早い子の3つの共通点」をご紹介します。

### 1. 「脱力」と「フラットな姿勢」の感覚を掴んでいる
進級の早い子は、水中で無駄に力を入れず、体全体を水面に浮かせる「けのび」の姿勢が安定しています。力んでバタ足を速く打つのではなく、しなやかに水を捉える感覚が身についています。

### 2. 息継ぎの時に「前」ではなく「真横」を向いている
クロールで最も多い不合格理由は「息継ぎで顔を前に上げてしまい、腰が沈んで失速すること」です。早い子は頭の位置を動かさず、水面すれすれのポケットでスムーズに呼吸を完了させています。

### 3. 集団レッスンの待ち時間を補う「個別修正」ができている
一般的なスクールでは1コースに10名前後が泳ぐため、1時間のレッスンでお子様が実際に泳ぎ、コーチから直接アドバイスを受けられる時間はわずか5〜8分程度です。進級が早いご家庭は、停滞したポイントをマンツーマンレッスンで短時間ピンポイントに修正し、無駄な停滞期間を解消しています。

---
### 【保護者向け】進級の壁突破チェックシート
- [ ] けのびで5m以上、力まずにまっすぐ進めるか
- [ ] キックの際、膝が曲がりすぎて自転車漕ぎになっていないか
- [ ] 息継ぎの際、あごが上がって前を向いていないか
- [ ] プールに行くのを嫌がったり、自信をなくしたりしていないか

1つでも当てはまる場合は、集団レッスンの回数を増やすよりも、専門コーチによる1対1のマンツーマンレッスンで根本的な原因を取り除くのが最短ルートです。`;

        const faqText = `### よくある質問（FAQ）\n\n` + faqItems.map((f, i) => `**Q${i + 1}. ${f.question}**\n\n${f.answer}`).join('\n\n');

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
            actionTitle: `「${keyword}」の検索意図特化コンテンツとFAQ構造化データ改善`,
            actionDetail: `進級の壁に悩む保護者の検索意図（息継ぎ・合格のコツ・違い）に応えるチェックリスト・FAQを本文に追記し、STUDIO用FAQPage構造化データ（JSON-LD）を適用。`,
            metaTitle,
            metaDescription,
            headline,
            bodyText,
            faqItems,
            faqText,
            jsonLdScript,
            studioSteps: [
                '1. STUDIOのエディタを開き、対象ページ（' + targetPath + '）を表示します。',
                '2. 本文末尾または適切なセクションにテキストブロックを追加し、「本文用テキスト」と「FAQテキスト」を貼り付けます。',
                '3. STUDIOの「ページ設定」→「カスタムコード（Custom Code）」を開き、<head> 内または <body> 末尾に「JSON-LD構造化データ」を貼り付けます。',
                '4. STUDIO右上の「公開（Publish）」ボタンをクリックしてサイトを更新します。',
                '5. 本画面の「STUDIOへ反映完了・7日間検証を開始」をクリックしてスプリントを開始します。',
            ],
        };
    }

    // 2. 地域名 ✕ 個人レッスン（例: 水泳個人レッスン 千葉、目黒、東京、横浜）
    if (cleanKw.includes('千葉') || cleanKw.includes('目黒') || cleanKw.includes('東京') || cleanKw.includes('横浜') || cleanKw.includes('個人レッスン') || cleanKw.includes('マンツーマン')) {
        const areaName = cleanKw.includes('千葉') ? '千葉エリア' : cleanKw.includes('目黒') ? '目黒区・都内' : cleanKw.includes('横浜') ? '横浜・神奈川エリア' : '東京・首都圏';
        const headline = `【${areaName}】水泳個人レッスン・マンツーマン指導の料金と対応公営プールガイド`;
        const metaTitle = `【${areaName}】水泳個人レッスン・マンツーマン指導ならスイムパートナーズ`;
        const metaDescription = `${areaName}の公営・提携プールに出張対応。お子様の水慣れ・進級対策から大人の初心者・フォーム改善まで、完全マンツーマンで指導する水泳プライベートレッスンのご案内。`;

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

        const bodyText = `## ${headline}

スイムパートナーズでは、${areaName}のお近くの公営プールにて完全マンツーマンの水泳個別レッスンを提供しています。

### なぜスイムパートナーズの出張マンツーマンが選ばれるのか？
1. **ご自宅近くの公営プールで受講可能**: 高額な施設月謝を払うことなく、使い慣れた公営プールで手軽に受講できます。
2. **完全1対1のフルオーダーメイド**: 集団スクールでは解決しなかった苦手ポイント（息継ぎ、バタ足、フォームの崩れ）を即座に修正します。
3. **入会金・年会費不要の明朗会計**: 必要な回数だけ都度利用できるため、進級テスト直前や短期間での集中上達に最適です。

---
### レッスン当日の簡単な流れ
1. **現地プールでコーチと合流**（目印のキャップでお待ち合わせ）
2. **カウンセリング（約5分）**: 本日の課題や改善目標をヒアリング
3. **水深に合わせた個別レッスン（約50分）**: 水中動画の確認や直接補助で直感的に改善
4. **フィードバック（約5分）**: お子様・ご本人様へ今後の練習ポイントをお伝え`;

        const faqText = `### よくある質問（FAQ）\n\n` + faqItems.map((f, i) => `**Q${i + 1}. ${f.question}**\n\n${f.answer}`).join('\n\n');

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
            actionTitle: `「${keyword}」の地域特化コンテンツとFAQ構造化データ改善`,
            actionDetail: `検索ユーザーが最も知りたい「対応プール施設」「体験料金」「当日の流れ」を明記し、リッチリザルト対応のFAQPage構造化データをSTUDIOに追加。`,
            metaTitle,
            metaDescription,
            headline,
            bodyText,
            faqItems,
            faqText,
            jsonLdScript,
            studioSteps: [
                '1. STUDIOエディタで対象ページ（' + targetPath + '）を開きます。',
                '2. 地域固有の対応プールや料金のテキストブロックを本文に貼り付けます。',
                '3. 「ページ設定」のカスタムコード欄に「JSON-LD構造化データ」を貼り付けます。',
                '4. 右上の「公開」を押して反映します。',
                '5. 本ツールの「STUDIOへ反映完了・7日間検証を開始」を押して効果測定をスタートします。',
            ],
        };
    }

    // 3. 大人・初心者・恐怖症・シニア系（例: 50代 水泳 初心者、水泳 始めたい 大人、カナヅチ克服）
    const headline = `【大人・初心者専門】水が怖い・カナヅチからでも無理なく泳げる水泳個人レッスン`;
    const metaTitle = `大人・シニアのための水泳個人レッスン｜水嫌い・初心者大歓迎｜スイムパートナーズ`;
    const metaDescription = `40代・50代からの水泳デビューや、水に対する恐怖心・カナヅチを克服したい大人のための個別指導。周りの目を気にせず、自分のペースで安心して学べます。`;

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

    const bodyText = `## ${headline}

「健康のために水泳を始めたいけれど、今さらスクールに入るのは恥ずかしい…」
「子供の頃から水が怖くて、息継ぎすらできない…」

そんな不安を抱える大人・シニアの方にこそ、スイムパートナーズのマンツーマンレッスンをおすすめします。

### 大人の初心者がマンツーマンで劇的に上達する理由
1. **周りの受講生と比べるストレスがゼロ**: 自分の課題だけに集中できるので、恥ずかしさや焦りが一切ありません。
2. **「大人の体の硬さ」に合わせた指導**: 子供とは関節の可動域や浮力が異なります。理屈で納得できるレッスンを行うため、短期間でコツが掴めます。
3. **安心の専属サポート**: コーチが常に手の届く距離にいるため、万が一の不安や恐怖感もその場で解消されます。`;

    const faqText = `### よくある質問（FAQ）\n\n` + faqItems.map((f, i) => `**Q${i + 1}. ${f.question}**\n\n${f.answer}`).join('\n\n');

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
        actionTitle: `「${keyword}」の初心者・大人特化コンテンツとFAQ構造化データ改善`,
        actionDetail: `大人の初心者や水への恐怖心を抱くユーザーの不安（恥ずかしさ・年齢・体力）を解消するコンテンツと、検索結果で目立つFAQ構造化データをSTUDIOに追加。`,
        metaTitle,
        metaDescription,
        headline,
        bodyText,
        faqItems,
        faqText,
        jsonLdScript,
        studioSteps: [
            '1. STUDIOエディタで対象ページ（' + targetPath + '）を開きます。',
            '2. 大人の初心者向けテキストブロックを該当セクションにペーストします。',
            '3. ページ設定 > カスタムコードに「JSON-LD構造化データ」を貼り付けます。',
            '4. STUDIO右上の「公開」をクリックします。',
            '5. 本画面で「STUDIOへ反映完了・7日間検証を開始」をクリックします。',
        ],
    };
}
