import { createAdminClient } from '@/lib/supabase/admin';

export interface GoogleCredentials {
    serviceAccountKey: string;
    siteUrl: string;
    ga4Id: string;
}

let cachedCredentials: GoogleCredentials | null = null;

/**
 * Google連携用の認証情報・設定を環境変数、またはSupabaseバックアップから安全に取得
 */
export async function getGoogleCredentials(): Promise<GoogleCredentials> {
    const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const envSiteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
    const envGa4Id = process.env.GA4_PROPERTY_ID;

    // 環境変数にすべて揃っていればそのまま使用
    if (envKey && envSiteUrl) {
        return {
            serviceAccountKey: envKey,
            siteUrl: envSiteUrl,
            ga4Id: envGa4Id || '',
        };
    }

    if (cachedCredentials && cachedCredentials.serviceAccountKey && cachedCredentials.siteUrl) {
        return cachedCredentials;
    }

    // 環境変数に不足している場合、Supabaseのバックアップレコードから自動フォールバック取得
    try {
        const supabase = createAdminClient();
        const { data } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url')
            .eq('space_name', 'SP_TRACKER_GOOGLE_CREDENTIALS')
            .limit(1)
            .maybeSingle();

        if (data?.webhook_url) {
            const parsed = JSON.parse(data.webhook_url);
            cachedCredentials = {
                serviceAccountKey: envKey || parsed.serviceAccountKey || '',
                siteUrl: envSiteUrl || parsed.siteUrl || '',
                ga4Id: envGa4Id || parsed.ga4Id || '',
            };
            return cachedCredentials;
        }
    } catch (err) {
        console.error('getGoogleCredentials fallback error:', err);
    }

    return {
        serviceAccountKey: envKey || '',
        siteUrl: envSiteUrl || '',
        ga4Id: envGa4Id || '',
    };
}
