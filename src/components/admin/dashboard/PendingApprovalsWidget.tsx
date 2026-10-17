'use client'

import React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { AlertCircle, CheckCircle2, ChevronRight, FileCheck, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface PendingRequestItem {
    id: string
    created_at: string
    request_type: string
    requested_is_trio?: boolean
    note?: string | null
    student?: {
        id: string
        full_name: string
        student_number: string
    } | null
    requested?: {
        name: string
    } | null
}

export interface PendingApprovalsWidgetProps {
    pendingRequests?: PendingRequestItem[] | null
}

/**
 * 未承認請求・確認事項ウィジェット
 * プラン変更・THE TRIO追加・解約申請など、管理者が確認・承認すべき重要タスクをリストアップ
 */
export function PendingApprovalsWidget({ pendingRequests }: PendingApprovalsWidgetProps) {
    const safeRequests = Array.isArray(pendingRequests) ? pendingRequests : []
    const displayRequests = safeRequests.slice(0, 5)

    return (
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
                {/* ヘッダー */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                未承認・確認事項
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                                プラン変更・解約申請
                            </p>
                        </div>
                    </div>
                    {safeRequests.length > 0 ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200 animate-pulse">
                            要対応 {safeRequests.length}件
                        </span>
                    ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full ring-1 ring-emerald-200">
                            未承認なし
                        </span>
                    )}
                </div>

                {/* リクエスト一覧 */}
                {displayRequests.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-700">承認待ちの申請はありません</p>
                        <p className="text-[11px] text-slate-400">すべてのプラン変更・解約申請は処理済みです</p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3 divide-y divide-slate-100">
                        {displayRequests.map((req) => {
                            let typeLabel = 'プラン変更'
                            let typeColor = 'bg-blue-50 text-blue-700 border-blue-200'
                            let detail = `希望プラン: ${req.requested?.name || '解約'}`

                            if (req.request_type === 'add_plan' && req.requested_is_trio === true) {
                                typeLabel = 'Trio追加'
                                typeColor = 'bg-amber-50 text-amber-700 border-amber-200'
                                detail = 'THE TRIOプランの追加'
                            } else if (req.request_type === 'cancel_plan' && req.requested_is_trio === false) {
                                typeLabel = 'Trio解約'
                                typeColor = 'bg-red-50 text-red-700 border-red-200'
                                detail = 'THE TRIOプランの解約'
                            } else if (req.request_type === 'add_plan') {
                                typeLabel = 'プラン追加'
                                typeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                detail = `追加プラン: ${req.requested?.name || ''}`
                            }

                            let formattedDate = ''
                            try {
                                formattedDate = format(parseISO(req.created_at), 'M/d')
                            } catch {
                                formattedDate = req.created_at
                            }

                            return (
                                <Link
                                    key={req.id}
                                    href={req.student?.id ? `/customers/${req.student.id}` : '/admin/approvals?tab=plans'}
                                    className="block pt-3 first:pt-0 group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-[10px] font-bold px-1.5 py-0", typeColor)}
                                                >
                                                    {typeLabel}
                                                </Badge>
                                                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                                    {req.student?.full_name || '生徒未指定'}
                                                </span>
                                                {req.student?.student_number && (
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        #{req.student.student_number}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-[11px] text-slate-500 mt-1 truncate">
                                                {detail}
                                            </p>
                                            {req.note && (
                                                <p className="text-[10px] text-slate-400 italic truncate mt-0.5">
                                                    「{req.note}」
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] text-slate-400 font-mono block">
                                                {formattedDate}
                                            </span>
                                            <span className="mt-1 inline-flex items-center text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                                                承認へ ➔
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* フッター導線 */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">申請管理</span>
                <Link
                    href="/admin/approvals?tab=plans"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
                >
                    承認センターを開く
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    )
}
