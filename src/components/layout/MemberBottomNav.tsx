'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, XCircle, Ticket, Crown, MessageCircle, User, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MemberBottomNav({ isTrioMember = false }: { isTrioMember?: boolean }) {
    const pathname = usePathname()

    const navItems = isTrioMember
        ? [
            { href: '/member/dashboard', icon: LayoutGrid, label: 'パーソナル' },
            { href: '/trio/dashboard', icon: Crown, label: 'THE TRIO', isActiveGlow: true },
        ]
        : [
            { href: '/member/dashboard', icon: LayoutGrid, label: 'パーソナル' },
            { href: '/member/reports', icon: FileText, label: 'カルテ' },
            { href: '/member/cancel', icon: XCircle, label: 'おやすみ', isSpecial: true },
            { href: '/trio/dashboard', icon: Crown, label: 'THE TRIO', isActiveGlow: true },
        ];

    if (pathname === '/member/login') return null;

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-4 md:hidden">
            <nav className="max-w-lg mx-auto bg-white/70 backdrop-blur-3xl border border-white/50 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.1)] flex justify-between items-center px-2 py-2 relative overflow-hidden">
                {/* 背景の装飾的なグラデーション（微か） */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 via-transparent to-purple-50/20 pointer-events-none" />
                
                {navItems.map((item: any) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                    // 特別なボタン（おやすみなど）のスタイル
                    if (item.isSpecial) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center w-16"
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                                    isActive 
                                        ? "bg-red-500 text-white shadow-red-200 rotate-0 scale-110" 
                                        : "bg-red-50/50 text-red-500 hover:bg-red-100 shadow-transparent rotate-[-4deg]"
                                )}>
                                    <item.icon className="h-6 w-6" strokeWidth={2.5} />
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black mt-1.5 transition-colors duration-300",
                                    isActive ? "text-red-600" : "text-red-400/70"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    }

                    // 通常のボタンおよび THE TRIO
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center py-2 px-1 transition-all duration-500 rounded-3xl",
                                isTrioMember ? "flex-1" : "w-16",
                                isActive ? "scale-105" : "hover:scale-105 active:scale-95"
                            )}
                        >
                            {/* アクティブ時のインジケーター（グロー効果） */}
                            {isActive && (
                                <div className={cn(
                                    "absolute inset-0 rounded-3xl blur-xl opacity-40 transition-all duration-700",
                                    item.isActiveGlow ? "bg-amber-400" : "bg-blue-400"
                                )} />
                            )}

                            <div className={cn(
                                "relative z-10 p-2.5 rounded-2xl transition-all duration-500 group",
                                isActive
                                    ? (item.isActiveGlow 
                                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-200/50" 
                                        : "bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-xl shadow-blue-200/50")
                                    : "text-slate-400 hover:text-slate-600"
                            )}>
                                <item.icon className={cn("h-5 w-5 transition-transform duration-500", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            
                            <span className={cn(
                                "relative z-10 text-[9px] font-black mt-1 text-center truncate w-full px-1 transition-colors duration-300",
                                isActive 
                                    ? (item.isActiveGlow ? "text-amber-600" : "text-blue-600") 
                                    : "text-slate-400"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
