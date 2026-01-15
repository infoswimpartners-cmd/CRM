import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleCalendar } from '@/components/dashboard/ScheduleCalendar'

export default async function CoachSchedulePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">スケジュール</h1>
                    <p className="text-muted-foreground">今後のレッスンの確認・追加</p>
                </div>
            </div>

            <ScheduleCalendar />
        </div>
    )
}
