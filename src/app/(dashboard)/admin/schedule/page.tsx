import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleCalendar } from '@/components/dashboard/ScheduleCalendar'

export default async function AdminSchedulePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Optional: Check if user is strictly admin?
    // The page is under /admin layout usually protected, but safe to check.
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        redirect('/coach/schedule')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">全体スケジュール</h1>
                    <p className="text-muted-foreground">全コーチのレッスン予定の確認・変更</p>
                </div>
            </div>

            {/* Render in Admin View Mode */}
            <ScheduleCalendar adminView={true} />
        </div>
    )
}
