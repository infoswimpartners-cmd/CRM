'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { navigationConfig, type NavItem as NavItemType } from '@/config/navigation'

export function MobileSidebar({ userProfile }: { userProfile: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const roleKey = userProfile?.role === 'admin' ? 'admin' : 'coach'
    const config = navigationConfig[roleKey] || navigationConfig.coach

    const checkIsActive = (item: NavItemType) => {
        if (!pathname) return false
        if (item.exact) {
            return pathname === item.href
        }
        return pathname === item.href || pathname.startsWith(item.href + '/')
    }

    // ナビアイテム：min-h-[44px] でタップターゲット確保
    const NavItem = ({ item }: { item: NavItemType }) => {
        const Icon = item.icon
        const isActive = checkIsActive(item)

        return (
            <Link
                href={item.href}
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl transition-all duration-150 group ${isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 active:bg-blue-100'
                    }`}
            >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
                <span className="font-medium tracking-wide text-sm truncate">{item.title}</span>
                {item.badge && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                        {item.badge}
                    </span>
                )}
            </Link>
        )
    }

    // セクション見出し
    const NavHeading = ({ children }: { children: React.ReactNode }) => (
        <div className="px-3 pt-4 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
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
                  [③ フッター・ログアウト flex-shrink-0]
                これにより ③ は絶対に ② と重ならない
            */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-[70] flex flex-col transform transition-transform duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[20px_0_60px_rgba(0,0,0,0.1)]`}
                style={{ willChange: 'transform' }}
            >
                {/* ① ヘッダー */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 min-h-[56px] border-b border-slate-100 bg-white">
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
                    {config.mainNav.map((section, idx) => (
                        <div key={section.domain || idx} className="space-y-0.5">
                            {section.title && <NavHeading>{section.title}</NavHeading>}
                            {section.items.map((item) => (
                                <NavItem key={item.href} item={item} />
                            ))}
                        </div>
                    ))}
                </nav>

                {/* ③ フッター（設定・マニュアル・ログアウト） */}
                <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 p-2.5 space-y-0.5 safe-bottom">
                    {config.footerNav.map((item) => (
                        <NavItem key={item.href} item={item} />
                    ))}

                    <form action="/auth/signout" method="post" className="pt-1">
                        <button
                            type="submit"
                            className="flex items-center gap-3 w-full min-h-[44px] px-3.5 py-2.5 text-slate-500 hover:text-red-500 active:text-red-600 transition-colors rounded-xl hover:bg-red-50 active:bg-red-100 touch-manipulation"
                        >
                            <LogOut className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium text-sm">ログアウト</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

