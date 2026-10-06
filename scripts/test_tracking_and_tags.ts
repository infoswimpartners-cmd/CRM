/**
 * LINE / LIFF アクセストラッキング＆タグ管理 検証スクリプト
 * 
 * 厳格ルール:
 *   テスト顧客は「会員番号0035、テスト太郎」のみ使用
 * 
 * 実行方法:
 *   npx tsx scripts/test_tracking_and_tags.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
    recordAccessLog,
    markConversionForUser,
    addTagToUser,
    removeTagFromUser,
    getUserTags,
    getTagsSummary,
    getTrackingKpiSummary,
    STANDARD_TAGS
} from '../src/lib/line-tracking-service';
import { fetchAndFilterMarketingStudents } from '../src/lib/line-marketing-service';

const TEST_STUDENT_NUMBER = '0035';
const TEST_LINE_USER_ID = 'U0e5a7654874369ca5e38deb47fd783aa';
const TEST_STUDENT_NAME = 'テスト太郎';
const TEST_STUDENT_ID = 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff';

async function runTest() {
    console.log('================================================================');
    console.log('🧪 LINE/LIFF アクセストラッキング＆タグ管理 検証開始');
    console.log(`👤 対象テスト顧客: ${TEST_STUDENT_NAME}（会員番号: ${TEST_STUDENT_NUMBER}, LINE: ${TEST_LINE_USER_ID}）`);
    console.log('================================================================\n');

    // 0. 初期化・既存タグの整理
    await removeTagFromUser(TEST_LINE_USER_ID, STANDARD_TAGS.FORM_VIEWED);
    await removeTagFromUser(TEST_LINE_USER_ID, STANDARD_TAGS.FORM_APPLIED);
    await removeTagFromUser(TEST_LINE_USER_ID, STANDARD_TAGS.REFERRAL);

    // 1. LIFFアクセス（体験予約フォーム閲覧）のシミュレーション
    console.log('--- 1. LIFFアクセスログの記録と自動タグ付与の検証 ---');
    const accessLog = await recordAccessLog({
        lineUserId: TEST_LINE_USER_ID,
        displayName: TEST_STUDENT_NAME,
        formType: 'trial',
        referrerName: '山田花子',
        pageUrl: 'https://manager.swim-partners.com/trial?ref=山田花子&utm_source=line_menu',
        utmSource: 'line_menu',
        utmMedium: 'richmenu',
        utmCampaign: 'trial_spring'
    });

    console.log('✅ アクセスログ記録成功:', {
        id: accessLog.id,
        formType: accessLog.form_type,
        referrer: accessLog.referrer_name,
        isConverted: accessLog.is_converted
    });

    // 閲覧タグが付与されたか確認
    const tagsAfterView = await getUserTags(TEST_LINE_USER_ID);
    console.log('✅ フォーム閲覧後の保有タグ:', tagsAfterView);
    if (!tagsAfterView.includes(STANDARD_TAGS.FORM_VIEWED)) {
        throw new Error('❌ trial_form_viewed タグが付与されていません！');
    }
    if (!tagsAfterView.includes(STANDARD_TAGS.REFERRAL)) {
        throw new Error('❌ referral_lead タグが付与されていません！');
    }
    console.log('🎉 閲覧タグ＆紹介タグの自動付与が正常に動作！\n');

    // 2. セグメント抽出テスト（この時点では「フォーム閲覧・未申込者（離脱者）」）
    console.log('--- 2. セグメント抽出（フォーム閲覧・未申込 離脱者）の検証 ---');
    const abandonedStudents = await fetchAndFilterMarketingStudents({
        viewedFormNotApplied: true,
        lineLinkedOnly: true
    });
    const foundTaro = abandonedStudents.find(s => s.studentNumber === TEST_STUDENT_NUMBER);
    console.log(`📊 離脱者セグメント抽出人数: ${abandonedStudents.length} 名`);
    if (!foundTaro) {
        throw new Error('❌ テスト太郎が「フォーム閲覧・未申込」セグメントに抽出されませんでした！');
    }
    console.log(`✅ テスト太郎が「未申込・離脱フォロー対象」として正しく抽出されました！（タグ: ${foundTaro.tags?.join(', ')}）\n`);

    // 3. コンバージョン（体験申込完了）シミュレーション
    console.log('--- 3. 体験申込完了（CV）と申込タグ付与の検証 ---');
    const convResult = await markConversionForUser(TEST_LINE_USER_ID, TEST_STUDENT_ID, '山田花子');
    if (!convResult) throw new Error('❌ markConversionForUser が失敗しました');

    const tagsAfterApply = await getUserTags(TEST_LINE_USER_ID);
    console.log('✅ 申込完了後の保有タグ:', tagsAfterApply);
    if (!tagsAfterApply.includes(STANDARD_TAGS.FORM_APPLIED)) {
        throw new Error('❌ trial_applied タグが付与されていません！');
    }
    console.log('🎉 体験申込完了タグ（trial_applied）の付与が正常に動作！\n');

    // 4. 再度離脱者フィルターを実行（申込完了後は離脱者から除外されるべき）
    console.log('--- 4. 申込完了後の離脱者フィルター自動除外検証 ---');
    const abandonedAfterApply = await fetchAndFilterMarketingStudents({
        viewedFormNotApplied: true,
        lineLinkedOnly: true
    });
    const stillFound = abandonedAfterApply.find(s => s.studentNumber === TEST_STUDENT_NUMBER);
    if (stillFound) {
        throw new Error('❌ 申込完了後なのにテスト太郎が離脱者セグメントに残っています！');
    }
    console.log('✅ 申込完了に伴い、離脱フォロー対象から自動的に安全除外されました！\n');

    // 5. アクセス分析 KPI 集計の検証
    console.log('--- 5. アクセス分析 KPI 集計の検証 ---');
    const kpiSummary = await getTrackingKpiSummary(10);
    console.log('📊 トラッキングKPI集計結果:', {
        totalViews: kpiSummary.totalViews,
        uniqueUsers: kpiSummary.uniqueUsers,
        totalConverted: kpiSummary.totalConverted,
        conversionRate: `${kpiSummary.conversionRate}%`,
        recentLogsCount: kpiSummary.recentLogs.length
    });
    if (kpiSummary.totalViews === 0 || kpiSummary.uniqueUsers === 0) {
        throw new Error('❌ アクセス集計が0件です');
    }
    console.log('🎉 アクセス分析KPI（PV/UU/CV/CVR）の集計が正常に動作！\n');

    // 6. タグ集計一覧の検証
    console.log('--- 6. タグ集計一覧の検証 ---');
    const tagsSummary = await getTagsSummary();
    console.log('🏷️ タグ一覧とユーザー数:');
    tagsSummary.forEach(t => {
        console.log(`   ・${t.tagLabel} (${t.tagName}): ${t.userCount}人 - ${t.description}`);
    });

    console.log('\n================================================================');
    console.log('🎉 LINE/LIFF アクセストラッキング＆タグ管理 全検証項目に合格しました！');
    console.log('================================================================');
}

runTest().catch(e => {
    console.error('❌ 検証失敗:', e);
    process.exit(1);
});
