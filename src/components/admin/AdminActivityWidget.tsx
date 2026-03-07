'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AllCoachesScheduleWidget } from './AllCoachesScheduleWidget'
import { RecentReportsWidget } from './RecentReportsWidget'

// Define compatible types based on the sub-components
type Schedule = {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    student_name?: string
    student_id?: string
    coach: {
        full_name: string
        avatar_url?: string | null
    }
}

type RecentReport = {
    id: string
    coach_id: string
    lesson_date: string
    student_name: string
    menu_description: string | null
    profiles: {
        full_name: string | null
        avatar_url: string | null
    } | null
}

interface AdminActivityWidgetProps {
    schedules: Schedule[]
    reports: RecentReport[]
}

export function AdminActivityWidget({ schedules, reports }: AdminActivityWidgetProps) {
    return (
        <div className="h-full flex flex-col">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                        <TabsTrigger
                            value="schedule"
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4 py-2 text-xs font-bold transition-all"
                        >
                            今後の予定
                        </TabsTrigger>
                        <TabsTrigger
                            value="report"
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm px-4 py-2 text-xs font-bold transition-all"
                        >
                            最新の報告
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="schedule" className="h-full mt-0 focus-visible:outline-none">
                        <AllCoachesScheduleWidget schedules={schedules} hideCard />
                    </TabsContent>

                    <TabsContent value="report" className="h-full mt-0 focus-visible:outline-none">
                        <RecentReportsWidget reports={reports} hideCard />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
