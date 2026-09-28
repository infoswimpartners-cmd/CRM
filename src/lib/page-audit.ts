import { execFile } from 'child_process';
import { SeoPageType } from './seo-improvement-generator';

export interface LivePageAuditResult {
    targetPath: string;
    targetUrl: string;
    liveTitle: string;
    liveDescription: string;
    h1: string;
    h2List: string[];
    hasLdJson: boolean;
    ldJsonTypes: string[];
    detectedPageType: SeoPageType;
    pageTypeLabel: string;
    isOptimizedForKeyword: boolean;
    optimizationStatus: 'optimized_in_production' | 'partially_optimized' | 'needs_optimization';
    statusBadgeLabel: string;
    matchedImprovements: string[];
    missingImprovements: string[];
    auditSummary: string;
    fetchedAt: string;
    source: 'live_network' | 'fallback_cache';
    httpStatus?: number;
    isDeletedPage?: boolean;
    suggestedAlternativePath?: string;
}

// インメモリキャッシュ（短時間保持しつつ、強制リフレッシュもサポート）
const auditCache = new Map<string, { result: LivePageAuditResult; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1分間

interface LiveFetchResult {
    html: string;
    status: number;
}

/**
 * 外部ネットワークからHTMLおよびHTTPステータスを確実に取得（fetch優先、curlフォールバック、キャッシュ完全バイパス）
 */
async function fetchHtmlLive(url: string): Promise<LiveFetchResult> {
    const separator = url.includes('?') ? '&' : '?';
    const bypassUrl = `${url}${separator}_t=${Date.now()}`;

    // 1. 標準 fetch による取得（サーバーレス/Edge/コンテナ対応）
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(bypassUrl, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            },
            cache: 'no-store',
        });
        clearTimeout(timeoutId);

        const text = await res.text();
        return {
            html: text || '',
            status: res.status,
        };
    } catch (fetchErr) {
        console.warn(`[page-audit] fetch failed for ${bypassUrl}, falling back to curl:`, fetchErr);
    }

    // 2. curl によるフォールバック
    return new Promise((resolve) => {
        execFile(
            'curl',
            [
                '-sL',
                '-w', '\n%{http_code}',
                '--max-time', '8',
                '-H', 'Cache-Control: no-cache, no-store, must-revalidate',
                '-H', 'Pragma: no-cache',
                '-H', 'User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                bypassUrl,
            ],
            { maxBuffer: 10 * 1024 * 1024 },
            (err, stdout) => {
                if (err || !stdout) {
                    return resolve({ html: '', status: 500 });
                }
                const parts = stdout.trim().split('\n');
                const lastLine = parts[parts.length - 1];
                const statusCode = parseInt(lastLine, 10) || (parts.length > 1 ? 200 : 0);
                const html = parts.slice(0, -1).join('\n');
                resolve({ html, status: statusCode });
            }
        );
    });
}

/**
 * 日本時間の文字列
 */
function getJstFormattedTime(): string {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().replace('T', ' ').substring(0, 19) + ' JST';
}

/**
 * HTMLからメタ情報と構造を正確に抽出
 */
