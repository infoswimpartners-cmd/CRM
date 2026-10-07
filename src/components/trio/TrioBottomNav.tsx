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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A192F]/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-xs md:hidden">
      <nav className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isScrollLink = item.href.startsWith('#');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors duration-200",
                isActive ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
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
              {/* アクティブ時の上部インジケーターライン */}
              {isActive && (
                <span className="absolute top-0 w-8 h-[2px] rounded-full bg-indigo-400" />
              )}

              <item.icon 
                className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-105")} 
                strokeWidth={isActive ? 2.2 : 1.8} 
              />
              <span className={cn(
                "text-[10px] mt-1 text-center truncate w-full px-1 tracking-tight",
                isActive ? "font-bold text-indigo-400" : "font-medium text-slate-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
