'use client'

import { useState } from 'react'
import {
    BookOpen,
    CreditCard,
    User,
    Info,
    Menu,
    Coins,
    ChevronRight
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { MembershipGuide } from '@/components/admin/manual/MembershipGuide'
import { CoachManagementGuide } from '@/components/admin/manual/CoachManagementGuide'
import { InternalOperationsGuide } from '@/components/admin/manual/InternalOperationsGuide'
import { BillingSystemGuide } from '@/components/admin/manual/BillingSystemGuide'

// Menu Items Configuration
const menuItems = [
    {
        id: 'billing',
        title: '請求システム総合ガイド',
        icon: Coins,
        component: BillingSystemGuide
    },
    {
        id: 'membership',
        title: '会員種別の変更',
        icon: CreditCard,
        component: MembershipGuide
    },
    {
        id: 'coach',
        title: 'コーチ管理・招待',
        icon: User,
        component: CoachManagementGuide
    },
    {
        id: 'internal',
        title: '社内運用マニュアル',
        icon: Info,
        component: InternalOperationsGuide
    }
]

export default function AdminManualPage() {
    const [activeSection, setActiveSection] = useState('billing')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const ActiveComponent = menuItems.find(item => item.id === activeSection)?.component || BillingSystemGuide

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                    管理者マニュアル
                </h1>
                <p className="text-slate-500 mt-2">
                    システムの使用方法、請求ルール、運用フローのドキュメントセンター
                </p>
            </div>

            <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
                {/* Mobile Menu Toggle */}
                <div className="md:hidden mb-4">
                    <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <span className="flex items-center gap-2">
                            <Menu className="h-4 w-4" />
                            メニューを選択
                        </span>
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isSidebarOpen && "rotate-90")} />
                    </Button>
                </div>

                {/* Sidebar Navigation */}
                <aside className={cn(
                    "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 transition-all duration-300",
                    !isSidebarOpen && "hidden md:block"
                )}>
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700">
                        目次
                    </div>
                    <nav className="p-2 space-y-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveSection(item.id)
                                    setIsSidebarOpen(false)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                                    activeSection === item.id
                                        ? "bg-blue-50 text-blue-700 shadow-sm"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5",
                                    activeSection === item.id ? "text-blue-600" : "text-slate-400"
                                )} />
                                {item.title}
                                {activeSection === item.id && (
                                    <ChevronRight className="h-4 w-4 ml-auto text-blue-400" />
                                )}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="min-h-[500px]">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm md:p-8">
                        <ActiveComponent />
                    </div>
                </main>
            </div>
        </div>
    )
}
