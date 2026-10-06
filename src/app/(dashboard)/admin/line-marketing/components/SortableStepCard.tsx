'use client';

/**
 * @dnd-kit/sortable 対応の個別ステップカードコンポーネント
 * 
 * ドラッグハンドルによる直感的な並び替え、ステップ詳細表示、有効/無効トグル、
 * 編集・削除ボタンを提供します。
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepRuleItem } from '@/types/line-marketing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    GripVertical,
    Clock,
    Calendar,
    Pencil,
    Trash2,
    CheckCircle2,
    PauseCircle
} from 'lucide-react';

interface SortableStepCardProps {
    rule: StepRuleItem;
    index: number;
    onEdit: (rule: StepRuleItem) => void;
    onDelete: (rule: StepRuleItem) => void;
    onToggleActive: (id: string, currentActive: boolean) => Promise<void>;
    isToggling?: boolean;
}

export function SortableStepCard({
    rule,
    index,
    onEdit,
    onDelete,
    onToggleActive,
    isToggling = false,
}: SortableStepCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: rule.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                isDragging
                    ? 'border-blue-400 bg-blue-50/40 shadow-lg ring-2 ring-blue-300'
                    : !rule.isActive
                    ? 'border-slate-200 bg-slate-50/70 text-slate-400 opacity-75'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
            }`}
        >
            {/* ドラッグハンドル (listeners/attributes はここにのみ付与して誤判定を防止) */}
            <div
                {...attributes}
                {...listeners}
                aria-label="並び替えハンドル"
                className="mt-1 p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100 transition-colors"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            {/* カード本体コンテンツ */}
            <div className="flex-1 min-w-0">
                {/* ヘッダー: ステップ番号、日数、配信時刻、ステータス */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge
                        variant="secondary"
                        className={`font-semibold text-xs px-2.5 py-0.5 ${
                            rule.isActive
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                        Step {index + 1}
                    </Badge>

                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{rule.targetTag === 'friend_only' ? '登録から' : rule.targetTag === 'trial_form_viewed' ? '閲覧から' : '体験から'} {rule.delayDays} 日後</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{rule.sendTime}</span>
                    </div>

                    {rule.targetTag && (
                        <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {rule.targetTag === 'trial_done' && '🏊‍♂️ 体験受講後'}
                            {rule.targetTag === 'trial_form_viewed' && '⚡ フォーム閲覧未申込'}
                            {rule.targetTag === 'friend_only' && '💬 友だち追加'}
                            {rule.targetTag === 'referral_lead' && '🎁 お友達紹介'}
                            {rule.targetTag === 'all' && '全対象'}
                        </span>
                    )}

                    {rule.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            有効
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            <PauseCircle className="w-3 h-3" />
                            一時停止中
                        </span>
                    )}
                </div>

                {/* タイトル */}
                <h4 className={`text-base font-bold mb-1.5 break-words ${rule.isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {rule.title}
                </h4>

                {/* メッセージ本文抜粋 (2行表示) */}
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono whitespace-pre-wrap line-clamp-2 break-all mb-3">
                    {rule.messageText}
                </p>

                {/* フッターアクション */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {/* 有効/無効スイッチ */}
                    <div className="flex items-center gap-2">
                        <Switch
                            id={`step-active-${rule.id}`}
                            checked={rule.isActive}
                            disabled={isToggling}
                            onCheckedChange={() => onToggleActive(rule.id, rule.isActive)}
                        />
                        <label
                            htmlFor={`step-active-${rule.id}`}
                            className="text-xs font-medium text-slate-600 cursor-pointer select-none"
                        >
                            {rule.isActive ? '配信中' : '停止中'}
                        </label>
                    </div>

                    {/* 編集・削除ボタン */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(rule)}
                            className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                        >
                            <Pencil className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            編集
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(rule)}
                            className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            削除
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
