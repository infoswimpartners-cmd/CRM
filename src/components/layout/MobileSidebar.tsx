'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, History, PlusCircle, Mail, FileCheck, Megaphone, MessageCircle, CreditCard, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function MobileSidebar({ userProfile }: { userProfile: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    // ナビアイテム：min-h-[44px] でタップターゲット確保
    const NavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: any, label: string, isActive?: boolean }) => (
        <Link
            href={href}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 font-bold shadow-sm'
                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 active:bg-blue-100'
                }`}
        >
            <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'group-hover:text-blue-600'}`} />
            <span className="font-medium tracking-wide">{label}</span>
        </Link>
    )

    // セクション見出し
    const NavHeading = ({ children }: { children: React.ReactNode }) => (
        <div className="px-3 pt-5 pb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
            {children}
        </div>
    )

    return (
        <div className="md:hidden">
            {/* ーーー モバイルヘッダーバー（固定） ーーー */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    {/* ハンバーガーボタン（44×44px） */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(true)}
                        className="h-11 w-11"
                        aria-label="メニューを開く"
                    >
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
                {/* 右側ゾーン: コーチIDバッジ + アバター */}
                <div className="flex items-center gap-2">
                    {/* コーチIDバッジ（コーチロールのみ） */}
                    {userProfile?.role === 'coach' && userProfile?.coach_number && (
                        <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md leading-none select-all">
                            {userProfile.coach_number}
                        </span>
                    )}
                    {/* ユーザーアバター（小） */}
                    <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden ring-2 ring-cyan-100 shrink-0">
                        {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-cyan-100 text-cyan-700 font-bold text-sm">
                                {userProfile?.full_name?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ーーー オーバーレイ ーーー */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ーーー サイドバードロワー ーーー
                flex-col で 3 ゾーンに分割：
                  [① ヘッダー flex-shrink-0]
                  [② ナビ    flex-1 + overflow-y-auto]
                  [③ ログアウト flex-shrink-0]
                これにより ③ は絶対に ② と重ならない
            */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200 z-[70] flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[20px_0_60px_rgba(0,0,0,0.1)]`}
                style={{ willChange: 'transform' }}
            >
                {/* ① ヘッダー */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 min-h-[56px] border-b border-slate-100 bg-white/50">
                    <span className="font-bold text-lg text-slate-800">メニュー</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="h-11 w-11"
                        aria-label="メニューを閉じる"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </Button>
                </div>

                {/* ② ナビゲーション（独立スクロール） */}
                <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-0.5">
                    {userProfile?.role === 'admin' ? (
                        <>
                            <NavItem href="/admin" icon={LayoutDashboard} label="ダッシュボード" isActive={pathname === '/admin'} />

                            <NavHeading>分析・集計</NavHeading>
                            <NavItem href="/admin/analytics" icon={DollarSign} label="売上詳細" isActive={pathname?.startsWith('/admin/analytics')} />
                            <NavHeading>財務管理</NavHeading>
                            <NavItem href="/admin/payments" icon={CreditCard} label="決済状況" isActive={pathname?.startsWith('/admin/payments')} />
                            <NavItem href="/admin/approvals" icon={FileCheck} label="承認管理" isActive={pathname?.startsWith('/admin/approvals')} />
                            <NavItem href="/admin/reports" icon={Calendar} label="実施メモ一覧" isActive={pathname?.startsWith('/admin/reports')} />

                            <NavHeading>運営管理</NavHeading>
                            <NavItem href="/admin/inquiries" icon={MessageCircle} label="お問い合わせ" isActive={pathname?.startsWith('/admin/inquiries')} />
                            <NavItem href="/admin/schedule" icon={Calendar} label="全体スケジュール" isActive={pathname?.startsWith('/admin/schedule')} />
                            <NavItem href="/customers" icon={Users} label="会員管理" isActive={pathname?.startsWith('/customers')} />
                            <NavItem href="/admin/coaches" icon={Users} label="コーチ管理" isActive={pathname?.startsWith('/admin/coaches')} />

                            <NavHeading>実務メニュー</NavHeading>
                            <NavItem href="/coach/history" icon={History} label="レッスン履歴" isActive={pathname?.startsWith('/coach/history')} />
                            <NavItem href="/coach/report" icon={PlusCircle} label="レッスン報告" isActive={pathname?.startsWith('/coach/report')} />

                            <NavHeading>システム</NavHeading>
                            <NavItem href="/admin/masters" icon={Settings} label="マスタ設定" isActive={pathname?.startsWith('/admin/masters')} />
                            <NavItem href="/admin/announcements" icon={Megaphone} label="お知らせ管理" isActive={pathname?.startsWith('/admin/announcements')} />
                            <NavItem href="/admin/email-templates" icon={Mail} label="メール設定" isActive={pathname?.startsWith('/admin/email-templates')} />
                            <NavItem href="/admin/settings" icon={Settings} label="全体設定" isActive={pathname?.startsWith('/admin/settings')} />
                        </>
                    ) : (
                        <>
                            <NavItem href="/coach" icon={LayoutDashboard} label="ダッシュボード" isActive={pathname === '/coach'} />

                            <NavHeading>運営管理</NavHeading>
                            <NavItem href="/students" icon={Users} label="生徒管理" isActive={pathname?.startsWith('/students')} />

                            <NavHeading>実務メニュー</NavHeading>
                            <NavItem href="/coach/schedule" icon={Calendar} label="スケジュール管理" isActive={pathname === '/coach/schedule'} />
                            <NavItem href="/coach/history" icon={History} label="レッスン履歴" isActive={pathname?.startsWith('/coach/history')} />
                            <NavItem href="/coach/report" icon={PlusCircle} label="レッスン報告" isActive={pathname?.startsWith('/coach/report')} />

                            <NavHeading>分析・集計</NavHeading>
                            <NavItem href="/finance" icon={DollarSign} label="支払い通知書一覧" isActive={pathname?.startsWith('/finance')} />

                            <NavHeading>設定</NavHeading>
                            <NavItem href="/settings" icon={Settings} label="アカウント設定" isActive={pathname?.startsWith('/settings')} />

                            <NavHeading>ヘルプ</NavHeading>
                            <NavItem href="/coach/manual" icon={BookOpen} label="コーチマニュアル" isActive={pathname?.startsWith('/coach/manual')} />
                        </>
                    )}
                </nav>

                {/* ③ ログアウト（flex-shrink-0 → 常に最下部・重なりゼロ） */}
                <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/90 safe-bottom">
                    <form action="/auth/signout" method="post" className="p-3">
                        <button
                            type="submit"
                            className="flex items-center gap-3 w-full min-h-[44px] px-4 py-2.5 text-slate-500 hover:text-red-500 active:text-red-600 transition-colors rounded-xl hover:bg-red-50 active:bg-red-100 touch-manipulation"
                        >
                            <LogOut className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium">ログアウト</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
