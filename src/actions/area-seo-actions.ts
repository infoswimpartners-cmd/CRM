'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
    AREA_SEO_AUDIT_DATA,
    AreaSeoAuditItem,
    evaluateAreaItemWithLiveAudit,
} from '@/lib/area-seo-audit';
import { getLivePageAudit } from '@/lib/page-audit';

const APP_CONFIG_AREA_SEO_KEY = 'AREA_SEO_CUSTOM_DATA_V1';

/**
 * 全商圏エリアの最新SEO診断データを取得（Supabase永続データ優先、フォールバックで初期シード）
 */
export async function getAreaSeoAuditsAction(): Promise<{
    success: boolean;
    data: AreaSeoAuditItem[];
    error?: string;
}> {
    try {
        const supabase = createAdminClient();
        if (supabase) {
            const { data: config } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', APP_CONFIG_AREA_SEO_KEY)
                .maybeSingle();

            if (config?.value) {
                try {
                    const parsed = JSON.parse(config.value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // シードデータとマージ（新設エリアがある場合にも漏れなく統合）
                        const map = new Map<string, AreaSeoAuditItem>();
                        AREA_SEO_AUDIT_DATA.forEach((item) => map.set(item.id, item));
                        parsed.forEach((saved: AreaSeoAuditItem) => {
                            if (map.has(saved.id)) {
                                map.set(saved.id, { ...map.get(saved.id)!, ...saved });
                            } else {
                                map.set(saved.id, saved);
                            }
                        });
                        return { success: true, data: Array.from(map.values()) };
                    }
                } catch (parseErr) {
                    console.warn('[getAreaSeoAuditsAction] JSON parse warning:', parseErr);
                }
            }
        }
    } catch (err: any) {
        console.warn('[getAreaSeoAuditsAction] Supabase fetch error, fallback to seed:', err?.message);
    }

    return { success: true, data: [...AREA_SEO_AUDIT_DATA] };
}

/**
 * 全商圏エリアの診断データをSupabaseに保存
 */
async function persistAreaSeoData(items: AreaSeoAuditItem[]): Promise<boolean> {
    try {
        const supabase = createAdminClient();
        if (supabase) {
            const { error } = await supabase.from('app_configs').upsert(
                {
                    key: APP_CONFIG_AREA_SEO_KEY,
                    value: JSON.stringify(items),
                },
                { onConflict: 'key' }
            );
            return !error;
        }
    } catch (err) {
        console.warn('[persistAreaSeoData] Save failed:', err);
    }
    return false;
}

/**
 * 特定エリアの専用LP URLを登録・更新し、即座に最新実測検証を実行
 */
export async function saveAreaCustomUrlAction(
    areaId: string,
    customUrl: string
): Promise<{
    success: boolean;
    data?: AreaSeoAuditItem;
    allData?: AreaSeoAuditItem[];
    error?: string;
}> {
    try {
        const cleanUrl = (customUrl || '').trim();
        const currentRes = await getAreaSeoAuditsAction();
        const items = currentRes.data;
        const targetIdx = items.findIndex((a) => a.id === areaId);

        if (targetIdx === -1) {
            return { success: false, error: '指定された商圏エリアが見つかりません。' };
        }

        // URLを更新
        items[targetIdx].customUrl = cleanUrl || null;
        if (cleanUrl) {
            // パス部分の正規化
            items[targetIdx].dedicatedLpPath = cleanUrl.startsWith('http')
                ? new URL(cleanUrl).pathname
                : cleanUrl.startsWith('/')
                ? cleanUrl
                : `/${cleanUrl}`;
        } else {
            items[targetIdx].dedicatedLpPath = null;
            items[targetIdx].hasDedicatedLp = false;
        }

        // URLが指定されている場合は直ちに再検証を実行
        if (cleanUrl) {
            const auditResult = await auditSingleAreaItem(items[targetIdx], cleanUrl);
            items[targetIdx] = auditResult;
        } else {
            items[targetIdx].lastAuditedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            items[targetIdx].auditStatus = 'not_found';
            items[targetIdx].status = 'needs_lp';
            items[targetIdx].statusLabel = '要改善（専用LP未登録）';
            items[targetIdx].seoScore = Math.min(items[targetIdx].seoScore, 40);
        }

        await persistAreaSeoData(items);

        return {
            success: true,
            data: items[targetIdx],
            allData: items,
        };
    } catch (err: any) {
        console.error('[saveAreaCustomUrlAction] Error:', err);
        return {
            success: false,
            error: err?.message || 'URLの登録・再検証中にエラーが発生しました。',
        };
    }
}

