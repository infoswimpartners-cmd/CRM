import fs from 'fs';
import path from 'path';
import { isStudioCmsPath, generateSeoImprovementKit } from './seo-improvement-generator';

export interface WatchwordItem {
    id: number;
    keyword: string;
    target_path: string;
    priority: 'high' | 'medium';
    status: 'active' | 'observing' | 'achieved';
    target_rank: number;
    current_rank: number;
    area_category?: string;
    target_category?: string;
}

export interface RankHistoryEntry {
    date: string;
    keyword: string;
    rank_position: number;
    impressions: number;
    clicks: number;
    ctr: string;
    page_url: string;
}

export interface ImprovementLogEntry {
    id: string;
    keyword: string;
    target_path: string;
    action_title: string;
    action_detail: string;
    implemented_at: string;
    review_date: string; // 実施日 + 7日
    status: 'observing' | 'achieved' | 'active';
    rank_before: number;
    current_rank: number;
    notes: string;
}

export interface SeoActionTask {
    id: string;
    keyword: string;
    targetPath: string;
    currentRank: number;
    priority: 'high' | 'medium';
    pageType: 'studio_cms' | 'studio_static';
    pageTypeLabel: string;
    actionTitle: string;
    actionDetail: string;
    status: 'ready' | 'executed_today' | 'observing';
    executedAt?: string;
    nextAvailableDate?: string; // 翌日日付（YYYY-MM-DD）
}

export interface SeoRankWatchState {
    watchwords: WatchwordItem[];
    rankHistory: RankHistoryEntry[];
    improvementLogs: ImprovementLogEntry[];
    topContender: WatchwordItem | null;
    topActions: SeoActionTask[]; // 常に提示される3つのアクションリスト
    observingItem: (WatchwordItem & { remainingDays: number; log: ImprovementLogEntry }) | null;
    stats: {
        achievedCount: number;
        observingCount: number;
        activeCount: number;
        totalCount: number;
    };
}


const DATA_DIR = path.join(process.cwd(), 'data/seo');
const WATCHWORDS_PATH = path.join(DATA_DIR, 'watchwords.json');
const RANK_HISTORY_PATH = path.join(DATA_DIR, 'rank-history.json');
const IMPROVEMENT_LOG_PATH = path.join(DATA_DIR, 'improvement-log.json');

const DB_KEY_WATCHWORDS = 'SP_TRACKER_SEO_WATCHWORDS';
const DB_KEY_IMPROVEMENT_LOGS = 'SP_TRACKER_SEO_IMPROVEMENT_LOGS';

/**
 * 日本時間（JST, UTC+9）の YYYY-MM-DD 文字列を取得
 */
export function getJstDateString(date = new Date()): string {
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(date.getTime() + jstOffset);
    return jstDate.toISOString().split('T')[0];
}

