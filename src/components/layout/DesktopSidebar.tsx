'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { navigationConfig, type NavItem as NavItemType } from '@/config/navigation'

interface DesktopSidebarProps {
    role: string
}

export function DesktopSidebar({ role }: DesktopSidebarProps) {
    const pathname = usePathname()

    const roleKey = role === 'admin' ? 'admin' : 'coach'
    const config = navigationConfig[roleKey] || navigationConfig.coach

    const checkIsActive = (item: NavItemType) => {
        if (!pathname) return false
        if (item.exact) {
            return pathname === item.href
        }
        return pathname === item.href || pathname.startsWith(item.href + '/')
    }

    const NavItem = ({ item }: { item: NavItemType }) => {
        const Icon = item.icon
        const isActive = checkIsActive(item)

        return (
            <Link
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 group ${isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
            >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="font-medium tracking-normal text-xs truncate">{item.title}</span>
                {item.badge && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                        {item.badge}
                    </span>
                )}
            </Link>
        )
    }

    const NavHeading = ({ children }: { children: React.ReactNode }) => (
        <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
            {children}
        </div>
    )

    return (
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 z-50 flex flex-col shadow-xs overflow-y-auto">
            {/* ヘッダーロゴ */}
            <div className="px-5 py-3.5 flex items-center justify-center sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 z-10">
                <div className="relative w-full h-9">
                    <Image
                        src="/logo.png"
                        alt="Swim Partners"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            {/* メインナビゲーション */}
            <nav className="flex-1 px-3 py-2 space-y-0.5">
                {config.mainNav.map((section, idx) => (
                    <div key={section.domain || idx} className="space-y-0.5">
                        {section.title && <NavHeading>{section.title}</NavHeading>}
                        {section.items.map((item) => (
                            <NavItem key={item.href} item={item} />
                        ))}
                    </div>
                ))}
            </nav>

            {/* フッター固定部（設定・マニュアル・ログアウト） */}
            <div className="flex-shrink-0 p-2.5 border-t border-slate-200/80 bg-white/60 backdrop-blur-md space-y-0.5">
                {config.footerNav.map((item) => (
                    <NavItem key={item.href} item={item} />
                ))}

                <form action="/auth/signout" method="post" className="pt-1">
                    <button
                        type="submit"
                        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-slate-500 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50/80"
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-xs">ログアウト</span>
                    </button>
                </form>
            </div>
        </aside>
    )
}

