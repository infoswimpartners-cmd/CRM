import { createClient } from '@/lib/supabase/server'
import { MastersNav } from '@/components/admin/MastersNav'
import { StudentStatusTable } from '@/components/admin/StudentStatusTable'
import { AddStudentStatusDialog } from '@/components/admin/AddStudentStatusDialog'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Info } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

export const dynamic = 'force-dynamic'

export default async function StatusesPage() {
    const supabase = await createClient()

    const { data: statuses } = await supabase
        .from('student_statuses')
        .select('*')
        .order('display_order', { ascending: true })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">顧客ステータスマスタ管理</h1>
                        <p className="text-gray-500">生徒に割り当てる予約・受講状況などのステータスを設定します。</p>
                    </div>
                </div>
            </div>

            <MastersNav />

            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                    ドラッグアンドドロップで並び順を変更できます。システム必須のステータス（キーが設定されているもの）は削除できません。名前と色は自由に変更可能です。
                </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between pt-2">
                <h2 className="text-xl font-semibold">ステータス一覧</h2>
                <AddStudentStatusDialog />
            </div>

            <StudentStatusTable statuses={statuses || []} />
        </div>
    )
}
