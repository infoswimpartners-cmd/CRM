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
                <div className="flex items-center justify-between mb-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="schedule">今後の予定</TabsTrigger>
                        <TabsTrigger value="report">最新の報告</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="schedule" className="h-full mt-0">
                        <AllCoachesScheduleWidget schedules={schedules} />
                    </TabsContent>

                    <TabsContent value="report" className="h-full mt-0">
                        <RecentReportsWidget reports={reports} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
