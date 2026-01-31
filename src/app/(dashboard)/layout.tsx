import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react' // Add Suspense
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { User, Bell, Search, LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { GlobalSearchContainer } from '@/components/layout/GlobalSearchContainer' // Import Container
import { NotificationBell } from '@/components/layout/NotificationBell' // [NEW]
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*, coach_number') // Explicitly select coach_number just in case * doesn't get it due to types? No, * gets all. But let's be safe or just rely on *
        // * is fine.
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/')
    }

    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || ''

    if (profile.must_change_password && !pathname.includes('/change-password')) {
        redirect('/change-password')
    }

    const safeProfile = profile as { id: string; full_name: string | null; role: string; avatar_url: string | null; email: string; coach_number: string | null }

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }



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
        <div className="min-h-screen bg-transparent flex font-sans selection:bg-primary/30">
            {/* Mobile Sidebar */}
            <MobileSidebar userProfile={safeProfile} />

            {/* Sidebar (Desktop) */}
            {/* Sidebar (Desktop) */}
            <DesktopSidebar role={safeProfile.role} />

            {/* Main Content */}
            <div className="md:ml-64 ml-0 flex-1 flex flex-col min-h-screen relative overflow-hidden transition-all duration-300 pt-16 md:pt-0">
                {/* Background Orbs */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
                </div>

                {/* Floating Header */}
                <header className="relative md:sticky md:top-4 z-40 mx-4 md:mx-6 mt-4">
                    <div className="glass rounded-2xl px-6 py-3 flex items-center justify-between shadow-sm border border-white/40">
                        <div className="flex-1 max-w-md relative">
                            <Suspense fallback={
                                <div className="h-11 w-full max-w-md bg-white/20 backdrop-blur-md rounded-full animate-pulse ring-1 ring-white/10" />
                            }>
                                <GlobalSearchContainer isAdmin={safeProfile.role === 'admin'} />
                            </Suspense>
                        </div>

                        <div className="flex items-center gap-4 ml-4">
                            {/* [NEW] Notification Bell */}
                            <Suspense>
                                <NotificationBell isAdmin={safeProfile.role === 'admin' || safeProfile.role === 'owner'} />
                            </Suspense>

                            <Link href="/settings" className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-4 rounded-full transition-all border border-transparent hover:border-white/5">
                                <Avatar className="h-9 w-9 ring-2 ring-white/10">
                                    <AvatarImage src={safeProfile.avatar_url || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-cyan-900 to-blue-900 text-cyan-100">
                                        {safeProfile.full_name?.slice(0, 1) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-white leading-none">{safeProfile.full_name}</p>
                                    <div className="flex flex-col mt-1">
                                        <p className="text-xs text-slate-400 capitalize">{safeProfile.role}</p>
                                        <p className="text-[10px] text-slate-500 font-mono opacity-70 hover:opacity-100 transition-opacity">
                                            ID: {safeProfile.coach_number || safeProfile.id.slice(0, 8)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="relative z-10 flex-1 p-6 space-y-6">
                    {children}
                </main>
            </div >
        </div >
    )
}
