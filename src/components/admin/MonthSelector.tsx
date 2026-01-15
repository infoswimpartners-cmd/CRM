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
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold min-w-[120px] text-center">
                {format(date, 'yyyy年M月', { locale: ja })}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}
