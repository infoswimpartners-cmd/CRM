'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogOut, LayoutDashboard, Users, Calendar, DollarSign, Settings, User, History, PlusCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface DesktopSidebarProps {
    role: string
}

export function DesktopSidebar({ role }: DesktopSidebarProps) {
    const pathname = usePathname()

    const NavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: any, label: string, isActive?: boolean }) => (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-cyan-100 text-cyan-900 border-l-4 border-cyan-500 font-bold shadow-sm'
                : 'text-slate-500 hover:text-cyan-700 hover:bg-cyan-50'
                }`}
        >
            <Icon className={`h-5 w-5 ${isActive ? 'text-primary drop-shadow-sm' : 'group-hover:text-primary'}`} />
            <span className="font-medium tracking-wide">{label}</span>
        </Link>
    )

    const NavHeading = ({ children }: { children: React.ReactNode }) => (
        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {children}
        </div>
    )

    return (
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 glass z-50 flex-col border-r border-white/20 shadow-xl overflow-y-auto">
            <div className="p-6 flex items-center justify-center sticky top-0 bg-white/20 backdrop-blur-md z-10">
                <div className="relative w-full h-14">
                    <Image
                        src="/logo.png"
                        alt="Swim Partners"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 pb-4">
                {role === 'admin' ? (
                    <>
                        <NavItem href="/admin" icon={LayoutDashboard} label="ダッシュボード" isActive={pathname === '/admin'} />

                        <NavHeading>分析・集計</NavHeading>
                        <NavItem href="/admin/analytics" icon={DollarSign} label="売上詳細" isActive={pathname?.startsWith('/admin/analytics')} />
                        <NavItem href="/admin/reports" icon={Calendar} label="実施メモ一覧" isActive={pathname?.startsWith('/admin/reports')} />

                        <NavHeading>運営管理</NavHeading>
                        <NavItem href="/customers" icon={Users} label="会員管理" isActive={pathname?.startsWith('/customers')} />
                        <NavItem href="/admin/coaches" icon={User} label="コーチ管理" isActive={pathname?.startsWith('/admin/coaches')} />

                        <NavHeading>実務メニュー</NavHeading>
                        <NavItem href="/coach/history" icon={History} label="レッスン履歴" isActive={pathname?.startsWith('/coach/history')} />
                        <NavItem href="/coach/schedule" icon={Calendar} label="予定登録" isActive={pathname?.startsWith('/coach/schedule')} />
                        <NavItem href="/coach/report" icon={PlusCircle} label="レッスン報告" isActive={pathname?.startsWith('/coach/report')} />

                        <NavHeading>システム</NavHeading>
                        <NavItem href="/admin/masters" icon={Settings} label="マスタ設定" isActive={pathname?.startsWith('/admin/masters')} />
                        <NavItem href="/admin/settings" icon={Settings} label="全体設定" isActive={pathname?.startsWith('/admin/settings')} />
                    </>
                ) : (
                    <>
                        <NavItem href="/coach" icon={LayoutDashboard} label="ダッシュボード" isActive={pathname === '/coach'} />

                        <NavHeading>運営管理</NavHeading>
                        <NavItem href="/students" icon={Users} label="生徒管理" isActive={pathname?.startsWith('/students')} />

                        <NavHeading>実務メニュー</NavHeading>
                        <NavItem href="/coach/history" icon={History} label="レッスン履歴" isActive={pathname?.startsWith('/coach/history')} />
                        <NavItem href="/coach/schedule" icon={Calendar} label="予定登録" isActive={pathname?.startsWith('/coach/schedule')} />
                        <NavItem href="/coach/report" icon={PlusCircle} label="レッスン報告" isActive={pathname?.startsWith('/coach/report')} />

                        <NavHeading>分析・集計</NavHeading>
                        <NavItem href="/finance" icon={DollarSign} label="売上管理" isActive={pathname?.startsWith('/finance')} />

                        <NavHeading>設定</NavHeading>
                        <NavItem href="/settings" icon={Settings} label="アカウント設定" isActive={pathname?.startsWith('/settings')} />
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-white/20 bg-white/10">
                <form action="/auth/signout" method="post">
                    <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50">
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">ログアウト</span>
                    </button>
                </form>
            </div>
        </aside>
    )
}
