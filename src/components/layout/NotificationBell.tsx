import { Bell, Mail, CreditCard } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface NotificationBellProps {
    isAdmin: boolean
}

export async function NotificationBell({ isAdmin }: NotificationBellProps) {
    if (!isAdmin) return null

    const supabase = createAdminClient()

    // 1. Pending Billing Approvals
    const { count: billingCount } = await supabase
        .from('lesson_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('billing_status', 'awaiting_approval')

    // 2. Pending Reception Approvals (Inquiry Only)
    const { count: receptionCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inquiry')

    const totalCount = (billingCount || 0) + (receptionCount || 0)
    const hasNotifications = totalCount > 0

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div
                    className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
                    role="button"
                >
                    <Bell className="w-6 h-6" />
                    {hasNotifications && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                        </span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-slate-700">通知</h4>
                    {hasNotifications && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                            {totalCount}件
                        </span>
                    )}
                </div>
                <div className="p-4 space-y-3">
                    {!hasNotifications ? (
                        <div className="text-center text-slate-500 text-sm py-4">
                            新しい通知はありません
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail className="h-4 w-4" />
                                    <span>申込承認待ち</span>
                                </div>
                                <span className={`font-bold ${receptionCount && receptionCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {receptionCount || 0}件
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <CreditCard className="h-4 w-4" />
                                    <span>請求承認待ち</span>
                                </div>
                                <span className={`font-bold ${billingCount && billingCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {billingCount || 0}件
                                </span>
                            </div>
                        </>
                    )}
                </div>
                <div className="p-3 bg-slate-50 border-t">
                    <Button asChild className="w-full text-xs" size="sm" variant="outline">
                        <Link href="/admin/approvals">承認管理ページへ移動</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
