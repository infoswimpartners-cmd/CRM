'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    X,
    Home,
    Calendar,
    FileText,
    Ticket,
    MessageCircle,
    LogOut,
    ChevronRight,
    User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MemberMobileSidebarProps {
    isOpen: boolean
    onClose: () => void
    studentName?: string
    handleLogout: () => Promise<void>
}

export default function MemberMobileSidebar({
    isOpen,
    onClose,
    studentName,
    handleLogout
}: MemberMobileSidebarProps) {
    const pathname = usePathname()

    // Prevent scrolling when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    const navItems = [
        { href: '/member/dashboard', icon: Home, label: 'ホーム', subLabel: 'トップページ' },
        { href: '/member/reservation', icon: Calendar, label: 'レッスン予約', subLabel: 'スケジュールリクエスト' },
        { href: '/member/reports', icon: FileText, label: 'カルテ・レポート', subLabel: '成長の記録' },
        { href: '/member/tickets', icon: Ticket, label: 'チケット管理', subLabel: '残高・購入履歴' },
        { href: 'https://lin.ee/placeholder', icon: MessageCircle, label: '公式LINE', subLabel: '運営へのお問い合わせ', external: true },
    ]

    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div className={cn(
                "fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-2xl border-r border-white/40 z-[110] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-blue-50 bg-gradient-to-br from-blue-50/80 to-white/80">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center text-white transform rotate-3">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Member Profile</p>
                            <h2 className="font-black text-gray-800 text-lg">{studentName || 'ゲスト'} 様</h2>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-blue-50 text-gray-400">
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                {/* Nav Items */}
                <nav className="p-4 space-y-3 h-[calc(100vh-200px)] overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        const ItemContent = (
                            <div className={cn(
                                "flex items-center justify-between w-full p-4 rounded-3xl transition-all duration-300 group",
                                isActive
                                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-200"
                                    : "text-gray-500 hover:bg-blue-50/50 hover:text-blue-600"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-2.5 rounded-2xl transition-all duration-300",
                                        isActive ? "bg-white/20 shadow-inner" : "bg-gray-50 group-hover:bg-white group-hover:shadow-sm"
                                    )}>
                                        <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm tracking-tight">{item.label}</p>
                                        <p className={cn(
                                            "text-[10px] font-bold uppercase tracking-tighter",
                                            isActive ? "text-blue-100/80" : "text-gray-300"
                                        )}>{item.subLabel}</p>
                                    </div>
                                </div>
                                <ChevronRight className={cn(
                                    "w-4 h-4 transition-transform group-hover:translate-x-1",
                                    isActive ? "text-white/60" : "text-gray-300"
                                )} />
                            </div>
                        )

                        if (item.external) {
                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                    onClick={onClose}
                                >
                                    {ItemContent}
                                </a>
                            )
                        }

                        return (
                            <Link key={item.href} href={item.href} onClick={onClose} className="block">
                                {ItemContent}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50/50 border-t border-gray-100">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            onClose()
                            handleLogout()
                        }}
                        className="w-full justify-start text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-12"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        <span className="font-bold text-sm">ログアウト</span>
                    </Button>
                </div>
            </div>
        </>
    )
}
