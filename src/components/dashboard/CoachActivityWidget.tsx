'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AllCoachesScheduleWidget } from '@/components/admin/AllCoachesScheduleWidget'
import { RecentReportsWidget } from '@/components/admin/RecentReportsWidget'

interface CoachActivityWidgetProps {
    schedules: any[]
    reports: any[]
    coachId?: string
}

export function CoachActivityWidget({ schedules, reports, coachId }: CoachActivityWidgetProps) {
    return (
        <div className="h-full flex flex-col">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="schedule">今後の予定</TabsTrigger>
                        <TabsTrigger value="report">最新のメモ</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="schedule" className="h-full mt-0">
                        <AllCoachesScheduleWidget schedules={schedules} title="今後の予定" />
                    </TabsContent>

                    <TabsContent value="report" className="h-full mt-0">
                        <RecentReportsWidget reports={reports} coachId={coachId} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
