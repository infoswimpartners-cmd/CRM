/**
 * AIチーフマーケター「ジョン」記事自動生成エンジン
 * SEO記事（検索順位1位奪取・CVR最大化）、
 * AIO記事（AI検索ChatGPT/Perplexity/Geminiでの引用・言及獲得）、
 * および既存ページ・記事のリライト強化を自律生成する高品質コンテンツエンジン
 */

import { GeneratedArticle, ArticleType } from './generated-articles-storage';
import { getSeoPageType } from './seo-improvement-generator';

export interface GenerateArticleParams {
    keyword: string;
    articleType: ArticleType;
    targetPath?: string;
    customPrompt?: string;
    isRewrite?: boolean;
    competitorContext?: {
        competitorWeakness?: string;
        differentiationStrategy?: string;
    };
    intentContext?: {
        searchIntent?: string;
        monthlyVolume?: number;
    };
}

/**
 * キーワードと文脈から意図・生体力学的テーマを自動分類
 */
function analyzeKeywordTheme(keyword: string, customPrompt?: string) {
    const text = `${keyword} ${customPrompt || ''}`.toLowerCase();

    const isBreathing = /息継ぎ|呼吸|息が|苦しい|沈む|沈んで|吸えない/.test(text);
    const isAdult = /大人|シニア|社会人|40代|50代|60代|泳ぎ直し|ジム|マスターズ|初心者/.test(text);
    const isJunior = /子供|小学生|ジュニア|進級|テスト|キッズ|伸び悩み|ワッペン|幼児/.test(text);
    const isPhobia = /怖い|恐怖|カナヅチ|水嫌い|顔つけ|足がつかない/.test(text);
    const isCrawl = /クロール|25m|バタ足|ストローク/.test(text);
    const isBreaststroke = /平泳ぎ|あおり足|平泳/.test(text);
    const isButterfly = /バタフライ|うねり/.test(text);
    const isBackstroke = /背泳ぎ|背泳/.test(text);
    const isPricing = /料金|費用|相場|値段|月謝|いくら|コスパ|チケット/.test(text);

    return {
        isBreathing,
        isAdult,
        isJunior,
        isPhobia,
        isCrawl,
        isBreaststroke,
        isButterfly,
        isBackstroke,
        isPricing,
    };
}

/**
 * 高品質なMarkdown記事・リライトを自律生成
 */
