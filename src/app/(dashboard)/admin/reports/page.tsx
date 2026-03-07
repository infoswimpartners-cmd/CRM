import { AllReportsTable } from '@/components/admin/AllReportsTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminCreateReportButton } from '@/components/admin/reports/AdminCreateReportButton'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const isAdmin = profile?.role === 'admin'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={isAdmin ? "/admin" : "/coach"}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {isAdmin ? '全レッスン報告' : 'レッスン報告一覧'}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {isAdmin ? 'すべてのコーチのレッスン報告を管理します。' : '自分もしくは担当生徒のレッスン報告が全て閲覧できます。'}
                        </p>
                    </div>
                </div>

                {/* 管理者のみ：代理報告作成ボタン */}
                {isAdmin && <AdminCreateReportButton />}
            </div>

            <AllReportsTable />
        </div>
    )
}

