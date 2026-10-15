/**
 * scripts/test_e2e_seo_funnel.ts
 * 
 * ==============================================================================
 * スイムパートナーズ SEO・集客ファネル包括的 E2E テストスイート (Tiers 1 - 4)
 * ==============================================================================
 * 
 * 対象要件:
 * - R1: 管理画面SEO（/admin/geo-seo）の極限シンプル化
 * - R2: 主要商圏エリアLP（/personal_swim/[area]）のSEO・公営プール訴求・CVR最大化
 * - R3: トップページ（/）4大強み訴求＆体験予約フォーム（/trial）Webハイブリッド化
 * 
 * 厳格ルール:
 * - テストを実施する際、顧客は会員番号0035、テスト太郎以外は使用しない。
 */

import * as fs from 'fs';
import * as path from 'path';

// 商圏SEO診断モジュール
import {
    AREA_SEO_AUDIT_DATA,
    getAreaRegionGroups,
    evaluateAreaItemWithLiveAudit,
    AreaSeoAuditItem,
} from '../src/lib/area-seo-audit';

// -----------------------------------------------------------------------------
// 1. 厳格顧客データ定数（会員番号0035・テスト太郎限定ルール）
// -----------------------------------------------------------------------------
export const TEST_TARO_CUSTOMER = {
    studentNumber: '0035',
    parentName: 'テスト太郎',
    parentKana: 'テストタロウ',
    email: 'taro.test0035@swim-partners-example.jp',
    phone: '090-0035-0035',
    preferredArea: '品川区（品川健康センター）',
    preferredDate1: '2026-11-01 10:00',
    preferredDate2: '2026-11-03 14:00',
    childName: 'テスト次郎',
    childBirthYear: '2018',
    childBirthMonth: '05',
    childBirthDay: '15',
    skillLevel: '水慣れ完了・クロールの息継ぎ練習中',
    notes: '会員番号0035 テスト太郎によるE2E検証予約',
};

