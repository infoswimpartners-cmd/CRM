'use client'

import Link from 'next/link'
import {
    Calendar,
    FileText,
    Ticket,
    MessageCircle,
    LogOut,
    ChevronRight,
    LayoutGrid,
    User,
    Settings,
    Crown,
    CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut as nextAuthSignOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface MemberDesktopSidebarProps {
    studentName?: string
    isTrioMember?: boolean
    isMember?: boolean
}

export default function MemberDesktopSidebar({
    studentName,
    isTrioMember = false,
    isMember = false,
}: MemberDesktopSidebarProps) {
    const pathname = usePathname()

    const handleLogout = async () => {
        try {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                await supabase.auth.signOut();
            }
        } catch (error) {
            console.error('Supabase signOut error:', error);
        } finally {
            await nextAuthSignOut({ callbackUrl: "/member/login" });
        }
    };

    const navItems = [
        { href: '/member/dashboard', icon: LayoutGrid, label: 'ホーム', subLabel: '予約の確認・キャンセル', external: false },
        ...(isMember ? [
            { href: '/member/billing', icon: CreditCard, label: 'ご契約・お支払い', subLabel: '契約内容・お支払い方法の変更', external: false }
        ] : []),
        { href: '/member/profile', icon: User, label: 'マイページ', subLabel: '基本情報の確認・変更', external: false },
    ];

    if (pathname === '/member/login') return null;

    return (
        <aside className="sticky top-0 h-screen bg-white/70 backdrop-blur-2xl border-r border-sky-100 flex flex-col w-72 flex-shrink-0 z-40 hidden lg:flex">
            {/* Logo Section */}
            <div className="p-6 border-b border-sky-50 flex justify-center">
                <div className="relative w-36 h-10">
                    <img
                        src="/logo.png"
                        alt="Swim Partners"
                        className="object-contain w-full h-full"
                    />
                </div>
            </div>

            {/* Header / Profile section */}
            <div className="p-8 pb-6 flex items-center justify-between border-b border-sky-50 bg-gradient-to-br from-sky-50/50 to-white/30">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500 shadow-md shadow-sky-100 flex items-center justify-center text-white transform rotate-3">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-sky-500 font-black tracking-widest uppercase">会員プロフィール</p>
                        <h2 className="font-bold text-slate-800 text-base">{studentName || 'ゲスト'} 様</h2>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const ItemContent = (
                        <div className={cn(
                            "flex items-center justify-between w-full p-4 rounded-2xl transition-all duration-300 group",
                            isActive
                                ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-lg shadow-sky-100 font-semibold"
                                : "text-slate-500 hover:bg-sky-50/60 hover:text-sky-600"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-all duration-300",
                                    isActive ? "bg-white/20 shadow-inner" : "bg-sky-50/60 group-hover:bg-white group-hover:shadow-sm"
                                )}>
                                    <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px] text-white" : "text-slate-400 group-hover:text-sky-600")} />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm tracking-tight">{item.label}</p>
                                    <p className={cn(
                                        "text-[10px] uppercase tracking-tight hidden xl:block",
                                        isActive ? "text-white/80" : "text-slate-400"
                                    )}>{item.subLabel}</p>
                                </div>
                            </div>
                            <ChevronRight className={cn(
                                "w-4 h-4 transition-transform group-hover:translate-x-1 hidden xl:block",
                                isActive ? "text-white/70" : "text-slate-300"
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
                            >
                                {ItemContent}
                            </a>
                        )
                    }

                    return (
                        <Link key={item.href} href={item.href} className="block">
                            {ItemContent}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-6 bg-slate-50/40 border-t border-slate-100">
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all h-12"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span className="font-semibold text-sm">ログアウト</span>
                </Button>
            </div>
        </aside>
    )
}
