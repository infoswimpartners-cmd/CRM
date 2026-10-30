/**
 * 記事向けサムネイル画像・アイキャッチ自動生成サービス
 * 記事タイトル・キーワード・カテゴリに応じた高品質な水泳サムネイル画像URLを生成します。
 */

import { createAdminClient } from './supabase/admin';

export interface ThumbnailGenerationOptions {
    title: string;
    keyword: string;
    category?: string;
    slug?: string;
}

/**
 * 水泳カテゴリ・テーマ別の高品質アイキャッチ画像ストックプール
 * (Unsplash クレジット付き・商用利用可能な公式高解像度スイミングフォト)
 */
const SWIMMING_THUMBNAIL_PRESETS: { [category: string]: string[] } = {
    adult: [
        'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&h=630&q=80', // クロールで力強く泳ぐ大人
        'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=1200&h=630&q=80', // 屋内プールのレーンと水面
        'https://images.unsplash.com/photo-1560090995-01632a28895b?auto=format&fit=crop&w=1200&h=630&q=80', // 水泳ゴーグルと水中の光
    ],
    junior: [
        'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?auto=format&fit=crop&w=1200&h=630&q=80', // ジュニアスイマーとコーチ
        'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&h=630&q=80', // プールで笑顔の子ども
        'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&w=1200&h=630&q=80', // 水しぶきと水泳レッスン
    ],
    phobia: [
        'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?auto=format&fit=crop&w=1200&h=630&q=80', // 穏やかな浅いプールの水面
        'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=1200&h=630&q=80', // 優しい日差しの温水プール
    ],
    pricing: [
        'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=1200&h=630&q=80', // 美しい公営温水プール施設
        'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=1200&h=630&q=80', // スタート台と青いプール
    ],
    area: [
        'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=1200&h=630&q=80', // 公営スポーツセンター温水プール
        'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=1200&h=630&q=80', // 綺麗な50m/25mレーン
    ],
    default: [
        'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&h=630&q=80', // スイムパートナーズ標準水泳フォト
    ],
};

/**
 * 記事のキーワードやタイトルに基づいて最適なサムネイル画像を生成または選定
 */
export async function generateArticleThumbnail(options: ThumbnailGenerationOptions): Promise<{
    thumbnailUrl: string;
    source: 'imagen' | 'preset';
    prompt?: string;
}> {
    const { title, keyword, category } = options;

    // 1. Gemini Imagen 3 APIによる画像生成を試行（APIキーが有効な場合）
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim()) {
        try {
            const prompt = `A professional, clean, photorealistic high-resolution photography for a swimming lesson article titled "${title}". Feature: beautiful indoor public swimming pool with clear turquoise blue water, a Japanese professional swimming coach instructing a student in private one-on-one lesson, bright modern indoor facility, inspiring athletic atmosphere, 16:9 aspect ratio, 4k resolution, cinematic lighting, editorial quality. No text, no letters.`;

            // Google Imagen 3 API エンドポイント
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey.trim()}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 最大12秒

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    instances: [{ prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: '16:9',
                        outputOptions: { mimeType: 'image/jpeg' },
                    },
                }),
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const base64Bytes = data.predictions?.[0]?.bytesBase64Encoded;
                if (base64Bytes) {
                    // Supabase Storageへアップロードして永続URLを発行
                    const uploadedUrl = await uploadThumbnailToSupabase(base64Bytes, options.slug || `art_${Date.now()}`);
                    if (uploadedUrl) {
                        return {
                            thumbnailUrl: uploadedUrl,
                            source: 'imagen',
                            prompt,
                        };
                    }
                }
            }
        } catch (err) {
            console.warn('[Thumbnail Generator] Imagen 3 generation skipped, using high-res swimming preset:', err);
        }
    }

    // 2. 高解像度水泳プリセットの選定（カテゴリやキーワードに応じて厳選）
    const catKey = (category && SWIMMING_THUMBNAIL_PRESETS[category]) ? category : detectCategoryFromKeyword(keyword);
    const presets = SWIMMING_THUMBNAIL_PRESETS[catKey] || SWIMMING_THUMBNAIL_PRESETS.default;
    
    // キーワードの文字列ハッシュから一意のプリセット画像を選択（同じキーワードなら常に同じ画像）
    const hash = keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedUrl = presets[hash % presets.length];

    return {
        thumbnailUrl: selectedUrl,
        source: 'preset',
    };
}

/**
 * キーワードからカテゴリを自動判定
 */
function detectCategoryFromKeyword(keyword: string): string {
    const kw = keyword.toLowerCase();
    if (kw.includes('大人') || kw.includes('息継ぎ') || kw.includes('沈む') || kw.includes('クロール') || kw.includes('マスターズ')) {
        return 'adult';
    }
    if (kw.includes('子') || kw.includes('進級') || kw.includes('小学生') || kw.includes('ジュニア')) {
        return 'junior';
    }
    if (kw.includes('恐怖') || kw.includes('怖い') || kw.includes('カナヅチ') || kw.includes('顔つけ')) {
        return 'phobia';
    }
    if (kw.includes('費用') || kw.includes('料金') || kw.includes('相場') || kw.includes('違い')) {
        return 'pricing';
    }
    return 'adult';
}

/**
 * Base64画像をSupabase Storageへ保存して公開URLを発行
 */
async function uploadThumbnailToSupabase(base64Data: string, filePrefix: string): Promise<string | null> {
    try {
        const supabase = createAdminClient();
        if (!supabase) return null;

        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `thumbnails/${filePrefix}_${Date.now()}.jpg`;

        // バケット存在確認および作成
        const bucketName = 'article-thumbnails';
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket = buckets?.some(b => b.name === bucketName);

        if (!hasBucket) {
            await supabase.storage.createBucket(bucketName, { public: true });
        }

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (uploadError) {
            console.warn('[Thumbnail Upload Warning]:', uploadError.message);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrlData?.publicUrl || null;
    } catch (e) {
        console.warn('[Thumbnail Upload Exception]:', e);
        return null;
    }
}
