'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Crown, User, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MemberBottomNav
 * Apple HIG標準の画面下端フラット接地ボトムナビゲーション
 */
export default function MemberBottomNav({ 
    isTrioMember = false,
    isMember = false,
}: { 
    isTrioMember?: boolean 
    isMember?: boolean
}) {
    const pathname = usePathname()

    const navItems = [
        { href: '/member/dashboard', icon: Home, label: 'ホーム' },
        ...(isTrioMember ? [
            { href: '/trio', icon: Crown, label: 'Trio', isTrio: true }
        ] : []),
        ...(isMember ? [
            { href: '/member/billing', icon: CreditCard, label: '契約・支払い' }
        ] : []),
        { href: '/member/profile', icon: User, label: 'マイページ' },
    ];

    if (pathname === '/member/login' || pathname === '/member/signup') return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] shadow-xs md:hidden">
            <nav className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/member/dashboard' && pathname.startsWith(item.href + '/'))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors duration-200",
                                isActive 
                                    ? (item.isTrio ? "text-amber-600" : "text-sky-600")
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {/* アクティブ時の上部インジケーターライン */}
                            {isActive && (
                                <span className={cn(
                                    "absolute top-0 w-8 h-[2px] rounded-full",
                                    item.isTrio ? "bg-amber-500" : "bg-sky-600"
                                )} />
                            )}

                            <item.icon 
                                className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-105")} 
                                strokeWidth={isActive ? 2.2 : 1.8} 
                            />
                            
                            <span className={cn(
                                "text-[10px] mt-1 text-center truncate w-full px-1 tracking-tight",
                                isActive ? "font-bold" : "font-medium"
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
