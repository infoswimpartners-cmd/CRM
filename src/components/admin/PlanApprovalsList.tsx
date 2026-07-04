'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { approveMembershipChangeRequest, rejectMembershipChangeRequest } from '@/actions/member/membership'
import { toast } from 'sonner'
import { Check, X, Loader2, ShieldAlert, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'

interface RequestItem {
    id: string
    student_id: string
    request_type: 'change_plan' | 'add_plan' | 'cancel_plan'
    requested_is_trio: boolean | null
    requested_membership_type_id: string | null
    note: string | null
    created_at: string
    student: {
        id: string
        full_name: string
        student_number: string | null
        membership_lock_until: string | null
        current_membership: {
            name: string
        } | null
    } | null
    requested: {
        name: string
    } | null
}

interface PlanApprovalsListProps {
    requests: RequestItem[]
}

// 申請種別・変更内容の判定ヘルパー
function resolveRequestInfo(req: RequestItem) {
    if (req.request_type === 'add_plan' && req.requested_is_trio === true) {
        return {
            typeLabel: 'Trio追加',
            typeColor: 'bg-amber-50 text-amber-700 border-amber-200',
            fromText: null,
            toText: 'THE TRIOプランの追加',
        }
    }
    if (req.request_type === 'cancel_plan' && req.requested_is_trio === false) {
        return {
            typeLabel: 'Trio解約',
            typeColor: 'bg-red-50 text-red-700 border-red-200',
            fromText: null,
            toText: 'THE TRIOプランの解約',
        }
    }
    if (req.request_type === 'add_plan') {
        return {
            typeLabel: 'プラン追加',
            typeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            fromText: null,
            toText: req.requested?.name || '—',
        }
    }
    // change_plan (デフォルト)
    return {
        typeLabel: 'プラン変更',
        typeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        fromText: req.student?.current_membership?.name || 'なし',
        toText: req.requested?.name || '解約',
    }
}

export default function PlanApprovalsList({ requests }: PlanApprovalsListProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [rejectOpen, setRejectOpen] = useState(false)
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    const handleApprove = (request: RequestItem) => {
        const isLocked = request.student?.membership_lock_until && new Date(request.student.membership_lock_until) > new Date()
        const lockDateStr = request.student?.membership_lock_until
            ? new Date(request.student.membership_lock_until).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            : ''

        const confirmMsg = isLocked
            ? `⚠️ 【警告】この生徒（${request.student?.full_name}）は現在ロック期間中（制限解除日: ${lockDateStr}）です。\n本当にこの申請を承認しますか？\n（Stripeのサブスクリプションも自動更新されます）`
            : `生徒「${request.student?.full_name}」の申請を承認しますか？\n（Stripeのサブスクリプションも自動更新されます）`

        if (!confirm(confirmMsg)) return

        startTransition(async () => {
            const res = await approveMembershipChangeRequest(request.id)
            if (res.success) {
                toast.success('申請を承認しました。')
                router.refresh()
            } else {
                toast.error(res.error || '承認に失敗しました。')
            }
        })
    }

    const openRejectModal = (requestId: string) => {
        setSelectedRequestId(requestId)
        setRejectReason('')
        setRejectOpen(true)
    }

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRequestId) return

        startTransition(async () => {
            const res = await rejectMembershipChangeRequest(selectedRequestId, rejectReason)
            if (res.success) {
                toast.success('申請を却下しました。')
                setRejectOpen(false)
                setSelectedRequestId(null)
                router.refresh()
            } else {
                toast.error(res.error || '却下に失敗しました。')
            }
        })
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">保留中の申請はありません</h3>
                <p className="text-sm text-slate-500 mt-1">現在、承認待ちのプラン変更・追加・解約申請はありません。</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* ====================================================
                デスクトップ表示（テーブル）
                lg 以上で表示
            ==================================================== */}
            <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                <th className="p-4 pl-6 text-xs font-bold text-slate-400 whitespace-nowrap">生徒</th>
                                <th className="p-4 text-xs font-bold text-slate-400 whitespace-nowrap">種別</th>
                                <th className="p-4 text-xs font-bold text-slate-400 whitespace-nowrap">変更内容</th>
                                <th className="p-4 text-xs font-bold text-slate-400 whitespace-nowrap">申請理由</th>
                                <th className="p-4 text-xs font-bold text-slate-400 whitespace-nowrap">ステータス</th>
                                <th className="p-4 text-xs font-bold text-slate-400 whitespace-nowrap">申請日</th>
                                <th className="p-4 pr-6 text-xs font-bold text-slate-400 text-right whitespace-nowrap">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.map((req) => {
                                const isLocked = req.student?.membership_lock_until && new Date(req.student.membership_lock_until) > new Date()
                                const lockDateStr = req.student?.membership_lock_until
                                    ? new Date(req.student.membership_lock_until).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                                    : ''
                                const { typeLabel, typeColor, fromText, toText } = resolveRequestInfo(req)

                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                                        {/* 生徒情報 */}
                                        <td className="p-4 pl-6 whitespace-nowrap">
                                            <Link
                                                href={`/customers/${req.student?.id}`}
                                                className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-sm block"
                                            >
                                                {req.student?.full_name}
                                            </Link>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                {req.student?.student_number || '—'}
                                            </span>
                                        </td>

                                        {/* 申請種別バッジ */}
                                        <td className="p-4 whitespace-nowrap">
                                            <Badge className={`${typeColor} text-[11px] font-bold whitespace-nowrap`} variant="outline">
                                                {typeLabel}
                                            </Badge>
                                        </td>

                                        {/* 変更内容: from → to を縦積みで表示 */}
                                        <td className="p-4">
                                            <div className="flex flex-col gap-0.5 min-w-[160px]">
                                                {fromText && (
                                                    <span className="text-xs text-slate-500 leading-snug">{fromText}</span>
                                                )}
                                                {fromText && (
                                                    <span className="text-[10px] text-slate-300">↓</span>
                                                )}
                                                <span className="text-xs font-bold text-slate-800 leading-snug">{toText}</span>
                                            </div>
                                        </td>

                                        {/* 申請理由 */}
                                        <td className="p-4 max-w-[200px]">
                                            {req.note ? (
                                                <span
                                                    className="text-xs text-slate-500 line-clamp-2 leading-relaxed"
                                                    title={req.note}
                                                >
                                                    {req.note}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300 italic">記載なし</span>
                                            )}
                                        </td>

                                        {/* ステータス (ロック有無) */}
                                        <td className="p-4 whitespace-nowrap">
                                            {isLocked ? (
                                                <div className="flex flex-col gap-1">
                                                    <Badge
                                                        className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold whitespace-nowrap w-fit"
                                                        variant="outline"
                                                    >
                                                        <ShieldAlert className="w-3 h-3 mr-1 shrink-0" />
                                                        ロック中
                                                    </Badge>
                                                    <span className="text-[10px] text-red-500 font-mono whitespace-nowrap">
                                                        〜{lockDateStr}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Badge className="bg-slate-50 text-slate-400 border-slate-200 text-[10px] whitespace-nowrap" variant="outline">
                                                    制限なし
                                                </Badge>
                                            )}
                                        </td>

                                        {/* 申請日 */}
                                        <td className="p-4 whitespace-nowrap">
                                            <span className="text-xs text-slate-400 font-mono">
                                                {format(new Date(req.created_at), 'yyyy/MM/dd')}
                                            </span>
                                            <br />
                                            <span className="text-[10px] text-slate-300 font-mono">
                                                {format(new Date(req.created_at), 'HH:mm')}
                                            </span>
                                        </td>

                                        {/* 操作ボタン */}
                                        <td className="p-4 pr-6 whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isPending}
                                                    onClick={() => openRejectModal(req.id)}
                                                    className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-lg whitespace-nowrap"
                                                >
                                                    <X className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="ml-1">却下</span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={isPending}
                                                    onClick={() => handleApprove(req)}
                                                    className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm whitespace-nowrap"
                                                >
                                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="ml-1">承認</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="h-8 px-2.5 text-xs font-bold rounded-lg whitespace-nowrap"
                                                >
                                                    <Link href={`/customers/${req.student?.id}`}>
                                                        詳細
                                                        <ArrowRight className="w-3 h-3 ml-1 shrink-0" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ====================================================
                モバイル・タブレット表示（カード）
                lg 未満で表示
            ==================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                {requests.map((req) => {
                    const isLocked = req.student?.membership_lock_until && new Date(req.student.membership_lock_until) > new Date()
                    const lockDateStr = req.student?.membership_lock_until
                        ? new Date(req.student.membership_lock_until).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                        : ''
                    const { typeLabel, typeColor, fromText, toText } = resolveRequestInfo(req)

                    return (
                        <div
                            key={req.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors"
                        >
                            {/* 上段: バッジ + 番号 + 日時 */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Badge className={`${typeColor} text-[11px] font-bold shrink-0`} variant="outline">
                                        {typeLabel}
                                    </Badge>
                                    <span className="text-[11px] text-slate-400 font-mono truncate">
                                        {req.student?.student_number || '—'}
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                                    {format(new Date(req.created_at), 'yyyy/MM/dd')}
                                </span>
                            </div>

                            {/* 生徒名 */}
                            <Link
                                href={`/customers/${req.student?.id}`}
                                className="font-bold text-slate-800 text-base hover:text-indigo-600 transition-colors leading-tight"
                            >
                                {req.student?.full_name}
                            </Link>

                            {/* 変更内容 */}
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">変更内容</p>
                                {fromText && (
                                    <p className="text-xs text-slate-500 leading-snug">{fromText}</p>
                                )}
                                {fromText && (
                                    <p className="text-[10px] text-slate-300 my-0.5 leading-none">↓</p>
                                )}
                                <p className="text-xs font-bold text-slate-800 leading-snug">{toText}</p>
                            </div>

                            {/* ロック警告 */}
                            {isLocked && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-start gap-2">
                                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-red-700 leading-snug">ロック期間中</p>
                                        <p className="text-[11px] text-red-500 mt-0.5">解除日: {lockDateStr}</p>
                                    </div>
                                </div>
                            )}

                            {/* 申請理由 */}
                            {req.note && (
                                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="font-bold text-slate-600 text-[10px] mb-1">申請理由</p>
                                    <p className="leading-relaxed line-clamp-3">「{req.note}」</p>
                                </div>
                            )}

                            {/* 操作ボタン */}
                            <div className="pt-1 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="h-9 text-xs font-bold rounded-lg border-slate-200 col-span-1"
                                >
                                    <Link href={`/customers/${req.student?.id}`}>
                                        詳細
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => openRejectModal(req.id)}
                                    className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-lg col-span-1"
                                >
                                    <X className="w-3.5 h-3.5 shrink-0" />
                                    <span className="ml-1">却下</span>
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => handleApprove(req)}
                                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm col-span-1"
                                >
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                    <span className="ml-1">承認</span>
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ====================================================
                却下理由ダイアログ
            ==================================================== */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="sm:max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800 font-bold">プラン変更申請の却下</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            却下の理由を入力してください。この理由は生徒への通知履歴に記載されます。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRejectSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="reject-reason" className="text-xs text-slate-500 font-bold">却下理由</Label>
                            <Textarea
                                id="reject-reason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="例: 現在のプラン契約から2ヶ月未満であるため変更できません。"
                                required
                            />
                        </div>
                        <DialogFooter className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejectOpen(false)}
                                className="rounded-lg h-10 text-xs font-bold"
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-10 text-xs font-bold"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '却下を確定する'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
