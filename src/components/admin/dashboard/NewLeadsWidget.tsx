'use client'

import React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { UserPlus, MapPin, Calendar, ArrowRight, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface LeadItem {
    id: string
    name: string
    area?: string | null
    lesson_location?: string | null
    created_at: string
    status?: string | null
    assigned_coach_id?: string | null
    available_times?: string | null
    email?: string | null
    phone?: string | null
}

export interface NewLeadsWidgetProps {
    leads?: LeadItem[] | null
}

/**
 * 新着体験申込リードウィジェット
 * 新規顧客からの体験レッスン申込（売上・成約に直結する重要タスク）を素早く把握しアサイン
 */
export function NewLeadsWidget({ leads }: NewLeadsWidgetProps) {
    const safeLeads = Array.isArray(leads) ? leads : []
    const pendingLeads = safeLeads.filter(l => !l.assigned_coach_id || l.status === '新規' || l.status === 'pending')
    const displayLeads = safeLeads.slice(0, 5)

    return (
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
                {/* ヘッダー */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                新着体験申込
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                                体験レッスン新規リード
                            </p>
                        </div>
                    </div>
                    {pendingLeads.length > 0 ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200 animate-pulse">
                            未対応 {pendingLeads.length}件
                        </span>
                    ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full ring-1 ring-emerald-200">
                            対応完了
                        </span>
                    )}
                </div>

                {/* リード一覧 */}
                {displayLeads.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-600">現在、新着の体験申込はありません</p>
                        <p className="text-[11px] text-slate-400">新しい体験申込が入るとここに通知されます</p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3 divide-y divide-slate-100">
                        {displayLeads.map((lead) => {
                            const isPending = !lead.assigned_coach_id || lead.status === '新規' || lead.status === 'pending'
                            let formattedDate = ''
                            try {
                                formattedDate = format(parseISO(lead.created_at), 'M/d HH:mm')
                            } catch {
                                formattedDate = lead.created_at
                            }

                            return (
                                <div key={lead.id} className="pt-3 first:pt-0 group">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                    {lead.name} 様
                                                </h4>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-bold px-1.5 py-0",
                                                        isPending
                                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                                    )}
                                                >
                                                    {isPending ? '未アサイン' : '対応中'}
                                                </Badge>
                                            </div>

                                            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                                                {(lead.area || lead.lesson_location) && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span className="truncate">{lead.area || lead.lesson_location}</span>
                                                    </div>
                                                )}
                                                {lead.available_times && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span className="truncate">{lead.available_times}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] text-slate-400 font-mono block">
                                                {formattedDate}
                                            </span>
                                            <Link
                                                href={`/admin/leads?id=${lead.id}`}
                                                className="mt-1 inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                アサイン ➔
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* フッター導線 */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">体験申込一覧</span>
                <Link
                    href="/admin/leads"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
                >
                    すべてのリードを見る
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    )
}
