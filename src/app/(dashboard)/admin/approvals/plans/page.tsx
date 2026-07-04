import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanApprovalsList from '@/components/admin/PlanApprovalsList'
import { FileCheck, ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PlanApprovalsPage() {
    const supabase = await createClient()

    // 1. セッションとロールのチェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/signin')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        redirect('/')
    }

    // 2. 保留中のプラン申請データをフェッチ
    const { data: requests, error } = await supabase
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

    if (error) {
        console.error('Error fetching plan approvals:', error)
    }

    const pendingRequests = requests || []

    return (
        <div className="relative space-y-6 md:space-y-10 pb-12 overflow-hidden px-4 md:px-0">
            {/* 装飾用背景要素 */}
            <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-linear-to-bl from-blue-500/5 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-[-100px] left-[-100px] -z-10 w-[500px] h-[500px] bg-linear-to-tr from-cyan-400/5 to-transparent rounded-full blur-3xl" />

            {/* パンくずリスト */}
            <nav className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <Link href="/admin" className="hover:text-slate-600 flex items-center gap-1 transition-colors">
                    <Home className="w-3.5 h-3.5" />
                    ダッシュボード
                </Link>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">プラン変更承認</span>
            </nav>

            {/* ヘッダーエリア */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-8 bg-blue-600 rounded-full"></span>
                        <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Approvals</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight flex items-center gap-2.5">
                        <FileCheck className="h-7 w-7 text-indigo-600" />
                        プラン変更・追加・解約承認
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base font-medium">生徒からのプラン変更、Trioプランの追加・解約申請の承認と管理を行います。</p>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="mt-6">
                <PlanApprovalsList requests={pendingRequests as any} />
            </div>
        </div>
    )
}
