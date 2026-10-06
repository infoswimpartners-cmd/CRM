'use client';

/**
 * LINEマーケティング管理画面ヘッダーコンポーネント
 * 
 * タイトル、説明、体験完了生徒手動同期ボタン、全体更新ボタンを提供します。
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw, RotateCcw, Loader2 } from 'lucide-react';

interface LineMarketingHeaderProps {
    onSyncTrialDone: () => Promise<void> | void;
    onRefresh: () => Promise<void> | void;
    isSyncing: boolean;
    isRefreshing: boolean;
}

export const LineMarketingHeader: React.FC<LineMarketingHeaderProps> = ({
    onSyncTrialDone,
    onRefresh,
    isSyncing,
    isRefreshing,
}) => {
    return (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/20 shadow-inner">
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        LINEマーケティング
                    </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 pl-0.5 max-w-2xl leading-relaxed">
                    ステータス・属性別のセグメント一括配信、体験後ステップ配信、および配信ログ追跡
                </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                {/* 体験完了生徒手動同期ボタン */}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onSyncTrialDone}
                    disabled={isSyncing || isRefreshing}
                    className="h-9 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600 shadow-sm"
                    title="体験完了（trial_done）の生徒をステップ進行管理テーブルへ同期します"
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-blue-400" />
                            同期中...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                            体験完了生徒を同期
                        </>
                    )}
                </Button>

                {/* 全体更新ボタン */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing || isSyncing}
                    className="h-9 px-3 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60"
                    title="最新のKPIデータおよび画面状態を再取得します"
                >
                    <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    更新
                </Button>
            </div>
        </div>
    );
};
