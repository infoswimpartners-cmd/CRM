import { MetadataRoute } from 'next';
import { AREA_SEO_AUDIT_DATA } from '@/lib/area-seo-audit';

/**
 * Googleクローラー向け動的サイトマップ (/sitemap.xml)
 * 主要商圏LP等のURLをGoogleに自動通知
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
    ];

    // 2. 商圏エリアLP (/personal_swim/[area])
    const areaRoutes: MetadataRoute.Sitemap = AREA_SEO_AUDIT_DATA.map((area) => ({
        url: `${baseUrl}/personal_swim/${area.areaKey}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [...staticRoutes, ...areaRoutes];
}
