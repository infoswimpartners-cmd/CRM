import { Bell } from 'lucide-react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

interface NotificationBellProps {
    isAdmin: boolean
}

export async function NotificationBell({ isAdmin }: NotificationBellProps) {
    if (!isAdmin) return null

    const supabase = createAdminClient()

    // Fetch pending billing approvals
    const { count } = await supabase
        .from('lesson_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('billing_status', 'awaiting_approval')

    const hasNotifications = count && count > 0

    return (
        <Link
            href="/admin/billing"
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white"
            title={hasNotifications ? `${count}件の承認待ちがあります` : '通知'}
        >
            <Bell className="w-6 h-6" />

            {hasNotifications && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[#5484FF]"></span>
                </span>
            )}
        </Link>
    )
}
