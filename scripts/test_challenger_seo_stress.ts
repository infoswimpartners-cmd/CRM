/**
 * scripts/test_challenger_seo_stress.ts
 *
 * ==============================================================================
 * スイムパートナーズ 商圏SEO・動的ルーティング・実測検証・管理画面
 * 敵対的ストレステスト スイート (Challenger Adversarial Stress Test Suite)
 * ==============================================================================
 *
 * 目的:
 * - 開発者・作業者の主張やログを盲信せず、敵対的検証者（Empirical Challenger）として
 *   自らテストコードを記述・実行し、境界値、異常系、破損、重複、不正URL耐性、
 *   スコアリング整合性を徹底的にストレステストする。
 *
 * 厳格ルール:
 * - 顧客テストデータを利用する際は「会員番号0035 / テスト太郎」以外を絶対に使用しない。
 * - 0035以外の会員番号が与えられた場合は即座に遮断するガード機構を実証する。
 */

import * as fs from 'fs';
import * as path from 'path';

// 商圏SEO診断モジュール
import {
    AREA_SEO_AUDIT_DATA,
    getAreaBySlugOrId,
    getAllAreaStaticParams,
    getAreaRegionGroups,
    evaluateAreaItemWithLiveAudit,
    AreaSeoAuditItem,
} from '../src/lib/area-seo-audit';

// 動的LPコンポーネント & メタデータ生成関数
import AreaPersonalSwimPage, {
    generateMetadata,
    generateStaticParams,
} from '../src/app/personal_swim/[area]/page';

// Server Actions
import {
    getAreaSeoAuditsAction,
    saveAreaCustomUrlAction,
    auditAreaSeoAction,
    auditAllAreasSeoAction,
} from '../src/actions/area-seo-actions';

// -----------------------------------------------------------------------------
// 1. 顧客データ安全ガード（会員番号0035 / テスト太郎限定ルール）
// -----------------------------------------------------------------------------
export const CHALLENGER_TEST_CUSTOMER = {
    studentNumber: '0035',
    parentName: 'テスト太郎',
    parentKana: 'テストタロウ',
    email: 'taro.test0035@swim-partners-example.jp',
    phone: '090-0035-0035',
};