/**
 * 特定商圏エリアの登録URLを実際にフェッチ・再検証
 */
export async function auditAreaSeoAction(
    areaId: string,
    overrideUrl?: string
): Promise<{
    success: boolean;
    data?: AreaSeoAuditItem;
    allData?: AreaSeoAuditItem[];
    error?: string;
}> {
    try {
        const currentRes = await getAreaSeoAuditsAction();
        const items = currentRes.data;
        const targetIdx = items.findIndex((a) => a.id === areaId);

        if (targetIdx === -1) {
            return { success: false, error: '指定された商圏エリアが見つかりません。' };
        }

        const baseItem = items[targetIdx];
        const targetUrl = (overrideUrl || baseItem.customUrl || baseItem.dedicatedLpPath || '').trim();

        if (!targetUrl) {
            return {
                success: false,
                error: '再検証を行う対象のURLが登録されていません。まずはURLを入力してください。',
            };
        }

        // 実際に最新HTMLをフェッチして診断
        const updatedItem = await auditSingleAreaItem(baseItem, targetUrl);
        items[targetIdx] = updatedItem;

        await persistAreaSeoData(items);

        return {
            success: true,
            data: updatedItem,
            allData: items,
        };
    } catch (err: any) {
        console.error('[auditAreaSeoAction] Error:', err);
        return {
            success: false,
            error: err?.message || 'エリアの再検証中にエラーが発生しました。',
        };
    }
}

/**
 * 全商圏エリアを一括で再検証
 */
export async function auditAllAreasSeoAction(): Promise<{
    success: boolean;
    data: AreaSeoAuditItem[];
    updatedCount: number;
    error?: string;
}> {
    try {
        const currentRes = await getAreaSeoAuditsAction();
        const items = [...currentRes.data];
        let updatedCount = 0;

        // 全エリアを順次検証（サーバー負荷とタイムアウトを考慮し順次実行）
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const targetUrl = (item.customUrl || item.dedicatedLpPath || '').trim();
            if (targetUrl) {
                try {
                    items[i] = await auditSingleAreaItem(item, targetUrl);
                    updatedCount++;
                } catch (singleErr) {
                    console.warn(`[auditAllAreasSeoAction] Failed for ${item.areaName}:`, singleErr);
                }
            }
        }

        await persistAreaSeoData(items);

        return {
            success: true,
            data: items,
            updatedCount,
        };
    } catch (err: any) {
        console.error('[auditAllAreasSeoAction] Error:', err);
        return {
            success: false,
            data: [],
            updatedCount: 0,
            error: err?.message || '全エリア一括再検証中にエラーが発生しました。',
        };
    }
}

/**
 * 単一エリアアイテムのLiveAudit実行ヘルパー
 */
async function auditSingleAreaItem(
    item: AreaSeoAuditItem,
    targetUrl: string
): Promise<AreaSeoAuditItem> {
    const pathOnly = targetUrl.startsWith('http')
        ? new URL(targetUrl).pathname
        : targetUrl.startsWith('/')
        ? targetUrl
        : `/${targetUrl}`;

    try {
        const liveAudit = await getLivePageAudit(pathOnly, item.primaryKeyword, true);
        return evaluateAreaItemWithLiveAudit(item, targetUrl, {
            httpStatus: liveAudit.httpStatus || 200,
            liveTitle: liveAudit.liveTitle,
            liveDescription: liveAudit.liveDescription,
            h1: liveAudit.h1,
            h2List: liveAudit.h2List,
            hasLdJson: liveAudit.hasLdJson,
            isDeletedPage: liveAudit.isDeletedPage,
            fetchedAt: liveAudit.fetchedAt,
        });
    } catch (err: any) {
        console.warn(`[auditSingleAreaItem] Fetch failed for ${pathOnly}:`, err?.message);
        return evaluateAreaItemWithLiveAudit(item, targetUrl, {
            httpStatus: 500,
            isDeletedPage: true,
            liveTitle: '（通信エラー・取得不可）',
            fetchedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        });
    }
}
