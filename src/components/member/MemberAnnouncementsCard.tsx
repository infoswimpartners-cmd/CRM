'use client'

import { Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface Notification {
    id: string
    title: string
    body: string | null
    type: string
    created_at: string
    action_url: string | null
    is_read: boolean
}

interface MemberAnnouncementsCardProps {
    notifications: Notification[]
}

const typeConfig: Record<string, { icon: typeof Bell; colorClass: string; bgClass: string }> = {
    info: { icon: Info, colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
    alert: { icon: AlertTriangle, colorClass: 'text-amber-600', bgClass: 'bg-amber-50' },
    success: { icon: CheckCircle, colorClass: 'text-green-600', bgClass: 'bg-green-50' },
}

export default function MemberAnnouncementsCard({ notifications }: MemberAnnouncementsCardProps) {
    const [visible, setVisible] = useState(true)

    if (!visible || notifications.length === 0) return null

    return (
        <div className="glass-card p-6 border-sky-100/80 bg-sky-50/30 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-sky-500" />
                    <h2 className="text-sm font-black text-slate-800">お知らせ</h2>
                    <span className="text-[10px] font-bold text-white bg-sky-500 rounded-full px-2 py-0.5 leading-none">
                        {notifications.length}
                    </span>
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                    閉じる
                </button>
            </div>

            <div className="space-y-3">
                {notifications.slice(0, 3).map((notif) => {
                    const config = typeConfig[notif.type] || typeConfig.info
                    const Icon = config.icon
                    return (
                        <div
                            key={notif.id}
                            className={`${config.bgClass} rounded-2xl p-4 flex items-start gap-3 border border-sky-100/40`}
                        >
                            <Icon className={`w-4 h-4 ${config.colorClass} shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 leading-tight">{notif.title}</p>
                                {notif.body && (
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                                        {notif.body}
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
