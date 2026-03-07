'use client'

import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'

interface MonthSelectorProps {
    currentMonth: string // YYYY-MM format
}

export function MonthSelector({ currentMonth }: MonthSelectorProps) {
    const router = useRouter()

    const date = new Date(currentMonth + '-01')

    const handlePrev = () => {
        const prev = subMonths(date, 1)
        const val = format(prev, 'yyyy-MM')
        router.push(`/admin?month=${val}`)
    }

    const handleNext = () => {
        const next = addMonths(date, 1)
        const val = format(next, 'yyyy-MM')
        router.push(`/admin?month=${val}`)
    }

    return (
        <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] ring-1 ring-slate-200/50">
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300"
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col items-center min-w-[130px] px-3">
                <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mb-0.5">Report Period</span>
                <span className="text-base font-black text-slate-800 tracking-tight">
                    {format(date, 'yyyy年 M月', { locale: ja })}
                </span>
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300"
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    )
}
