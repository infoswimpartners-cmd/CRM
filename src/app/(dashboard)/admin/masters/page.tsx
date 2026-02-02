import { createClient } from '@/lib/supabase/server'
import { AddLessonTypeDialog } from '@/components/admin/AddLessonTypeDialog'
import { LessonMasterTable } from '@/components/admin/LessonMasterTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { StripeSyncButton } from '@/components/admin/StripeSyncButton'

import { MastersNav } from '@/components/admin/MastersNav'

export const dynamic = 'force-dynamic'

export default async function MastersPage() {
    const supabase = await createClient()

    const { data: masters } = await supabase
        .from('lesson_masters')
        .select('*')
        .order('created_at', { ascending: false })

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
                        <h1 className="text-3xl font-bold tracking-tight">マスタ管理</h1>
                        <p className="text-gray-500">各種マスタデータの設定を行います。</p>
                    </div>
                </div>
                <StripeSyncButton />
            </div>

            <MastersNav />

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">レッスン種類一覧</h2>
                <AddLessonTypeDialog />
            </div>

            <LessonMasterTable masters={masters || []} />
        </div>
    )
}