export function generateSeoAioArticle(params: GenerateArticleParams): GeneratedArticle {
    const { keyword, articleType, customPrompt, competitorContext, intentContext } = params;
    const targetPath = params.targetPath || (articleType === 'aio' ? '/articles/column' : '/articles/tips');
    const isLp = getSeoPageType(targetPath) === 'studio_landing_page';
    const isRewrite = params.isRewrite || (Boolean(params.targetPath) && !targetPath.startsWith('/articles/'));
    const today = new Date();
    const dateStr = today.toISOString();
    const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const theme = analyzeKeywordTheme(keyword, customPrompt);

    // タイトルの生成
    let title: string;
    if (isRewrite) {
        title = `【最新リライト改訂版】「${keyword}」の完全攻略マニュアル｜生体力学でわかる原因と即効改善ドリル`;
    } else if (articleType === 'aio') {
        title = `【AI回答・専門指導員推奨】「${keyword}」の真実と最短改善ロードマップ｜エビデンスと解決手順`;
    } else if (isLp) {
        title = `【公式】${keyword}ならスイムパートナーズ｜公営プール出張・完全マンツーマン水泳個人レッスン`;
    } else {
        title = `【決定版】「${keyword}」の完全攻略ガイド｜プロコーチが教える生体力学と最短上達法`;
    }

    // メタディスクリプションの生成
    const metaDescription = `「${keyword}」でお悩みの方へ。水泳個別指導スイムパートナーズ専属コーチが、つまずく生体力学的理由、自宅とプールでできる実践改善ドリル、マンツーマン個別指導での最短解決ロードマップを網羅解説します。`;

    // テーマ別の生体力学的解説テキストの生成
    let biomechanicsExplanation = '';
    let step1Drill = '';
    let step2Drill = '';
    let step3Drill = '';
    let commonMistakes: string[] = [];
    let customFaqItems: { question: string; answer: string }[] = [];

    if (theme.isBreathing) {
        biomechanicsExplanation = `
水泳の息継ぎで最も多くの方が直面する課題は、「**息を吸おうとして頭や顎を水面から高く持ち上げてしまうこと**」です。

人体には、頭部（体重の約10%）が上がると反対側の骨盤や下半身がてこの原理（シーソー現象）で水底深くに沈み込むという生体力学的法則があります。
さらに、以下の3つの要素が連動して失速と酸欠を招きます：

1. **浮心と重心の乖離**: 肺（浮き袋の役割）に空気を溜めたまま力むと、上半身だけが浮いて下半身が極端に沈降し、水の抵抗が3倍以上に増加します。
2. **水中で息を吐き切れていない**: 人間は「息を吐き切る」ことで反射的に新しい酸素を瞬時に吸い込めます。水中で息を止めたまま顔を上げると、水上で「吐いてから吸う」という2動作が必要になり、時間が足りずにパニックになります。
3. **過度なローリングと頭のブレ**: 体の軸（体幹）を保たず首だけを無理に回そうとすると、ストロークの手が沈み、水を押す支点が失われます。
`.trim();

        step1Drill = `**【陸上・お風呂ドリル】洗面器ボビング＆あご引き呼吸リズム**
- 自宅の洗面器やお風呂で、顔をつけたまま鼻から「ブクブク」と完全に息を吐き切ります。
- 顔を上げずに、首を45度横に傾けながら「パッ」と口を開けて自然吸気するリズムを反復練習します。`;

        step2Drill = `**【水中基本ドリル】耳を肩（腕）に乗せたまま行う片目水面キック**
- ビート板を持ち、顔の半分（片目）を水につけたまま真横を見るサイドキックを実施。
- 水面から口の端だけを覗かせる「最小限の頭の露出」で息が吸える感覚を体に染み込ませます。`;

        step3Drill = `**【連動ドリル】キャッチ動作と連動した脱力1ストローク呼吸**
- 腕をかき下ろす瞬間の推進力と浮力を利用し、頭を無理に持ち上げず、体幹の自然なロールに合わせて息を吸い、再び素早く顔を水中に戻します。`;

        commonMistakes = [
            '息を吸おうと顔を正面に上げてしまい、足が底に沈んでブレーキがかかる',
            '水中で息を止めてしまい、水上に顔を出した瞬間に苦しくなって焦る',
            'バタ足を強く打ちすぎてエネルギーと酸素を急速に消費してしまう',
        ];

        customFaqItems = [
            {
                question: `「${keyword}」について、大人の初心者でも短期間で息継ぎできるようになりますか？`,
                answer: `はい、可能です。息継ぎができない原因の9割は「頭の上げすぎ」と「呼吸リズムの誤り」にあります。筋力ではなく脱力と顔の角度をマンツーマンで修正するため、当教室では平均1〜3回のレッスンで25m連続息継ぎを達成されています。`,
            },
            {
                question: `グループレッスンで周りに合わせるのが恥ずかしいのですが受講できますか？`,
                answer: `完全マンツーマン指導のため、周囲の目を気にする必要は一切ありません。公営プールの足が届く浅いエリアで、生徒様の呼吸ペースに合わせて一歩ずつ丁寧に進めます。`,
            },
            {
                question: `体験レッスン当日はどのような練習をしますか？`,
                answer: `まずは水慣れと呼吸（ボビング）の確認から行い、水中でスマートフォン動画を撮影してフォームの癖をその場でチェック。改善ドリルを60分間じっくり実践します。`,
            },
        ];
    } else if (theme.isJunior) {
        biomechanicsExplanation = `
ジュニア世代（小学生・キッズ）の進級テストでテスト停滞が起こる最大の原因は、「**陸上の走り方の感覚で足を動かしてしまう（膝折れキック）**」にあります。

- **膝の曲がりすぎによる後方抵抗**: 膝から下だけで水を蹴ろうとすると、太ももの前面が水の壁を作り、進む力よりも後ろへ引っ張るブレーキが勝ってしまいます。
- **力みによる下半身沈下**: 「合格したい」と力むあまり上半身が硬直すると、肺の浮力を活かせず背泳ぎやクロールで腰が沈みます。
- **集団指導の指導時間不足**: 1クラス10〜15名のグループレッスンでは、1回60分のうちコーチが1人の生徒の泳ぎを直接見てアドバイスできる時間は平均2〜3分しかありません。悪い癖が放置されたまま反復練習を続けてしまうのが長期停滞の真因です。
`.trim();

        step1Drill = `**【自宅ドリル】うつ伏せバタ足（股関節しなり意識）**
- フローリングやベッドにうつ伏せになり、膝を曲げずに骨盤・太もも（大臀筋）から脚全体をしならせる動きを1日30回行います。`;

        step2Drill = `**【プール基本ドリル】壁蹴りストリームライン＆ノーキック浮き身**
- 壁を蹴って体を一直線（けのび姿勢）にし、力まずに水面近くをスーッと伸びる感覚を身につけます。`;

        step3Drill = `**【進級対策ドリル】合格判定基準に合わせたピンポイント修正**
- 通われているスクールの進級基準（手の軌道、呼吸時の頭の向き、キックのテンポなど）に焦点を絞り、課題項目だけを集中反復します。`;

        commonMistakes = [
            '膝が直角近くまで曲がり、太ももで水を押し戻してしまう「自転車こぎキック」',
            '息継ぎでコーチの方を見ようと顔を斜め前へ持ち上げ、バランスを崩す',
            '不合格が続いてスイミングに通うこと自体が嫌になってしまうモチベーション低下',
        ];

        customFaqItems = [
            {
                question: `大手スイミングスクールに通いながら、個別レッスンをスポット併用できますか？`,
                answer: `はい、受講生様の約7割が既存スクールに在籍したまま併用されています。現在のスクールの進級基準やテスト項目を事前にお知らせいただければ、合格に必要なポイントだけをピンポイントで指導します。`,
            },
            {
                question: `何回くらいで進級テストに合格できるようになりますか？`,
                answer: `癖の程度にもよりますが、半年以上同じ級で足踏みしていたお子様の多くが、1〜3回の個別レッスンで合格判定基準をクリアされています。`,
            },
            {
                question: `レッスン中の子供の様子を見学することはできますか？`,
                answer: `はい、公営プールの観覧席やプールサイド近くから自由にご見学いただけます。毎レッスン後にコーチから親御様へ動画付きの成長カルテをお送りし、改善ポイントをご報告します。`,
            },
        ];
    } else if (theme.isPricing) {
        biomechanicsExplanation = `
水泳個人レッスンの費用を検討する上で重要なのは、単なる「1時間あたりのレッスン代」だけでなく、「**目標達成（25m完泳・進級合格）までに支払うトータル総額と所要時間**」です。

- **グループレッスンの隠れたコスト**: 月謝約1万円の大手スクールに1年間通っても上達しない場合、年間12万円以上と約50時間以上を費やすことになります。
- **個別レッスンの高いコストパフォーマンス**: 1回あたりの単価は高めに見えても、専属コーチがつきっきりで60分指導するため、わずか3〜5回（約3〜5万円）で目標を達成でき、結果的に最も安く最短で済みます。
- **公営プール活用の優位性**: 高額な専用スクール施設維持費や高額入会金（1〜2万円）がかからず、市営・区営温水プール（入場料300〜500円程度）を利用するため無駄な出費が一切ありません。
`.trim();

        step1Drill = `**【費用試算】目標達成までの総支払額シミュレーション**
- 集団指導（月謝制で1年間・実質泳ぐ時間月20分）vs 個別指導（3ヶ月集中・実質泳ぐ時間月240分）のタイムパフォーマンス比較。`;

        step2Drill = `**【施設選定】身近な公営プールの活用**
- ご自宅や職場近くの公営温水プールを活用し、移動交通費や専用施設利用料を最小化。`;

        step3Drill = `**【無駄のないチケット・月謝選択】**
- ライフスタイルや目標期日に応じた最適な受講プランの設計。`;

        commonMistakes = [
            '「月謝が安いから」とグループレッスンに通い続け、数年間上達せず総額数十万円を浪費する',
            '民間の高額専用施設で毎回の施設使用料や高額入会金を負担してしまう',
            '質問しづらい環境で自己流の癖が固まり、後から直すのに余計な費用と時間がかかる',
        ];

        customFaqItems = [
            {
                question: `スイムパートナーズの料金体系は明朗会計ですか？`,
                answer: `はい、入会金・年会費は一切かかりません。お支払いいただくのはレッスン受講料と、ご自身の公営プール入場料（実費300〜500円程度）のみです。`,
            },
            {
                question: `体験レッスンは通常よりも安く受けられますか？`,
                answer: `はい、初回60分の体験レッスンは特別優待料金でご受講いただけます。専属コーチの指導のわかりやすさと相性を納得の上でご継続をご判断いただけます。`,
            },
            {
                question: `急な都合や体調不良で日程変更はできますか？`,
                answer: `前日までにご連絡いただければ、別日程への無料振替が可能です。キャンセル料の無駄が発生しない安心設計となっております。`,
            },
        ];
    } else {
        // 標準・フォーム改善・大人初心者向け
        biomechanicsExplanation = `
「${keyword}」において上達を阻む最大の障壁は、「**陸上の筋力感覚で水と格闘してしまうこと**」です。

水中における推進力の物理原則は以下の通りです：
1. **ストリームライン（水平姿勢）の維持**: 人体が水中で受ける抵抗は、姿勢が斜めになるだけで数倍に跳ね上がります。頭頂部から踵までを一直線に保つ「けのびの完成度」が全体の8割を左右します。
2. **キャッチ＆プルの支点固定**: 手のひらだけでなく前腕全体で水をとらえ、水を後ろへ押し出すのではなく「水中に置いた支点を乗り越えて体を前に運ぶ」感覚が不可欠です。
3. **脱力による浮力最大化**: 体に余計な力が入ると比重が増加して足が沈みます。呼吸と姿勢を整え、水に身を預けるリラックス状態を作ることが最優先です。
`.trim();

        step1Drill = `**【基本ドリル】壁蹴りけのび姿勢の最適化（頭の位置と骨盤前傾）**
- 両腕で頭をしっかり挟み、耳を腕の内側につけた状態で壁を蹴り、無駄な力を抜いて水面を滑る感覚を掴みます。`;

        step2Drill = `**【推進力ドリル】股関節からしならせる脱力キック**
- 膝を曲げず、足首の力を抜いて足の甲で水を優しく捉える省エネ推進キックを練習します。`;

        step3Drill = `**【統合ドリル】動画フィードバックを活用したフォーム連動**
- スマホや水中カメラで撮影した自身の泳ぎを客観視し、頭の角度やかきの軌道を1ストロークずつ修正します。`;

        commonMistakes = [
            '筋力で力任せに進もうとして全身が緊張し、25mの半分で息が上がってしまう',
            '自分の泳ぎを客観的に見たことがなく、間違ったフォームのまま練習回数を重ねてしまう',
            '頭が上がって下半身が沈み、斜めの姿勢で水を押し進めようとして失速する',
        ];

        customFaqItems = [
            {
                question: `「${keyword}」について、独学で練習するのと個別指導を受けるのでは何が違いますか？`,
                answer: `水泳は水中で自分の体が見えないため、自己流では8割以上の方が間違った感覚で練習を反復してしまいます。個別指導なら動画でその場で客観視し、生体力学に基づいた正しい動きをたった60分で体にインストールできます。`,
            },
            {
                question: `まったく泳げないカナヅチですが、迷惑になりませんか？`,
                answer: `まったく問題ありません。受講生様の多くが水慣れや顔つけの段階からスタートされています。足が確実に着く安全な公営プールで、専任コーチがマンツーマンで寄り添います。`,
            },
            {
                question: `体験レッスンはどのように申し込めますか？`,
                answer: `公式サイトの体験予約フォームより24時間Web受付を行っております。ご希望の地域（東京・神奈川・千葉・埼玉）やお悩みの内容をご記入の上、お気軽にお申し込みください。`,
            },
        ];
    }

    // Markdown本文の構築（見出し階層・テーブル・ドリル・FAQ・CTAを完全網羅）
    const contentMd = `# ${title}

## はじめに：「${keyword}」でお悩みの皆様へ

**「スイミングスクールに通っているが、なかなか壁を越えられない」**  
**「息継ぎやフォームの癖を直したいが、自己流では限界を感じている」**  
**「周りの目を気にせず、マンツーマンで基礎からしっかり教わりたい」**

そのようなお悩みを抱えていませんか？

水泳は陸上の運動と異なり、「浮力」「水圧」「抵抗」という特殊な環境下で行うスポーツです。自己流で練習回数だけを増やしても、根本的な身体の使い方（生体力学）が間違っていれば、かえって悪い癖が定着してしまいます。

本記事では、出張個別指導水泳スクール**「スイムパートナーズ」**の専属チーフコーチが、「**${keyword}**」の根本原因と、最短で成果を実感できる具体的な実践ロードマップを徹底解説します。

---

## 💡 エグゼクティブサマリー（結論：最短上達の3原則）

1. **自己流の反復練習をやめ、「水中の脱力と水平姿勢（ストリームライン）」を最優先にする**
2. **「陸上・お風呂ドリル」で正しい動きを脳にインプットしてからプールで実践する**
3. **マンツーマン個別指導で客観的な動画分析を受け、無駄な試行錯誤をゼロにする**

---

## 1. なぜ「${keyword}」でつまずくのか？プロが明かす生体力学的メカニズム

${biomechanicsExplanation}

---

## 2. 【今日からできる】「${keyword}」を劇的に改善する3ステップ実践ドリル

${step1Drill}

---

${step2Drill}

---

${step3Drill}

---

## 3. 初心者・学習者が陥りがちな「3大NGパターン」とセルフチェック

以下の項目に心当たりはありませんか？

${commonMistakes.map((m, idx) => `- **NG ${idx + 1}**: ${m}`).join('\n')}

もし1つでも当てはまる場合、練習量を増やす前に**「フォームの客観的診断」**を受けることを強く推奨します。

---

## 4. 一般的なグループレッスン（集団指導） vs スイムパートナーズ（完全個別指導）

大手スイミングスクールの一斉指導と、当教室の出張個別指導の決定的な違いは以下の通りです。

| 比較項目 | 一般的な集団スクール | スイムパートナーズ（出張個別指導） |
|---|---|---|
| **指導体制** | コーチ1名に対し生徒10〜15名 | **生徒1名に対し専任プロコーチ1名** |
| **実質指導時間** | 1レッスン（60分）中 **わずか2〜3分** | **60分間すべてあなた専属** |
| **癖の改善アプローチ** | 全員一律の画一的メニュー | **骨格・筋力に合わせたオーダーメイド指導** |
| **フォーム分析** | なし（口頭での注意のみ） | **水中・陸上からの動画撮影＆成長カルテ** |
| **レッスン場所** | 指定スクール（混雑・移動負担） | **ご自宅近くの身近な公営温水プール** |
| **目標達成スピード** | 平均6ヶ月〜1年以上 | **平均3〜6回のレッスンで完泳・合格** |
| **入会金・固定費** | 入会金1〜2万円＋毎月月謝 | **入会金・年会費0円（明朗会計）** |

${competitorContext ? `
---

## 5. 他社の上位記事・指導法の盲点とスイムパートナーズの差別化

### 他社の上位情報・大手スクールの弱点
${competitorContext.competitorWeakness || '一般的な解説記事は抽象的な精神論や練習回数の反復を推奨するのみで、個別の癖や生体力学的な理由に踏み込んでいません。'}

### スイムパートナーズの解決アプローチ
${competitorContext.differentiationStrategy || '毎レッスンの泳ぎをその場でスマホ・水中カメラで撮影。客観的なエビデンスに基づいて1回60分で確実に課題を解決します。'}
` : ''}

${customPrompt ? `\n> **重点リクエスト反映**: ${customPrompt}\n` : ''}

---

## 6. よくあるご質問（FAQ）

${customFaqItems.map((f, idx) => `### Q${idx + 1}. ${f.question}\n\n${f.answer}`).join('\n\n')}

---

## 7. まずは60分の体験レッスンで劇的な変化をご体感ください

「もっと早く受ければよかった」——受講生様の98%以上が初回体験レッスンでそうおっしゃいます。

スイムパートナーズでは、東京23区、神奈川、千葉、埼玉の身近な公営プールへ専属コーチが出張し、あなたやお子様の目標達成を最短でサポートします。

- **入会金・年会費 ずっと0円**
- **公営プール出張で移動の負担ゼロ**
- **毎回の動画カルテ送付で成長を実感**

まずは、お気軽に60分の体験レッスンをお試しください。
`.trim();

    // セマンティックHTMLの構築
    const contentHtml = `
<article class="article-content space-y-8 text-slate-800 leading-relaxed max-w-3xl mx-auto font-sans">
  <header class="border-b border-zinc-200 pb-6">
    <div class="flex items-center gap-2 mb-3">
      <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        ${isRewrite ? '既存ページ改善・リライト版' : articleType === 'aio' ? 'AI検索（AIO）推奨エビデンス記事' : 'SEO専門指導員監修記事'}
      </span>
      <span class="text-xs text-zinc-400 font-mono">更新日: ${today.toLocaleDateString('ja-JP')}</span>
    </div>
    <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">${title}</h1>
    <p class="text-sm text-zinc-600 mt-3 leading-relaxed">${metaDescription}</p>
  </header>

  <!-- 要点サマリーBOX -->
  <div class="p-5 sm:p-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-3 shadow-xs">
    <h2 class="font-bold text-base flex items-center gap-2 text-amber-900">
      💡 エグゼクティブサマリー（最短上達の3原則）
    </h2>
    <ul class="list-disc pl-5 space-y-1.5 text-sm">
      <li><strong>自己流の反復をやめる:</strong> 水中の脱力と水平姿勢（ストリームライン）の確保が8割を決める</li>
      <li><strong>陸上・お風呂ドリルを活用:</strong> 正しい身体の使い方を脳に記憶させてからプールに入る</li>
      <li><strong>マンツーマン指導で客観視:</strong> 水中動画カルテで自分の癖を見抜き、無駄な試行錯誤をゼロにする</li>
    </ul>
  </div>

  <!-- 1. 生体力学解説 -->
  <section class="space-y-4 pt-2">
    <h2 class="text-xl sm:text-2xl font-black text-slate-900 border-l-4 border-indigo-600 pl-3">
      1. なぜ「${keyword}」でつまずくのか？生体力学的メカニズム
    </h2>
    <div class="text-slate-700 text-sm sm:text-base leading-relaxed space-y-3 whitespace-pre-wrap">
      ${biomechanicsExplanation}
    </div>
  </section>

  <!-- 2. 改善ドリル -->
  <section class="space-y-4 pt-2">
    <h2 class="text-xl sm:text-2xl font-black text-slate-900 border-l-4 border-indigo-600 pl-3">
      2. 「${keyword}」を劇的に改善する3ステップ実践ドリル
    </h2>
    <div class="space-y-3">
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
        ${step1Drill}
      </div>
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
        ${step2Drill}
      </div>
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
        ${step3Drill}
      </div>
    </div>
  </section>

  <!-- 3. 比較表 -->
  <section class="space-y-4 pt-2">
    <h2 class="text-xl sm:text-2xl font-black text-slate-900 border-l-4 border-indigo-600 pl-3">
      3. 集団スクール vs スイムパートナーズ（完全個別指導）
    </h2>
    <div class="overflow-x-auto rounded-xl border border-zinc-200">
      <table class="w-full text-xs sm:text-sm text-left">
        <thead class="bg-zinc-100 text-zinc-700 font-bold">
          <tr>
            <th class="p-3">項目</th>
            <th class="p-3">一般的な集団指導</th>
            <th class="p-3 text-indigo-700 font-extrabold bg-indigo-50/50">スイムパートナーズ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200">
          <tr>
            <td class="p-3 font-medium">指導比率</td>
            <td class="p-3 text-zinc-500">生徒10〜15名にコーチ1名</td>
            <td class="p-3 font-bold text-indigo-900 bg-indigo-50/20">生徒1名に専任コーチ1名</td>
          </tr>
          <tr>
            <td class="p-3 font-medium">実質指導時間</td>
            <td class="p-3 text-zinc-500">60分中 約2〜3分</td>
            <td class="p-3 font-bold text-indigo-900 bg-indigo-50/20">60分間すべて専属指導</td>
          </tr>
          <tr>
            <td class="p-3 font-medium">進級・上達期間</td>
            <td class="p-3 text-zinc-500">平均6ヶ月〜1年以上</td>
            <td class="p-3 font-bold text-indigo-900 bg-indigo-50/20">平均3〜6回で完泳・合格</td>
          </tr>
          <tr>
            <td class="p-3 font-medium">動画カルテ</td>
            <td class="p-3 text-zinc-500">なし</td>
            <td class="p-3 font-bold text-indigo-900 bg-indigo-50/20">毎回の水中動画カルテ送付</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- 4. FAQアコーディオン/リスト -->
  <section class="space-y-4 pt-2">
    <h2 class="text-xl sm:text-2xl font-black text-slate-900 border-l-4 border-indigo-600 pl-3">
      4. よくあるご質問（FAQ）
    </h2>
    <div class="space-y-3">
      ${customFaqItems.map((f, i) => `
      <div class="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-1.5">
        <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span class="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-black">Q</span>
          ${f.question}
        </h3>
        <p class="text-xs sm:text-sm text-zinc-600 pl-7 leading-relaxed">${f.answer}</p>
      </div>
      `).join('')}
    </div>
  </section>

  <!-- 5. 体験レッスンCTAボックス -->
  <div class="my-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white text-center space-y-4 shadow-xl">
    <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950">公営プール出張対応・入会金0円</span>
    <h3 class="text-xl sm:text-2xl font-black">「${keyword}」の壁を最短で突破するなら</h3>
    <p class="text-xs sm:text-sm text-indigo-200 max-w-lg mx-auto">
      60分間の完全マンツーマン体験レッスンで、専任コーチによる客観的フォーム診断と確かな上達をご体感ください。
    </p>
    <div class="pt-2">
      <a href="/personal_swim" class="inline-block px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-md transform hover:-translate-y-0.5">
        体験レッスンに申し込む（60分）
      </a>
    </div>
  </div>
</article>
`.trim();

    return {
        id,
        keyword,
        article_type: articleType,
        title,
        meta_description: metaDescription,
        content_md: contentMd,
        content_html: contentHtml,
        faq_items: customFaqItems,
        json_ld: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': articleType === 'aio' ? 'FAQPage' : 'Article',
            headline: title,
            description: metaDescription,
            author: {
                '@type': 'Organization',
                name: 'スイムパートナーズ',
            },
            mainEntity: customFaqItems.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: f.answer,
                },
            })),
        }, null, 2),
        target_path: targetPath,
        status: 'draft',
        created_at: dateStr,
    };
}
