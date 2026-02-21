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
}

export default function MemberHeader({ unreadCount = 0, studentName }: MemberHeaderProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        // Logout from Supabase
        const supabase = createClient();
        await supabase.auth.signOut();

        // Logout from NextAuth (this will also redirect)
        await nextAuthSignOut({ callbackUrl: "/member/login" });
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-blue-100 bg-white/80 backdrop-blur-xl shadow-sm transition-all duration-300">
                <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-1 md:gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(true)}
                            className="mr-1 md:hidden hover:bg-white/50 rounded-full"
                        >
                            <Menu className="h-6 w-6 text-gray-600" />
                        </Button>

                        <Link href="/member/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                            <div className="relative w-28 h-8 md:w-32 md:h-10">
                                <Image
                                    src="/logo.png"
                                    alt="Swim Partners"
                                    fill
                                    className="object-contain object-left"
                                    priority
                                />
                            </div>
                        </Link>
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
                            size="sm"
                            onClick={handleLogout}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full px-3 md:px-4"
                        >
                            <LogOut className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                            <span className="hidden md:inline">ログアウト</span>
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
