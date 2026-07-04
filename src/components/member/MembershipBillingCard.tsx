'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CreditCard, Calendar, Info, ShieldAlert, Sparkles, Crown, PlusCircle, MinusCircle } from 'lucide-react'
import { submitMembershipChangeRequest } from '@/actions/member/membership'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface MembershipType {
    id: string
    name: string
    fee: number
    active: boolean
    is_package: boolean
    description?: string | null
    rules?: string | null
}

interface LessonSchedule {
    id: string
    start_time: string
    title: string
    price: number | null
}

interface MembershipBillingCardProps {
    student: any
    activePlans: MembershipType[]
    pendingSchedules: LessonSchedule[]
    pendingRequest: any
    trioPlanId: string | null
    consentTermsJson: string
    consentRulesJson: string
    termsOfServiceText: string
}

export default function MembershipBillingCard({
    student,
    activePlans,
    pendingSchedules,
    pendingRequest,
    trioPlanId,
    consentTermsJson,
    consentRulesJson,
    termsOfServiceText
}: MembershipBillingCardProps) {
    const [openDialogType, setOpenDialogType] = useState<'change_private' | 'add_private' | 'add_trio' | 'cancel_trio' | null>(null)
    const [selectedPlanId, setSelectedPlanId] = useState('')
    const [note, setNote] = useState('')
    const [agreedTermIds, setAgreedTermIds] = useState<Record<string, boolean>>({})
    const [agreedToTermsOfService, setAgreedToTermsOfService] = useState(false)
    const [isPending, startTransition] = useTransition()

    // 現在のプライベートプラン
    const currentPrivatePlan = student.membership_types
    const isTrioMember = !!student.is_trio

    // プライベートレッスンが単発プランかどうかの判定 (月会費が0円、またはプランがない)
    const isSinglePlan = !currentPrivatePlan || currentPrivatePlan.fee === 0 || currentPrivatePlan.is_package

    // 未請求レッスンの合計額
    const pendingLessonsTotal = pendingSchedules.reduce((acc, curr) => acc + (curr.price || 0), 0)

    // 次回請求予定額の計算
    const privateFee = currentPrivatePlan?.fee || 0
    const trioFee = 0 
    const nextBillingAmount = privateFee + trioFee + pendingLessonsTotal

    // プラン変更ロック状態のチェック (プライベートレッスン契約者のみ対象)
    const isLocked = student.membership_lock_until && new Date(student.membership_lock_until) > new Date()
    const lockDateStr = student.membership_lock_until
        ? format(new Date(student.membership_lock_until), 'yyyy年M月d日')
        : ''

    // ダイアログを閉じる際のリセット処理
    const handleClose = () => {
        setOpenDialogType(null)
        setSelectedPlanId('')
        setNote('')
        setAgreedTermIds({})
        setAgreedToTermsOfService(false)
    }

    // 表示対象の同意項目をフィルタリング
    const activeConsentTerms = (() => {
        try {
            const allTerms: any[] = JSON.parse(consentTermsJson)
            const isTrio = openDialogType === 'add_trio' || openDialogType === 'cancel_trio'
            
            // 選択されたプランがパッケージかどうか
            const selectedPlan = activePlans.find(p => p.id === selectedPlanId)
            const isPkg = selectedPlan?.is_package || false
            
            return allTerms.filter(t => {
                if (t.target === 'all') return true
                if (isTrio) {
                    // Trio申請時はキャンセル規定(all)など最低限のもののみ
                    return false
                }
                if (isPkg && t.target === 'package') return true
                if (!isPkg && t.target === 'monthly') return true
                return false
            })
        } catch (e) {
            console.error("Failed to parse consentTermsJson:", e)
            return []
        }
    })()

    // 表示されているすべての同意項目がチェックされているか検証
    const allTermsAgreed = activeConsentTerms.every(term => agreedTermIds[term.id] === true)

    // 選択されたプランのルールをパース
    const selectedPlanRules = (() => {
        const selectedPlan = activePlans.find(p => p.id === selectedPlanId)
        if (!selectedPlan) return []
        
        const parseRules = (rulesStr: string | null | undefined, defaultRules: string[]) => {
            if (!rulesStr || !rulesStr.trim()) return defaultRules
            return rulesStr.split('\n').map(r => r.trim()).filter(Boolean)
        }

        // デフォルトのルール (プランに応じたもの)
        const isMonthly4 = selectedPlan.name.includes('月4回')
        const defaultRules = [
            'コーチの交通費・施設利用料がすべて含まれています。',
            isMonthly4
                ? 'レッスンの追加・先行利用は「8,500円/回」で可能です。'
                : 'レッスンの追加・先行利用は「8,700円/回」で可能です。',
            '振替の有効期間は【2ヶ月間】となります。',
            '入会金・年会費は一切かかりません。'
        ]

        return parseRules(selectedPlan.rules, defaultRules)
    })()

    // 申請送信処理
    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!agreedToTermsOfService || !allTermsAgreed) {
            toast.error('注意事項の確認および利用規約への同意が必要です。')
            return
        }

        let reqPlanId: string | null = null
        let reqType: 'change_plan' | 'add_plan' | 'cancel_plan' = 'change_plan'
        let reqIsTrio: boolean | null = null

        if (openDialogType === 'change_private') {
            if (!selectedPlanId) {
                toast.error('変更希望のプランを選択してください。')
                return
            }
            reqPlanId = selectedPlanId
            reqType = 'change_plan'
        } else if (openDialogType === 'add_private') {
            if (!selectedPlanId) {
                toast.error('追加希望のプランを選択してください。')
                return
            }
            reqPlanId = selectedPlanId
            reqType = 'add_plan'
        } else if (openDialogType === 'add_trio') {
            reqPlanId = trioPlanId
            reqType = 'add_plan'
            reqIsTrio = true
        } else if (openDialogType === 'cancel_trio') {
            reqPlanId = null
            reqType = 'cancel_plan'
            reqIsTrio = false
        }

        startTransition(async () => {
            const res = await submitMembershipChangeRequest({
                studentId: student.id,
                requestedMembershipTypeId: reqPlanId,
                requestType: reqType,
                requestedIsTrio: reqIsTrio,
                note
            })

            if (res.success) {
                toast.success('申請を送信しました。')
                handleClose()
            } else {
                toast.error(res.error || '申請に失敗しました。')
            }
        })
    }

    // 保留中申請の表示テキスト生成
    const getPendingRequestText = () => {
        if (!pendingRequest) return ''
        const reqPlanName = pendingRequest.requested?.name || ''
        
        if (pendingRequest.request_type === 'add_plan' && pendingRequest.requested_is_trio === true) {
            return 'THE TRIOプランの追加申請'
        }
        if (pendingRequest.request_type === 'cancel_plan' && pendingRequest.requested_is_trio === false) {
            return 'THE TRIOプランの解約申請'
        }
        if (pendingRequest.request_type === 'add_plan') {
            return `プライベートレッスンプランの追加申請（${reqPlanName}）`
        }
        return `プライベートレッスンのプラン変更申請（${reqPlanName}）`
    }

    return (
        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden mb-12 animate-fade-in-up">
            <CardHeader className="bg-gradient-to-br from-indigo-50/50 to-white border-b border-indigo-50/50 p-8">
                <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-indigo-500" />
                    <CardTitle className="text-xl font-black text-gray-800">ご契約状況・次回ご請求</CardTitle>
                </div>
                <CardDescription className="text-gray-500 font-medium">
                    現在の契約内容と次回のご請求予定額をご確認いただけます。プランの追加や変更もこちらから申請できます。
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-10 space-y-8">
                
                {/* 契約プラン情報 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-8">
                    {/* プライベートレッスン契約状況 */}
                    <div className="space-y-3 bg-slate-50/40 p-6 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-4 h-4 text-sky-500" />
                            <span className="text-xs font-bold uppercase tracking-widest">プライベートレッスン</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-slate-800">
                                    {currentPrivatePlan?.name || '未加入 (単発受講のみ)'}
                                </span>
                                {currentPrivatePlan && currentPrivatePlan.fee > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                        月謝会員
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-indigo-600">
                                月額会費: ¥{currentPrivatePlan?.fee?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>

                    {/* Trio契約状況 */}
                    <div className="space-y-3 bg-slate-50/40 p-6 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Crown className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-widest">THE TRIO (グループレッスン)</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-slate-800">
                                    {isTrioMember ? '加入中 (Trio会員)' : '未加入'}
                                </span>
                                {isTrioMember && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                        <Crown className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                                        Trio会員
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-amber-600">
                                {isTrioMember ? '月額会費: ¥0 (チケット都度払い)' : 'Trioの機能は制限されています'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 次回ご請求予定額 */}
                <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div className="space-y-0.5">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                次回ご請求予定額
                                <span className="text-[10px] text-slate-400 font-normal">（次回更新時）</span>
                            </h3>
                            <p className="text-xs text-slate-500">※月会費と未請求レッスン代金の合算になります。</p>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                            ¥{nextBillingAmount.toLocaleString()}
                        </div>
                    </div>

                    {/* 未請求レッスン */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {isSinglePlan ? '未請求レッスン（従量課金分）' : '追加レッスンご利用分'}
                        </h4>
                        
                        {pendingSchedules.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {pendingSchedules.map((schedule) => (
                                    <div key={schedule.id} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm text-sm">
                                        <div className="flex items-center gap-2.5">
                                            <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                                            <div>
                                                <div className="font-bold text-slate-700">
                                                    {format(new Date(schedule.start_time), 'M月d日 (E) HH:mm', { locale: ja })}
                                                </div>
                                                <div className="text-xs text-slate-400">{schedule.title}</div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-slate-800">
                                            ¥{schedule.price?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed text-xs text-slate-400">
                                未請求のレッスンはありません
                            </div>
                        )}
                    </div>
                </div>

                {/* プラン変更・追加セクション */}
                <div className="pt-6 border-t border-slate-100 space-y-6">
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 text-sm">プランの追加・変更・解約</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            月会員プランは2ヶ月以上の継続契約が基本ルールとなります。プライベートレッスンを変更した場合、その時点から2ヶ月間は再変更・解約は原則行えません。
                        </p>
                    </div>

                    {/* 保留中申請の表示 */}
                    {pendingRequest && (
                        <div className="flex items-center gap-2.5 p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 text-xs font-bold">
                            <Info className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="flex-1 min-w-0">現在、以下の申請を事務局にて審査中です：{getPendingRequestText()}</span>
                        </div>
                    )}

                    {/* プランロック警告 (表示は出すがボタンは押せるようにする) */}
                    {isLocked && (
                        <div className="flex items-start gap-2.5 p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 text-xs font-medium">
                            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <span className="font-bold block mb-0.5">プライベートレッスン変更ロック中</span>
                                現在、最小契約期間内（または前回の変更から2ヶ月以内）のロック期間中（制限解除日: {lockDateStr}）です。
                                原則としてプランの変更や解約は行えませんが、特別な事情がある場合は申請フォームよりご申請ください。
                            </div>
                        </div>
                    )}

                    {/* アクションボタン群 */}
                    {!pendingRequest && (
                        <div className="flex flex-wrap gap-4">
                            {/* 1. Trio関連アクション */}
                            {!isTrioMember ? (
                                <Button
                                    onClick={() => setOpenDialogType('add_trio')}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 rounded-xl px-6 shadow-md shadow-amber-100 flex items-center gap-2"
                                    disabled={!trioPlanId}
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    THE TRIOプランを追加する
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setOpenDialogType('cancel_trio')}
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-12 rounded-xl px-6 flex items-center gap-2"
                                >
                                    <MinusCircle className="w-4 h-4" />
                                    THE TRIOプランを解約する
                                </Button>
                            )}

                            {/* 2. プライベートレッスン関連アクション (ロック中もクリック可能) */}
                            {!currentPrivatePlan ? (
                                <Button
                                    onClick={() => setOpenDialogType('add_private')}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl px-6 shadow-md shadow-indigo-100 flex items-center gap-2"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    プライベートレッスンを追加する
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setOpenDialogType('change_private')}
                                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-12 rounded-xl px-6 shadow-md shadow-sky-100"
                                >
                                    プライベートレッスンのプランを変更する
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* 各種アクションダイアログ */}
                <Dialog open={openDialogType !== null} onOpenChange={(isOpen) => !isOpen && handleClose()}>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20 rounded-3xl overflow-y-auto max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="font-black text-xl text-slate-800">
                                {openDialogType === 'add_trio' && 'THE TRIOプランの追加申請'}
                                {openDialogType === 'cancel_trio' && 'THE TRIOプランの解約申請'}
                                {openDialogType === 'add_private' && 'プライベートレッスンの追加申請'}
                                {openDialogType === 'change_private' && 'プライベートレッスンプランの変更申請'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                {openDialogType === 'add_trio' && 'THE TRIO（月2回・月謝0円）プランを追加します。注意事項を確認の上、ご申請ください。'}
                                {openDialogType === 'cancel_trio' && 'THE TRIOプランを解約します。注意事項を確認の上、ご申請ください。'}
                                {openDialogType === 'add_private' && '新しくプライベートレッスンプランを契約します。希望プランを選択し、ご申請ください。'}
                                {openDialogType === 'change_private' && '現在のプライベートレッスンプランを変更します。新しいプランを選択し、ご申請ください。'}
                            </DialogDescription>
                        </DialogHeader>

                        {/* ロック期間中の警告 (プライベート関連申請のみ) */}
                        {isLocked && (openDialogType === 'add_private' || openDialogType === 'change_private') && (
                            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 text-red-800 rounded-2xl border border-red-100 text-xs font-bold leading-normal mb-2">
                                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    【ご注意】現在ロック期間中（制限解除日: {lockDateStr}）です。
                                    原則として期間中のプラン変更は承っておりませんが、特別な事情がある場合は理由を詳しく入力の上、ご申請ください。事務局にて個別に審査いたします。
                                </div>
                            </div>
                        )}

                        {/* 前月申請ルール・ロック期間共通注意文表示 (全員共通) */}
                        <div className="flex items-start gap-2.5 p-3.5 bg-indigo-50/50 text-indigo-950 rounded-xl border border-indigo-100 text-[11px] leading-relaxed mb-2 font-bold">
                            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                                <p>プランの変更・追加・解約は、適用希望月の前月中にご申請いただくルールとなっております。管理者の承認後、すべて「次月1日」からの適用となります（月の途中でのプラン変更・日割り適用は不可）。</p>
                                <p className="text-amber-700">※プラン変更・追加後は、適用開始日（次月1日）から2ヶ月間は原則として再度の変更・解約は行えなくなります（最低契約期間2ヶ月の適用）。</p>
                            </div>
                        </div>

                        <form onSubmit={handleRequestSubmit} className="space-y-4 py-2">
                            {/* プラン選択 (プライベート追加・変更時のみ) */}
                            {(openDialogType === 'add_private' || openDialogType === 'change_private') && (
                                <div className="space-y-2">
                                    <Label htmlFor="plan" className="text-xs font-bold text-slate-500">希望プラン</Label>
                                    <Select onValueChange={setSelectedPlanId} value={selectedPlanId} required>
                                        <SelectTrigger className="bg-slate-50 border-none h-12 rounded-xl focus:ring-2 focus:ring-sky-400">
                                            <SelectValue placeholder="プランを選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activePlans
                                                .filter(p => p.id !== currentPrivatePlan?.id)
                                                .map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} (月額 ¥{p.fee.toLocaleString()})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* 受講ルール表示 (選択プランがある場合のみ) */}
                            {(openDialogType === 'add_private' || openDialogType === 'change_private') && selectedPlanId && selectedPlanRules.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 mt-2">
                                    <span className="text-[11px] font-bold text-slate-500 block">
                                        【重要】このプランの受講ルール
                                    </span>
                                    <div className="space-y-1.5">
                                        {selectedPlanRules.map((rule, idx) => (
                                            <div key={idx} className="flex items-start text-[11px] text-slate-600 font-bold">
                                                <span className="text-sky-500 mr-1.5 shrink-0">✓</span>
                                                <span className="flex-1 min-w-0 leading-normal">{rule}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="note" className="text-xs font-bold text-slate-500">申請理由・ご要望 (任意)</Label>
                                <Textarea
                                    id="note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="bg-slate-50 border-none rounded-xl"
                                    placeholder={
                                        openDialogType === 'add_trio' ? '例: グループレッスンにも興味があるため追加を希望します。' :
                                        openDialogType === 'cancel_trio' ? '例: 都合によりTrioレッスンへの参加が難しくなったため解約します。' :
                                        isLocked ? '※ロック期間中の変更申請のため、具体的な理由を必ずご記入ください。' :
                                        '例: 練習回数を増やしたい為、プランの変更・追加を希望します。'
                                    }
                                    rows={3}
                                />
                            </div>

                            {/* 利用規約のスクロール表示ボックス */}
                            <div className="space-y-2 pt-4 border-t border-slate-100 mb-2">
                                <Label className="text-xs font-bold text-slate-500">利用規約</Label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-wrap font-medium">
                                    {termsOfServiceText}
                                </div>
                            </div>

                            {/* 利用規約への同意ボタン */}
                            <div className="pb-2">
                                <Button
                                    type="button"
                                    variant={agreedToTermsOfService ? "default" : "outline"}
                                    className={cn(
                                        "w-full h-11 text-xs font-bold rounded-xl border-indigo-200 transition-all duration-300",
                                        agreedToTermsOfService 
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100" 
                                            : "text-indigo-600 hover:bg-indigo-50 bg-white"
                                    )}
                                    onClick={() => setAgreedToTermsOfService(!agreedToTermsOfService)}
                                >
                                    {agreedToTermsOfService ? "✓ 利用規約に同意しました" : "利用規約に同意する"}
                                </Button>
                            </div>

                            {/* 同意事項チェックボックス（動的生成） */}
                            {activeConsentTerms.length > 0 && (
                                <div className="space-y-3 pt-2 mb-2">
                                    <span className="text-xs font-bold text-slate-700 block">
                                        同意事項の確認
                                    </span>
                                    <div className="space-y-2.5">
                                        {activeConsentTerms.map((term) => (
                                            <label
                                                key={term.id}
                                                className="flex items-start p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 border border-slate-100 transition-colors gap-2.5"
                                            >
                                                <Checkbox
                                                    id={`term-${term.id}`}
                                                    checked={!!agreedTermIds[term.id]}
                                                    onCheckedChange={(checked) => setAgreedTermIds(prev => ({ ...prev, [term.id]: !!checked }))}
                                                    className="shrink-0 mt-0.5"
                                                />
                                                <span className="flex-1 min-w-0 text-[11px] text-slate-600 leading-normal font-bold">
                                                    {term.text} <span className="text-red-500">(必須)</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-2 grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    className="rounded-xl h-12 text-sm font-bold border-slate-200"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isPending || !agreedToTermsOfService || !allTermsAgreed || ((openDialogType === 'add_private' || openDialogType === 'change_private') && !selectedPlanId)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl text-sm shadow-md disabled:bg-slate-300 disabled:shadow-none"
                                >
                                    {isPending ? '送信中...' : '申請を送信する'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </CardContent>
        </Card>
    )
}
