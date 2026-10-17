'use client'

import React from 'react'
import Link from 'next/link'
import { UserPlus, CalendarPlus, MessageSquare, Search, Zap } from 'lucide-react'

/**
 * 実務クイックアクションウィジェット
 * 日常の実務で最も頻度の高い4大アクションへ最速アクセスを提供
 */
export function QuickActionsWidget() {
    const actions = [
        {
            title: '体験リード管理',
            desc: '体験申込・アサイン',
            href: '/admin/leads',
            icon: UserPlus,
            bgHover: 'hover:border-sky-200 hover:bg-sky-50/30',
            iconColor: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
        },
        {
            title: 'スケジュール追加',
            desc: 'レッスン日程の調整',
            href: '/coach/schedule',
            icon: CalendarPlus,
            bgHover: 'hover:border-emerald-200 hover:bg-emerald-50/30',
            iconColor: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
        },
        {
            title: 'LINE一括配信',
            desc: 'お知らせ・セグメント',
            href: '/admin/line-marketing',
            icon: MessageSquare,
            bgHover: 'hover:border-green-200 hover:bg-green-50/30',
            iconColor: 'bg-green-50 text-green-600 ring-1 ring-green-100',
        },
        {
            title: '会員カルテ検索',
            desc: '生徒情報の照会',
            href: '/customers',
            icon: Search,
            bgHover: 'hover:border-indigo-200 hover:bg-indigo-50/30',
            iconColor: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
        },
    ]

    return (
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                        クイックアクション
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                        日常実務の最速ショートカット
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                {actions.map((act) => {
                    const Icon = act.icon
                    return (
                        <Link
                            key={act.href}
                            href={act.href}
                            className={`group p-3.5 rounded-2xl border border-slate-200/70 bg-white transition-all duration-200 flex flex-col justify-between ${act.bgHover}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${act.iconColor}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {act.title}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                                    {act.desc}
                                </p>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
