'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileCheck, ShieldCheck, AlertCircle, Clock, Globe, Check, RotateCcw, Loader2 } from "lucide-react"
import { toast } from 'sonner'
import { toggleCoachOnboardingStatusByAdmin } from '@/actions/coach-contract'

interface ContractRecord {
    id: string
    contract_type: string
    version: string
    signer_name: string
    signer_address: string
    ip_address: string
    user_agent: string
    agreed_at: string
}

interface CoachContractCardProps {
    contracts: ContractRecord[]
    onboardingCompletedAt?: string | null
    coachId?: string
}

export function CoachContractCard({ contracts, onboardingCompletedAt, coachId }: CoachContractCardProps) {
    const [loading, setLoading] = useState(false)
    const basicContract = contracts.find(c => c.contract_type === 'basic_agreement')
    const memoContract = contracts.find(c => c.contract_type === 'compensation_memorandum')

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return '-'
        try {
            return new Date(isoString).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return isoString
        }
    }

    const handleToggleStatus = async (targetCompleted: boolean) => {
        if (!coachId) return
        const confirmMsg = targetCompleted
            ? 'このコーチを「初期セットアップ完了済み」としてダッシュボード利用を許可しますか？'
            : 'このコーチのセットアップ完了を解除し、初期設定画面（オンボーディング）へ誘導するように戻しますか？'

        if (!window.confirm(confirmMsg)) return

        setLoading(true)
        try {
            const res = await toggleCoachOnboardingStatusByAdmin(coachId, targetCompleted)
            if (res.success) {
                toast.success(targetCompleted ? '初期セットアップを完了扱いに設定しました' : 'セットアップ完了を解除しました')
            } else {
                toast.error(res.error || '更新に失敗しました')
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                        契約締結・規約同意ログ
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {onboardingCompletedAt ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                初期セットアップ完了
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                セットアップ未完了
                            </Badge>
                        )}
                        {coachId && (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={loading}
                                onClick={() => handleToggleStatus(!onboardingCompletedAt)}
                                className="h-7 text-xs px-2.5 gap-1 border-slate-300 hover:bg-slate-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : onboardingCompletedAt ? (
                                    <>
                                        <RotateCcw className="h-3 w-3 text-slate-500" />
                                        未完了に戻す
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        手動で完了済みにする
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
                <CardDescription>
                    コーチ初回ログイン時のWeb規約同意ログ（電磁的記録）です。既存コーチなど個別事情がある場合は右上のボタンから手動で完了扱いに切り替えることも可能です。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ① 業務委託基本契約 */}
                    <div className="p-4 rounded-xl border bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800">
                                業務委託基本契約書
                            </span>
                            {basicContract ? (
                                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                                    同意済 (v{basicContract.version})
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[11px] font-semibold text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-full">
                                    未同意
                                </span>
                            )}
                        </div>
                        {basicContract ? (
                            <div className="text-xs text-slate-600 space-y-1 pt-1">
                                <div className="flex items-center gap-1 text-[11px]">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>同意日時: {formatDate(basicContract.agreed_at)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px]">
                                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                                    <span>IP: {basicContract.ip_address}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                    署名者: {basicContract.signer_name}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">まだ同意されていません</p>
                        )}
                    </div>

                    {/* ② 報酬に関する覚書 */}
                    <div className="p-4 rounded-xl border bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800">
                                報酬に関する覚書（2026年6月改定）
                            </span>
                            {memoContract ? (
                                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                                    同意済 (v{memoContract.version})
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[11px] font-semibold text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-full">
                                    未同意
                                </span>
                            )}
                        </div>
                        {memoContract ? (
                            <div className="text-xs text-slate-600 space-y-1 pt-1">
                                <div className="flex items-center gap-1 text-[11px]">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>同意日時: {formatDate(memoContract.agreed_at)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px]">
                                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                                    <span>IP: {memoContract.ip_address}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                    署名者: {memoContract.signer_name}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">まだ同意されていません</p>
                        )}
                    </div>
                </div>

                {basicContract?.signer_address && (
                    <div className="text-xs text-slate-500 bg-slate-100/70 p-3 rounded-lg">
                        <span className="font-semibold text-slate-700">登録受託者住所: </span>
                        {basicContract.signer_address}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
