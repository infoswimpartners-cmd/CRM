"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { LogOut, Bell, Menu } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import MemberMobileSidebar from "./MemberMobileSidebar";

interface MemberHeaderProps {
    unreadCount?: number;
    studentName?: string;
    planName?: string;
}

export default function MemberHeader({ unreadCount = 0, studentName, planName }: MemberHeaderProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            // Logout from Supabase
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            const session = data?.session;
            if (session) {
                await supabase.auth.signOut();
            }
        } catch (error) {
            console.error('Supabase signOut error:', error);
        } finally {
            // Logout from NextAuth (this will also redirect)
            await nextAuthSignOut({ callbackUrl: "/member/login" });
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-blue-100 bg-white/80 backdrop-blur-xl shadow-sm transition-all duration-300">
                <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
                    <div className="flex flex-col justify-center py-1">
                        <span className="text-[10px] md:text-xs text-gray-400 font-medium">
                            おかえりなさい！
                        </span>
                        <span className="font-black text-gray-800 text-lg md:text-xl tracking-tight leading-none mt-0.5 flex items-center gap-2">
                            {studentName || 'ゲスト'}さん
                            {planName && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold tracking-wider relative -top-0.5">
                                    {planName}
                                </span>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {unreadCount > 0 ? (
                            <Link href="/member/notifications" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors mr-1">
                                <Bell className="w-5 h-5 text-gray-600" />
                                <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-white">
                                    {unreadCount}
                                </span>
                            </Link>
                        ) : (
                            <div className="p-2 mr-1">
                                <Bell className="w-5 h-5 text-gray-300" />
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden hover:bg-white/50 rounded-full ml-1 md:ml-2"
                        >
                            <Menu className="h-6 w-6 text-gray-600" />
                        </Button>
                    </div>
                </div>
            </header>

            <MemberMobileSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                studentName={studentName}
                handleLogout={handleLogout}
            />
        </>
    );
}
