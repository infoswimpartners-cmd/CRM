import { createClient } from '@/lib/supabase/server'
import { AddCoachDialog } from '@/components/admin/AddCoachDialog'
import { CoachTable } from '@/components/admin/CoachTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CoachListPage() {
    const supabase = await createClient()

    const { data: coaches, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'coach')
        .order('full_name')

    if (error) {
        console.error(error)
        return <div>Error loading coaches</div>
    }

    const { data: students } = await supabase
        .from('students')
        .select('coach_id')

    const studentCounts = (students || []).reduce((acc, s) => {
        if (s.coach_id) {
            acc[s.coach_id] = (acc[s.coach_id] || 0) + 1
        }
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">コーチ管理</h1>
                    <p className="text-gray-500">コーチ一覧と担当生徒の確認・引き継ぎ</p>
                </div>
                <div className="ml-auto">
                    <AddCoachDialog />
                </div>
            </div>

            {/* @ts-ignore */}
            <CoachTable coaches={coaches || []} studentCounts={studentCounts} />
        </div>
    )
}
