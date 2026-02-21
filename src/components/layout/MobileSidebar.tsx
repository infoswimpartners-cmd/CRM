'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, History, PlusCircle, Mail, FileCheck, Megaphone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function MobileSidebar({ userProfile }: { userProfile: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const NavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: any, label: string, isActive?: boolean }) => (
        <Link
            href={href}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-cyan-100 text-cyan-900 border-l-4 border-cyan-500 font-bold shadow-sm'
                : 'text-slate-500 hover:text-cyan-700 hover:bg-cyan-50'
                }`}
        >
            <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-600' : 'group-hover:text-cyan-600'}`} />
            <span className="font-medium tracking-wide">{label}</span>
        </Link>
    )

    return (
        <div className="md:hidden">
            {/* Mobile Header Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                        <Menu className="h-6 w-6 text-slate-700" />
                    </Button>
                    <div className="relative w-32 h-8">
                        <Image
                            src="/logo.png"
                            alt="Swim Partners"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                </div>
                {/* User Avatar Tiny */}
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                    {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cyan-100 text-cyan-700 font-bold text-xs">
                            {userProfile?.full_name?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            )}

            {/* Sidebar Drawer */}
            <div className={`fixed top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200 z-[70] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                    <span className="font-bold text-xl text-slate-800">メニュー</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <X className="h-5 w-5 text-slate-500" />
                    </Button>
                </div>

                <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                    {userProfile?.role === 'admin' ? (
                        <>
                            <NavItem href="/admin" icon={LayoutDashboard} label="ダッシュボード" isActive={pathname === '/admin'} />

                            <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">分析・集計</div>
                            <NavItem href="/admin/analytics" icon={DollarSign} label="売上詳細" isActive={pathname?.startsWith('/admin/analytics')} />
                            <NavItem href="/admin/approvals" icon={FileCheck} label="承認管理" isActive={pathname?.startsWith('/admin/approvals')} />
                            <NavItem href="/admin/reports" icon={Calendar} label="実施メモ一覧" isActive={pathname?.startsWith('/admin/reports')} />

                            <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">運営管理</div>
                            <NavItem href="/admin/inquiries" icon={MessageCircle} label="お問い合わせ" isActive={pathname?.startsWith('/admin/inquiries')} />
                            <NavItem href="/admin/schedule" icon={Calendar} label="全体スケジュール" isActive={pathname?.startsWith('/admin/schedule')} />
                            <NavItem href="/customers" icon={Users} label="会員管理" isActive={pathname?.startsWith('/customers')} />
                            <NavItem href="/admin/coaches" icon={Users} label="コーチ管理" isActive={pathname?.startsWith('/admin/coaches')} />

                            <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">実務メニュー</div>
                            <NavItem href="/coach/history" icon={History} label="レッスン履歴" isActive={pathname?.startsWith('/coach/history')} />
                            <NavItem href="/coach/schedule" icon={Calendar} label="予定登録" isActive={pathname?.startsWith('/coach/schedule')} />
                            <NavItem href="/coach/report" icon={PlusCircle} label="レッスン報告" isActive={pathname?.startsWith('/coach/report')} />

                            <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">システム</div>
                            <NavItem href="/admin/masters" icon={Settings} label="マスタ設定" isActive={pathname?.startsWith('/admin/masters')} />
                            <NavItem href="/admin/announcements" icon={Megaphone} label="お知らせ管理" isActive={pathname?.startsWith('/admin/announcements')} />
                            <NavItem href="/admin/email-templates" icon={Mail} label="メール設定" isActive={pathname?.startsWith('/admin/email-templates')} />
                            <NavItem href="/admin/settings" icon={Settings} label="全体設定" isActive={pathname?.startsWith('/admin/settings')} />
                        </>
                    ) : (
                        <>
                            <NavItem href="/coach" icon={LayoutDashboard} label="ダッシュボード" isActive={pathname === '/coach'} />
                            <NavItem href="/students" icon={Users} label="生徒管理" isActive={pathname?.startsWith('/students')} />
                            <NavItem href="/coach/schedule" icon={Calendar} label="スケジュール" isActive={pathname === '/coach/schedule'} />
                            <NavItem href="/finance" icon={DollarSign} label="支払い通知書一覧" isActive={pathname?.startsWith('/finance')} />

                            <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">設定</div>
                            <NavItem href="/settings" icon={Settings} label="アカウント設定" isActive={pathname?.startsWith('/settings')} />
                        </>
                    )}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-slate-50/50">
                    <form action="/auth/signout" method="post">
                        <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50">
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">ログアウト</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