function ensureDataFiles() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export function readWatchwords(): WatchwordItem[] {
    try {
        ensureDataFiles();
        if (fs.existsSync(WATCHWORDS_PATH)) {
            const data = fs.readFileSync(WATCHWORDS_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('readWatchwords error:', e);
    }
    return [];
}

export function writeWatchwords(data: WatchwordItem[]): void {
    try {
        ensureDataFiles();
        fs.writeFileSync(WATCHWORDS_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('writeWatchwords error:', e);
    }
}

/**
 * SupabaseからWatchwordsを取得（なければローカルJSONから取得して初期保存）
 */
export async function getPersistedWatchwords(supabase?: any): Promise<WatchwordItem[]> {
    if (!supabase) return readWatchwords();
    try {
        const { data } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url')
            .eq('space_name', DB_KEY_WATCHWORDS)
            .limit(1)
            .maybeSingle();

        if (data?.webhook_url) {
            return JSON.parse(data.webhook_url);
        }

        // Supabaseにレコードがまだ無ければローカルJSONを初期値として投入
        const local = readWatchwords();
        if (local.length > 0) {
            await savePersistedWatchwords(supabase, local);
        }
        return local;
    } catch (e) {
        console.error('getPersistedWatchwords error:', e);
        return readWatchwords();
    }
}

/**
 * SupabaseにWatchwordsを永続化保存
 */
export async function savePersistedWatchwords(supabase: any, data: WatchwordItem[]): Promise<boolean> {
    // ローカルファイルにもバックアップ書き込み
    writeWatchwords(data);
    if (!supabase) return true;

    try {
        const jsonStr = JSON.stringify(data);
        const { data: existing } = await supabase
            .from('google_chat_webhooks')
            .select('id')
            .eq('space_name', DB_KEY_WATCHWORDS)
            .limit(1)
            .maybeSingle();

        if (existing?.id) {
            await supabase
                .from('google_chat_webhooks')
                .update({ webhook_url: jsonStr, active: true })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('google_chat_webhooks')
                .insert({
                    space_name: DB_KEY_WATCHWORDS,
                    webhook_url: jsonStr,
                    active: true,
                });
        }
        return true;
    } catch (e) {
        console.error('savePersistedWatchwords error:', e);
        return false;
    }
}

export function readRankHistory(): RankHistoryEntry[] {
    try {
        ensureDataFiles();
        if (fs.existsSync(RANK_HISTORY_PATH)) {
            const data = fs.readFileSync(RANK_HISTORY_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('readRankHistory error:', e);
    }
    return [];
}

export function appendRankHistory(entries: RankHistoryEntry[]): void {
    try {
        ensureDataFiles();
        const current = readRankHistory();
        const existingKeys = new Set(current.map((h) => `${h.date}_${h.keyword}`));
        const toAdd = entries.filter((e) => !existingKeys.has(`${e.date}_${e.keyword}`));
        if (toAdd.length > 0) {
            fs.writeFileSync(RANK_HISTORY_PATH, JSON.stringify([...current, ...toAdd], null, 2), 'utf8');
        }
    } catch (e) {
        console.error('appendRankHistory error:', e);
    }
}

export function readImprovementLogs(): ImprovementLogEntry[] {
    try {
        ensureDataFiles();
        if (fs.existsSync(IMPROVEMENT_LOG_PATH)) {
            const data = fs.readFileSync(IMPROVEMENT_LOG_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('readImprovementLogs error:', e);
    }
    return [];
}

export function writeImprovementLogs(data: ImprovementLogEntry[]): void {
    try {
        ensureDataFiles();
        fs.writeFileSync(IMPROVEMENT_LOG_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('writeImprovementLogs error:', e);
    }
}

/**
 * Supabaseから改善ログを取得（なければローカルJSONから取得して初期保存）
 */
export async function getPersistedImprovementLogs(supabase?: any): Promise<ImprovementLogEntry[]> {
    if (!supabase) return readImprovementLogs();
    try {
        const { data } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url')
            .eq('space_name', DB_KEY_IMPROVEMENT_LOGS)
            .limit(1)
            .maybeSingle();

        if (data?.webhook_url) {
            return JSON.parse(data.webhook_url);
        }

        // Supabaseにレコードがまだ無ければローカルJSONを初期値として投入
        const local = readImprovementLogs();
        if (local.length > 0) {
            await savePersistedImprovementLogs(supabase, local);
        }
        return local;
    } catch (e) {
        console.error('getPersistedImprovementLogs error:', e);
        return readImprovementLogs();
    }
}

/**
 * Supabaseに改善ログを永続化保存
 */
export async function savePersistedImprovementLogs(supabase: any, data: ImprovementLogEntry[]): Promise<boolean> {
    // ローカルファイルにもバックアップ書き込み
    writeImprovementLogs(data);
    if (!supabase) return true;

    try {
        const jsonStr = JSON.stringify(data);
        const { data: existing } = await supabase
            .from('google_chat_webhooks')
            .select('id')
            .eq('space_name', DB_KEY_IMPROVEMENT_LOGS)
            .limit(1)
            .maybeSingle();

        if (existing?.id) {
            await supabase
                .from('google_chat_webhooks')
                .update({ webhook_url: jsonStr, active: true })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('google_chat_webhooks')
                .insert({
                    space_name: DB_KEY_IMPROVEMENT_LOGS,
                    webhook_url: jsonStr,
                    active: true,
                });
        }
        return true;
    } catch (e) {
        console.error('savePersistedImprovementLogs error:', e);
        return false;
    }
}

/**
 * SEO Rank Watch の現在状態を算出（Supabase永続化対応）
 */
export async function getSeoRankWatchState(supabase?: any): Promise<SeoRankWatchState> {
    const [watchwords, improvementLogs] = await Promise.all([
        getPersistedWatchwords(supabase),
        getPersistedImprovementLogs(supabase),
    ]);
    const rankHistory = readRankHistory();

    const todayStr = getJstDateString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 観察中 (observing) のアイテムを特定
    let observingItem: SeoRankWatchState['observingItem'] = null;
    const observingKw = watchwords.find((w) => w.status === 'observing');
    if (observingKw) {
        const log = improvementLogs.find((l) => l.keyword === observingKw.keyword && l.status === 'observing') ||
                    improvementLogs.find((l) => l.keyword === observingKw.keyword) || {
                        id: 'temp',
                        keyword: observingKw.keyword,
                        target_path: observingKw.target_path,
                        action_title: '本質的なコンテンツ・FAQ改善',
                        action_detail: '検索ニーズに合わせた訴求と構造化データの追加',
                        implemented_at: todayStr,
                        review_date: getJstDateString(new Date(Date.now() + 7 * 86400000)),
                        status: 'observing' as const,
                        rank_before: observingKw.current_rank + 1,
                        current_rank: observingKw.current_rank,
                        notes: '7日間効果測定中',
                    };

        const reviewDate = new Date(log.review_date);
        reviewDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, diffDays);

        observingItem = {
            ...observingKw,
            remainingDays,
            log,
        };
    }

    // 2. 次の1位狙撃対象 (active の中で最も1位に近く、優先度が高いもの)
    const activeContenders = watchwords
        .filter((w) => w.status === 'active')
        .sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return (a.current_rank || 100) - (b.current_rank || 100);
        });

    const topContender = activeContenders[0] || null;

    // 3. 3つの具体的改善アクション（SeoActionTask）の自動生成 & 翌日補充サイクル
    const nextDateStr = getJstDateString(new Date(Date.now() + 86400000));
    const topActions: SeoActionTask[] = [];

    // ① 本日実行された改善ログを抽出（本日実行済みタスクとして最大3件まで表示）
    const todayLogs = improvementLogs.filter((l) => l.implemented_at === todayStr);
    for (const tLog of todayLogs) {
        if (topActions.length >= 3) break;
        const kwItem = watchwords.find((w) => w.keyword === tLog.keyword);
        const isCms = isStudioCmsPath(tLog.target_path);
        topActions.push({
            id: `task_${tLog.id}`,
            keyword: tLog.keyword,
            targetPath: tLog.target_path,
            currentRank: kwItem?.current_rank || tLog.current_rank,
            priority: kwItem?.priority || 'high',
            pageType: isCms ? 'studio_cms' : 'studio_static',
            pageTypeLabel: isCms ? 'STUDIO CMS記事' : 'STUDIO 通常ページ',
            actionTitle: tLog.action_title,
            actionDetail: tLog.action_detail,
            status: 'executed_today',
            executedAt: tLog.implemented_at,
            nextAvailableDate: nextDateStr,
        });
    }

    // ② 残りの枠（合計3件になるまで）、未実行の候補（active）から優先度順に補充
    const executedKwToday = new Set(todayLogs.map((l) => l.keyword));
    const candidateKeywords = watchwords
        .filter((w) => w.status !== 'achieved' && !executedKwToday.has(w.keyword))
        .sort((a, b) => {
            if (a.status === 'active' && b.status === 'observing') return -1;
            if (a.status === 'observing' && b.status === 'active') return 1;
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return (a.current_rank || 100) - (b.current_rank || 100);
        });

    for (const cand of candidateKeywords) {
        if (topActions.length >= 3) break;
        const isCms = isStudioCmsPath(cand.target_path);
        const kit = generateSeoImprovementKit(cand.keyword, cand.target_path, cand.current_rank);

        topActions.push({
            id: `task_cand_${cand.id}`,
            keyword: cand.keyword,
            targetPath: cand.target_path,
            currentRank: cand.current_rank,
            priority: cand.priority,
            pageType: isCms ? 'studio_cms' : 'studio_static',
            pageTypeLabel: isCms ? 'STUDIO CMS記事' : 'STUDIO 通常ページ',
            actionTitle: kit.actionTitle,
            actionDetail: kit.actionDetail,
            status: cand.status === 'observing' ? 'observing' : 'ready',
        });
    }

    // 4. 統計集計
    const stats = {
        achievedCount: watchwords.filter((w) => w.status === 'achieved').length,
        observingCount: watchwords.filter((w) => w.status === 'observing').length,
        activeCount: watchwords.filter((w) => w.status === 'active').length,
        totalCount: watchwords.length,
    };

    return {
        watchwords,
        rankHistory,
        improvementLogs,
        topContender,
        topActions,
        observingItem,
        stats,
    };
}