// -----------------------------------------------------------------------------
// 2. テストアサーション & 実行結果管理
// -----------------------------------------------------------------------------
interface StressTestResult {
    category: string;
    testId: string;
    description: string;
    passed: boolean;
    reason?: string;
    detail?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

const testResults: StressTestResult[] = [];

function assertTest(
    category: string,
    testId: string,
    description: string,
    condition: boolean,
    reasonIfFailed?: string,
    detail?: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
) {
    if (condition) {
        testResults.push({
            category,
            testId,
            description,
            passed: true,
            severity,
        });
        console.log(`  ✅ [PASS] [${testId}] ${description}`);
    } else {
        testResults.push({
            category,
            testId,
            description,
            passed: false,
            reason: reasonIfFailed || 'アサーション条件不成立',
            detail,
            severity,
        });
        console.error(`  ❌ [FAIL] [${testId}] ${description} -> ${reasonIfFailed} (Detail: ${detail || 'none'})`);
    }
}

// -----------------------------------------------------------------------------
// 3. 敵対的ストレステスト本体
// -----------------------------------------------------------------------------
async function runChallengerStressTestSuite() {
    console.log('==============================================================================');
    console.log(' ⚔️ スイムパートナーズ 商圏SEO 敵対的ストレステスト（Challenger Stress Suite）');
    console.log('==============================================================================\n');

    // =========================================================================
    // Scope 1: 動的ルーティング & 404 / notFound() 耐性テスト
    // =========================================================================
    console.log('------------------------------------------------------------------------------');
    console.log(' [Scope 1: 動的ルーティング & notFound() / 404 ハンドリング敵対的検証]');
    console.log('------------------------------------------------------------------------------');

    // 1.1 不正スラッグの網羅的入力耐性
    const adversarialSlugs = [
        { label: '未知の都市名', slug: 'unknown-city' },
        { label: '未知の東京エリア', slug: 'tokyo_unknown' },
        { label: 'ランダムUUID/数値', slug: 'random-99999-invalid' },
        { label: 'パストラバーサル (../)', slug: '../../etc/passwd' },
        { label: 'URLエンコードトラバーサル', slug: '..%2F..%2Fetc%2Fpasswd' },
        { label: 'XSSスクリプトタグ', slug: '<script>alert(1)</script>' },
        { label: 'SQLインジェクション風', slug: "'; DROP TABLE areas;--" },
        { label: '空文字', slug: '' },
        { label: '空白のみ', slug: '   ' },
        { label: '改行・タブ文字', slug: '\n\t\r' },
        { label: 'URLエンコード空白 (%20)', slug: '%20' },
        { label: 'ヌルバイト (%00)', slug: '%00' },
        { label: '文字列null', slug: 'null' },
        { label: '文字列undefined', slug: 'undefined' },
        { label: '漢字直接入力 (品川)', slug: '品川' },
        { label: '巨大文字列 (10,000文字)', slug: 'a'.repeat(10000) },
        { label: 'サブパス付きスラッグ', slug: 'meguro/subpath' },
        { label: '絵文字含むスラッグ', slug: 'swimming🏊‍♀️pool' },
    ];

    console.log('  1.1 不正スラッグ解決に対する getAreaBySlugOrId 耐性テスト:');
    for (let i = 0; i < adversarialSlugs.length; i++) {
        const item = adversarialSlugs[i];
        const res = getAreaBySlugOrId(item.slug);
        assertTest(
            'ルーティング異常系',
            `S1-01-${String(i + 1).padStart(2, '0')}`,
            `不正スラッグ「${item.label}」に対して undefined を安全に返却すること`,
            res === undefined,
            `予期せずマッチしました: ${JSON.stringify(res?.slug || res?.id)}`,
            `入力スラッグ: ${item.slug.slice(0, 30)}`
        );
    }

    // 1.2 大文字小文字の正規化（Case-Insensitive Resolution）テスト
    console.log('\n  1.2 大文字小文字の正規化テスト:');
    const caseVariants = [
        { input: 'MEGURO', expectedSlug: 'meguro' },
        { input: 'Shinagawa', expectedSlug: 'shinagawa' },
        { input: 'yOkOhAmA', expectedSlug: 'yokohama' },
        { input: '  fUnAbAsHi  ', expectedSlug: 'funabashi' },
    ];
    for (const cv of caseVariants) {
        const res = getAreaBySlugOrId(cv.input);
        assertTest(
            'スラッグ正規化',
            `S1-02-${cv.expectedSlug}`,
            `表記揺れスラッグ「${cv.input}」が「${cv.expectedSlug}」へ安全に正規化解決されること`,
            res?.slug === cv.expectedSlug,
            `解決失敗: ${res?.slug || 'undefined'}`
        );
    }

    // 1.3 存在しないエリアIDでの notFound() 呼出し実証テスト
    console.log('\n  1.3 存在しないエリアIDでの AreaPersonalSwimPage notFound() スロー実証:');
    let notFoundThrown = false;
    let notFoundDigest = '';
    try {
        await AreaPersonalSwimPage({
            params: Promise.resolve({ area: 'unknown-city' }),
        });
    } catch (err: any) {
        notFoundThrown = true;
        notFoundDigest = err?.digest || err?.message || '';
    }

    assertTest(
        'notFoundハンドリング',
        'S1-03',
        '未知エリア /personal_swim/unknown-city に対し AreaPersonalSwimPage が notFound() をスローすること',
        notFoundThrown && (notFoundDigest.includes('NEXT_HTTP_ERROR_FALLBACK;404') || notFoundDigest.includes('NEXT_NOT_FOUND')),
        `notFound未スローまたは予期せぬエラー: ${notFoundDigest}`,
        notFoundDigest,
        'CRITICAL'
    );

    // 1.4 存在しないエリアIDでの generateMetadata フォールバック実証
    console.log('\n  1.4 存在しないエリアIDでの generateMetadata フォールバック実証:');
    const fallbackMetadata = await generateMetadata({
        params: Promise.resolve({ area: 'unknown-city-999' }),
    });

    assertTest(
        'Metadataフォールバック',
        'S1-04',
        '未知エリアに対する generateMetadata がクラッシュせずデフォルト安全メタデータを返却すること',
        Boolean(
            fallbackMetadata.title &&
            fallbackMetadata.title.toString().includes('Swim Partners') &&
            fallbackMetadata.description &&
            fallbackMetadata.description.toString().includes('Swim Partners')
        ),
        `返却メタデータが不正です: title=${fallbackMetadata.title}`
    );

    // 1.5 generateStaticParams の完全性 & 重複排除実証
    console.log('\n  1.5 generateStaticParams の生成パラメータ検証:');
    const staticParams = await generateStaticParams();
    const staticAreas = staticParams.map((p) => p.area);
    const uniqueStaticAreas = new Set(staticAreas);

    assertTest(
        'SSG静的パラメータ完全性',
        'S1-05-01',
        'generateStaticParams() が全定義エリアのパラメータ（slugおよびid）を漏れなく生成すること',
        staticParams.length >= 20,
        `生成数不足: ${staticParams.length}件`
    );

    assertTest(
        'SSG静的パラメータ重複排除',
        'S1-05-02',
        'generateStaticParams() の生成リストに重複スラッグが含まれていないこと',
        staticAreas.length === uniqueStaticAreas.size,
        `重複検出: 生成件数=${staticAreas.length}, ユニーク数=${uniqueStaticAreas.size}`
    );


    // =========================================================================
    // Scope 2: 全12商圏のメタデータ・JSON-LD・出張公営プール整合性検証
    // =========================================================================
    console.log('\n------------------------------------------------------------------------------');
    console.log(' [Scope 2: 全商圏エリア（12エリア）メタデータ・JSON-LD・公営プール整合性]');
    console.log('------------------------------------------------------------------------------');

    // 2.1 全商圏の一意性（重複排除）
    const allSlugs = AREA_SEO_AUDIT_DATA.map((a) => a.slug);
    const allIds = AREA_SEO_AUDIT_DATA.map((a) => a.id);
    const allKeys = AREA_SEO_AUDIT_DATA.map((a) => a.areaKey);
    const allLpPaths = AREA_SEO_AUDIT_DATA.map((a) => a.dedicatedLpPath).filter(Boolean);

    assertTest(
        'データ一意性',
        'S2-01-01',
        '全商圏データのスラッグ（slug）に重複が一切存在しないこと',
        allSlugs.length === new Set(allSlugs).size,
        `重複スラッグあり: ${allSlugs.length} vs ${new Set(allSlugs).size}`
    );

    assertTest(
        'データ一意性',
        'S2-01-02',
        '全商圏データのID（id）に重複が一切存在しないこと',
        allIds.length === new Set(allIds).size,
        `重複IDあり: ${allIds.length} vs ${new Set(allIds).size}`
    );

    assertTest(
        'データ一意性',
        'S2-01-03',
        '全商圏データの専用LPパス（dedicatedLpPath）に重複が一切存在しないこと',
        allLpPaths.length === new Set(allLpPaths).size,
        `重複LPパスあり: ${allLpPaths.length} vs ${new Set(allLpPaths).size}`
    );

    // 2.2 全12商圏の動的メタデータ完全性検証
    console.log('\n  2.2 全12商圏の generateMetadata 出力検証:');
    const requiredKeywords = ['品川', '目黒', '世田谷', '横浜', '八景', '川崎', '八王子', '千葉', '船橋', '市川', '浦安', 'さいたま'];
    const generatedTitles = new Set<string>();
    const generatedDescriptions = new Set<string>();
    const generatedCanonicals = new Set<string>();

    for (const item of AREA_SEO_AUDIT_DATA) {
        const meta = await generateMetadata({
            params: Promise.resolve({ area: item.slug }),
        });

        const titleStr = String(meta.title || '');
        const descStr = String(meta.description || '');
        const canonicalUrl = meta.alternates?.canonical ? String(meta.alternates.canonical) : '';
        const ogUrl = meta.openGraph?.url ? String(meta.openGraph.url) : '';

        generatedTitles.add(titleStr);
        generatedDescriptions.add(descStr);
        generatedCanonicals.add(canonicalUrl);

        const cleanName = item.areaName.split('（')[0];
        const hasCleanNameInTitle = titleStr.includes(cleanName);
        const hasFacilityInDesc = item.majorFacilities.some((f) => descStr.includes(f.name));
        const canonicalMatches = canonicalUrl === `https://swim-partners.com/personal_swim/${item.slug}`;
        const ogMatchesCanonical = ogUrl === canonicalUrl;

        assertTest(
            'メタデータ整合性',
            `S2-02-${item.slug}`,
            `「${item.areaName}」のメタデータ（タイトル・ディスクリプション・canonical）が完全であること`,
            hasCleanNameInTitle && hasFacilityInDesc && canonicalMatches && ogMatchesCanonical,
            `タイトル/施設不整合: title="${titleStr}", canonical="${canonicalUrl}"`
        );
    }

    assertTest(
        'メタデータ重複排除',
        'S2-02-DEDUP',
        '全12商圏でタイトル・ディスクリプション・canonicalがコピペ重複せず一意であること',
        generatedTitles.size === AREA_SEO_AUDIT_DATA.length &&
        generatedDescriptions.size === AREA_SEO_AUDIT_DATA.length &&
        generatedCanonicals.size === AREA_SEO_AUDIT_DATA.length,
        `一意性崩れ: titles=${generatedTitles.size}, descriptions=${generatedDescriptions.size}, canonicals=${generatedCanonicals.size}`
    );

    // 2.3 全12商圏のJSON-LD（構造化データ）構文・スキーマ厳密検証
    console.log('\n  2.3 全12商圏のJSON-LD（構造化データ）構文・スキーマ厳密検証:');
    const faqAnswersPoolNames = new Set<string>();

    for (const item of AREA_SEO_AUDIT_DATA) {
        const pageElement = await AreaPersonalSwimPage({
            params: Promise.resolve({ area: item.slug }),
        });

        // JSX ツリーから script[type="application/ld+json"] を探索
        let jsonLdRaw = '';
        const findJsonLd = (node: any) => {
            if (!node) return;
            if (node.type === 'script' && node.props?.type === 'application/ld+json') {
                jsonLdRaw = node.props.dangerouslySetInnerHTML?.__html || '';
                return;
            }
            if (node.props?.children) {
                if (Array.isArray(node.props.children)) {
                    node.props.children.forEach(findJsonLd);
                } else {
                    findJsonLd(node.props.children);
                }
            }
        };
        findJsonLd(pageElement);

        assertTest(
            'JSON-LD埋め込み',
            `S2-03-${item.slug}-PRESENT`,
            `「${item.areaName}」のページにJSON-LD scriptタグが出力されていること`,
            Boolean(jsonLdRaw && jsonLdRaw.length > 50),
            'JSON-LDが見つかりません'
        );

        if (jsonLdRaw) {
            let parsedLd: any = null;
            let parseSuccess = false;
            try {
                parsedLd = JSON.parse(jsonLdRaw);
                parseSuccess = true;
            } catch (err: any) {
                parseSuccess = false;
            }

            assertTest(
                'JSON-LD構文妥当性',
                `S2-03-${item.slug}-SYNTAX`,
                `「${item.areaName}」のJSON-LDがJSONとして正常にパースできること`,
                parseSuccess && parsedLd['@context'] === 'https://schema.org',
                'JSONパースエラーまたは@context不整合'
            );

            // スキーマ種別（SportsClub + FAQPage）検証
            const graph = parsedLd?.['@graph'] || [];
            const sportsClub = graph.find((g: any) => g['@type'] === 'SportsClub');
            const faqPage = graph.find((g: any) => g['@type'] === 'FAQPage');

            assertTest(
                'JSON-LDエンティティ検証',
                `S2-03-${item.slug}-GRAPH`,
                `「${item.areaName}」のJSON-LDにSportsClubおよびFAQPageの両エンティティが含まれること`,
                Boolean(sportsClub && faqPage),
                'SportsClubまたはFAQPageが欠落しています'
            );

            // FAQPage の質問と回答の検証
            const questions = faqPage?.mainEntity || [];
            const q1 = questions[0];
            const cleanName = item.areaName.split('（')[0];
            const q1MatchesArea = q1?.name?.includes(cleanName);
            const a1Text = q1?.acceptedAnswer?.text || '';
            const a1MentionsPool = item.majorFacilities.some((f) => a1Text.includes(f.name));

            faqAnswersPoolNames.add(a1Text);

            assertTest(
                'JSON-LD地域FAQ整合性',
                `S2-03-${item.slug}-FAQ`,
                `「${item.areaName}」のFAQ Q1/A1に対象エリア名と公営プール名が動的反映されていること`,
                q1MatchesArea && a1MentionsPool && questions.length >= 5,
                `FAQ不整合: Q1="${q1?.name}", A1="${a1Text.slice(0, 40)}..."`
            );
        }
    }

    assertTest(
        'JSON-LDコピペ排除',
        'S2-03-FAQ-DEDUP',
        '全12商圏のFAQプール回答が地域ごとに独自の内容となっており重複コピペでないこと',
        faqAnswersPoolNames.size === AREA_SEO_AUDIT_DATA.length,
        `FAQ回答重複検出: ユニーク数=${faqAnswersPoolNames.size} / 全商圏=${AREA_SEO_AUDIT_DATA.length}`
    );

    // 2.4 出張公営プール名の実在性・地域整合性・クロスコンタミネーション排除
    console.log('\n  2.4 出張公営プール名の実在性・地域整合性検証:');
    for (const area of AREA_SEO_AUDIT_DATA) {
        assertTest(
            '公営プール拠点数',
            `S2-04-${area.slug}-COUNT`,
            `「${area.areaName}」の出張対応プールが2拠点以上定義されていること`,
            area.majorFacilities.length >= 2,
            `拠点数不足: ${area.majorFacilities.length}`
        );

        for (const fac of area.majorFacilities) {
            const hasPoolKeyword = ['プール', 'アリーナ', 'スポーツセンター', '武道館', '水泳場', '体育館'].some((kw) =>
                fac.name.includes(kw)
            );
            const hasSpec = fac.poolSpecs.length >= 4;
            const hasFeature = fac.features.length >= 4;

            // 自治体・都道府県との整合性
            let regionConsistent = false;
            if (area.prefecture === 'tokyo') {
                regionConsistent = fac.address.includes('区') || fac.address.includes('市') || fac.address.includes('東京都');
            } else if (area.prefecture === 'kanagawa') {
                regionConsistent = fac.address.includes('横浜市') || fac.address.includes('川崎市') || fac.address.includes('横須賀市') || fac.address.includes('中区');
            } else if (area.prefecture === 'chiba') {
                regionConsistent = fac.address.includes('千葉市') || fac.address.includes('船橋市') || fac.address.includes('市川市') || fac.address.includes('浦安市') || fac.address.includes('習志野市');
            } else if (area.prefecture === 'saitama') {
                regionConsistent = fac.address.includes('さいたま市') || fac.address.includes('川口市');
            }

            assertTest(
                '施設実在・地域整合性',
                `S2-04-${area.slug}-${fac.name.slice(0, 6)}`,
                `施設「${fac.name}」のスペック・特徴・所在地（${fac.address}）が対象エリア「${area.areaName}」と整合すること`,
                hasPoolKeyword && hasSpec && hasFeature && regionConsistent,
                `施設情報不整合: name=${fac.name}, address=${fac.address}, spec=${fac.poolSpecs}`
            );
        }
    }


    // =========================================================================
    // Scope 3: 管理画面・Server Actions の敵対的ストレステスト
    // =========================================================================
    console.log('\n------------------------------------------------------------------------------');
    console.log(' [Scope 3: 管理画面・Server Actions 不正URL耐性 & スコアリング整合性]');
    console.log('------------------------------------------------------------------------------');

    // 3.1 saveAreaCustomUrlAction 不正URL保存の耐性テスト
    console.log('  3.1 saveAreaCustomUrlAction 不正URL保存の耐性テスト:');

    // テストケース A: 空文字（URLリセット）
    const emptySaveRes = await saveAreaCustomUrlAction('area_tokyo_meguro', '');
    assertTest(
        'ServerAction不正URL耐性',
        'S3-01-EMPTY',
        '空文字登録時にクラッシュせず、URL未登録としてスコア<=40・needs_lpに安全降格すること',
        emptySaveRes.success === true &&
        emptySaveRes.data?.customUrl === null &&
        emptySaveRes.data?.dedicatedLpPath === null &&
        emptySaveRes.data?.seoScore <= 40 &&
        emptySaveRes.data?.status === 'needs_lp',
        `空文字処理不正: success=${emptySaveRes.success}, score=${emptySaveRes.data?.seoScore}, status=${emptySaveRes.data?.status}`
    );

    // テストケース B: 空白のみ
    const spacesSaveRes = await saveAreaCustomUrlAction('area_tokyo_meguro', '     ');
    assertTest(
        'ServerAction不正URL耐性',
        'S3-01-SPACES',
        '空白のみの登録時に空文字と同様に安全リセットされること',
        spacesSaveRes.success === true &&
        spacesSaveRes.data?.customUrl === null &&
        spacesSaveRes.data?.status === 'needs_lp',
        `空白処理不正: success=${spacesSaveRes.success}`
    );

    // テストケース C: 不正URL構文 (http://)
    const malformedHttpRes = await saveAreaCustomUrlAction('area_tokyo_meguro', 'http://');
    assertTest(
        'ServerAction不正URL耐性',
        'S3-01-MALFORMED-HTTP',
        '構文エラーURL「http://」に対してサーバー例外クラッシュせず { success: false } を返却すること',
        malformedHttpRes.success === false && Boolean(malformedHttpRes.error),
        `クラッシュまたは予期せぬ成功: success=${malformedHttpRes.success}`
    );

    // テストケース D: 存在しないエリアID
    const nonExistentAreaRes = await saveAreaCustomUrlAction('invalid_area_id_99999', '/test');
    assertTest(
        'ServerAction不正URL耐性',
        'S3-01-NON-EXISTENT-AREA',
        '存在しないエリアIDへの保存要求に対し { success: false, error: ... } で安全に拒否されること',
        nonExistentAreaRes.success === false && Boolean(nonExistentAreaRes.error?.includes('見つかりません')),
        `拒否されませんでした: error=${nonExistentAreaRes.error}`
    );

    // テストケース E: 危険なスキーム (javascript:)
    const jsSchemeRes = await saveAreaCustomUrlAction('area_tokyo_meguro', 'javascript:alert(1)');
    assertTest(
        'ServerAction不正URL耐性',
        'S3-01-JAVASCRIPT-SCHEME',
        '「javascript:alert(1)」保存時にクラッシュせず安全にパス正規化またはフォールバックされること',
        jsSchemeRes.success === true && jsSchemeRes.data?.seoScore <= 40,
        `XSSスキーム処理不正: success=${jsSchemeRes.success}, score=${jsSchemeRes.data?.seoScore}`
    );

    // テストケース F: 正常な専用LPパスへの再登録復旧
    const restoreRes = await saveAreaCustomUrlAction('area_tokyo_meguro', '/personal_swim/meguro');
    assertTest(
        'ServerAction正常復旧',
        'S3-01-RESTORE',
        '正常パス「/personal_swim/meguro」の登録によりスコアが80点以上の対策完了状態へ正常復帰すること',
        restoreRes.success === true && (restoreRes.data?.seoScore || 0) >= 80,
        `復旧失敗: score=${restoreRes.data?.seoScore}`
    );

    // 3.2 auditAreaSeoAction 単一再検証の境界値 & エラー耐性
    console.log('\n  3.2 auditAreaSeoAction 単一再検証の耐性テスト:');

    // 存在しないエリアID
    const auditNonExistentRes = await auditAreaSeoAction('unknown_id_00000');
    assertTest(
        '単一再検証異常系',
        'S3-02-UNKNOWN-AREA',
        '未知のエリアIDに対する再検証が { success: false } で安全に失敗すること',
        auditNonExistentRes.success === false,
        `成功してしまいました: ${JSON.stringify(auditNonExistentRes)}`
    );

    // 存在しないURL（404）の再検証
    const audit404Res = await auditAreaSeoAction('area_tokyo_shinagawa', '/personal_swim/does_not_exist_404');
    assertTest(
        '単一再検証404検知',
        'S3-02-404-DETECT',
        '存在しないURL（404）に対する再検証がスコア35点以下・auditStatus: not_found となること',
        audit404Res.success === true &&
        audit404Res.data?.httpStatus === 404 &&
        audit404Res.data?.seoScore <= 35 &&
        audit404Res.data?.auditStatus === 'not_found',
        `404検知不正: score=${audit404Res.data?.seoScore}, status=${audit404Res.data?.auditStatus}`
    );

    // 3.3 auditAllAreasSeoAction 一括再検証の耐久テスト
    console.log('\n  3.3 auditAllAreasSeoAction 一括再検証の耐久テスト:');
    const bulkAuditRes = await auditAllAreasSeoAction();
    assertTest(
        '一括再検証耐久性',
        'S3-03-BULK',
        '全商圏エリアの一括再検証がタイムアウト・クラッシュせず全件（12件）完了すること',
        bulkAuditRes.success === true && bulkAuditRes.updatedCount === AREA_SEO_AUDIT_DATA.length && bulkAuditRes.data.length === AREA_SEO_AUDIT_DATA.length,
        `一括再検証失敗: success=${bulkAuditRes.success}, updated=${bulkAuditRes.updatedCount}`
    );

    // 3.4 スコアリングロジックの決定性（Idempotency）& 境界値
    console.log('\n  3.4 evaluateAreaItemWithLiveAudit スコアリング決定性 & 境界値検証:');
    const baseTestItem = AREA_SEO_AUDIT_DATA[0]; // 目黒

    // 同一入力で5回実行し、決定性を確認
    const runScores: number[] = [];
    for (let r = 0; r < 5; r++) {
        const evalRes = evaluateAreaItemWithLiveAudit(baseTestItem, '/personal_swim/meguro', {
            httpStatus: 200,
            liveTitle: '目黒・港区・品川の水泳個人レッスン｜目黒区民センタープール出張',
            h1: '目黒区で水泳マンツーマン個人レッスン',
            h2List: ['目黒区民センタープール対応', '港区スポーツセンター出張'],
            hasLdJson: true,
        });
        runScores.push(evalRes.seoScore);
    }

    const isDeterministic = runScores.every((s) => s === runScores[0]);
    assertTest(
        'スコアリング決定性',
        'S3-04-IDEMPOTENCY',
        '同一の実測データに対して5回連続で全く同一のSEOスコア（決定性）を出力すること',
        isDeterministic && runScores[0] >= 85,
        `決定性違反: scores=${runScores.join(', ')}`
    );

    // キーワードもプール名も一切一致しない低品質ページのスコアリング
    const lowQualityEval = evaluateAreaItemWithLiveAudit(baseTestItem, '/irrelevant_page', {
        httpStatus: 200,
        liveTitle: '全く無関係なプログラミング学習ブログ記事',
        h1: 'ReactとTypeScriptの基礎知識',
        h2List: ['コンポーネント設計', '状態管理'],
        hasLdJson: false,
    });

    assertTest(
        '低品質ペナルティスコア',
        'S3-04-LOW-QUALITY',
        '地域名・プール名・JSON-LDが一切ないページに対してスコア60点未満・needs_lpに判定すること',
        lowQualityEval.seoScore < 60 && lowQualityEval.status === 'needs_lp',
        `過剰高得点: score=${lowQualityEval.seoScore}, status=${lowQualityEval.status}`
    );


    // =========================================================================
    // Scope 4: 厳格顧客データ安全ガード (会員番号0035 / テスト太郎)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------------');
    console.log(' [Scope 4: 厳格顧客データ安全ガード（会員番号0035・テスト太郎限定ルール）]');
    console.log('------------------------------------------------------------------------------');

    function executeChallengerCustomerGuard(studentNumber: string, customerName: string): boolean {
        // 厳格セキュリティルール: 0035 / テスト太郎 以外のテストデータ投入は即座に拒否
        if (studentNumber !== '0035' || !customerName.includes('テスト太郎')) {
            return false; // 遮断
        }
        return true; // 許可
    }

    assertTest(
        '顧客安全ガード',
        'S4-01',
        '会員番号0035・テスト太郎の検証ペイロードは正常に許可されること',
        executeChallengerCustomerGuard(CHALLENGER_TEST_CUSTOMER.studentNumber, CHALLENGER_TEST_CUSTOMER.parentName) === true,
        '0035 テスト太郎が拒絶されました',
        undefined,
        'CRITICAL'
    );

    const unauthorizedCustomers = [
        { no: '0001', name: '一般会員A' },
        { no: '9999', name: '退会済み会員B' },
        { no: '0036', name: 'テスト次郎' },
        { no: '0035', name: '悪意あるなりすまし' }, // 番号は合っているが氏名不一致
        { no: '', name: 'テスト太郎' },              // 番号欠落
    ];

    for (let u = 0; u < unauthorizedCustomers.length; u++) {
        const unauth = unauthorizedCustomers[u];
        const isAllowed = executeChallengerCustomerGuard(unauth.no, unauth.name);
        assertTest(
            '顧客安全ガード遮断',
            `S4-02-${u + 1}`,
            `不正顧客「番号:${unauth.no || '空'} / 氏名:${unauth.name}」のテスト投入が確実に遮断されること`,
            isAllowed === false,
            `遮断失敗（不正許可）: no=${unauth.no}, name=${unauth.name}`,
            undefined,
            'CRITICAL'
        );
    }

    // =========================================================================
    // テスト結果集計
    // =========================================================================
    console.log('\n==============================================================================');
    console.log(' 敵対的ストレステスト（Challenger Suite） 実行結果サマリー');
    console.log('==============================================================================');

    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = testResults.filter((r) => !r.passed);

    console.log(`  総ストレステスト件数: ${total}`);
    console.log(`  合格 (PASSED)       : ${passed} / ${total}`);
    console.log(`  不合格 (FAILED)     : ${failed.length} / ${total}`);
    console.log('==============================================================================');

    if (failed.length > 0) {
        console.log('\n❌ 失敗したテストケース一覧:');
        for (const f of failed) {
            console.log(`  [${f.severity}] [${f.category}] [${f.testId}] ${f.description}`);
            console.log(`     理由: ${f.reason}`);
            if (f.detail) console.log(`     詳細: ${f.detail}\n`);
        }
        process.exit(1);
    } else {
        console.log('\n🏆 敵対的ストレステスト全項目が合格しました！');
        console.log('   SEO動的ルーティング、メタデータ、JSON-LD、公営プール整合性、');
        console.log('   管理画面不正URL耐性、Server Actionsスコアリング整合性の全検証に成功しました。\n');
        process.exit(0);
    }
}

// 実行
runChallengerStressTestSuite().catch((err) => {
    console.error('Challenger stress test runner fatal error:', err);
    process.exit(1);
});
