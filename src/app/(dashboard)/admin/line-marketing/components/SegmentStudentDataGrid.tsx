'use client';

/**
 * セグメント生徒プレビューデータグリッドコンポーネント
 * 
 * デスクトップ表示（>=768px）では洗練されたモダンテーブル、
 * モバイル表示（<768px）ではスマートフォンに最適化されたカード型リストへ自動切り替えます。
 * ステータス彩色、タグピル、エリアアイコン、LINE連携バッジ、個別スマホプレビュー確認、
 * 全選択/個別除外トグル、ローディング表示、0件時ガイダンスを備えます。
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Smartphone, Loader2, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { FilterPreviewStudent } from '@/types/line-marketing';

export type StudentPreviewItem = FilterPreviewStudent;

export interface SegmentStudentDataGridProps {
    students: StudentPreviewItem[];
    excludedStudentIds: Set<string>;
    onToggleExclude: (id: string) => void;
    onToggleAll: () => void;
    isLoading: boolean;
    onOpenPhonePreview: (student: StudentPreviewItem) => void;
}

// ステータスに応じたモダンバッジスタイリング
const getStatusBadgeStyle = (status: string, statusLabel: string) => {
    const s = (status || '').toLowerCase();
    const l = statusLabel || '';

    if (s.includes('active') || l.includes('本会員') || l.includes('契約中') || l.includes('在籍')) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (s.includes('trial_done') || l.includes('受講済')) {
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    }
    if (s.includes('applied') || l.includes('申込')) {
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    }
    if (s.includes('dormant') || s.includes('resting') || l.includes('休会')) {
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
    }
    if (s.includes('withdrawn') || l.includes('退会')) {
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

// タグに応じたモダンピルスタイリング
const getTagBadge = (tag: string) => {
    switch (tag) {
        case 'trial_form_viewed':
            return {
                label: '⚡ フォーム閲覧',
                className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
            };
        case 'trial_applied':
            return {
                label: '📝 体験申込済',
                className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
            };
        case 'trial_done':
            return {
                label: '🏊‍♂️ 体験受講後',
                className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
            };
        case 'friend_only':
            return {
                label: '💬 友だち追加',
                className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
            };
        case 'referral_lead':
            return {
                label: '🎁 紹介経由',
                className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
            };
        default:
            return {
                label: `#${tag}`,
                className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
            };
    }
};

export const SegmentStudentDataGrid: React.FC<SegmentStudentDataGridProps> = ({
    students,
    excludedStudentIds,
    onToggleExclude,
    onToggleAll,
    isLoading,
    onOpenPhonePreview,
}) => {
    const lineEligibleStudents = students.filter(s => s.hasLine);
    const targetStudents = lineEligibleStudents.filter(s => !excludedStudentIds.has(s.id));
    const targetCount = targetStudents.length;
    const isAllSelected = lineEligibleStudents.length > 0 && targetCount === lineEligibleStudents.length;

    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <CardTitle className="text-base font-bold">配信対象者プレビュー</CardTitle>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                            条件に合致した生徒一覧です。チェックを外すことで特定の生徒を今回の配信から除外できます。
                        </CardDescription>
                    </div>

                    {/* カウントサマリーバッジ */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800">
                            抽出総数: <span className="font-bold ml-1">{students.length}</span> 名
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            LINE連携済: <span className="font-bold ml-1">{lineEligibleStudents.length}</span> 名
                        </Badge>
                        {excludedStudentIds.size > 0 && (
                            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                                除外: <span className="font-bold ml-1">{excludedStudentIds.size}</span> 名
                            </Badge>
                        )}
                        <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                            送信対象: {targetCount} 名
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {/* 1. デスクトップ表示（>=768px）: テーブル形式 */}
                <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-12 text-center">
                                        <Checkbox
                                            checked={isAllSelected}
                                            disabled={lineEligibleStudents.length === 0}
                                            onCheckedChange={onToggleAll}
                                            aria-label="全選択/解除"
                                            className="min-h-[18px] min-w-[18px]"
                                        />
                                    </TableHead>
                                    <TableHead className="w-24 text-xs font-semibold">会員番号</TableHead>
                                    <TableHead className="text-xs font-semibold">生徒氏名 / タグ</TableHead>
                                    <TableHead className="text-xs font-semibold">ステータス</TableHead>
                                    <TableHead className="text-xs font-semibold">エリア</TableHead>
                                    <TableHead className="text-xs font-semibold">担当コーチ</TableHead>
                                    <TableHead className="text-xs font-semibold">受講プラン</TableHead>
                                    <TableHead className="w-24 text-xs font-semibold text-center">LINE連携</TableHead>
                                    <TableHead className="w-24 text-xs font-semibold text-right">プレビュー</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-36 text-center text-xs text-slate-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                                生徒データを抽出・検証中...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : students.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-36 text-center text-xs text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                                                <AlertCircle className="w-6 h-6 text-slate-400" />
                                                <p className="font-medium text-slate-600 dark:text-slate-400">
                                                    該当する生徒が見つかりませんでした。
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    上部のフィルター条件や検索キーワードを変更してください。
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.map(student => {
                                        const isExcluded = excludedStudentIds.has(student.id);
                                        const isEligible = student.hasLine;
                                        const isSelected = isEligible && !isExcluded;

                                        return (
                                            <TableRow
                                                key={student.id}
                                                className={`transition-colors ${
                                                    !isEligible
                                                        ? 'opacity-55 bg-slate-50/50 dark:bg-slate-900/30'
                                                        : isExcluded
                                                        ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        disabled={!isEligible}
                                                        onCheckedChange={() => onToggleExclude(student.id)}
                                                        className="min-h-[18px] min-w-[18px]"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                    {student.studentNumber}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-slate-100">
                                                            {student.fullName}
                                                        </span>
                                                        {student.fullNameKana && (
                                                            <span className="block text-[10px] text-slate-400">
                                                                {student.fullNameKana}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {student.tags && student.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {student.tags.map(t => {
                                                                const badge = getTagBadge(t);
                                                                return (
                                                                    <span
                                                                        key={t}
                                                                        className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-medium border ${badge.className}`}
                                                                    >
                                                                        {badge.label}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] px-1.5 py-0.5 font-semibold ${getStatusBadgeStyle(
                                                            student.status,
                                                            student.statusLabel
                                                        )}`}
                                                    >
                                                        {student.statusLabel || student.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                        <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                                                        {student.area || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                    {student.coachName || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                    {student.planName || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {student.hasLine ? (
                                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] border-emerald-300 hover:bg-emerald-100">
                                                            <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                                                            連携済
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] text-slate-400">
                                                            未連携
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onOpenPhonePreview(student)}
                                                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                                    >
                                                        <Smartphone className="w-3.5 h-3.5 mr-1" />
                                                        確認
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* 2. モバイル表示（<768px）: 最適化カード型リスト */}
                <div className="block md:hidden space-y-2.5">
                    {/* モバイル用全選択バー */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox
                                checked={isAllSelected}
                                disabled={lineEligibleStudents.length === 0}
                                onCheckedChange={onToggleAll}
                                className="min-h-[22px] min-w-[22px]"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                LINE連携者をすべて選択
                            </span>
                        </label>
                        <span className="text-xs text-slate-500 font-medium">
                            {targetCount} / {lineEligibleStudents.length} 名
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            生徒データを抽出中...
                        </div>
                    ) : students.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4">
                            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                            該当する生徒が見つかりませんでした。条件を変更してください。
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                            {students.map(student => {
                                const isExcluded = excludedStudentIds.has(student.id);
                                const isEligible = student.hasLine;
                                const isSelected = isEligible && !isExcluded;

                                return (
                                    <div
                                        key={student.id}
                                        className={`p-3 rounded-lg border transition-all ${
                                            !isEligible
                                                ? 'bg-slate-50/60 border-slate-200 opacity-60 dark:bg-slate-900/40 dark:border-slate-800'
                                                : isExcluded
                                                ? 'bg-amber-50/30 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                                                : 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs dark:bg-slate-900 dark:border-slate-800'
                                        }`}
                                    >
                                        {/* カード上部: チェックボックス & 会員番号 & ステータス & 連携バッジ */}
                                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                                                <Checkbox
                                                    checked={isSelected}
                                                    disabled={!isEligible}
                                                    onCheckedChange={() => onToggleExclude(student.id)}
                                                    className="min-h-[22px] min-w-[22px]"
                                                />
                                                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    #{student.studentNumber}
                                                </span>
                                            </label>

                                            <div className="flex items-center gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0 font-semibold ${getStatusBadgeStyle(
                                                        student.status,
                                                        student.statusLabel
                                                    )}`}
                                                >
                                                    {student.statusLabel || student.status}
                                                </Badge>
                                                {student.hasLine ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 border-emerald-300">
                                                        連携済
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-slate-400">
                                                        未連携
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* カード中部: 氏名 & カナ & タグ */}
                                        <div className="pt-2">
                                            <div className="flex items-baseline justify-between">
                                                <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {student.fullName}
                                                </div>
                                                {student.fullNameKana && (
                                                    <div className="text-[10px] text-slate-400">
                                                        {student.fullNameKana}
                                                    </div>
                                                )}
                                            </div>

                                            {student.tags && student.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {student.tags.map(t => {
                                                        const badge = getTagBadge(t);
                                                        return (
                                                            <span
                                                                key={t}
                                                                className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium border ${badge.className}`}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* カード下部: 属性メタ & プレビューボタン */}
                                        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500">
                                            <div className="flex items-center gap-2 truncate text-[11px]">
                                                <span className="inline-flex items-center gap-0.5 font-medium text-slate-700 dark:text-slate-300">
                                                    <MapPin className="h-3 w-3 text-emerald-600" />
                                                    {student.area || '-'}
                                                </span>
                                                <span className="text-slate-300">|</span>
                                                <span className="truncate">{student.coachName || 'コーチ未定'}</span>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onOpenPhonePreview(student)}
                                                className="min-h-[38px] px-2.5 text-xs text-slate-700 hover:text-emerald-700 border-slate-200"
                                            >
                                                <Smartphone className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                実機確認
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
