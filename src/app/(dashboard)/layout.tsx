import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { GlobalSearchContainer } from '@/components/layout/GlobalSearchContainer'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { CoachBottomNav } from '@/components/layout/CoachBottomNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || ''

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
        const redirectUrl = pathname ? `/login?redirectTo=${encodeURIComponent(pathname)}` : '/login'
        redirect(redirectUrl)
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


    return (
        <div className="min-h-screen bg-transparent flex font-sans selection:bg-primary/30">
            {/* Mobile Sidebar */}
            <MobileSidebar userProfile={safeProfile} />

            {/* Sidebar (Desktop) */}
            <DesktopSidebar role={safeProfile.role} />

            {/* Main Content */}
            <div className="md:ml-64 ml-0 flex-1 flex flex-col min-h-screen transition-all duration-150 pt-16 md:pt-0 min-w-0">
                {/* Flat Sticky Header（Apple HIG macOS風すりガラス・上端フラット接地） */}
                <header className="hidden md:block sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 max-w-md relative">
                            <Suspense fallback={
                                <div className="h-10 w-full max-w-md bg-slate-100/60 rounded-lg animate-pulse border border-slate-200/60" />
                            }>
                                <GlobalSearchContainer isAdmin={safeProfile.role === 'admin'} />
                            </Suspense>
                        </div>

                        <div className="flex items-center gap-4 ml-4">
                            {/* [NEW] Notification Bell */}
                            <Suspense>
                                <NotificationBell isAdmin={safeProfile.role === 'admin' || safeProfile.role === 'owner'} />
                            </Suspense>

                            <Link href="/settings" className="flex items-center gap-3 hover:bg-slate-100/80 p-1.5 pr-3 rounded-lg transition-all border border-transparent hover:border-slate-200/60">
                                <Avatar className="h-8 w-8 ring-1 ring-slate-200">
                                    <AvatarImage src={safeProfile.avatar_url || undefined} />
                                    <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">
                                        {safeProfile.full_name?.slice(0, 1) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-semibold text-slate-900 leading-none">{safeProfile.full_name}</p>
                                    <div className="flex flex-col mt-1 gap-1">
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{safeProfile.role}</p>
                                        {safeProfile.role === 'coach' ? (
                                            <p className="text-[11px] font-bold text-cyan-700 font-mono bg-cyan-50 px-1.5 py-0.5 rounded inline-flex w-fit items-center border border-cyan-200">
                                                ID: {safeProfile.coach_number || safeProfile.id.slice(0, 8)}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 font-mono">
                                                ID: {safeProfile.id.slice(0, 8)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className={`relative z-10 flex-1 p-4 md:p-6 space-y-6 ${safeProfile.role === 'coach' ? 'pb-20 md:pb-6' : ''}`}>
                    {children}
                </main>
                {safeProfile.role === 'coach' && <CoachBottomNav />}
            </div >
        </div >
    )
}
