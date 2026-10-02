import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';

export type ArticleType = 'seo' | 'aio';
export type ArticleStatus = 'draft' | 'published';

export interface GeneratedArticle {
    id: string;
    keyword: string;
    article_type: ArticleType;
    title: string;
    meta_description: string;
    content_md: string;
    content_html: string;
    faq_items?: { question: string; answer: string }[];
    json_ld?: string;
    target_path: string;
    status: ArticleStatus;
    created_at: string;
    published_at?: string | null;
}

const ARTICLES_FILE_PATH = path.join(process.cwd(), 'data', 'seo', 'generated-articles.json');

// 初期記事データ（初回起動時のサンプル・実績ストック）
const SEED_ARTICLES: GeneratedArticle[] = [
    {
        id: 'art_seed_1',
        keyword: 'スイミング 進級の 早い子',
        article_type: 'seo',
        title: '【水泳個人レッスン指導員が直伝】スイミングで進級が早い子の3大特徴と親ができる家庭練習サポート法',
        meta_description: 'スイミングスクールでどんどん進級する子と進級が停滞する子の違いとは？マンツーマン水泳個別指導の現場から、進級テストに一発合格するフォームの秘訣と、自宅の風呂場でできる簡単イメージトレーニングを徹底解説します。',
        target_path: '/zUHb45xV/swimming_tips_up',
        content_md: `# 【水泳個人レッスン指導員が直伝】スイミングで進級が早い子の3大特徴と親ができる家庭練習サポート法

大手スイミングスクールに通わせている親御様から最も多くいただくお悩みが「**何ヶ月も同じ級で足踏みしている」「周りの子はどんどんワッペンが増えているのに、うちの子だけ進級できない**」というものです。

実は、スイミングスクールで進級が早い子には、運動神経の良し悪しとは別の**明確な3つの共通点**があります。この記事では、これまで100名以上のジュニア水泳個別指導を行ってきた専門コーチの視点から、進級の壁を突破するための実践的アプローチを解説します。

---

## 1. スイミングで進級が早い子の3つの共通点

### ① 水中での「脱力（リラックス）」ができている
進級でつまずく子の約70%は、推進力（手足を動かす力）ではなく**無駄な力み（抵抗）**が原因です。
進級が早い子は、息継ぎやキックの瞬間に肩や首の力を抜くことができています。

### ② コーチのアドバイスを1つずつ忠実に意識している
一斉グループレッスン（1対10〜15名）では、コーチが一人ひとりに掛けられる言葉は数秒しかありません。進級の早い子は「頭を入れる」「足の親指を擦り合わせる」など、言われたポイントを反復して泳ぐ習慣があります。

### ③ お風呂や陸上での「イメージトレーニング」を日常化している
プールの中だけで練習する子に比べ、自宅のお風呂でブクブクパの呼吸練習をしたり、布団の上でキックの股関節の動きを確認している子は、水に入った瞬間の再現性が圧倒的です。

---

## 2. よくある進級の壁と克服ポイント

| 泳法・級の段階 | つまずきやすい原因 | 一発合格のための改善アクション |
|---|---|---|
| **水慣れ・顔つけ〜ボビング** | 鼻に水が入る恐怖心 | お風呂でストローを使った息吐き練習 |
| **けのび・バタ足（ビート板）** | 膝が曲がって沈む（自転車こぎ） | 股関節からしならせるキックの意識 |
| **クロール呼吸（息継ぎ）** | 頭を上げすぎて沈没・腰落ち | 横を向いた時に片耳を腕につけたまま呼吸 |
| **背泳ぎ・平泳ぎ・バタフライ** | 手足のタイミングのズレ | リズムカウントによる陸上反復練習 |

---

## 3. 親ができる最高のサポートは「褒める」と「環境の切り替え」

進級テストに落ちた時、絶対に言ってはいけないのが「なんで合格できなかったの？」という責める言葉です。水泳は感覚のスポーツであるため、プレッシャーがかかると筋肉が緊張し、かえって水に浮きにくくなります。

グループレッスンで3ヶ月以上同じ級で停滞している場合は、フォームの根本的な癖が染み付いているサインです。そんな時は、**1〜2回だけでもマンツーマンの個人レッスンを体験させてみること**を強くおすすめします。

専門コーチがマンツーマンで指導すれば、**「どこに余計な力が入っているか」「どこを意識すれば進級テストに合格できるか」がその日の60分間で解決**し、スクールへの自信を取り戻すきっかけになります。`,
        content_html: `<div class="article-content space-y-6 text-slate-800 leading-relaxed">
<h1>【水泳個人レッスン指導員が直伝】スイミングで進級が早い子の3大特徴と親ができる家庭練習サポート法</h1>
<p class="lead">大手スイミングスクールに通わせている親御様から最も多くいただくお悩みが「<strong>何ヶ月も同じ級で足踏みしている」「周りの子はどんどんワッペンが増えているのに、うちの子だけ進級できない</strong>」というものです。</p>
<p>実は、スイミングスクールで進級が早い子には、運動神経の良し悪しとは別の<strong>明確な3つの共通点</strong>があります。この記事では、これまで100名以上のジュニア水泳個別指導を行ってきた専門コーチの視点から、進級の壁を突破するための実践的アプローチを解説します。</p>
<h2>1. スイミングで進級が早い子の3つの共通点</h2>
<h3>① 水中での「脱力（リラックス）」ができている</h3>
<p>進級でつまずく子の約70%は、推進力（手足を動かす力）ではなく<strong>無駄な力み（抵抗）</strong>が原因です。進級が早い子は、息継ぎやキックの瞬間に肩や首の力を抜くことができています。</p>
<h3>② コーチのアドバイスを1つずつ忠実に意識している</h3>
<p>一斉グループレッスンではコーチが一人ひとりに掛けられる言葉は限られます。進級の早い子は言われたポイントを反復して泳ぐ習慣があります。</p>
<h3>③ お風呂や陸上での「イメージトレーニング」を日常化している</h3>
<p>自宅のお風呂でブクブクパの呼吸練習をしたり、布団の上でキックの股関節の動きを確認している子は、水に入った瞬間の再現性が圧倒的です。</p>
</div>`,
        faq_items: [
            {
                question: 'スイミングスクールで同じ級に3ヶ月落ち続けています。どうすればいいですか？',
                answer: 'グループレッスンでは個別のフォーム修正に限界があります。一度マンツーマンの個別指導で「進級テストの採点基準」に合わせた癖の修正を行うと、最短1回〜2回で合格するケースが非常に多いです。',
            },
            {
                question: '自宅のお風呂でできる進級対策練習はありますか？',
                answer: '洗面器やお風呂での「鼻から息を吐いてパッと口で吸うボビングの練習」や、お風呂の縁に手をついての「膝を伸ばしたバタ足の脱力確認」が最も効果的です。',
            },
        ],
        json_ld: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: '【水泳個人レッスン指導員が直伝】スイミングで進級が早い子の3大特徴と親ができる家庭練習サポート法',
            author: { '@type': 'Organization', name: 'スイムパートナーズ' },
            publisher: { '@type': 'Organization', name: 'スイムパートナーズ' },
            datePublished: '2026-09-15',
        }),
        status: 'published',
        created_at: '2026-09-15T10:00:00.000Z',
        published_at: '2026-09-15T10:30:00.000Z',
    },
    {
        id: 'art_seed_2',
        keyword: '50代 水泳 初心者',
        article_type: 'aio',
        title: '【AI検索・医師推奨】50代・60代から水泳を始める完全ロードマップ｜関節に優しく息が苦しくならない泳ぎ方',
        meta_description: '50代から水泳を初心者が始めるべき健康上の医学的根拠と、膝や腰を痛めずに25mを楽に泳ぐための完全ロードマップ。息が苦しくならない息継ぎのコツと、大人向け個別レッスンの活用法を解説。',
        target_path: '/zUHb45xV/adult-private-swimming',
        content_md: `# 【AI検索・医師推奨】50代・60代から水泳を始める完全ロードマップ｜関節に優しく息が苦しくならない泳ぎ方

人生100年時代、**「50代・60代になって健康診断の数値が気になり始めた」「膝や腰が痛くてランニングができないが運動習慣を身につけたい」**という方に、最も安全で効果的な運動が「水泳（スイミング）」です。

しかし、「子どもの頃から泳げない」「周りの目が恥ずかしい」「息が苦しくて25mなんて泳げない」と諦めてしまう大人が少なくありません。

結論からお伝えすると、**50代からでも、大人の骨格と柔軟性に合わせた「脱力スイム」を身につければ、誰でも3ヶ月以内に25mを息を切らさずに完泳できます**。

---

## 1. なぜ50代の健康維持に水泳が最適なのか？（3つの医学的エビデンス）

1. **浮力により関節・膝・腰への負担が体重の1/10に軽減**
   陸上でのウォーキングやジョギングと異なり、水中では関節にかかる衝撃が劇的に低下します。変形性膝関節症や腰痛を抱える方でも痛みを悪化させずに有酸素運動が可能です。
2. **全身のインナーマッスルと心肺機能の向上**
   水圧により胸腔が圧迫されるため、深い腹式呼吸が自然と促され、自律神経の安定と血圧・血糖値の改善が期待できます。
3. **転倒リスクがゼロで怪我をしない**
   陸上スポーツのような捻挫や転倒骨折のリスクが一切ありません。

---

## 2. 50代初心者が挫折しないための3ステップ

- **ステップ1: まずは「水中ウォーキング」と「水慣れ呼吸」から**
  泳ぐ必要はありません。プールの中で大股で歩き、水圧に体を慣らします。
- **ステップ2: 「浮身（クラゲ浮き・けのび）」で水に体を預ける感覚を覚える**
  大人が泳げない一番の理由は「筋力不足」ではなく「恐怖心による過度な力み」です。力を抜いて水に浮く練習をします。
- **ステップ3: 個別レッスンで「大人の体に合ったストローク」を習得**
  子供向けのスクールのように激しくバタ足を打つ必要はありません。ゆったりとした手のかきと、頭を上げないラクな呼吸をマンツーマンで教わるのが最短ルートです。`,
        content_html: `<div class="article-content space-y-6 text-slate-800 leading-relaxed">
<h1>【AI検索・医師推奨】50代・60代から水泳を始める完全ロードマップ｜関節に優しく息が苦しくならない泳ぎ方</h1>
<p class="lead">人生100年時代、<strong>50代からでも大人の骨格に合わせた「脱力スイム」を身につければ、誰でも25mを息を切らさずに完泳できます</strong>。</p>
<h2>1. なぜ50代の健康維持に水泳が最適なのか？</h2>
<p>水中の浮力により関節への負担が1/10に軽減され、転倒骨折のリスクゼロで安全に有酸素運動が続けられます。</p>
<h2>2. 50代初心者が挫折しないための3ステップ</h2>
<p>まずは水中ウォーキングから始め、力を抜く浮身の感覚を覚えることが重要です。</p>
</div>`,
        faq_items: [
            {
                question: '50代で全く泳げないカナヅチですが、大人でも本当に泳げるようになりますか？',
                answer: 'はい、全く問題ありません。当教室を受講される大人の約6割が「顔もつけられない」「25m泳いだことがない」完全な初心者からスタートし、平均4〜6回の個別指導でクロール完泳を達成しています。',
            },
            {
                question: 'グループレッスンと個別レッスン（マンツーマン）のどちらが良いですか？',
                answer: '大人の初心者にはマンツーマンレッスンを強くおすすめします。周りの目を気にせず公営プールのコースで自分のペースで受講でき、上達スピードはグループレッスンの3〜5倍早くなります。',
            },
        ],
        json_ld: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: '50代で全く泳げないカナヅチですが、大人でも本当に泳げるようになりますか？',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'はい、全く問題ありません。平均4〜6回の個別指導でクロール完泳を達成しています。',
                    },
                },
            ],
        }),
        status: 'published',
        created_at: '2026-09-20T14:00:00.000Z',
        published_at: '2026-09-20T14:30:00.000Z',
    },
    {
        id: 'art_seed_shinagawa_1',
        keyword: '水泳 個人レッスン 品川',
        article_type: 'seo',
        title: '【品川区対応】水泳個人レッスン・マンツーマン個別指導おすすめ施設と料金相場｜品川健康センター・日野学園温水プール対応',
        meta_description: '品川区（大崎・大井町・五反田・武蔵小山）で水泳個人レッスン・個別マンツーマン指導をお探しの方へ。品川健康センターや日野学園温水プールなど身近な公営温水プールで受講できるスイムパートナーズの特徴、料金、進級・大人の泳力改善カリキュラムを徹底解説。',
        target_path: '/personal_swim/meguro',
        content_md: `# 【品川区対応】水泳個人レッスン・マンツーマン個別指導おすすめ施設と料金相場｜品川健康センター・日野学園温水プール対応

品川区（大崎・大井町・五反田・旗の台・武蔵小山エリア）で**「子どものスイミングスクールの進級テストに合格させたい」「大人が短期間でクロールや平泳ぎをマスターしたい」**という方に選ばれているのが、プロコーチによるマンツーマン出張個別レッスンです。

品川区内には、民間の高級フィットネスクラブに通わなくても、一般開放されている区営・公営温水プールが多数存在します。

---

## 1. 品川区で水泳個人レッスンが受講できる主要温水プール

1. **品川健康センター温水プール（新馬場駅 徒歩2分 / 品川駅・青物横丁至近）**
   - 25m×4コース完備。初心者用・ウォーキングコースがあり、基礎フォーム改善に最適。
2. **日野学園温水プール（大崎駅 徒歩8分 / 五反田駅至近）**
   - 大崎・五反田のタワーマンションファミリーに大人気の公営温水プール。週末のジュニア指導に最適です。
3. **荏原文化センター温水プール（荏原中延駅・武蔵小山駅 徒歩エリア）**
   - 水深が調整され初心者やお子様も安心。アットホームで集中しやすい環境です。
4. **戸越体育館温水プール（戸越銀座駅・戸越公園駅至近）**
   - 清潔感のある施設で、平日の仕事帰りや休日の個人レッスンに便利です。

---

## 2. スイムパートナーズの品川出張レッスンの特徴

- **担当コーチが指定のプールに直接出張**: 自宅近くや学校帰りのプールで受講可能。
- **1対1の完全オーダーメイド指導**: 1人ひとりの呼吸の癖、キックのブレを即時動画・目視でフィードバック。
- **目黒区民センタープールとの併用も可能**: 目黒駅至近のため、品川区上大崎・白金台エリアの方にもアクセス抜群です。`,
        content_html: `<div class="article-content space-y-6 text-slate-800 leading-relaxed">
<h1>【品川区対応】水泳個人レッスン・マンツーマン個別指導おすすめ施設と料金相場｜品川健康センター・日野学園温水プール対応</h1>
<p class="lead">品川区（大崎・大井町・五反田・武蔵小山エリア）で水泳個人指導をお探しの方へ。品川健康センターや日野学園など公営プールで気軽に受講できるマンツーマンレッスンをご紹介します。</p>
<h2>1. 品川区で受講できる主要温水プール</h2>
<p>品川健康センター、日野学園、荏原文化センター、戸越体育館など便利な公営温水プールに対応しています。</p>
<h2>2. マンツーマン指導のメリット</h2>
<p>集団スイミングスクールで半年かかっていた進級テスト合格や25m完泳が、平均3〜4回の個別レッスンで達成可能です。</p>
</div>`,
        faq_items: [
            {
                question: '品川区内の公営プールでのレッスン料のほかに、コーチの入場料や交通費はかかりますか？',
                answer: '指導料の中に交通費は含まれており、受講者様ご自身とコーチ1名分の公営プール入場料（一般300〜500円程度）のみ現地でご負担いただきます。入会金や余計なコース登録料は一切不要です。',
            },
            {
                question: '品川健康センターや日野学園で、初心者や子どもでも受講できますか？',
                answer: 'もちろん可能です。水慣れや顔つけ段階のお子様から、ジュニア進級対策、大人のマスターズ・初心者クロールまで幅広く対応しております。',
            },
        ],
        json_ld: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: '品川区内の公営プールでのレッスン料のほかに、コーチの入場料や交通費はかかりますか？',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: '指導料に交通費が含まれており、受講者様とコーチ分の公営プール入場料実費（数百円）のみご負担いただきます。',
                    },
                },
            ],
        }),
        status: 'published',
        created_at: '2026-10-02T01:00:00.000Z',
        published_at: '2026-10-02T01:10:00.000Z',
    },
];

