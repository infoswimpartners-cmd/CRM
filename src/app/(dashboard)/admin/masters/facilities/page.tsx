import { createClient } from '@/lib/supabase/server'
import { AddFacilityDialog } from '@/components/admin/AddFacilityDialog'
import { FacilityTable } from '@/components/admin/FacilityTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

import { MastersNav } from '@/components/admin/MastersNav'

export const dynamic = 'force-dynamic'

export default async function FacilitiesPage() {
    const supabase = await createClient()

    const { data: facilities } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
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

            <MastersNav />

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">施設一覧</h2>
                <AddFacilityDialog />
            </div>

            <FacilityTable facilities={facilities || []} />
        </div>
    )
}
