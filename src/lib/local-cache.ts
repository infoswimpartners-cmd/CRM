/**
 * クライアント側ローカルストレージ即時キャッシュ（SWR: Stale-While-Revalidate用ユーティリティ）
 * 
 * ページ遷移やリロード時に即時（0ミリ秒）で前回データを復元し、
 * バックグラウンド通信完了時にシームレスに最新化します。
 */

interface CacheEnvelope<T> {
    timestamp: number;
    data: T;
}

/**
 * 期限内または直近のキャッシュを即時取得（Stale許容: 即時表示用）
 */
export function getStaleLocalCache<T>(key: string, maxAgeMs: number = 1000 * 60 * 60 * 24 * 3): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(`sp_cache_${key}`);
        if (!raw) return null;
        const envelope: CacheEnvelope<T> = JSON.parse(raw);
        if (!envelope || typeof envelope !== 'object' || !('timestamp' in envelope)) return null;

        // 最大許容期間（デフォルト3日）を過ぎている場合は破棄
        if (Date.now() - envelope.timestamp > maxAgeMs) {
            localStorage.removeItem(`sp_cache_${key}`);
            return null;
        }

        return envelope.data;
    } catch {
        return null;
    }
}

/**
 * キャッシュをローカルストレージに安全に保存
 */
export function setLocalCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        const envelope: CacheEnvelope<T> = {
            timestamp: Date.now(),
            data,
        };
        localStorage.setItem(`sp_cache_${key}`, JSON.stringify(envelope));
    } catch {
        // 容量超過（QuotaExceededError）などの安全なフォールバック
    }
}

/**
 * 特定のキーのキャッシュをクリア
 */
export function clearLocalCache(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(`sp_cache_${key}`);
    } catch {}
}
