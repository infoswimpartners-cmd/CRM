'use client'

import Link from 'next/link'
import { FileText, XCircle, MessageCircle } from 'lucide-react'

/**
 * ダッシュボードのクイックアクション
 * 指示書の3つの目的「動画を見る・残回数確認・キャンセル」に素早くアクセス
 */
export default function MemberQuickActions() {
    const actions = [
        {
            href: '/member/reports',
            icon: FileText,
            label: '動画を見る',
            sublabel: 'カルテ・フィードバック',
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-white/20',
        },
        {
            href: '/member/cancel',
            icon: XCircle,
            label: 'キャンセル',
            sublabel: '予約変更・取消',
            gradient: 'from-red-400 to-red-500',
            iconBg: 'bg-white/20',
        },
        {
            href: 'https://lin.ee/placeholder',
            icon: MessageCircle,
            label: 'LINEで予約',
            sublabel: '次回のレッスン相談',
            gradient: 'from-green-400 to-green-600',
            iconBg: 'bg-white/20',
            external: true,
        },
    ]

    return (
        <div className="grid grid-cols-3 gap-3">
            {actions.map((action) => {
                const Tag = action.external ? 'a' : Link
                const extraProps = action.external
                    ? { href: action.href, target: '_blank', rel: 'noopener noreferrer' }
                    : { href: action.href }

                return (
                    <Tag
                        key={action.href}
                        {...(extraProps as any)}
                        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-4 flex flex-col items-center justify-center text-white text-center shadow-md active:scale-95 transition-all duration-200 min-h-[100px]`}
                    >
                        {/* デコレーション */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/10" />

                        <div className={`relative z-10 ${action.iconBg} p-2.5 rounded-xl mb-2`}>
                            <action.icon className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <span className="relative z-10 text-xs font-black tracking-tight leading-tight">{action.label}</span>
                        <span className="relative z-10 text-[10px] text-white/70 mt-0.5 leading-tight">{action.sublabel}</span>
                    </Tag>
                )
            })}
        </div>
    )
}
