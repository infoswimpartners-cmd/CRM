import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { fetchGA4GoogleAdsAnalytics } from '../src/lib/google-analytics';

async function testAds() {
    console.log('Testing Google Ads performance via GA4 API...');
    const ads = await fetchGA4GoogleAdsAnalytics();
    if (ads) {
        console.log('✅ Google Ads data fetched successfully:');
        console.log('Linked status:', ads.linked);
        console.log('Total Cost:', ads.totalCost, '円');
        console.log('Total Clicks:', ads.totalClicks);
        console.log('Total Impressions:', ads.totalImpressions);
        console.log('Average CPC:', ads.averageCpc, '円');
        console.log('Campaigns count:', ads.campaigns.length);
        console.log('Campaigns sample:', ads.campaigns);
        console.log('Keywords sample:', ads.keywords.slice(0, 5));
    } else {
        console.log('❌ fetchGA4GoogleAdsAnalytics returned null');
    }
}

testAds();