export function parseHtmlAudit(html: string, targetPath: string, keyword: string): LivePageAuditResult {
    const cleanKw = keyword.trim();
    const cleanKwParts = cleanKw.split(/[\s　]+/).filter(Boolean);

    // タイトルタグ
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const liveTitle = titleMatch ? titleMatch[1].trim() : '';

    // メタディスクリプション
    const descMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const liveDescription = descMatch ? descMatch[1].trim() : '';

    // H1
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

    // H2
    const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
    const h2List = h2Matches.map((m) => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);

    // JSON-LD構造化データ
    const ldJsonMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const hasLdJson = ldJsonMatches.length > 0;
    const ldJsonTypes: string[] = [];

    ldJsonMatches.forEach((m) => {
        try {
            const parsed = JSON.parse(m[1]);
            if (parsed['@type']) {
                ldJsonTypes.push(String(parsed['@type']));
            }
            if (Array.isArray(parsed['@graph'])) {
                parsed['@graph'].forEach((item: any) => {
                    if (item['@type']) ldJsonTypes.push(String(item['@type']));
                });
            }
        } catch {
            // パースエラーは無視
        }
    });

    // ページ種別の厳密な判定
    const p = targetPath.toLowerCase();
    const isCmsArticle =
        p.startsWith('/zuhb45xv/') ||
        p.startsWith('/articles/') ||
        p.startsWith('/blog/') ||
        html.includes('class="c-entry') ||
        html.includes('itemprop="articleBody"');

    const detectedPageType: SeoPageType = isCmsArticle ? 'studio_cms_article' : 'studio_landing_page';
    const pageTypeLabel = isCmsArticle
        ? 'STUDIO CMS記事（ブログ・ノウハウコラム）'
        : '集客ランディングページ（LP・通常デザイン）';

    // キーワード正規化ヘルパー
    const normalize = (str: string) =>
        str
            .toLowerCase()
            .replace(/[【】『』「」［］（）()［］|｜・,，、.。!！?？\-_~〜\s　]/g, '')
            .normalize('NFKC');

    const normTitle = normalize(liveTitle);
    const normKeyword = normalize(cleanKw);
    // 改善項目の収集用配列
    const matchedImprovements: string[] = [];
    const missingImprovements: string[] = [];

    // キーワード要素トークン（2文字以上の実質名詞）
    // 例: 「水泳個人レッスン 千葉」 -> ['水泳', '個人レッスン', '千葉']
    // 例: 「スイミング 進級の 早い子」 -> ['スイミング', '進級', '早い子']
    const rawTokens = cleanKw
        .split(/[\s　]+/)
        .map((t) => t.replace(/^(の|が|を|に|へ|で|と)+|(の|が|を|に|へ|で|と)+$/g, '').trim())
        .filter((t) => t.length >= 2);

    // 同意語・助詞揺らぎの許容マッピング
    const checkTokenMatch = (token: string, targetText: string): boolean => {
        const normTarget = normalize(targetText);
        const normTok = normalize(token);
        if (normTarget.includes(normTok)) return true;

        // 地域名の区・市・県ゆらぎ（例: 目黒 ⇆ 目黒区, 千葉 ⇆ 千葉県/千葉市）
        if (normTok === '目黒' && normTarget.includes('目黒区')) return true;
        if (normTok === '千葉' && (normTarget.includes('千葉') || normTarget.includes('千葉県'))) return true;

        // 水泳 ⇆ スイミング
        if ((normTok === '水泳' || normTok === 'スイミング') && (normTarget.includes('水泳') || normTarget.includes('スイミング'))) return true;

        // 個人レッスン ⇆ 個別レッスン ⇆ マンツーマン ⇆ プライベートレッスン
        if (
            ['個人レッスン', '個別レッスン', 'マンツーマン', 'プライベート'].some((w) => normTok.includes(w)) &&
            ['個人レッスン', '個別レッスン', 'マンツーマン', '個別', '個人'].some((w) => normTarget.includes(w))
        ) {
            return true;
        }

        // 進級の早い子 ⇆ 進級が早い子 ⇆ 進級の早い
        if (normTok.includes('進級') && normTarget.includes('進級')) return true;
        if ((normTok.includes('早い') || normTok.includes('上達')) && (normTarget.includes('早い') || normTarget.includes('上達'))) return true;

        return false;
    };

    // ① タイトルにキーワード（またはその構成トークン群）が含まれているか
    const titleMatchesDirect = normTitle.includes(normKeyword);
    const titleMatchesAllTokens = rawTokens.length > 0 && rawTokens.every((tok) => checkTokenMatch(tok, liveTitle));
    const titleMatchesKw = titleMatchesDirect || titleMatchesAllTokens;

    if (titleMatchesKw) {
        matchedImprovements.push(`タイトルタグに「${cleanKw}」関連の訴求が反映済み（現在: 「${liveTitle}」）`);
    } else {
        missingImprovements.push(`タイトルタグに「${cleanKw}」のキーワード要素が不足しています（現在: 「${liveTitle || '未設定'}」）`);
    }

    // ② 構造化データの反映
    if (hasLdJson) {
        matchedImprovements.push(`JSON-LD構造化データ設置済み (${ldJsonTypes.join(', ') || '設置確認'})`);
    } else {
        missingImprovements.push('JSON-LD構造化データ（FAQPage / LocalBusiness）未検出（LPの場合は任意）');
    }

    // ③ ディスクリプション
    if (liveDescription && (cleanKwParts.some((part) => liveDescription.includes(part)) || rawTokens.some((tok) => checkTokenMatch(tok, liveDescription)))) {
        matchedImprovements.push(`メタディスクリプションに検索クエリの訴求が含まれています`);
    }

    // 総合ステータス判定（タイトルが最適化されていれば反映済みとみなす）
    let optimizationStatus: LivePageAuditResult['optimizationStatus'] = 'needs_optimization';
    let statusBadgeLabel = '未反映・改善推奨';

    if (titleMatchesKw) {
        optimizationStatus = 'optimized_in_production';
        statusBadgeLabel = hasLdJson ? '✅ 本番反映済み（検証・効果測定中）' : '✅ 本番反映済み（タイトル・構成最適化済み）';
    } else if (rawTokens.some((tok) => checkTokenMatch(tok, liveTitle)) || hasLdJson) {
        optimizationStatus = 'partially_optimized';
        statusBadgeLabel = '⚡ 一部反映済み（検証中）';
    }

    // 監査要約メッセージ
    let auditSummary = '';
    if (optimizationStatus === 'optimized_in_production') {
        auditSummary = `対象ページ「${targetPath}」の最新HTMLを検査した結果、狙撃キーワード「${cleanKw}」に適合するタイトルおよびコンテンツが既に本番公開環境に反映されていることを確認しました。現在は検索順位上昇を観察する「7日間検証スプリント」の期間です。`;
    } else if (optimizationStatus === 'partially_optimized') {
        auditSummary = `対象ページ「${targetPath}」の最新HTMLを検査しました。一部の要素（${matchedImprovements.join('、')}）は反映されていますが、より高い順位を狙うために${missingImprovements.join('、')}の追加対応が推奨されます。`;
    } else {
        auditSummary = `対象ページ「${targetPath}」の最新HTMLを検査しました。現状のタイトルは「${liveTitle}」となっており、狙撃キーワード「${cleanKw}」への最適化が必要です。`;
    }

    return {
        targetPath,
        targetUrl: `https://swim-partners.com${targetPath}`,
        liveTitle,
        liveDescription,
        h1,
        h2List,
        hasLdJson,
        ldJsonTypes,
        detectedPageType,
        pageTypeLabel,
        isOptimizedForKeyword: titleMatchesKw,
        optimizationStatus,
        statusBadgeLabel,
        matchedImprovements,
        missingImprovements,
        auditSummary,
        fetchedAt: getJstFormattedTime(),
        source: 'live_network',
    };
}

