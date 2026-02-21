'use client'

import Link from 'next/link'
import { CalendarRange, FileText, MessageCircle, Settings, ChevronRight } from 'lucide-react'

// Define the actions
const quickActions = [
    {
        href: '/member/reservation',
        label: 'レッスン予約',
        subLabel: 'スケジュール確認',
        icon: CalendarRange,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
    },
    // {
    //     href: '/member/reports',
    //     label: 'カルテ確認',
    //     subLabel: '過去の記録',
    //     icon: FileText,
    //     color: 'text-purple-500',
    //     bg: 'bg-purple-50',
    // },
    {
        href: 'https://lin.ee/placeholder',
        label: '公式LINE',
        subLabel: '相談・お問い合わせ',
        icon: MessageCircle,
        color: 'text-green-500',
        bg: 'bg-green-50',
        external: true,
    },
    // {
    //     href: '/member/settings',
    //     label: '設定',
    //     subLabel: '登録情報変更',
    //     icon: Settings,
    //     color: 'text-gray-500',
    //     bg: 'bg-gray-50',
    // },
]

export default function QuickActions() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 px-1">メニュー</h3>
            <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action: any) => {
                    const content = (
                        <>
                            <div className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                                <action.icon className="w-6 h-6" />
                            </div>
                            <div className="ml-4 flex-1">
                                <h4 className="font-bold text-gray-800">{action.label}</h4>
                                <p className="text-xs text-gray-400">{action.subLabel}</p>
                            </div>
                            <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </>
                    )

                    if (action.external) {
                        return (
                            <a
                                key={action.href}
                                href={action.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-200"
                            >
                                {content}
                            </a>
                        )
                    }

                    return (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="group flex items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-200"
                        >
                            {content}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
