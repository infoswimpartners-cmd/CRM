'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Calendar, Users } from 'lucide-react'
import { motion } from 'framer-motion'

// ナビゲーションアイテムの定義
const NAV_ITEMS = [
    {
        label: 'ホーム',
        href: '/coach',
        icon: LayoutDashboard,
        exact: true,
    },
    {
        label: '報告',
        href: '/coach/report',
        icon: FileText,
        exact: false,
    },
    {
        label: '予定',
        href: '/coach/schedule',
        icon: Calendar,
        exact: false,
    },
    {
        label: '生徒',
        href: '/students',
        icon: Users,
        exact: false,
    },
]

export function CoachBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-slate-200/50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
            <div className="h-16 flex items-center justify-around px-4 max-w-lg mx-auto">
                {NAV_ITEMS.map((item) => {
                    // 現在のパスがアクティブかどうかを判定
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href)

                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-500 transition-colors"
                        >
                            {/* アクティブ時のプレミアムな背景発光 & アンダーライン演出 */}
                            {isActive && (
                                <>
                                    {/* タブ背景の微かな円形グラデーション発光 */}
                                    <motion.div
                                        layoutId="bottom-nav-active-glow"
                                        className="absolute inset-0 bg-cyan-50/50 rounded-2xl -z-10 mx-3 my-1"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                    {/* 上部のアクティブインジケーターライン */}
                                    <motion.div
                                        layoutId="bottom-nav-active-indicator"
                                        className="absolute top-0 h-[3px] w-8 bg-cyan-600 rounded-full"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                </>
                            )}

                            {/* アイコン部分のスケールアニメーション */}
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className={`flex flex-col items-center gap-0.5 ${
                                    isActive ? 'text-cyan-600' : 'text-slate-400'
                                }`}
                            >
                                <Icon className="w-5 h-5 transition-transform duration-200" />
                                <span className="text-[10px] font-bold tracking-wider">
                                    {item.label}
                                </span>
                            </motion.div>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
