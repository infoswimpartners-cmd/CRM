"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { Bell, Menu, Crown, Sparkles } from "lucide-react";
import { useState } from "react";
import { usePathname } from 'next/navigation';
import MemberMobileSidebar from "./MemberMobileSidebar";
import { cn } from "@/lib/utils";

interface MemberHeaderProps {
    unreadCount?: number;
    studentName?: string;
    planName?: string;
    isTrioMember?: boolean;
    isMember?: boolean;
}

/**
 * MemberHeader
 * 明るくクールな洗練されたヘッダー
 */
export default function MemberHeader({ unreadCount = 0, studentName, planName, isTrioMember = false, isMember = false }: MemberHeaderProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    if (pathname === '/member/login' || pathname === '/member/signup') return null;

    const handleLogout = async () => {
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Supabase signOut error:', error);
        } finally {
            await nextAuthSignOut({ callbackUrl: "/member/login" });
        }
    };

    // 現在のページ名を判定
    const getPageTitle = () => {
        if (pathname === '/trio') return 'The Trio';
        if (pathname === '/member/profile') return 'Account';
        if (pathname === '/member/billing') return 'Billing';
        return 'Home';
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-sky-100/60 shadow-[0_4px_30px_rgba(56,189,248,0.03)]">
                <div className="container mx-auto px-6 h-16 md:h-20 flex items-center justify-between max-w-5xl">
                    <div className="flex items-center gap-4">
                        <Link href="/member/dashboard" className="flex items-center gap-3 group">
                            <div className="relative w-28 h-8 md:w-32 md:h-9 lg:hidden">
                                <Image
                                    src="/logo.png"
                                    alt="Swim Partners"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <span className="hidden lg:inline-block text-xs text-sky-500 font-black uppercase tracking-[0.2em] group-hover:translate-x-0.5 transition-transform">
                                {getPageTitle()}
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <Link href="/member/notifications" className="relative p-3 bg-sky-50/50 hover:bg-white border border-sky-100 rounded-2xl transition-all shadow-sm group">
                                <Bell className="w-5 h-5 text-slate-600 group-hover:rotate-12 transition-transform" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
                            </Link>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden w-12 h-12 bg-sky-50/50 hover:bg-white border border-sky-100 rounded-2xl text-slate-700 transition-all"
                        >
                            <Menu className="h-6 w-6 text-slate-700" />
                        </Button>
                        
                        <div className="hidden lg:flex items-center gap-2 p-1.5 bg-sky-50/50 border border-sky-100 rounded-2xl">
                             <div className="w-10 h-10 rounded-xl bg-white border border-sky-100 flex items-center justify-center shadow-sm">
                                <Sparkles className="w-5 h-5 text-sky-400" />
                             </div>
                        </div>
                    </div>
                </div>
            </header>

            <MemberMobileSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                studentName={studentName}
                isTrioMember={isTrioMember}
                isMember={isMember}
                handleLogout={handleLogout}
            />
        </>
    );
}
