'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
    X,
    Home,
    Calendar,
    FileText,
    LogOut,
    ChevronRight,
    User,
    Settings,
    Crown,
    Sparkles,
    CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MemberMobileSidebarProps {
    isOpen: boolean
    onClose: () => void
    studentName?: string
    isTrioMember?: boolean
    isMember?: boolean
    handleLogout: () => Promise<void>
}

/**
 * MemberMobileSidebar
 * 明るくクールなサイドナビゲーション
 */
export default function MemberMobileSidebar({
    isOpen,
    onClose,
    studentName,
    isTrioMember = false,
    isMember = false,
    handleLogout
}: MemberMobileSidebarProps) {
    const pathname = usePathname()

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    const navItems = [
        { href: '/member/dashboard', icon: Home, label: 'ホーム', subLabel: 'Dashboard' },
        ...(isMember ? [
            { href: '/member/billing', icon: CreditCard, label: 'ご契約・お支払い', subLabel: 'Billing & Payments' }
        ] : []),
        { href: '/member/profile', icon: Settings, label: 'アカウント設定', subLabel: 'Profile Settings' },
    ];

    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 bg-slate-900/40 z-[100] backdrop-blur-sm transition-opacity duration-500",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <div className={cn(
                "fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-[110] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="p-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shadow-sm">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl hover:bg-slate-50 text-slate-400 w-12 h-12 border border-slate-100">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] text-sky-500 font-bold tracking-[0.25em] uppercase">Authenticated Member</p>
                        <h2 className="font-bold text-slate-900 text-2xl tracking-tight">{studentName || 'Explorer'} <span className="text-slate-300 font-normal">様</span></h2>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="px-6 space-y-2 h-[calc(100vh-320px)] overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/member/dashboard' && pathname.startsWith(item.href + '/'))
                        
                        return (
                            <Link key={item.href} href={item.href} onClick={onClose} className="block group">
                                <div className={cn(
                                    "flex items-center justify-between w-full p-4 rounded-2xl transition-all duration-300",
                                    isActive
                                        ? "bg-sky-600 text-white font-semibold shadow-md shadow-sky-100"
                                        : "text-slate-500 hover:bg-sky-50/60 hover:text-sky-900"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                            isActive ? "bg-white/20 text-white" : "bg-sky-50/80 group-hover:bg-white text-slate-500"
                                        )}>
                                            <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm tracking-tight">{item.label}</p>
                                            <p className={cn(
                                                "text-[9px] uppercase tracking-wider",
                                                isActive ? "text-white/80" : "text-slate-400"
                                            )}>{item.subLabel}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-4 h-4 transition-transform duration-300 group-hover:translate-x-1",
                                        isActive ? "text-white/60" : "text-slate-300"
                                    )} />
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            onClose()
                            handleLogout()
                        }}
                        className="w-full justify-start text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all h-12 px-4 group"
                    >
                        <LogOut className="mr-3 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold text-xs uppercase tracking-widest">Logout</span>
                    </Button>
                </div>
            </div>
        </>
    )
}
