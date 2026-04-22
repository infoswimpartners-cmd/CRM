'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TrioBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/trio/dashboard', icon: Home, label: 'Home' },
    { href: '#reservations', icon: Calendar, label: '予約' },
    { href: '#roadmap', icon: TrendingUp, label: '成長ログ' },
    { href: '/member/profile', icon: User, label: 'マイページ' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4 md:hidden">
      <nav className="max-w-lg mx-auto bg-[#0A192F]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.4)] flex justify-between items-center px-4 py-2 relative overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isScrollLink = item.href.startsWith('#');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-1 transition-all duration-500 rounded-3xl flex-1",
                isActive ? "scale-105" : "hover:scale-105 active:scale-95 text-slate-500"
              )}
              onClick={(e) => {
                if (isScrollLink) {
                  e.preventDefault();
                  const target = document.querySelector(item.href);
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
            >
              <div className={cn(
                "relative z-10 p-2.5 rounded-2xl transition-all duration-500",
                isActive
                  ? "bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-xl shadow-indigo-500/20"
                  : "text-slate-400"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "relative z-10 text-[9px] font-black mt-1 text-center truncate w-full px-1",
                isActive ? "text-indigo-400" : "text-slate-500 font-medium"
              )}>
                {item.label}
              </span>
              
              {isActive && (
                <div className="absolute top-0 w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
