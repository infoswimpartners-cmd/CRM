'use client'

import { Ticket, History, PlusCircle } from 'lucide-react'
import Link from 'next/link'

interface TicketCardProps {
    balance: number;
}

export default function TicketCard({ balance }: TicketCardProps) {
    return (
        <div className="glass-card relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-500 text-white p-6 shadow-xl shadow-blue-200/50 border-white/20">
            {/* Decorative water-like shapes */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-cyan-300/20 blur-2xl" />

            <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-white/90">
                        <Ticket className="w-5 h-5" />
                        <span className="font-bold text-sm tracking-widest uppercase">Ticket Pass</span>
                    </div>
                    <div className="px-2 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-md text-[10px] font-black text-white tracking-tighter">
                        MEMBER
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-xs text-blue-100/80 font-medium mb-1">利用可能残高</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black tracking-tighter text-white drop-shadow-sm">{balance}</span>
                        <span className="text-lg font-bold text-blue-100/90">枚</span>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <Link href="/member/tickets" className="flex-1 bg-white hover:bg-blue-50 text-blue-600 text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-all shadow-md active:scale-95">
                        <PlusCircle className="w-3.5 h-3.5" />
                        購入
                    </Link>
                    <Link href="/member/tickets" className="flex-1 bg-blue-400/30 hover:bg-blue-400/40 text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-all border border-white/20 backdrop-blur-sm active:scale-95">
                        <History className="w-3.5 h-3.5" />
                        履歴
                    </Link>
                </div>
            </div>
        </div>
    )
}
