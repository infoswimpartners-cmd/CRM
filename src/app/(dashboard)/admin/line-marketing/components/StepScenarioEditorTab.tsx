'use client';

/**
 * 体験後ステップ配信シナリオエディタメインタブコンポーネント
 * 
 * @dnd-kit による直感的なカード型ステップのD&D並び替え、ステップ追加・編集・削除、
 * 有効/無効切り替え、および本入会自動スキップ安全制御の案内を提供します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { StepRuleItem } from '@/types/line-marketing';
import {
    getStepRules,
    reorderStepRules,
    deleteStepRule,
    toggleStepRuleActive,
} from '@/actions/line-marketing';
import { SortableStepCard } from './SortableStepCard';
import { StepEditorModal } from './StepEditorModal';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    RefreshCw,
    ShieldCheck,
    Info,
    Layers,
    Loader2,
    Tag,
    Sparkles
} from 'lucide-react';

interface StepScenarioEditorTabProps {
    onUpdate?: () => void;
}

export function StepScenarioEditorTab({ onUpdate }: StepScenarioEditorTabProps) {
    const [rules, setRules] = useState<StepRuleItem[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('trial_done');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // SSRハイドレーション防止フラグ
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // モーダル状態
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<StepRuleItem | null>(null);

    // 削除確認ダイアログ状態
    const [deletingRule, setDeletingRule] = useState<StepRuleItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // DnD センサー設定 (クリック操作とドラッグの誤判定を防ぐ activationConstraint)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // ルール一覧取得（タグ別）
    const loadRules = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getStepRules(selectedTag);
            if (res.success) {
                setRules(res.rules);
            } else {
                toast.error(res.error || 'ステップルールの取得に失敗しました。');
            }
        } catch (err: any) {
            console.error('[StepScenarioEditorTab] load error:', err);
            toast.error('ルールの読み込み中にエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTag]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    // ドラッグ＆ドロップ並び替え完了処理 (楽観的更新 + サーバー同期)
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = rules.findIndex(r => r.id === active.id);
        const newIndex = rules.findIndex(r => r.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const previousRules = [...rules];
        const newRules = arrayMove(rules, oldIndex, newIndex);

        // 楽観的UI更新
        setRules(newRules);
        setIsSavingOrder(true);

        try {
            const orderedIds = newRules.map(r => r.id);
            const res = await reorderStepRules(orderedIds);
            if (!res.success) {
                throw new Error(res.error || '並び順の保存に失敗しました。');
            }
            toast.success('ステップの並び順を更新しました。');
            if (onUpdate) onUpdate();
        } catch (err: any) {
            console.error('[StepScenarioEditorTab] reorder error:', err);
            toast.error('並び替えの保存に失敗したため元に戻しました。');
            setRules(previousRules); // ロールバック
        } finally {
            setIsSavingOrder(false);
        }
    };

    // 有効/無効切り替え
    const handleToggleActive = async (id: string, currentActive: boolean) => {
        setTogglingId(id);
        const nextActive = !currentActive;

        // 楽観的更新
        setRules(prev => prev.map(r => (r.id === id ? { ...r, isActive: nextActive } : r)));

        try {
            const res = await toggleStepRuleActive(id, nextActive);
            if (!res.success) {
                throw new Error(res.error || 'ステータスの更新に失敗しました。');
            }
            toast.success(nextActive ? 'ステップを有効化しました。' : 'ステップを一時停止しました。');
            if (onUpdate) onUpdate();
        } catch (err: any) {
            console.error('[StepScenarioEditorTab] toggle error:', err);
            toast.error('ステータスの更新に失敗しました。');
            // ロールバック
            setRules(prev => prev.map(r => (r.id === id ? { ...r, isActive: currentActive } : r)));
        } finally {
            setTogglingId(null);
        }
    };

    // 編集モーダルを開く
    const handleOpenEdit = (rule: StepRuleItem) => {
        setEditingRule(rule);
        setIsModalOpen(true);
    };

    // 新規作成モーダルを開く
    const handleOpenCreate = () => {
        setEditingRule(null);
        setIsModalOpen(true);
    };

    // 削除実行
    const handleConfirmDelete = async () => {
        if (!deletingRule) return;

        setIsDeleting(true);
        try {
            const res = await deleteStepRule(deletingRule.id);
            if (!res.success) {
                throw new Error(res.error || 'ステップの削除に失敗しました。');
            }
            toast.success('ステップを削除しました。');
            setDeletingRule(null);
            loadRules(); // 番号連番がバックエンドで再整理されるため再読込
            if (onUpdate) onUpdate();
        } catch (err: any) {
            console.error('[StepScenarioEditorTab] delete error:', err);
            toast.error(err.message || '削除中にエラーが発生しました。');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* タグ別シナリオ切り替えセレクター */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">配信対象タグ・シナリオ:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {[
                        { id: 'trial_done', label: '🏊‍♂️ 体験受講後', desc: '体験後入会促進' },
                        { id: 'trial_form_viewed', label: '⚡ フォーム閲覧未申込', desc: '離脱フォロー' },
                        { id: 'friend_only', label: '💬 友だち追加リード', desc: '初期アプローチ' },
                        { id: 'referral_lead', label: '🎁 お友達紹介', desc: '特典案内' },
                        { id: 'all', label: '📋 すべて', desc: '全ステップ' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedTag(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedTag === tab.id
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 上部説明 & 安全仕様案内バナー */}
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 mt-0.5">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                            {selectedTag === 'trial_done' && '🏊‍♂️ 体験後フォロー自動ステップ配信シナリオ'}
                            {selectedTag === 'trial_form_viewed' && '⚡ フォーム閲覧・未申込 離脱フォロー配信シナリオ'}
                            {selectedTag === 'friend_only' && '💬 公式LINE友だち追加リード 初期ステップ配信シナリオ'}
                            {selectedTag === 'referral_lead' && '🎁 お友達紹介キャンペーン案内ステップ配信シナリオ'}
                            {selectedTag === 'all' && '📋 全ステップ配信シナリオ一覧'}
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                            {selectedTag === 'trial_done' && '生徒のステータスが「体験レッスン受講完了（trial_done）」になった日を起点（0日目）として、設定した経過日数・配信時刻にLINEメッセージを自動配信します。'}
                            {selectedTag === 'trial_form_viewed' && '体験予約フォーム（LIFF）を開いた日を起点として、未申込のユーザーに対してフォローメッセージを自動配信します。申込完了すると自動スキップされます。'}
                            {selectedTag === 'friend_only' && '公式LINEを友だち追加した日を起点として、出張プールやスクールの魅力を定期的に自動配信します。'}
                            {selectedTag === 'referral_lead' && 'お友達紹介キャンペーン対象者へ、特別価格（3,500円）の体験予約促進や特典案内を配信します。'}
                            {selectedTag === 'all' && '登録済みのすべてのステップ配信ルールを表示しています。'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded w-fit">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                            <span>安全制御: 本入会（status: active）または退会した生徒には、以降のステップ配信が自動的に安全スキップされます。</span>
                        </div>
                    </div>
                </div>

                {/* アクションボタン群 */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadRules}
                        disabled={isLoading}
                        className="h-9 text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                        更新
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        ステップを追加
                    </Button>
                </div>
            </div>

            {/* ステップ一覧コンテナ */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-sm text-slate-500 font-medium">ステップルールを読み込み中...</p>
                </div>
            ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <Layers className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">ステップ配信がまだ登録されていません</h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                        「ステップを追加」ボタンから、体験受講完了後のフォローメッセージ（1日後、3日後など）を作成してください。
                    </p>
                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        最初のステップを追加
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>全 {rules.length} ステップ（ドラッグハンドルを掴んで上下に並び替え可能）</span>
                        {isSavingOrder && (
                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                並び順を保存中...
                            </span>
                        )}
                    </div>

                    {isMounted ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={rules.map(r => r.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {rules.map((rule, idx) => (
                                        <SortableStepCard
                                            key={rule.id}
                                            rule={rule}
                                            index={idx}
                                            onEdit={handleOpenEdit}
                                            onDelete={setDeletingRule}
                                            onToggleActive={handleToggleActive}
                                            isToggling={togglingId === rule.id}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        // SSRマウント前の静的フォールバック
                        <div className="space-y-3">
                            {rules.map((rule, idx) => (
                                <SortableStepCard
                                    key={rule.id}
                                    rule={rule}
                                    index={idx}
                                    onEdit={handleOpenEdit}
                                    onDelete={setDeletingRule}
                                    onToggleActive={handleToggleActive}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 新規・編集モーダル */}
            <StepEditorModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                ruleToEdit={editingRule}
                defaultTag={selectedTag !== 'all' ? selectedTag : 'trial_done'}
                onSaved={() => {
                    loadRules();
                    if (onUpdate) onUpdate();
                }}
            />

            {/* 削除確認ダイアログ */}
            <AlertDialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-slate-900">
                            ステップ配信ルールの削除
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-slate-600">
                            ステップ「<strong className="text-slate-900">{deletingRule?.title}</strong>」を削除してもよろしいですか？
                            <br />
                            削除後、残りのステップ番号は自動的に連番に再整理されます。この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    削除中...
                                </>
                            ) : (
                                '削除する'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
