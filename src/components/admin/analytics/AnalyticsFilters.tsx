'use client'

import { useRouter } from 'next/navigation'
import { Users, Activity } from 'lucide-react'

interface Coach {
    id: string
    full_name: string
}

interface AnalyticsFiltersProps {
    coaches: Coach[]
    selectedCoachId?: string
    selectedYear: number
    availableYears: number[]
}

export function AnalyticsFilters({
    coaches,
    selectedCoachId,
    selectedYear,
    availableYears,
}: AnalyticsFiltersProps) {
    const router = useRouter()

    // コーチ変更時のナビゲーション
    const handleCoachChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const coachId = e.target.value
        const params = new URLSearchParams()
        params.set('year', String(selectedYear))
        if (coachId) params.set('coach_id', coachId)
        router.push(`/admin/analytics?${params.toString()}`)
    }

    // 年度変更時のナビゲーション
    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const year = e.target.value
        const params = new URLSearchParams()
        params.set('year', year)
        if (selectedCoachId) params.set('coach_id', selectedCoachId)
        router.push(`/admin/analytics?${params.toString()}`)
    }

    const selectClass =
        'appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-sm min-w-[140px]'

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
                {/* コーチ選択 */}
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <label htmlFor="coach-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        表示対象コーチ:
                    </label>
                    <div className="relative">
                        <select
                            id="coach-select"
                            className={selectClass}
                            value={selectedCoachId || ''}
                            onChange={handleCoachChange}
                        >
                            <option value="">全員</option>
                            {coaches.map(coach => (
                                <option key={coach.id} value={coach.id}>
                                    {coach.full_name}
                                </option>
                            ))}
                        </select>
                        {/* カスタム矢印アイコン */}
                        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* 年度選択 */}
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <label htmlFor="year-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        表示対象年:
                    </label>
                    <div className="relative">
                        <select
                            id="year-select"
                            className={selectClass}
                            value={selectedYear}
                            onChange={handleYearChange}
                        >
                            {availableYears.map(yr => (
                                <option key={yr} value={yr}>
                                    {yr}年
                                </option>
                            ))}
                        </select>
                        {/* カスタム矢印アイコン */}
                        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
