'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Crown, User } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MemberBottomNav
 * 明るくクールなガラスモーフィズム・ナビゲーション
 */
export default function MemberBottomNav({ isTrioMember = false }: { isTrioMember?: boolean }) {
    const pathname = usePathname()

    const navItems = [
        { href: '/member/dashboard', icon: Home, label: 'ホーム' },
        { href: '/member/reports', icon: FileText, label: 'カルテ' },
        { href: '/trio', icon: Crown, label: 'Trio', isTrio: true },
        { href: '/member/profile', icon: User, label: 'マイページ' },
    ];

    if (pathname === '/member/login' || pathname === '/member/signup') return null;

    return (
        <div className="fixed bottom-8 left-0 right-0 z-[100] px-6 md:hidden">
            <nav className="max-w-md mx-auto bg-white/80 backdrop-blur-3xl border border-sky-100 rounded-[2.5rem] shadow-[0_20px_80px_rgba(56,189,248,0.15)] flex justify-between items-center px-4 py-3 relative overflow-hidden">
                {/* 繊細なアクセントグラデーション */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-sky-50/50 via-transparent to-transparent pointer-events-none" />
                
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/member/dashboard' && pathname.startsWith(item.href + '/'))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center py-1 transition-all duration-500",
                                isActive ? "scale-110 flex-1" : "flex-1 opacity-40 hover:opacity-100"
                            )}
                        >
                            {/* アクティブ時のグローインジケーター */}
                            {isActive && (
                                <div className={cn(
                                    "absolute inset-0 rounded-3xl blur-2xl opacity-30 transition-all duration-1000",
                                    item.isTrio ? "bg-amber-400" : "bg-sky-400"
                                )} />
                            )}

                            <div className={cn(
                                "relative z-10 p-2.5 rounded-2xl transition-all duration-500",
                                isActive
                                    ? (item.isTrio 
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-200" 
                                        : "bg-sky-600 text-white shadow-lg shadow-sky-200")
                                    : "text-slate-900"
                            )}>
                                <item.icon className={cn("h-5 w-5 transition-transform duration-500", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            
                            <span className={cn(
                                "relative z-10 text-[9px] font-black mt-1.5 text-center truncate w-full px-1 transition-all duration-300 tracking-tighter",
                                isActive 
                                    ? (item.isTrio ? "text-amber-600" : "text-sky-600") 
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
