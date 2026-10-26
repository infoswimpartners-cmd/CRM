import { createClient } from '@/lib/supabase/server'
import { AddCoachDialog } from '@/components/admin/AddCoachDialog'
import { CoachGenericInviteButton } from '@/components/admin/CoachGenericInviteButton'
import { CoachTable } from '@/components/admin/CoachTable'
import { CoachOnboardingGuideDialog } from '@/components/admin/CoachOnboardingGuideDialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, Bell, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CoachListPage() {
    const supabase = await createClient()

    const { data: coaches, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['coach', 'admin'])
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">コーチ管理</h1>
                        <p className="text-gray-500 text-sm">コーチ一覧と担当生徒の確認・引き継ぎ</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <CoachOnboardingGuideDialog />
                    <Button variant="outline" asChild className="gap-1.5 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 font-semibold shadow-sm">
                        <Link href="/coach/onboarding?demo=true" target="_blank">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            オンボーディング体験デモ
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        <Link href="/admin/webhooks">
                            <Bell className="h-4 w-4 text-indigo-600" />
                            Webhook設定
                        </Link>
                    </Button>
                    <CoachGenericInviteButton />
                    <AddCoachDialog />
                </div>
            </div>

            {/* @ts-ignore */}
            <CoachTable coaches={coaches || []} studentCounts={studentCounts} />
        </div>
    )
}
