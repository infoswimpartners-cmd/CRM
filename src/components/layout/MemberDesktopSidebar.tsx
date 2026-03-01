'use client'

import Link from 'next/link'
import {
    Home,
    Calendar,
    FileText,
    Ticket,
    MessageCircle,
    LogOut,
    ChevronRight,
    User,
    Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut as nextAuthSignOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface MemberDesktopSidebarProps {
    studentName?: string
}

export default function MemberDesktopSidebar({
    studentName
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
        { href: '/member/dashboard', icon: Home, label: 'ホーム', subLabel: 'トップページ' },
        { href: '/member/reservation', icon: Calendar, label: 'レッスン予約', subLabel: 'スケジュールリクエスト' },
        { href: '/member/reports', icon: FileText, label: 'カルテ・レポート', subLabel: '成長の記録' },
        { href: '/member/tickets', icon: Ticket, label: 'チケット管理', subLabel: '残高・購入履歴' },
        { href: '/member/profile', icon: Settings, label: 'アカウント設定', subLabel: '基本情報の確認・変更' },
        { href: 'https://lin.ee/placeholder', icon: MessageCircle, label: '公式LINE', subLabel: '運営へのお問い合わせ', external: true },
    ]

    return (
        <aside className="sticky top-0 h-screen bg-white/50 backdrop-blur-2xl border-r border-blue-100 flex flex-col w-72 flex-shrink-0 z-40 hidden lg:flex">
            {/* Logo Section */}
            <div className="p-6 border-b border-blue-50/50 flex justify-center">
                <div className="relative w-36 h-10">
                    <img
                        src="/logo.png"
                        alt="Swim Partners"
                        className="object-contain w-full h-full"
                    />
                </div>
            </div>

            {/* Header / Profile section */}
            <div className="p-8 pb-6 flex items-center justify-between border-b border-blue-50 bg-gradient-to-br from-blue-50/30 to-white/30">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center text-white transform rotate-3">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-400 font-black tracking-widest uppercase">会員プロフィール</p>
                        <h2 className="font-black text-gray-800 text-base">{studentName || 'ゲスト'} 様</h2>
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
                                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-200"
                                : "text-gray-500 hover:bg-blue-50/50 hover:text-blue-600"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-all duration-300",
                                    isActive ? "bg-white/20 shadow-inner" : "bg-gray-50 group-hover:bg-white group-hover:shadow-sm"
                                )}>
                                    <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-tight">{item.label}</p>
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-tighter hidden xl:block",
                                        isActive ? "text-blue-100/80" : "text-gray-400"
                                    )}>{item.subLabel}</p>
                                </div>
                            </div>
                            <ChevronRight className={cn(
                                "w-4 h-4 transition-transform group-hover:translate-x-1 hidden xl:block",
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
            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all h-12"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span className="font-bold text-sm">ログアウト</span>
                </Button>
            </div>
        </aside>
    )
}
