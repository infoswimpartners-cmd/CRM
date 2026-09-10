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
 * SEO Rank Watch の現在状態を算出
 */
export function getSeoRankWatchState(): SeoRankWatchState {
    const watchwords = readWatchwords();
    const rankHistory = readRankHistory();
    const improvementLogs = readImprovementLogs();

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
                        implemented_at: new Date().toISOString().split('T')[0],
                        review_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
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
    const todayStr = new Date().toISOString().split('T')[0];
    const nextDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const topActions: SeoActionTask[] = [];

    // ① 本日実行された改善ログを抽出（本日実行済みタスクとして最大2件まで表示）
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
    // ※ 前日以前に実行されたものは除外され、翌日になれば自動的に新しい未実施キーワードがスライドインして補充される
    const executedKwToday = new Set(todayLogs.map((l) => l.keyword));
    const candidateKeywords = watchwords
        .filter((w) => w.status !== 'achieved' && !executedKwToday.has(w.keyword))
        .sort((a, b) => {
            // observing 中のものは ready の後に回す
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

