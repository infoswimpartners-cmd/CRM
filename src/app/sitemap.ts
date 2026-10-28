import { MetadataRoute } from 'next';
import { getGeneratedArticles } from '@/lib/generated-articles-storage';
import { AREA_SEO_AUDIT_DATA } from '@/lib/area-seo-audit';

/**
 * Googleクローラー向け動的サイトマップ (/sitemap.xml)
 * 自動作成されたSEO記事および主要商圏LPのURLをGoogleに自動通知
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com';

    // 1. 静的・主要ページ
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/trial`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/articles`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
    ];

    // 2. 商圏エリアLP (/personal_swim/[area])
    const areaRoutes: MetadataRoute.Sitemap = AREA_SEO_AUDIT_DATA.map((area) => ({
        url: `${baseUrl}/personal_swim/${area.areaKey}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    // 3. 自動生成公開記事 (/articles/[slug])
    let articleRoutes: MetadataRoute.Sitemap = [];
    try {
        const articles = await getGeneratedArticles();
        articleRoutes = articles
            .filter((a) => a.status === 'published')
            .map((a) => {
                const slug = a.target_path.split('/').pop() || a.id;
                return {
                    url: `${baseUrl}/articles/${slug}`,
                    lastModified: new Date(a.created_at),
                    changeFrequency: 'monthly',
                    priority: 0.7,
                };
            });
    } catch (e) {
        console.warn('Failed to generate sitemap for articles:', e);
    }

    return [...staticRoutes, ...areaRoutes, ...articleRoutes];
}
