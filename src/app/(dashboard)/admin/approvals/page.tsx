import { createAdminClient } from '@/lib/supabase/admin'
import { FileCheck, ChevronRight, Home, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { ApprovalsTabsClient } from './ApprovalsTabsClient'
import { getStripeInvoices } from '@/actions/stripe'

export const dynamic = 'force-dynamic'

interface ApprovalsPageProps {
    searchParams: Promise<{ tab?: string; q?: string }>
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
    const resolvedSearchParams = await searchParams
    const initialTab = resolvedSearchParams?.tab === 'plans' ? 'plans' : 'billing'
    const initialQuery = resolvedSearchParams?.q || ''

    const supabase = createAdminClient()

    // 1. Stripeで請求を行った履歴（インボイス履歴）を取得
    const invoicesResult = await getStripeInvoices({ limit: 50 })
    const initialInvoices = invoicesResult.success ? invoicesResult.data : []
    const initialHasMore = invoicesResult.success ? invoicesResult.hasMore : false

    // 2. プラン変更・解約申請データの取得
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
                <span className="text-slate-600">請求・決済履歴管理</span>
            </nav>

            {/* ヘッダーエリア */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                    <CreditCard className="h-7 w-7 text-blue-600" />
                    請求・決済管理
                </h1>
                <p className="text-sm text-slate-500">
                    Stripeで請求を行った履歴（インボイス履歴・決済状況）の確認・閲覧、および生徒からのプラン変更・解約申請を管理します。
                </p>
            </div>

            {/* タブ統合コンテンツ */}
            <ApprovalsTabsClient
                initialTab={initialTab}
                initialInvoices={initialInvoices}
                initialHasMore={initialHasMore}
                initialSearchQuery={initialQuery}
                pendingRequests={(pendingRequests as any) || []}
            />
        </div>
    )
}

