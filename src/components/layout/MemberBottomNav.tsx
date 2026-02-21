'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, FileText, Ticket, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MemberBottomNav() {
    const pathname = usePathname()

    const navItems = [
        { href: '/member/dashboard', icon: Home, label: 'ホーム' },
        { href: '/member/reports', icon: FileText, label: 'カルテ' },
        { href: '/member/reservation', icon: Calendar, label: '予約', isMain: true },
        { href: '/member/tickets', icon: Ticket, label: 'チケット' },
        { href: 'https://lin.ee/placeholder', icon: MessageCircle, label: '公式LINE', external: true },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-2xl border-t border-white/40 px-2 pb-safe pt-1 z-50 md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex justify-around items-end text-xs max-w-lg mx-auto relative h-16">
                {navItems.map((item: any) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                    if (item.isMain) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -top-8 flex flex-col items-center gap-1 group"
                            >
                                <div className={cn(
                                    "w-18 h-18 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) group-active:scale-90",
                                    isActive
                                        ? "bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-blue-400/40 ring-4 ring-white"
                                        : "bg-white text-blue-500 hover:shadow-xl ring-4 ring-white"
                                )}>
                                    <item.icon className="h-9 w-9" strokeWidth={2.5} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-tighter mt-1 translate-y-2.5",
                                    isActive ? "text-blue-600" : "text-gray-400"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    }

                    const content = (
                        <>
                            <div className={cn(
                                "p-2 rounded-2xl transition-all duration-300",
                                isActive ? "bg-blue-100/50 text-blue-600" : "text-gray-400 group-hover:bg-blue-50/50"
                            )}>
                                <item.icon className={cn("h-6 w-6", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold tracking-tighter mt-0.5",
                                isActive ? "text-blue-600" : "text-gray-400"
                            )}>{item.label}</span>
                        </>
                    )

                    if (item.external) {
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center p-2 transition-all w-16 mb-1 group"
                            >
                                {content}
                            </a>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center p-2 transition-all w-16 mb-1 group",
                                isActive ? "scale-110" : "hover:scale-105"
                            )}
                        >
                            {content}
                        </Link>
                    )
                })}
            </div>
            {/* Safe Area Spacer for iPhone Home Bar */}
            <div className="h-safe-bottom" />
        </div>
    );
}
