import { generateArticleThumbnail } from '../src/lib/thumbnail-generator-service';
import { getSpreadsheetConfigStatus } from '../src/lib/article-spreadsheet-service';

async function main() {
    console.log('🧪 サムネイル画像生成テスト...');
    const thumb = await generateArticleThumbnail({
        title: '【完全攻略】水泳の息継ぎで沈まない生体力学と最短上達法',
        keyword: '水泳 息継ぎ 沈む',
        category: 'adult',
        slug: 'swimming-breathing-sinking-solution',
    });
    console.log('✅ 生成されたサムネイル画像:', thumb);

    console.log('\n🧪 スプレッドシート連携設定テスト...');
    const config = await getSpreadsheetConfigStatus();
    console.log('✅ スプレッドシート設定状況:', config);
}

main().catch(console.error);
