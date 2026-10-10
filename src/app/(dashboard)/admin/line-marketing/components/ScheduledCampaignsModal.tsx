'use client';

/**
 * 配信予約・キャンペーン管理モーダル / 一覧パネル
 * 
 * 予約配信中・送信済み・キャンセル済みの一括配信キャンペーンの確認、
 * 予約日時の変更、タイトル・メッセージ本文の修正、予約キャンセル・削除を実行できます。
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Clock,
    Calendar,
    Edit3,
    Trash2,
    XCircle,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Send,
    Loader2,
    FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { LineBroadcastCampaign } from '@/types/line-marketing';
import {
    getBroadcastCampaigns,
    updateBroadcastCampaign,
    cancelBroadcastCampaign,
    deleteBroadcastCampaign,
    executeScheduledBroadcastsAction,
} from '@/actions/line-marketing';

interface ScheduledCampaignsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCampaignUpdated?: () => void;
}

export const ScheduledCampaignsModal: React.FC<ScheduledCampaignsModalProps> = ({
    isOpen,
    onClose,
    onCampaignUpdated,
}) => {
    const [campaigns, setCampaigns] = useState<LineBroadcastCampaign[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [filterStatus, setFilterStatus] = useState<string>('scheduled');

    // 編集モーダル用の状態
    const [editingCampaign, setEditingCampaign] = useState<LineBroadcastCampaign | null>(null);
    const [editTitle, setEditTitle] = useState<string>('');
    const [editMessage, setEditMessage] = useState<string>('');
    const [editScheduledAt, setEditScheduledAt] = useState<string>('');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isExecutingId, setIsExecutingId] = useState<string | null>(null);
    const [isBatchExecuting, setIsBatchExecuting] = useState<boolean>(false);

    // キャンペーン一覧読み込み
    const loadCampaigns = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getBroadcastCampaigns({
                status: filterStatus === 'all' ? undefined : filterStatus,
                limit: 50,
            });
            if (res.success) {
                setCampaigns(res.campaigns);
            } else {
                toast.error('配信一覧の取得に失敗しました: ' + (res.error || ''));
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        if (isOpen) {
            loadCampaigns();
        }
    }, [isOpen, loadCampaigns]);

    // 編集開始
    const handleStartEdit = (camp: LineBroadcastCampaign) => {
        setEditingCampaign(camp);
        setEditTitle(camp.title || '');
        setEditMessage(camp.message_template || camp.message_text || '');
        if (camp.scheduled_at) {
            // ISO文字列を datetime-local 形式 (YYYY-MM-DDTHH:mm) に変換
            const dt = new Date(camp.scheduled_at);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const localIso = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
            setEditScheduledAt(localIso);
        } else {
            setEditScheduledAt('');
        }
    };

    // 編集保存
    const handleSaveEdit = async () => {
        if (!editingCampaign) return;
        if (!editTitle.trim()) {
            toast.error('キャンペーンタイトルを入力してください');
            return;
        }
        if (!editMessage.trim()) {
            toast.error('配信本文を入力してください');
            return;
        }

        setIsSaving(true);
        try {
            const res = await updateBroadcastCampaign(editingCampaign.id, {
                title: editTitle.trim(),
                messageTemplate: editMessage.trim(),
                scheduledAt: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
            });

            if (res.success) {
                toast.success('予約配信内容を更新しました');
                setEditingCampaign(null);
                await loadCampaigns();
                if (onCampaignUpdated) onCampaignUpdated();
            } else {
                toast.error('更新に失敗しました: ' + (res.error || ''));
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // 予約キャンペーンの即時送信実行
    const handleExecuteNow = async (camp: LineBroadcastCampaign) => {
        if (!confirm(`「${camp.title}」を今すぐ対象生徒（${camp.target_count || 0}名）へ一斉送信しますか？\n（LINE公式アカウントから実際のメッセージが送信されます）`)) {
            return;
        }

        setIsExecutingId(camp.id);
        try {
            const res = await executeScheduledBroadcastsAction({ campaignId: camp.id });
            if (res.success) {
                toast.success(`送信完了: ${res.successCount || 0}件成功 / ${res.failedCount || 0}件失敗`);
                await loadCampaigns();
                if (onCampaignUpdated) onCampaignUpdated();
            } else {
                toast.error('配信実行に失敗しました: ' + (res.error || ''));
            }
        } catch (err: any) {
            toast.error('配信エラー: ' + err.message);
        } finally {
            setIsExecutingId(null);
        }
    };

    // 予定時刻が到来した全予約キャンペーンの一括ディスパッチ実行
    const handleBatchExecute = async () => {
        if (!confirm('予定時刻が到来しているすべての予約配信を今すぐ実行しますか？')) {
            return;
        }

        setIsBatchExecuting(true);
        try {
            const res = await executeScheduledBroadcastsAction();
            if (res.success) {
                toast.success(`一括実行完了: ${res.processedCampaigns || 0}件のキャンペーン (${res.successCount || 0}通送信成功)`);
                await loadCampaigns();
                if (onCampaignUpdated) onCampaignUpdated();
            } else {
                toast.error('一括実行に失敗しました: ' + (res.error || ''));
            }
        } catch (err: any) {
            toast.error('一括実行エラー: ' + err.message);
        } finally {
            setIsBatchExecuting(false);
        }
    };

    // 予約キャンセル
    const handleCancelCampaign = async (camp: LineBroadcastCampaign) => {
        if (!confirm(`「${camp.title}」の配信予約をキャンセルしますか？\n（LINEへの送信は中止されます）`)) {
            return;
        }

        try {
            const res = await cancelBroadcastCampaign(camp.id);
            if (res.success) {
                toast.success('配信予約をキャンセルしました');
                await loadCampaigns();
                if (onCampaignUpdated) onCampaignUpdated();
            } else {
                toast.error('キャンセルに失敗しました: ' + (res.error || ''));
            }
        } catch (err: any) {
            toast.error('エラー: ' + err.message);
        }
    };

    // 削除
    const handleDeleteCampaign = async (camp: LineBroadcastCampaign) => {
        if (!confirm(`「${camp.title}」を削除しますか？`)) {
            return;
        }

        try {
            const res = await deleteBroadcastCampaign(camp.id);
            if (res.success) {
                toast.success('キャンペーンを削除しました');
                await loadCampaigns();
                if (onCampaignUpdated) onCampaignUpdated();
            } else {
                toast.error('削除に失敗しました: ' + (res.error || ''));
            }
        } catch (err: any) {
            toast.error('エラー: ' + err.message);
        }
    };

    // ステータスバッジレンダリング
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled':
                return (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        予約中
                    </Badge>
                );
            case 'sending':
                return (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        送信中
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        送信完了
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge variant="secondary" className="text-slate-500 text-[10px] flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        キャンセル済
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 text-[10px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        送信失敗
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        {status}
                    </Badge>
                );
        }
    };

    // 日時フォーマット
    const formatDate = (isoStr?: string | null) => {
        if (!isoStr) return '-';
        try {
            const dt = new Date(isoStr);
            return dt.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return isoStr;
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <DialogTitle className="text-base font-bold">
                                    一括配信予約・送信キャンペーンの管理
                                </DialogTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBatchExecute}
                                    disabled={isBatchExecuting || isLoading}
                                    className="h-8 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                    title="予定日時を過ぎた予約配信を今すぐ実行"
                                >
                                    <Send className={`w-3.5 h-3.5 mr-1 ${isBatchExecuting ? 'animate-spin' : ''}`} />
                                    {isBatchExecuting ? '送信中...' : '予定到来分を一括送信'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadCampaigns}
                                    disabled={isLoading}
                                    className="h-8 text-xs text-slate-600"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                    更新
                                </Button>
                            </div>
                        </div>
                        <DialogDescription className="text-xs">
                            予約中のメッセージ確認・配信日時の変更・本文の修正・予約キャンセルが可能です。
                        </DialogDescription>
                    </DialogHeader>

                    {/* フィルタピル */}
                    <div className="flex items-center gap-2 py-2 shrink-0 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-semibold mr-1">状態絞り込み:</span>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('scheduled')}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                                filterStatus === 'scheduled'
                                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800'
                            }`}
                        >
                            ⏰ 予約中のみ
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('all')}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-slate-900 text-white font-bold shadow-xs dark:bg-slate-100 dark:text-slate-900'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800'
                            }`}
                        >
                            すべて（履歴含む）
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('completed')}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                                filterStatus === 'completed'
                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800'
                            }`}
                        >
                            ✅ 送信完了
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('cancelled')}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                                filterStatus === 'cancelled'
                                    ? 'bg-slate-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800'
                            }`}
                        >
                            🚫 キャンセル済
                        </button>
                    </div>

                    {/* キャンペーン一覧テーブル */}
                    <div className="flex-1 overflow-y-auto mt-2 border border-slate-200 dark:border-slate-800 rounded-lg">
                        {isLoading ? (
                            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                                <span className="text-xs">キャンペーンデータを読み込み中...</span>
                            </div>
                        ) : campaigns.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs">該当するキャンペーンはありません。</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="w-24 text-xs font-bold">状態</TableHead>
                                        <TableHead className="text-xs font-bold">キャンペーン名 / 配信予定日時</TableHead>
                                        <TableHead className="w-20 text-xs font-bold text-center">対象</TableHead>
                                        <TableHead className="w-24 text-xs font-bold text-center">結果</TableHead>
                                        <TableHead className="w-56 text-xs font-bold text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campaigns.map(camp => {
                                        const isScheduled = camp.status === 'scheduled';
                                        return (
                                            <TableRow key={camp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <TableCell className="align-top py-3">
                                                    {renderStatusBadge(camp.status)}
                                                </TableCell>
                                                <TableCell className="align-top py-3">
                                                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                                        {camp.title}
                                                    </div>
                                                    <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        <span>予定: {formatDate(camp.scheduled_at)}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-900 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                                                        {camp.message_template || camp.message_text}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="align-top py-3 text-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {camp.target_count || 0}名
                                                    </span>
                                                </TableCell>
                                                <TableCell className="align-top py-3 text-center">
                                                    {camp.status === 'completed' ? (
                                                        <span className="text-xs text-emerald-600 font-semibold">
                                                            {camp.sent_count || camp.success_count || 0}件成功
                                                        </span>
                                                    ) : camp.status === 'failed' ? (
                                                        <span className="text-xs text-rose-600 font-semibold">
                                                            {camp.failed_count || 0}件失敗
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-top py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {isScheduled && (
                                                            <>
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => handleExecuteNow(camp)}
                                                                    disabled={isExecutingId === camp.id}
                                                                    className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                                                                    title="今すぐこの予約配信を実行"
                                                                >
                                                                    {isExecutingId === camp.id ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                                                    ) : (
                                                                        <Send className="w-3.5 h-3.5 mr-1" />
                                                                    )}
                                                                    今すぐ送信
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleStartEdit(camp)}
                                                                    className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                    title="予約内容を編集"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                                                                    編集
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleCancelCampaign(camp)}
                                                                    className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                                                    title="予約をキャンセル"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {!isScheduled && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteCampaign(camp)}
                                                                className="h-7 px-2 text-xs text-slate-400 hover:text-rose-600"
                                                                title="削除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 予約編集サブモーダル */}
            {editingCampaign && (
                <Dialog open={!!editingCampaign} onOpenChange={open => !open && setEditingCampaign(null)}>
                    <DialogContent className="max-w-lg p-5">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-blue-600" />
                                <DialogTitle className="text-base font-bold">配信予約の編集</DialogTitle>
                            </div>
                            <DialogDescription className="text-xs">
                                予約タイトル、メッセージ本文、および配信日時を変更できます。
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 pt-2">
                            {/* タイトル */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    タイトル
                                </Label>
                                <Input
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="h-8 text-xs"
                                    placeholder="キャンペーンタイトル"
                                />
                            </div>

                            {/* 予約日時 */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    配信予定日時
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={editScheduledAt}
                                    onChange={e => setEditScheduledAt(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>

                            {/* 本文 */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    配信メッセージ本文
                                </Label>
                                <Textarea
                                    value={editMessage}
                                    onChange={e => setEditMessage(e.target.value)}
                                    rows={8}
                                    className="text-xs leading-relaxed"
                                    placeholder="メッセージ本文..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCampaign(null)}
                                disabled={isSaving}
                                className="h-8 text-xs"
                            >
                                キャンセル
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        保存中...
                                    </>
                                ) : (
                                    '変更を保存'
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};
