'use client';

/**
 * 配信ログ・トラッキングメインタブコンポーネント
 * 
 * LINE Messaging APIによる全配信ログの追跡、ステータス別/種別別の絞り込み、
 * フリーワード検索、ページネーション、本文詳細モーダル表示を提供します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LineDeliveryLog, DeliveryLogsResult } from '@/types/line-marketing';
import { getDeliveryLogs } from '@/actions/line-marketing';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { LogDetailModal } from './LogDetailModal';

export function DeliveryLogsTab() {
    const [logs, setLogs] = useState<LineDeliveryLog[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        totalSent: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    // フィルタ・ページネーション状態
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [deliveryType, setDeliveryType] = useState<string>('all');
    const [status, setStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [queryInput, setQueryInput] = useState('');

    // 詳細確認モーダル状態
    const [selectedLog, setSelectedLog] = useState<LineDeliveryLog | null>(null);

    // ログ取得処理
    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res: DeliveryLogsResult = await getDeliveryLogs({
                page,
                pageSize,
                deliveryType: deliveryType as any,
                status: status as any,
                searchQuery: searchQuery.trim() || undefined,
            });

            if (res.success) {
                setLogs(res.logs);
                setTotalCount(res.totalCount);
                setStats(res.stats);
            } else {
                toast.error(res.error || '配信ログの取得に失敗しました。');
            }
        } catch (err: any) {
            console.error('[DeliveryLogsTab] fetch error:', err);
            toast.error('配信ログ取得中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, deliveryType, status, searchQuery]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // 検索フォーム送信
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearchQuery(queryInput);
    };

    // 日時フォーマッタ (JST表示)
    const formatDateTime = (isoString?: string | null) => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return isoString;
        }
    };

    // 総ページ数計算
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return (
        <div className="space-y-6">
            {/* KPI統計サマリーカード */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="text-[11px] font-medium text-slate-500">総送信件数</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                        {stats.totalSent.toLocaleString()} <span className="text-xs font-normal text-slate-500">件</span>
                    </div>
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        成功件数
                    </div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                        {stats.successCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">件</span>
                    </div>
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        エラー失敗件数
                    </div>
                    <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1 font-mono">
                        {stats.failedCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">件</span>
                    </div>
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        安全スキップ件数
                    </div>
                    <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1 font-mono">
                        {stats.skippedCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">件</span>
                    </div>
                </div>
            </div>

            {/* 検索・絞り込みフィルタバー */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* キーワード検索 */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="生徒名、会員番号、本文キーワードで検索..."
                            value={queryInput}
                            onChange={(e) => setQueryInput(e.target.value)}
                            className="pl-9 text-xs"
                        />
                    </div>

                    {/* 配信種別フィルタ */}
                    <div className="w-full sm:w-40">
                        <Select
                            value={deliveryType}
                            onValueChange={(val) => {
                                setDeliveryType(val);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="text-xs h-9">
                                <SelectValue placeholder="配信種別" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全種別</SelectItem>
                                <SelectItem value="broadcast">一括配信</SelectItem>
                                <SelectItem value="step_message">ステップ配信</SelectItem>
                                <SelectItem value="test_preview">テスト送信</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ステータスフィルタ */}
                    <div className="w-full sm:w-36">
                        <Select
                            value={status}
                            onValueChange={(val) => {
                                setStatus(val);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="text-xs h-9">
                                <SelectValue placeholder="ステータス" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全ステータス</SelectItem>
                                <SelectItem value="success">成功</SelectItem>
                                <SelectItem value="failed">失敗</SelectItem>
                                <SelectItem value="skipped">スキップ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 h-9">
                            検索
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setQueryInput('');
                                setSearchQuery('');
                                setDeliveryType('all');
                                setStatus('all');
                                setPage(1);
                            }}
                            className="text-xs h-9"
                        >
                            リセット
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={fetchLogs}
                            disabled={isLoading}
                            className="h-9 w-9 text-slate-500 hover:text-slate-800"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </form>
            </div>

            {/* ログ一覧テーブル */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                            <TableHead className="w-40 text-xs font-semibold text-slate-700 dark:text-slate-300">送信日時</TableHead>
                            <TableHead className="w-28 text-xs font-semibold text-slate-700 dark:text-slate-300">配信種別</TableHead>
                            <TableHead className="w-44 text-xs font-semibold text-slate-700 dark:text-slate-300">宛先生徒</TableHead>
                            <TableHead className="w-24 text-xs font-semibold text-slate-700 dark:text-slate-300">状態</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">メッセージ抜粋</TableHead>
                            <TableHead className="w-32 text-xs font-semibold text-slate-700 dark:text-slate-300">エラー/理由</TableHead>
                            <TableHead className="w-20 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">詳細</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                                    ログを読み込み中...
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                                    該当する配信ログは見つかりませんでした。
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => {
                                const isSuccess = log.status === 'success' || log.status === 'sent';
                                const isFailed = log.status === 'failed';
                                const isSkipped = log.status === 'skipped';

                                return (
                                    <TableRow key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                                        {/* 送信日時 */}
                                        <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                            {formatDateTime(log.sent_at || log.created_at)}
                                        </TableCell>

                                        {/* 配信種別 */}
                                        <TableCell>
                                            {log.delivery_type === 'broadcast' && (
                                                <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                                                    一括配信
                                                </Badge>
                                            )}
                                            {log.delivery_type === 'step_message' && (
                                                <Badge variant="outline" className="text-[11px] bg-purple-50 text-purple-700 border-purple-200">
                                                    ステップ
                                                </Badge>
                                            )}
                                            {log.delivery_type === 'test_preview' && (
                                                <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">
                                                    テスト
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* 宛先生徒 */}
                                        <TableCell>
                                            <div className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                                                {log.student_name || '名前未設定'}
                                            </div>
                                            {log.student_number && (
                                                <div className="text-[11px] font-mono text-slate-400">
                                                    #{log.student_number}
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* ステータス */}
                                        <TableCell>
                                            {isSuccess && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    成功
                                                </span>
                                            )}
                                            {isFailed && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                                    <XCircle className="w-3 h-3" />
                                                    失敗
                                                </span>
                                            )}
                                            {isSkipped && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    スキップ
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* メッセージ本文抜粋 */}
                                        <TableCell className="max-w-xs">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 font-mono break-all">
                                                {log.rendered_message || log.message_body}
                                            </p>
                                        </TableCell>

                                        {/* エラー / スキップ理由 */}
                                        <TableCell className="max-w-[140px]">
                                            {log.error_message ? (
                                                <span className="text-xs text-rose-600 line-clamp-1 break-all" title={log.error_message}>
                                                    {log.error_message}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </TableCell>

                                        {/* 詳細ボタン */}
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedLog(log)}
                                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* ページネーションフッター */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <div>
                        全 <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{totalCount}</span> 件中{' '}
                        {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} 〜{' '}
                        {Math.min(page * pageSize, totalCount)} 件を表示
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1 || isLoading}
                            className="h-8 px-2 text-xs"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            前へ
                        </Button>
                        <span className="font-mono text-xs px-2">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                            className="h-8 px-2 text-xs"
                        >
                            次へ
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* メッセージ本文詳細モーダル */}
            <LogDetailModal
                log={selectedLog}
                open={!!selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </div>
    );
}