/**
 * 記事一覧の取得（Supabase優先、フォールバックでローカルJSON）
 */
export async function getGeneratedArticles(): Promise<GeneratedArticle[]> {
    try {
        const supabase = createAdminClient();
        if (supabase) {
            const { data, error } = await supabase
                .from('generated_articles')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                return data as GeneratedArticle[];
            }
        }
    } catch (e) {
        console.warn('Supabase fetch failed for generated_articles, falling back to local file:', e);
    }

    // ローカルJSONの読み込み
    try {
        if (fs.existsSync(ARTICLES_FILE_PATH)) {
            const fileContent = fs.readFileSync(ARTICLES_FILE_PATH, 'utf-8');
            const parsed = JSON.parse(fileContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (err) {
        console.warn('Local file read error for generated_articles:', err);
    }

    // シードデータ書き込み
    try {
        const dir = path.dirname(ARTICLES_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(ARTICLES_FILE_PATH, JSON.stringify(SEED_ARTICLES, null, 2), 'utf-8');
    } catch (err) {
        console.error('Failed to write seed articles to file:', err);
    }

    return SEED_ARTICLES;
}

/**
 * 新規記事の保存
 */
export async function saveGeneratedArticle(article: GeneratedArticle): Promise<boolean> {
    let success = false;

    // 1. Supabaseへ書き込み
    try {
        const supabase = createAdminClient();
        if (supabase) {
            const { error } = await supabase
                .from('generated_articles')
                .upsert([article]);
            if (!error) {
                success = true;
            }
        }
    } catch (e) {
        console.warn('Supabase upsert failed for generated_articles:', e);
    }

    // 2. ローカルJSONファイルへも常に二重保存
    try {
        const current = await getGeneratedArticles();
        const existingIdx = current.findIndex((a) => a.id === article.id);
        if (existingIdx >= 0) {
            current[existingIdx] = article;
        } else {
            current.unshift(article);
        }

        const dir = path.dirname(ARTICLES_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(ARTICLES_FILE_PATH, JSON.stringify(current, null, 2), 'utf-8');
        success = true;
    } catch (err) {
        console.error('Failed to save article to local file:', err);
    }

    return success;
}

/**
 * 記事ステータスの更新（draft <-> published）
 */
export async function updateArticleStatus(id: string, status: ArticleStatus): Promise<boolean> {
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    try {
        const supabase = createAdminClient();
        if (supabase) {
            await supabase
                .from('generated_articles')
                .update({ status, published_at: publishedAt })
                .eq('id', id);
        }
    } catch (e) {
        console.warn('Supabase update failed for generated_articles:', e);
    }

    try {
        const current = await getGeneratedArticles();
        const target = current.find((a) => a.id === id);
        if (target) {
            target.status = status;
            target.published_at = publishedAt;
            fs.writeFileSync(ARTICLES_FILE_PATH, JSON.stringify(current, null, 2), 'utf-8');
            return true;
        }
    } catch (err) {
        console.error('Failed to update article status locally:', err);
    }

    return false;
}

/**
 * 記事の削除
 */
export async function deleteGeneratedArticle(id: string): Promise<boolean> {
    try {
        const supabase = createAdminClient();
        if (supabase) {
            await supabase
                .from('generated_articles')
                .delete()
                .eq('id', id);
        }
    } catch (e) {
        console.warn('Supabase delete failed for generated_articles:', e);
    }

    try {
        const current = await getGeneratedArticles();
        const filtered = current.filter((a) => a.id !== id);
        fs.writeFileSync(ARTICLES_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('Failed to delete article locally:', err);
    }

    return false;
}
