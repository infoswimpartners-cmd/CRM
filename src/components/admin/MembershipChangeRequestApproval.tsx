'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { approveMembershipChangeRequest, rejectMembershipChangeRequest } from '@/actions/member/membership'
import { toast } from 'sonner'
import { AlertCircle, Check, X, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface MembershipChangeRequestApprovalProps {
    request: {
        id: string
        request_type: 'change_plan' | 'add_plan' | 'cancel_plan'
        requested_is_trio: boolean | null
        requested_membership_type_id: string | null
        requested: {
            name: string
        } | null
        note: string | null
        student_lock_until?: string | null
    }
}

export default function MembershipChangeRequestApproval({ request }: MembershipChangeRequestApprovalProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [rejectOpen, setRejectOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    const isLocked = request.student_lock_until && new Date(request.student_lock_until) > new Date()
    const lockDateStr = request.student_lock_until 
        ? new Date(request.student_lock_until).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''

    const handleApprove = async () => {
        const confirmMsg = isLocked
            ? `⚠️ 【警告】この生徒は現在ロック期間中（制限解除日: ${lockDateStr}）です。\n本当にこのプラン変更・追加・解約申請を承認しますか？\n（Stripeのサブスクリプションも自動更新されます）`
            : 'この申請を承認しますか？\n（Stripeのサブスクリプションも自動更新されます）'

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

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            const res = await rejectMembershipChangeRequest(request.id, rejectReason)
            if (res.success) {
                toast.success('申請を却下しました。')
                setRejectOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || '却下に失敗しました。')
            }
        })
    }

    // 動的にタイトルや内容を設定
    let title = 'プラン変更申請が届いています'
    let detailText = `変更希望プラン: ${request.requested?.name || ''}`

    if (request.request_type === 'add_plan' && request.requested_is_trio === true) {
        title = 'THE TRIOプランの追加申請が届いています'
        detailText = '追加プラン: THE TRIO (月額¥0、チケット都度課金)'
    } else if (request.request_type === 'cancel_plan' && request.requested_is_trio === false) {
        title = 'THE TRIOプランの解約申請が届いています'
        detailText = '解約対象プラン: THE TRIO'
    } else if (request.request_type === 'add_plan') {
        title = 'プライベートレッスンプランの追加申請が届いています'
        detailText = `追加希望プラン: ${request.requested?.name || ''}`
    } else if (request.request_type === 'change_plan') {
        title = 'プライベートレッスンプランの変更申請が届いています'
        detailText = `変更希望プラン: ${request.requested?.name || ''}`
    }

    return (
        <Card className="border-amber-200 bg-amber-50/50 shadow-md">
            {isLocked && (
                <div className="bg-red-50 border-b border-red-100 p-3.5 text-xs font-bold text-red-800 flex items-center gap-2 rounded-t-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="flex-1 min-w-0">⚠️ 警告: この生徒は現在プラン変更ロック期間中（制限解除日: {lockDateStr}）です。</span>
                </div>
            )}
            <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <div className="font-bold text-amber-900 text-sm">
                            {title}
                        </div>
                        <div className="text-xs text-amber-700">
                            {detailText}
                        </div>
                        {request.note && (
                            <div className="text-xs text-amber-600 italic bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/50 mt-1 max-w-xl text-left">
                                申請理由: {request.note}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                className="border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 text-xs font-bold gap-1 rounded-lg h-9 px-3"
                            >
                                <X className="w-3.5 h-3.5" />
                                却下する
                            </Button>
                        </DialogTrigger>
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

                    <Button
                        onClick={handleApprove}
                        disabled={isPending}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 rounded-lg h-9 px-3 shadow-md shadow-emerald-100"
                    >
                        {isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        承認する
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
