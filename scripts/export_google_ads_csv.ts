/**
 * Google広告の最新実績を分析用CSVとして出力するスクリプト
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fetchGA4GoogleAdsAnalytics } from '../src/lib/google-analytics';

async function exportGoogleAdsCsv() {
    console.log('🔄 Google広告の最新実績データを取得中...');
    const ads = await fetchGA4GoogleAdsAnalytics();

    if (!ads || !ads.keywords || ads.keywords.length === 0) {
        console.error('❌ Google広告データの取得に失敗したか、キーワードデータがありません。');
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const outputDir = path.join(process.cwd(), 'docs', 'analytics_sheet_templates');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, 'google_ads_actual_performance.csv');

    // ヘッダー
    const headers = [
        '集計日',
        '流入チャネル',
        '施策_キーワード_キャンペーン',
        '広告費用(円)',
        '表示回数(Imp)',
        'クリック数(Clicks)',
        'CTR(%)',
        'CPC(円)',
        '問い合わせ数(CV)',
        'CPA(円)',
        'CVR(%)',
        '運用評価_AIアクション'
    ];

    const rows: string[] = [headers.join(',')];

    // 1. キャンペーン行
    for (const camp of ads.campaigns) {
        const action = camp.cpa > 8000 ? '要改善（CPA高騰）' : '良好（継続配信）';
        rows.push([
            todayStr,
            'Googleリスティング広告',
            `[キャンペーン] ${camp.campaignName}`,
            camp.adCost.toString(),
            camp.adImpressions.toString(),
            camp.adClicks.toString(),
            camp.ctr.toString(),
            camp.cpc.toString(),
            camp.conversions.toString(),
            camp.cpa.toString(),
            camp.cvr.toString(),
            action
        ].join(','));
    }

    // 2. キーワード行
    for (const kw of ads.keywords) {
        let action = '配信中';
        if (kw.cpa > 0 && kw.cpa <= 3000) {
            action = '⭐ 超優秀（予算増額推奨・成約率高）';
        } else if (kw.conversions === 0 && kw.adCost >= 4000) {
            action = '⚠️ 改善対象（CVなし費用高・除外検討）';
        } else if (kw.conversions > 0) {
            action = '良好（安定獲得中）';
        }

        rows.push([
            todayStr,
            'Googleリスティング広告',
            `[KW] ${kw.keyword}`,
            kw.adCost.toString(),
            '-',
            kw.adClicks.toString(),
            '-',
            kw.cpc.toString(),
            kw.conversions.toString(),
            kw.cpa.toString(),
            kw.cvr.toString(),
            action
        ].join(','));
    }

    fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
    console.log(`✅ Google広告の実績CSVを出力しました: ${filePath}`);
    console.log(`📊 総費用: ${ads.totalCost.toLocaleString()}円, 総クリック: ${ads.totalClicks}回, 平均CPC: ${ads.averageCpc}円`);
}

exportGoogleAdsCsv();
