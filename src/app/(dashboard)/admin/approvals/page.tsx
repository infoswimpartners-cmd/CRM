import { createAdminClient } from '@/lib/supabase/admin'
import { FileCheck, ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { ApprovalsTabsClient } from './ApprovalsTabsClient'

export const dynamic = 'force-dynamic'

interface ApprovalsPageProps {
    searchParams: Promise<{ tab?: string }>
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
    const resolvedSearchParams = await searchParams
    const initialTab = resolvedSearchParams?.tab === 'plans' ? 'plans' : 'billing'

    const supabase = createAdminClient()

    // 1. レッスン請求（体験）の未払い/承認待ちデータ取得
    const { data: unpaidSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters!inner (
                name,
                is_trial
            )
        `)
        .in('billing_status', ['awaiting_payment', 'awaiting_approval', 'error', 'pending', 'approved'])
        .eq('lesson_master.is_trial', true)
        .order('start_time', { ascending: true })

    // 2. レッスン請求（体験）の決済履歴取得
    const { data: paidSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters!inner (
                name,
                is_trial
            )
        `)
        .in('billing_status', ['paid', 'refunded', 'partially_refunded'])
        .eq('lesson_master.is_trial', true)
        .order('start_time', { ascending: false })
        .limit(20)

    // 3. レッスン請求（超過レッスン等）の未払い/承認待ちデータ取得
    const { data: unpaidRegularSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters!inner (
                name,
                is_trial
            )
        `)
        .eq('is_overage', true)
        .eq('lesson_master.is_trial', false)
        .in('billing_status', ['ready_to_invoice', 'awaiting_payment', 'awaiting_approval', 'error', 'pending', 'approved'])
        .order('start_time', { ascending: true })

    // 4. レッスン請求（超過レッスン等）の決済履歴取得
    const { data: paidRegularSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters!inner (
                name,
                is_trial
            )
        `)
        .eq('is_overage', true)
        .eq('lesson_master.is_trial', false)
        .in('billing_status', ['paid', 'refunded', 'partially_refunded'])
        .order('start_time', { ascending: false })
        .limit(30)

    // 5. プラン変更・解約申請データの取得
    const { data: planRequests, error: planError } = await supabase
        .from('membership_change_requests')
        .select(`
            *,
            student:students (
                id,
                full_name,
                student_number,
                membership_lock_until,
                current_membership:membership_types!membership_type_id (
                    name
                )
            ),
            requested:membership_types!requested_membership_type_id ( name )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (planError) {
        console.error('Error fetching plan approvals in approvals page:', planError)
    }

    const pendingRequests = planRequests || []

    return (
        <div className="space-y-6">
            {/* パンくずリスト */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Link href="/admin" className="hover:text-slate-600 flex items-center gap-1 transition-colors">
                    <Home className="w-3.5 h-3.5" />
                    ダッシュボード
                </Link>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">請求・承認管理</span>
            </nav>

            {/* ヘッダーエリア */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                    <FileCheck className="h-7 w-7 text-blue-600" />
                    請求・承認管理
                </h1>
                <p className="text-sm text-slate-500">
                    レッスン請求（体験・超過）の承認、および生徒からのプラン変更・解約申請の承認を一元管理します。
                </p>
            </div>

            {/* タブ統合コンテンツ */}
            <ApprovalsTabsClient
                initialTab={initialTab}
                unpaidSchedules={(unpaidSchedules as any) || []}
                paidSchedules={(paidSchedules as any) || []}
                unpaidRegularSchedules={(unpaidRegularSchedules as any) || []}
                paidRegularSchedules={(paidRegularSchedules as any) || []}
                pendingRequests={(pendingRequests as any) || []}
            />
        </div>
    )
}