/**
 * 対象パスの最新HTMLを取得・分析する（キャッシュ & 強制再取得対応）
 */
export async function getLivePageAudit(
    targetPath: string,
    keyword: string,
    forceRefresh = false
): Promise<LivePageAuditResult> {
    const cacheKey = `${targetPath}:::${keyword}`;
    const now = Date.now();

    if (!forceRefresh && auditCache.has(cacheKey)) {
        const cached = auditCache.get(cacheKey)!;
        if (now - cached.cachedAt < CACHE_TTL_MS) {
            return { ...cached.result, source: 'fallback_cache' };
        }
    }

    const fullUrl = `https://swim-partners.com${targetPath}`;

    try {
        const { html, status } = await fetchHtmlLive(fullUrl);

        // 404（削除済みページ）の厳密な判定と除外対応
        if (status === 404) {
            const deletedResult: LivePageAuditResult = {
                targetPath,
                targetUrl: fullUrl,
                liveTitle: '（削除済みページ・404）',
                liveDescription: 'このページは既に削除されているか存在しません。',
                h1: '',
                h2List: [],
                hasLdJson: false,
                ldJsonTypes: [],
                detectedPageType: 'studio_landing_page',
                pageTypeLabel: '集客ランディングページ（LP・通常デザイン）',
                isOptimizedForKeyword: false,
                optimizationStatus: 'needs_optimization',
                statusBadgeLabel: '🗑️ 削除済みページ (404)',
                matchedImprovements: [],
                missingImprovements: ['対象URLは削除されています。既存の主力ページ（/）の改善、または新規LPの作成を行ってください。'],
                auditSummary: `対象ページ「${targetPath}」は現在HTTP 404（削除済み）となっています。キーワード「${keyword}」の検索順位・流入を獲得するため、既存の集客ページ（トップページ / など）の改善を行うか、新規集客ページの作成を推奨します。`,
                fetchedAt: getJstFormattedTime(),
                source: 'live_network',
                httpStatus: 404,
                isDeletedPage: true,
                suggestedAlternativePath: '/',
            };
            auditCache.set(cacheKey, { result: deletedResult, cachedAt: now });
            return deletedResult;
        }

        if (html && html.length > 50) {
            const auditResult = parseHtmlAudit(html, targetPath, keyword);
            auditResult.httpStatus = status || 200;
            auditResult.isDeletedPage = false;
            auditCache.set(cacheKey, { result: auditResult, cachedAt: now });
            return auditResult;
        }
    } catch (err) {
        console.warn(`[getLivePageAudit] Fetch failed for ${fullUrl}:`, err);
    }

    // フェッチ失敗時のフォールバック（既知のフォールバック値ではなく、エラー状態を返す）
    return {
        targetPath,
        targetUrl: fullUrl,
        liveTitle: '取得失敗（エラー）',
        liveDescription: 'ページの取得に失敗しました。',
        h1: '',
        h2List: [],
        hasLdJson: false,
        ldJsonTypes: [],
        detectedPageType: targetPath.includes('swimming_tips_up') ? 'studio_cms_article' : 'studio_landing_page',
        pageTypeLabel: targetPath.includes('swimming_tips_up')
            ? 'STUDIO CMS記事（ブログ・ノウハウコラム）'
            : '集客ランディングページ（LP・通常デザイン）',
        isOptimizedForKeyword: false,
        optimizationStatus: 'needs_optimization',
        statusBadgeLabel: '❌ 取得失敗（要確認）',
        matchedImprovements: [],
        missingImprovements: ['ページの取得に失敗しました。URLやネットワーク環境を確認してください。'],
        auditSummary: 'ページのHTML取得に失敗したため、改善状況を判定できませんでした。',
        fetchedAt: getJstFormattedTime(),
        source: 'fallback_cache',
        httpStatus: 500,
        isDeletedPage: false,
    };
}
