'use client';

/**
 * LIFFアクセストラッキング＆タグ管理タブ
 * 
 * 責務:
 *   1. 体験申込フォーム等のPV、UU、CV、CVRのリアルタイム集計表示
 *   2. タグ管理（保有ユーザー数集計、手動タグ付与/解除）
 *   3. アクセス・クリック履歴ログの詳細一覧表示
 *   4. 「フォーム閲覧未申込」セグメント配信へのシームレスな誘導
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Activity,
    Users,
    CheckCircle2,
    TrendingUp,
    RefreshCw,
    Tag,
    ExternalLink,
    Filter,
    Clock,
    UserCheck,
    AlertCircle,
    Send
} from 'lucide-react';
import { toast } from 'sonner';
import { getTrackingSummaryAction, getTagsSummaryAction, assignTagToUserAction, removeTagFromUserAction } from '@/actions/line-marketing';
import { TrackingKpiSummary, TagSummaryItem, LineAccessLog } from '@/types/line-tracking';

interface LiffTrackingTabProps {
    onSelectTagForBroadcast?: (tagName: string) => void;
}

export function LiffTrackingTab({ onSelectTagForBroadcast }: LiffTrackingTabProps) {
    const [summary, setSummary] = useState<TrackingKpiSummary | null>(null);
    const [tags, setTags] = useState<TagSummaryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // データ取得
    const fetchData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const [summaryRes, tagsRes] = await Promise.all([
                getTrackingSummaryAction(100),
                getTagsSummaryAction()
            ]);

            if (summaryRes.success && summaryRes.data) {
                setSummary(summaryRes.data);
            }
            if (tagsRes.success && tagsRes.tags) {
                setTags(tagsRes.tags);
            }
        } catch (err: any) {
            console.error('[LiffTrackingTab] Fetch error:', err);
            toast.error('トラッキングデータの取得に失敗しました');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // フィルタリングされたアクセスログ
    const filteredLogs = (summary?.recentLogs || []).filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (log.line_user_id || '').toLowerCase().includes(q) ||
            (log.display_name || '').toLowerCase().includes(q) ||
            (log.referrer_name || '').toLowerCase().includes(q) ||
            (log.form_type || '').toLowerCase().includes(q)
        );
    });

    const filteredTags = tags.filter(t => {
        if (selectedCategory === 'all') return true;
        return t.tagCategory === selectedCategory;
    });

    return (
        <div className="space-y-6">
            {/* 1. アクセス分析 KPI サマリーカード */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-800/80">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">総アクセス数 (PV)</span>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                                {summary?.totalViews ?? 0}
                                <span className="text-xs font-normal text-slate-500 ml-1">回</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">LIFFフォームが開かれた総回数</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-800/80">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">訪問ユーザー数 (UU)</span>
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                                {summary?.uniqueUsers ?? 0}
                                <span className="text-xs font-normal text-slate-500 ml-1">人</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">閲覧したユニークLINEユーザー</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white dark:from-slate-900 dark:to-slate-800/80">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">体験申込完了 (CV)</span>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {summary?.totalConverted ?? 0}
                                <span className="text-xs font-normal text-slate-500 ml-1">件</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">フォームから送信完了した数</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-amber-50/50 to-white dark:from-slate-900 dark:to-slate-800/80">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">コンバージョン率 (CVR)</span>
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                                {summary?.conversionRate ?? 0}
                                <span className="text-xs font-normal text-slate-500 ml-1">%</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">フォーム閲覧からの申込転換率</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. タグ管理・セグメント活用パネル */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Tag className="h-5 w-5 text-blue-600" />
                                ユーザータグ管理＆ステップ配信連携
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                                LIFFフォーム閲覧者や申込者に自動付与されたタグです。タグを選択して特定の離脱者へステップ・一括配信が可能です。
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchData}
                                disabled={isRefreshing}
                                className="h-8 text-xs gap-1.5"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                更新
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {filteredTags.map((tag) => {
                            const isViewed = tag.tagName === 'trial_form_viewed';
                            const isApplied = tag.tagName === 'trial_applied';

                            return (
                                <div
                                    key={tag.tagName}
                                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-600 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <Badge
                                                variant="secondary"
                                                className={`text-[11px] font-semibold ${
                                                    isViewed
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                                        : isApplied
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {tag.tagLabel}
                                            </Badge>
                                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                                {tag.userCount} <span className="text-[10px] font-normal text-slate-400">人</span>
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                                            {tag.description}
                                        </p>
                                    </div>

                                    {onSelectTagForBroadcast && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onSelectTagForBroadcast(tag.tagName)}
                                            className="w-full text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 justify-center h-7 gap-1"
                                        >
                                            <Send className="h-3 w-3" />
                                            このタグに配信作成
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 3. アクセス・クリック履歴ログ詳細テーブル */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-600" />
                                LIFFフォーム アクセス・クリック履歴ログ
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                                LINE公式アカウントから体験予約フォーム（LIFF）を開いたユーザーの最新リアルタイム履歴です
                            </CardDescription>
                        </div>
                        <div className="w-full sm:w-64">
                            <Input
                                placeholder="LINE IDや名前で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                    <th className="py-2.5 px-4 font-semibold">アクセス日時</th>
                                    <th className="py-2.5 px-4 font-semibold">LINEユーザー</th>
                                    <th className="py-2.5 px-4 font-semibold">フォーム種別</th>
                                    <th className="py-2.5 px-4 font-semibold">ご紹介者様</th>
                                    <th className="py-2.5 px-4 font-semibold">ステータス</th>
                                    <th className="py-2.5 px-4 font-semibold">参照元 (UTM)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            ログを読み込み中...
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            アクセスログはまだ記録されていません。公式LINEのリッチメニューからLIFFを開くと自動記録されます。
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const dateStr = new Date(log.created_at).toLocaleString('ja-JP', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                                                    {dateStr}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {log.display_name || (log.line_user_id ? log.line_user_id.slice(0, 10) + '...' : '未認証')}
                                                    </div>
                                                    {log.line_user_id && (
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            {log.line_user_id}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                        {log.form_type === 'trial' ? '体験申込フォーム' : log.form_type}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {log.referrer_name ? (
                                                        <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                                            🎁 {log.referrer_name} 様
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {log.is_converted ? (
                                                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            申込完了 (CV)
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            閲覧・離脱
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-[11px] text-slate-500">
                                                    {log.utm_source ? (
                                                        <span>{log.utm_source} {log.utm_campaign ? `(${log.utm_campaign})` : ''}</span>
                                                    ) : (
                                                        <span className="text-slate-400">LINE公式経由</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