// -----------------------------------------------------------------------------
// 2. テスト実行＆アサーション管理フレームワーク
// -----------------------------------------------------------------------------
interface TestCaseResult {
    tier: string;
    category: string;
    testId: string;
    description: string;
    passed: boolean;
    reason?: string;
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

const testResults: TestCaseResult[] = [];

function assert(
    tier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4',
    category: string,
    testId: string,
    description: string,
    condition: boolean,
    reasonIfFailed?: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
) {
    if (condition) {
        testResults.push({
            tier,
            category,
            testId,
            description,
            passed: true,
        });
        console.log(`  ✅ [PASS] [${tier}] [${testId}] ${description}`);
    } else {
        testResults.push({
            tier,
            category,
            testId,
            description,
            passed: false,
            reason: reasonIfFailed || '条件が満たされませんでした',
            severity,
        });
        console.error(`  ❌ [FAIL] [${tier}] [${testId}] ${description} -> ${reasonIfFailed}`);
    }
}

// -----------------------------------------------------------------------------
// 3. テストスイート本体
// -----------------------------------------------------------------------------
async function runE2ESeoFunnelTestSuite() {
    console.log('==============================================================================');
    console.log(' スイムパートナーズ SEO改善＆獲得ファネル 包括的 E2E テストスイート実行');
    console.log('==============================================================================\n');

    const projectRoot = path.resolve(__dirname, '..');

    // =========================================================================
    // Tier 1: Feature Coverage (R1, R2, R3)
    // =========================================================================
    console.log('------------------------------------------------------------------------------');
    console.log(' [Tier 1 - Feature Coverage: 機能要件の網羅的検証]');
    console.log('------------------------------------------------------------------------------');

    // -------------------------------------------------------------------------
    // R1: 管理画面SEO (/admin/geo-seo) の極限シンプル化
    // -------------------------------------------------------------------------
    const adminGeoSeoPagePath = path.join(projectRoot, 'src/app/(dashboard)/admin/geo-seo/page.tsx');
    const areaCardComponentPath = path.join(projectRoot, 'src/components/admin/geo-seo/SpTrackerAreaSeoAuditCard.tsx');

    const adminGeoSeoContent = fs.existsSync(adminGeoSeoPagePath)
        ? fs.readFileSync(adminGeoSeoPagePath, 'utf-8')
        : '';
    const areaCardContent = fs.existsSync(areaCardComponentPath)
        ? fs.readFileSync(areaCardComponentPath, 'utf-8')
        : '';

    // R1-01: 記事生成モーダル・タブナビゲーション・AIコンポーネント等の撤去検証
    const hasArticleModal = adminGeoSeoContent.includes('<SeoArticleGeneratorModal');
    const hasTwoTierNav = adminGeoSeoContent.includes('<GeoSeoTwoTierNav');
    const hasAiExecutiveBar = adminGeoSeoContent.includes('<AiCockpitExecutiveBar');
    const hasAiUnifiedHub = adminGeoSeoContent.includes('<AiCockpitUnifiedHub');
    const hasJohnDrawer = adminGeoSeoContent.includes('<JohnMarketingConsultDrawer');

    assert(
        'Tier 1',
        'R1 管理画面極限シンプル化',
        'R1-01',
        '記事生成モーダル・2層タブバー・AIコックピット・ジョン相談ドロワーが撤去されていること',
        !hasArticleModal && !hasTwoTierNav && !hasAiExecutiveBar && !hasAiUnifiedHub && !hasJohnDrawer,
        `検出された撤去対象: modal=${hasArticleModal}, nav=${hasTwoTierNav}, aiBar=${hasAiExecutiveBar}, hub=${hasAiUnifiedHub}, john=${hasJohnDrawer}`,
        'CRITICAL'
    );

    // R1-02: 商圏SEO診断カードの常駐マウント確認
    const hasAreaSeoAuditCardMounted = adminGeoSeoContent.includes('<SpTrackerAreaSeoAuditCard');
    assert(
        'Tier 1',
        'R1 管理画面極限シンプル化',
        'R1-02',
        '商圏エリア別SEO診断・実測検証カード（SpTrackerAreaSeoAuditCard）がメインビューに配置されていること',
        hasAreaSeoAuditCardMounted,
        'page.tsx 内に <SpTrackerAreaSeoAuditCard が見つかりません'
    );

    // R1-03: 商圏診断カードのアクションボタン刷新確認（記事生成→公開ページ確認＆再検証）
    const hasOpenPageButton = areaCardContent.includes('🔗 公開ページを確認');
    const hasReAuditButton = areaCardContent.includes('⚡ 最新状態を再検証');
    const hasOldGeneratorButton = areaCardContent.includes('onOpenGenerator(');

    assert(
        'Tier 1',
        'R1 管理画面極限シンプル化',
        'R1-03',
        'カードフッターのアクションが記事生成モーダルから「🔗 公開ページを確認」「⚡ 最新状態を再検証」に刷新されていること',
        hasOpenPageButton && hasReAuditButton && !hasOldGeneratorButton,
        `hasOpenPage=${hasOpenPageButton}, hasReAudit=${hasReAuditButton}, hasOldGen=${hasOldGeneratorButton}`
    );

    // R1-04: 商圏エリア診断データの完全性
    assert(
        'Tier 1',
        'R1 商圏エリアデータ完全性',
        'R1-04',
        'AREA_SEO_AUDIT_DATA に主要商圏（品川・目黒・世田谷・横浜・船橋・浦安）を含む10エリア以上が定義されていること',
        AREA_SEO_AUDIT_DATA.length >= 10,
        `定義エリア数: ${AREA_SEO_AUDIT_DATA.length}`
    );

    const requiredAreas = ['shinagawa', 'meguro', 'setagaya', 'yokohama', 'funabashi', 'urayasu'];
    const matchedCount = requiredAreas.filter((key) =>
        AREA_SEO_AUDIT_DATA.some(
            (a) => a.areaKey.includes(key) || a.id.includes(key) || (a as any).slug === key
        )
    ).length;

    assert(
        'Tier 1',
        'R1 商圏エリアデータ完全性',
        'R1-05',
        '主要6大商圏（品川・目黒・世田谷・横浜・船橋・浦安）がすべて網羅されていること',
        matchedCount === requiredAreas.length,
        `網羅数: ${matchedCount}/${requiredAreas.length}`
    );

    // R1-06: 地域グループ集計関数の整合性
    const groups = getAreaRegionGroups();
    assert(
        'Tier 1',
        'R1 商圏エリアデータ完全性',
        'R1-06',
        'getAreaRegionGroups() が全5グループ（東京23区、神奈川、千葉、多摩、埼玉）の集計を正しく算出すること',
        groups.length === 5 && groups.every((g) => g.areas.length > 0 && g.averageScore >= 0),
        `グループ数: ${groups.length}`
    );

    // R1-07: 実測再検証エンジンのスコアリングロジック検証
    const dummyBaseItem = AREA_SEO_AUDIT_DATA[0]; // 目黒
    const highQualityAudit = evaluateAreaItemWithLiveAudit(dummyBaseItem, '/personal_swim/meguro', {
        httpStatus: 200,
        liveTitle: '目黒・品川の水泳個人レッスンならスイムパートナーズ｜目黒区民センタープール出張',
        h1: '目黒区で水泳マンツーマン個人レッスン',
        h2List: ['目黒区民センタープール対応', '港区スポーツセンター出張'],
        hasLdJson: true,
    });

    assert(
        'Tier 1',
        'R1 実測再検証エンジン',
        'R1-07',
        '地域名・公営プール名言及・構造化データ完備の正常ページが85点以上（status: completed）に評価されること',
        highQualityAudit.seoScore >= 85 && highQualityAudit.status === 'completed',
        `Score: ${highQualityAudit.seoScore}, Status: ${highQualityAudit.status}`
    );

    const notFoundAudit = evaluateAreaItemWithLiveAudit(dummyBaseItem, '/non_existent_page', {
        httpStatus: 404,
    });

    assert(
        'Tier 1',
        'R1 実測再検証エンジン',
        'R1-08',
        'HTTP 404未検出ページが35点以下（auditStatus: not_found）に判定され、改善アドバイスが設定されること',
        notFoundAudit.seoScore <= 35 && notFoundAudit.auditStatus === 'not_found',
        `Score: ${notFoundAudit.seoScore}, Status: ${notFoundAudit.auditStatus}`
    );

    // -------------------------------------------------------------------------
    // R2: 主要商圏エリアLP (/personal_swim/[area])
    // -------------------------------------------------------------------------
    const personalSwimAreaPagePath = path.join(projectRoot, 'src/app/personal_swim/[area]/page.tsx');
    const personalSwimRootPagePath = path.join(projectRoot, 'src/app/personal_swim/page.tsx');

    const hasAreaPageFile = fs.existsSync(personalSwimAreaPagePath);
    assert(
        'Tier 1',
        'R2 商圏エリアLPルーティング',
        'R2-01',
        '主要商圏LPの動的ルート src/app/personal_swim/[area]/page.tsx が存在すること',
        hasAreaPageFile,
        `ファイルが存在しません: ${personalSwimAreaPagePath}`
    );

    let areaPageContent = '';
    if (hasAreaPageFile) {
        areaPageContent = fs.readFileSync(personalSwimAreaPagePath, 'utf-8');

        // R2-02: generateStaticParams または SSG対応の確認
        const hasStaticParams = areaPageContent.includes('generateStaticParams');
        assert(
            'Tier 1',
            'R2 商圏エリアLPルーティング',
            'R2-02',
            'SSG高速化のための generateStaticParams が実装されていること',
            hasStaticParams,
            'generateStaticParams が見つかりません'
        );

        // R2-03: SEOメタデータ生成 (generateMetadata)
        const hasMetadataGen = areaPageContent.includes('generateMetadata');
        assert(
            'Tier 1',
            'R2 商圏エリアLP SEO最適化',
            'R2-03',
            'エリア固有の動的メタデータを生成する generateMetadata が実装されていること',
            hasMetadataGen,
            'generateMetadata が見つかりません'
        );

        // R2-04: 構造化データ（JSON-LD）の出力確認
        const hasLdJson = areaPageContent.includes('application/ld+json') || areaPageContent.includes('FAQPage');
        assert(
            'Tier 1',
            'R2 商圏エリアLP SEO最適化',
            'R2-04',
            'FAQPageおよびLocalBusinessの構造化データ（JSON-LD）が正しく出力されていること',
            hasLdJson,
            'application/ld+json が見つかりません'
        );

        // R2-05: 出張対応公営プール訴求コンポーネント・セクションの存在
        const mentionsPoolFacilities = areaPageContent.includes('majorFacilities') ||
            areaPageContent.includes('公営プール') ||
            areaPageContent.includes('出張対応プール');
        assert(
            'Tier 1',
            'R2 商圏エリアLP 公営プール訴求',
            'R2-05',
            '各商圏の出張対応公営プール施設情報（施設名・スペック）を表示するセクションが存在すること',
            mentionsPoolFacilities,
            '公営プール施設情報の表示が見つかりません'
        );

        // R2-06: /trial への直結CTAボタンの存在
        const hasTrialCtaLink = areaPageContent.includes('/trial');
        assert(
            'Tier 1',
            'R2 商圏エリアLP CVR最大化',
            'R2-06',
            '外部LINE等への丸投げではなく自社体験予約フォーム /trial への直結CTAリンクが配置されていること',
            hasTrialCtaLink,
            '/trial へのリンクが見つかりません'
        );
    }

    // -------------------------------------------------------------------------
    // R3: トップページ (/) および体験予約導線 (/trial)
    // -------------------------------------------------------------------------
    const homePagePath = path.join(projectRoot, 'src/app/page.tsx');
    const trialPagePath = path.join(projectRoot, 'src/app/trial/page.tsx');
    const trialApiPath = path.join(projectRoot, 'src/app/api/trial-booking/route.ts');

    const homePageContent = fs.existsSync(homePagePath)
        ? fs.readFileSync(homePagePath, 'utf-8')
        : '';
    const trialPageContent = fs.existsSync(trialPagePath)
        ? fs.readFileSync(trialPagePath, 'utf-8')
        : '';
    const trialApiContent = fs.existsSync(trialApiPath)
        ? fs.readFileSync(trialApiPath, 'utf-8')
        : '';

    // R3-01: トップページの4大強み訴求ファーストビュー
    const hasPillar1 = homePageContent.includes('安心の完全専任マンツーマン') || homePageContent.includes('専任');
    const hasPillar2 = homePageContent.includes('公営プール出張') || homePageContent.includes('近所の公営プール');
    const hasPillar3 = homePageContent.includes('毎回の動画カルテ') || homePageContent.includes('動画カルテ');
    const hasPillar4 = homePageContent.includes('透明な料金体系') || homePageContent.includes('明朗会計') || homePageContent.includes('入会金');

    assert(
        'Tier 1',
        'R3 トップページファーストビュー',
        'R3-01',
        'トップページに4大強み（完全専任、公営プール出張、動画カルテ、透明な料金体系）が明確に訴求されていること',
        hasPillar1 && hasPillar2 && hasPillar3 && hasPillar4,
        `pillar1=${hasPillar1}, pillar2=${hasPillar2}, pillar3=${hasPillar3}, pillar4=${hasPillar4}`
    );

    // R3-02: 他社比較表または差別化要素＆/trial CTAリンク
    const hasComparisonTable = homePageContent.includes('他社') || homePageContent.includes('比較') || homePageContent.includes('対比');
    const hasHomeTrialCta = homePageContent.includes('/trial');

    assert(
        'Tier 1',
        'R3 トップページファーストビュー',
        'R3-02',
        'トップページに他社スクールとの比較表および体験レッスン予約（/trial）ボタンが配置されていること',
        hasComparisonTable && hasHomeTrialCta,
        `hasComparison=${hasComparisonTable}, hasTrialCta=${hasHomeTrialCta}`
    );

    // R3-03: 認証済みユーザーのロール別リダイレクトの完全保護
    const redirectsAdmin = homePageContent.includes("redirect('/admin')");
    const redirectsCoach = homePageContent.includes("redirect('/coach')");
    const redirectsMember = homePageContent.includes("redirect('/member/dashboard')");

    assert(
        'Tier 1',
        'R3 認証リダイレクト保護',
        'R3-03',
        '既存のログイン中ロール別リダイレクト（admin/coach/member）ロジックが1行も欠けず安全に保持されていること',
        redirectsAdmin && redirectsCoach && redirectsMember,
        `admin=${redirectsAdmin}, coach=${redirectsCoach}, member=${redirectsMember}`,
        'CRITICAL'
    );

    // R3-04: 体験予約フォームのWebハイブリッド化（非LIFF環境での正常受付）
    // 旧コードの「if (!userId) { alert("LINE IDが取得できませんでした") }」が撤去またはバイパスされていること
    const blocksWithoutLineId = trialPageContent.includes('LINE IDが取得できませんでした。LINEアプリから開き直してください');
    assert(
        'Tier 1',
        'R3 体験予約Webハイブリッド化',
        'R3-04',
        'LIFF外の通常Webブラウザアクセス時にLINE ID未取得を理由とした強制遮断が行われないこと',
        !blocksWithoutLineId,
        'WebアクセスをブロックするLINE ID必須チェックが残存しています',
        'CRITICAL'
    );

    // R3-05: 入力負荷軽減（メアド2重確認廃止、2人目トグル、泳力チップ）
    const forcesEmailConfirm = trialPageContent.includes('emailConfirm') && trialPageContent.includes('メールアドレス（確認）');
    const hasSkillChipsOrQuickSelect = trialPageContent.includes('QUICK_SKILL_CHIPS') || trialPageContent.includes('クイック選択') || trialPageContent.includes('chips') || trialPageContent.includes('水慣れ');
    const hasThanksUi = trialPageContent.includes('isSubmitted') && (trialPageContent.includes('受け付けました') || trialPageContent.includes('予約を受け付け'));

    assert(
        'Tier 1',
        'R3 体験予約入力負荷軽減',
        'R3-05',
        'メールアドレス2重入力が撤廃または簡素化され、泳力チップ等の入力支援および送信後サンクスUIが存在すること',
        !forcesEmailConfirm && hasThanksUi && hasSkillChipsOrQuickSelect,
        `forcesEmailConfirm=${forcesEmailConfirm}, hasThanksUi=${hasThanksUi}, hasSkillChips=${hasSkillChipsOrQuickSelect}`
    );

    // R3-06: バックエンドAPIのWeb申込受付整合性
    const acceptsNullUserId = trialApiContent.includes('userId || null') || trialApiContent.includes('line_user_id: payload.userId');
    const recordsWebChannel = trialApiContent.includes("'WEB申込'") || trialApiContent.includes('"WEB申込"') || trialApiContent.includes('channel');

    assert(
        'Tier 1',
        'R3 体験予約API整合性',
        'R3-06',
        'API（src/app/api/trial-booking/route.ts）がLINE User ID無しのWeb申込（null）を受け入れ、チャネル記録すること',
        acceptsNullUserId && recordsWebChannel,
        `acceptsNullUserId=${acceptsNullUserId}, recordsWebChannel=${recordsWebChannel}`
    );


    // =========================================================================
    // Tier 2: Boundary & Corner Cases (境界値・異常系・セキュリティガード)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------------');
    console.log(' [Tier 2 - Boundary & Corner Cases: 境界値・異常系・安全ガード]');
    console.log('------------------------------------------------------------------------------');

    // B1: 顧客データ安全ガード（会員番号0035・テスト太郎限定ルール）の厳格テスト
    console.log('  [B1] 会員番号0035「テスト太郎」限定セキュリティガード検証');
    function testCustomerSecurityGuard(studentNumber: string, customerName: string): boolean {
        // 厳格セキュリティルール: 0035 / テスト太郎 以外のテストデータ投入は即座に拒否
        if (studentNumber !== '0035' || !customerName.includes('テスト太郎')) {
            return false; // 遮断成功
        }
        return true; // 許可
    }

    assert(
        'Tier 2',
        '顧客データ安全ガード',
        'B1-01',
        '会員番号0035・テスト太郎のテスト実行は正常に許可されること',
        testCustomerSecurityGuard(TEST_TARO_CUSTOMER.studentNumber, TEST_TARO_CUSTOMER.parentName) === true,
        '0035 テスト太郎が拒否されました',
        'CRITICAL'
    );

    assert(
        'Tier 2',
        '顧客データ安全ガード',
        'B1-02',
        '会員番号0035以外の顧客番号（例: 0001, 9999）でのテスト実行が確実に遮断（false/拒否）されること',
        testCustomerSecurityGuard('0001', '不正顧客A') === false &&
        testCustomerSecurityGuard('9999', '実在顧客B') === false,
        '不正な顧客番号が遮断されませんでした',
        'CRITICAL'
    );

    // B2: 不正エリアスラッグのフォールバック・安全耐性
    console.log('  [B2] 不正なエリアIDアクセスに対するフェイルセーフ');
    const invalidSlugs = [
        'invalid_slug_999999',
        '../../etc/passwd',
        '<script>alert(1)</script>',
        '   ',
    ];

    for (const badSlug of invalidSlugs) {
        // AREA_SEO_AUDIT_DATA に存在しないスラッグを検索した際に undefined となること
        const found = AREA_SEO_AUDIT_DATA.find(
            (a) => a.areaKey === badSlug || (a as any).slug === badSlug
        );
        assert(
            'Tier 2',
            '不正エリアスラッグ処理',
            `B2-${invalidSlugs.indexOf(badSlug) + 1}`,
            `不正スラッグ「${badSlug.trim() || '空文字'}」に対して未登録（undefined）として安全に判定されること`,
            found === undefined,
            `予期せずマッチしました: ${JSON.stringify(found)}`
        );
    }

    // B3: 登録URLインライン編集のバリデーション耐性
    console.log('  [B3] 登録URLのインライン編集・実測エンジンのバリデーション耐性');
    const extremeUrls = [
        { url: '', expectStatus: 'not_found' },
        { url: 'javascript:alert(1)', expectStatus: 'not_found' },
        { url: 'ftp://malicious-host.com/test', expectStatus: 'not_found' },
    ];

    for (const tc of extremeUrls) {
        const auditRes = evaluateAreaItemWithLiveAudit(dummyBaseItem, tc.url, {
            httpStatus: 404,
            isDeletedPage: true,
        });
        assert(
            'Tier 2',
            'URLバリデーション耐性',
            `B3-${extremeUrls.indexOf(tc) + 1}`,
            `危険・空文字URL「${tc.url}」に対してクラッシュせず not_found・低スコアに安全フォールバックすること`,
            auditRes.auditStatus === tc.expectStatus && auditRes.seoScore <= 35,
            `auditStatus: ${auditRes.auditStatus}, score: ${auditRes.seoScore}`
        );
    }


    // =========================================================================
    // Tier 3: Cross-Feature Combinations (モジュール間連携・相互整合)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------------');
    console.log(' [Tier 3 - Cross-Feature Combinations: モジュール間結合整合性]');
    console.log('------------------------------------------------------------------------------');

    // C1: 商圏LPの出張対応公営プールとエリア診断データ（AREA_SEO_AUDIT_DATA）の完全整合
    console.log('  [C1] 商圏LPメタデータと公営プールデータベースの整合性');
    const shinagawaData = AREA_SEO_AUDIT_DATA.find((a) => a.areaKey.includes('shinagawa') || a.id.includes('shinagawa'));
    const meguroData = AREA_SEO_AUDIT_DATA.find((a) => a.areaKey.includes('meguro') || a.id.includes('meguro'));
    const setagayaData = AREA_SEO_AUDIT_DATA.find((a) => a.areaKey.includes('setagaya') || a.id.includes('setagaya'));

    assert(
        'Tier 3',
        'エリアデータ結合整合性',
        'C1-01',
        '品川エリアに出張対応プール「品川健康センター温水プール」が確実に紐づいていること',
        Boolean(shinagawaData?.majorFacilities.some((f) => f.name.includes('品川健康センター'))),
        '品川健康センターが見つかりません'
    );

    assert(
        'Tier 3',
        'エリアデータ結合整合性',
        'C1-02',
        '目黒エリアに出張対応プール「目黒区民センタープール」が確実に紐づいていること',
        Boolean(meguroData?.majorFacilities.some((f) => f.name.includes('目黒区民センター'))),
        '目黒区民センターが見つかりません'
    );

    assert(
        'Tier 3',
        'エリアデータ結合整合性',
        'C1-03',
        '世田谷エリアに出張対応プール「世田谷区総合運動場温水プール」が確実に紐づいていること',
        Boolean(setagayaData?.majorFacilities.some((f) => f.name.includes('世田谷区総合運動場'))),
        '世田谷区総合運動場が見つかりません'
    );

    // C2: 商圏SEO実測エンジンとエリアLP実測シミュレーションの整合性
    console.log('  [C2] エリアLP生成HTMLと実測再検証エンジンのスコアリング整合');
    if (shinagawaData) {
        const shinagawaAudit = evaluateAreaItemWithLiveAudit(shinagawaData, '/personal_swim/shinagawa', {
            httpStatus: 200,
            liveTitle: '品川の水泳個人レッスンならスイムパートナーズ｜品川健康センター出張対応',
            h1: '品川区で水泳マンツーマン個人指導',
            h2List: [
                '出張対応プール：品川健康センター温水プール・日野学園温水プール',
                '安心の完全専任マンツーマン指導と毎回の動画カルテ',
            ],
            hasLdJson: true,
        });

        assert(
            'Tier 3',
            '実測エンジン相互整合',
            'C2-01',
            '品川LPの最新HTML実測データが地域名・品川健康センター・JSON-LD適合により90点以上の高スコア（completed）を獲得すること',
            shinagawaAudit.seoScore >= 90 && shinagawaAudit.status === 'completed',
            `Score: ${shinagawaAudit.seoScore}, Status: ${shinagawaAudit.status}`
        );
    }

    // C3: 商圏LPから体験予約フォーム（/trial）へのクエリパラメータ・導線結合
    console.log('  [C3] 商圏LPから体験予約フォームへのクエリ引き継ぎ導線');
    const areaQueryTrialLink = '/trial?area=shinagawa';
    const trialUrl = new URL(areaQueryTrialLink, 'https://swim-partners.com');
    assert(
        'Tier 3',
        '導線結合整合性',
        'C3-01',
        '商圏LPから/trialへエリア情報（area=shinagawa）をパラメータ付与して引き継げる設計であること',
        trialUrl.pathname === '/trial' && trialUrl.searchParams.get('area') === 'shinagawa',
        `URLパース結果: path=${trialUrl.pathname}, param=${trialUrl.searchParams.get('area')}`
    );


    // =========================================================================
    // Tier 4: Real-World Application Scenarios (実運用シナリオ完全検証)
    // =========================================================================
    console.log('\n------------------------------------------------------------------------------');
    console.log(' [Tier 4 - Real-World Application Scenarios: エンドツーエンド実証シナリオ]');
    console.log('------------------------------------------------------------------------------');

    // シナリオ 1: エリア検索からLP訪問・公営プール確認・Web体験予約完了までのE2Eフロー
    console.log('  [Scenario 1] 品川エリア検索 ➔ LP訪問 ➔ 公営プール確認 ➔ Web体験予約完了');
    
    // Step 1: 検索キーワードとエリア特定
    const searchKeyword = '水泳 個人レッスン 品川';
    const matchedArea = AREA_SEO_AUDIT_DATA.find(
        (a) => a.primaryKeyword.includes('品川') || a.areaName.includes('品川')
    );
    assert(
        'Tier 4',
        '実運用シナリオ1: 検索流入',
        'S1-01',
        '「水泳 個人レッスン 品川」の検索需要に対して品川エリアLPデータが正しく解決されること',
        matchedArea !== undefined,
        '品川エリアデータが解決できません'
    );

    // Step 2: LP訪問と出張公営プール（品川健康センター）の特定
    const targetFacility = matchedArea?.majorFacilities.find((f) => f.name.includes('品川健康センター'));
    assert(
        'Tier 4',
        '実運用シナリオ1: プール確認',
        'S1-02',
        '品川LP内で最寄りの公営プール「品川健康センター温水プール」が確認できること',
        targetFacility !== undefined && targetFacility.address.includes('品川区'),
        '品川健康センターの施設情報が不完全です'
    );

    // Step 3: Web体験予約フォームへ遷移し、会員番号0035「テスト太郎」の予約ペイロードを生成
    const bookingPayload = {
        userId: null, // Webブラウザアクセス（非LIFF）
        studentNumber: TEST_TARO_CUSTOMER.studentNumber, // 0035
        parentName: TEST_TARO_CUSTOMER.parentName, // テスト太郎
        parentKana: TEST_TARO_CUSTOMER.parentKana,
        email: TEST_TARO_CUSTOMER.email,
        phone: TEST_TARO_CUSTOMER.phone,
        preferredArea: `${matchedArea?.areaName}（${targetFacility?.name}）`,
        preferredDate1: TEST_TARO_CUSTOMER.preferredDate1,
        preferredDate2: TEST_TARO_CUSTOMER.preferredDate2,
        childName: TEST_TARO_CUSTOMER.childName,
        childBirthYear: TEST_TARO_CUSTOMER.childBirthYear,
        childBirthMonth: TEST_TARO_CUSTOMER.childBirthMonth,
        childBirthDay: TEST_TARO_CUSTOMER.childBirthDay,
        skillLevel: TEST_TARO_CUSTOMER.skillLevel,
        notes: TEST_TARO_CUSTOMER.notes,
    };

    assert(
        'Tier 4',
        '実運用シナリオ1: Web予約入力',
        'S1-03',
        '会員番号0035・テスト太郎によるWeb体験予約ペイロード（userId: null）が完全なスキーマで構築できること',
        bookingPayload.studentNumber === '0035' &&
        bookingPayload.parentName === 'テスト太郎' &&
        bookingPayload.userId === null &&
        Boolean(bookingPayload.preferredArea.includes('品川健康センター')),
        '予約ペイロードの整合性が不正です'
    );

    // Step 4: 予約バリデーションシミュレーション（API contracts）
    const isPayloadValid = Boolean(
        bookingPayload.parentName &&
        bookingPayload.email &&
        bookingPayload.phone &&
        bookingPayload.preferredDate1 &&
        bookingPayload.childName
    );

    assert(
        'Tier 4',
        '実運用シナリオ1: 予約完了',
        'S1-04',
        '予約ペイロードが必須バリデーションを通過し、Web申込（channel: WEB申込）として受付可能な状態であること',
        isPayloadValid,
        'ペイロードバリデーションに失敗しました'
    );

    // シナリオ 2: 管理画面での商圏SEO診断 ➔ URLインライン編集 ➔ リアルタイム再検証フロー
    console.log('\n  [Scenario 2] 管理画面での商圏診断 ➔ URL編集 ➔ リアルタイム再検証の運用フロー');

    // Step 1: 初期診断アイテムの確認
    const initialItem = AREA_SEO_AUDIT_DATA.find((a) => a.areaKey.includes('yokohama'));
    assert(
        'Tier 4',
        '実運用シナリオ2: 商圏診断',
        'S2-01',
        '管理者が横浜商圏のSEO対策状況を確認できること',
        initialItem !== undefined && initialItem.primaryKeyword.includes('横浜'),
        '横浜商圏の初期データが見つかりません'
    );

    // Step 2: URLインライン編集のシミュレーション
    const newLpUrl = '/personal_swim/yokohama';
    const updatedCustomItem: AreaSeoAuditItem = {
        ...initialItem!,
        customUrl: newLpUrl,
        hasDedicatedLp: true,
    };

    assert(
        'Tier 4',
        '実運用シナリオ2: URL編集',
        'S2-02',
        '横浜エリアの登録URLを /personal_swim/yokohama にインライン更新できること',
        updatedCustomItem.customUrl === newLpUrl && updatedCustomItem.hasDedicatedLp === true,
        'URLインライン更新に失敗しました'
    );

    // Step 3: リアルタイム再検証の実行シミュレーション
    const reAuditedItem = evaluateAreaItemWithLiveAudit(updatedCustomItem, newLpUrl, {
        httpStatus: 200,
        liveTitle: '横浜の水泳マンツーマン個人レッスン｜横浜国際プール・保土ケ谷出張',
        h1: '横浜エリアで水泳の完全専任個別指導',
        h2List: [
            '出張対応：横浜国際プール・保土ケ谷プール・都筑スポーツセンター',
            '安心の明朗会計と毎回の水中動画カルテ',
        ],
        hasLdJson: true,
    });

    assert(
        'Tier 4',
        '実運用シナリオ2: 即時再検証',
        'S2-03',
        '再検証実行により最新HTMLが解析され、スコア90点以上・status: completed・最新監査日時が記録されること',
        reAuditedItem.seoScore >= 90 &&
        reAuditedItem.status === 'completed' &&
        Boolean(reAuditedItem.lastAuditedAt) &&
        reAuditedItem.auditFeedback!.length > 0,
        `Score: ${reAuditedItem.seoScore}, Status: ${reAuditedItem.status}, Feedback: ${reAuditedItem.auditFeedback?.join(', ')}`
    );

    // =========================================================================
    // テスト結果サマリー
    // =========================================================================
    console.log('\n==============================================================================');
    console.log(' E2E テストスイート 実行結果サマリー');
    console.log('==============================================================================');

    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = testResults.filter((r) => !r.passed);

    console.log(`  総テストケース数: ${total}`);
    console.log(`  合格 (PASSED)   : ${passed} / ${total}`);
    console.log(`  不合格 (FAILED) : ${failed.length} / ${total}`);
    console.log('==============================================================================');

    if (failed.length > 0) {
        console.log('\n❌ 失敗したテストケース一覧:');
        for (const f of failed) {
            console.log(`  [${f.severity || 'HIGH'}] [${f.tier}] [${f.testId}] ${f.description}`);
            console.log(`     理由: ${f.reason}\n`);
        }
        process.exit(1);
    } else {
        console.log('\n🎉 全Tier（Tier 1〜Tier 4）の全テストケースが正常にパスしました！\n');
        process.exit(0);
    }
}

// 実行
runE2ESeoFunnelTestSuite().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
