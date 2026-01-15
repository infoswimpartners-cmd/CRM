import { createClient } from '@/lib/supabase/server'
import { AddMembershipTypeDialog } from '@/components/admin/AddMembershipTypeDialog'
import { MembershipTypeTable } from '@/components/admin/MembershipTypeTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

import { MastersNav } from '@/components/admin/MastersNav'

export const dynamic = 'force-dynamic'

export default async function MembershipTypesPage() {
    const supabase = await createClient()

    const { data: types } = await supabase
        .from('membership_types')
        .select(`
            *,
            default_lesson:lesson_masters!default_lesson_master_id (
                name
            )
        `)
        .order('created_at', { ascending: false })

    // Transform data to flatten the nested lesson_masters if needed by table, 
    // or pass as is. The table component expects 'lesson_masters: {name}' which is what we get.
    // However, TypeScript might complain about the type returned by Supabase not strictly matching the interface.
    // Let's assume the table component handles the optional property correctly.

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
                <h2 className="text-xl font-semibold">会員区分一覧</h2>
                <AddMembershipTypeDialog />
            </div>

            <MembershipTypeTable types={types || []} />
        </div>
    )
}
