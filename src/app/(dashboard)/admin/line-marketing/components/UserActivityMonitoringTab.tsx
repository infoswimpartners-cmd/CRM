'use client';

/**
 * LINE友だち行動監視・アクティビティ履歴タブ
 * 
 * 責務:
 *   1. 友だち追加後の全アクション（追加・メッセージ・スタンプ・リッチメニュー操作・フォーム閲覧・申込完了・ブロック）のリアルタイム監視
 *   2. アクション種別ごとのKPIサマリーカード表示
 *   3. フィルター検索および個別トークへのワンクリック連携
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Activity,
    UserPlus,
    UserX,
    MessageSquare,
    Smile,
    Image,
    MousePointerClick,
    Eye,
    CheckCircle2,
    RefreshCw,
    Search,
    Clock,
    Send,
    Radio
} from 'lucide-react';
import { toast } from 'sonner';
import { getUserActivitiesAction, getActivityKpiSummaryAction } from '@/actions/line-marketing';
import { LineUserActivity, ActivityKpiSummary, LineActivityType } from '@/types/line-tracking';

interface UserActivityMonitoringTabProps {
    onNavigateToChat?: (lineUserId: string) => void;
}

export function UserActivityMonitoringTab({ onNavigateToChat }: UserActivityMonitoringTabProps) {
    const [activities, setActivities] = useState<LineUserActivity[]>([]);
    const [kpi, setKpi] = useState<ActivityKpiSummary>({
        totalActivities: 0,
        todayActivities: 0,
        followCount: 0,
        messageCount: 0,
        formViewCount: 0,
        postbackCount: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsRefreshing(true);
        try {
            const [actsRes, kpiRes] = await Promise.all([
                getUserActivitiesAction(150, selectedType),
                getActivityKpiSummaryAction()
            ]);

            if (actsRes.success && actsRes.activities) {
                setActivities(actsRes.activities);
            }
            if (kpiRes.success && kpiRes.kpi) {
                setKpi(kpiRes.kpi);
            }
        } catch (e) {
            console.error('[UserActivityMonitoringTab] Fetch error:', e);
            if (!isSilent) toast.error('行動履歴の取得に失敗しました');
        } finally {
            setIsLoading(false);
            if (!isSilent) setIsRefreshing(false);
        }
    }, [selectedType]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 10秒ごとの自動更新
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    // 検索フィルタリング
    const filteredActivities = activities.filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const name = (a.display_name || '').toLowerCase();
        const userId = (a.line_user_id || '').toLowerCase();
        const title = (a.activity_title || '').toLowerCase();
        const detail = (a.activity_detail || '').toLowerCase();
        return name.includes(q) || userId.includes(q) || title.includes(q) || detail.includes(q);
    });

    // アクション種別のバッジ＆アイコン描画
    const renderActivityBadge = (type: LineActivityType) => {
        switch (type) {
            case 'follow':
                return (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-[11px] font-semibold">
                        <UserPlus className="h-3 w-3" />
                        友だち追加
                    </Badge>
                );
            case 'unfollow':
                return (
                    <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
                        <UserX className="h-3 w-3" />
                        ブロック
                    </Badge>
                );
            case 'message_text':
                return (
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px] font-semibold">
                        <MessageSquare className="h-3 w-3" />
                        メッセージ受信
                    </Badge>
                );
            case 'message_sticker':
                return (
                    <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 text-[11px] font-semibold">
                        <Smile className="h-3 w-3" />
                        スタンプ受信
                    </Badge>
                );
            case 'message_media':
                return (
                    <Badge className="bg-sky-600 hover:bg-sky-700 text-white gap-1 text-[11px] font-semibold">
                        <Image className="h-3 w-3" />
                        画像・動画
                    </Badge>
                );
            case 'postback':
                return (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-[11px] font-semibold">
                        <MousePointerClick className="h-3 w-3" />
                        リッチメニュー操作
                    </Badge>
                );
            case 'form_view':
                return (
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-[11px] font-semibold">
                        <Eye className="h-3 w-3" />
                        フォーム閲覧
                    </Badge>
                );
            case 'form_confirm':
                return (
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white gap-1 text-[11px] font-semibold">
                        <Clock className="h-3 w-3" />
                        確認画面到達
                    </Badge>
                );
            case 'form_apply':
                return (
                    <Badge className="bg-teal-600 hover:bg-teal-700 text-white gap-1 text-[11px] font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        体験申込完了 (CV)
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary" className="text-[11px]">
                        {type}
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. リアルタイム監視KPIサマリーカード */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                        <span>総アクション数</span>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                        {kpi.totalActivities}
                    </div>
                    <span className="text-[10px] text-slate-400">記録された全行動</span>
                </Card>

                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                        <span>本日のアクション</span>
                        <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {kpi.todayActivities}
                    </div>
                    <span className="text-[10px] text-slate-400">本日発生した行動</span>
                </Card>

                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                        <span>友だち追加</span>
                        <UserPlus className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                        {kpi.followCount}
                    </div>
                    <span className="text-[10px] text-slate-400">新規追加・復帰</span>
                </Card>

                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                        <span>受信メッセージ</span>
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                        {kpi.messageCount}
                    </div>
                    <span className="text-[10px] text-slate-400">テキスト/スタンプ/画像</span>
                </Card>

                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                        <span>フォーム閲覧</span>
                        <Eye className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                        {kpi.formViewCount}
                    </div>
                    <span className="text-[10px] text-slate-400">予約フォーム/確認到達</span>
                </Card>

                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                        <span>リッチメニュー操作</span>
                        <MousePointerClick className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                        {kpi.postbackCount}
                    </div>
                    <span className="text-[10px] text-slate-400">ボタンタップ回数</span>
                </Card>
            </div>

            {/* 2. アクション監視メインカード */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Activity className="h-5 w-5 text-[#06C755]" />
                                LINE友だち行動監視・リアルタイムアクティビティ
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                                公式LINEの友だち追加、メッセージ受信、リッチメニュー操作、フォーム閲覧など、友だちのあらゆる行動を常時監視・記録しています
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="auto-refresh"
                                    checked={autoRefresh}
                                    onCheckedChange={setAutoRefresh}
                                />
                                <Label htmlFor="auto-refresh" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                                    自動更新 (10s)
                                </Label>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchData(false)}
                                disabled={isRefreshing}
                                className="h-8 text-xs gap-1.5"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                更新
                            </Button>
                        </div>
                    </div>

                    {/* フィルター＆検索エリア */}
                    <div className="pt-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                        {/* アクション種別フィルタータブ */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                            {[
                                { id: 'all', label: 'すべて' },
                                { id: 'follow', label: '友だち追加' },
                                { id: 'message_text', label: 'メッセージ' },
                                { id: 'message_sticker', label: 'スタンプ' },
                                { id: 'postback', label: 'メニュー操作' },
                                { id: 'form_view', label: 'フォーム閲覧' },
                                { id: 'form_confirm', label: '確認到達' },
                                { id: 'form_apply', label: '申込完了' },
                                { id: 'unfollow', label: 'ブロック' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setSelectedType(tab.id)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                                        selectedType === tab.id
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* 検索入力 */}
                        <div className="w-full sm:w-64 relative">
                            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="名前・LINE ID・内容で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 text-xs pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">発生日時</th>
                                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">LINE友だち</th>
                                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">アクション種別</th>
                                    <th className="py-2.5 px-4 font-semibold">アクション詳細 / メッセージ内容</th>
                                    <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            行動履歴を読み込み中...
                                        </td>
                                    </tr>
                                ) : filteredActivities.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            該当する行動履歴はありません。LINE友だちの追加やメッセージ送信、リッチメニュー操作があるとリアルタイムに表示されます。
                                        </td>
                                    </tr>
                                ) : (
                                    filteredActivities.map((act) => {
                                        const dateStr = new Date(act.created_at).toLocaleString('ja-JP', {
                                            month: 'numeric',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        });

                                        return (
                                            <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                {/* 発生日時 */}
                                                <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap align-top">
                                                    {dateStr}
                                                </td>

                                                {/* LINE友だち */}
                                                <td className="py-3 px-4 align-top whitespace-nowrap">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                        {act.display_name || 'LINEユーザー'}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                                                        {act.line_user_id}
                                                    </div>
                                                </td>

                                                {/* アクション種別 */}
                                                <td className="py-3 px-4 align-top whitespace-nowrap">
                                                    {renderActivityBadge(act.activity_type)}
                                                </td>

                                                {/* アクション詳細 */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {act.activity_title}
                                                    </div>
                                                    {act.activity_detail && (
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                            {act.activity_detail}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 操作 */}
                                                <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (onNavigateToChat) {
                                                                onNavigateToChat(act.line_user_id);
                                                            } else {
                                                                window.location.href = `/admin/line-marketing?tab=chat&lineUserId=${act.line_user_id}`;
                                                            }
                                                        }}
                                                        className="h-7 text-xs text-[#06C755] hover:text-[#06C755] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 px-2.5 font-medium"
                                                    >
                                                        <Send className="h-3 w-3" />
                                                        個別トーク
                                                    </Button>
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
