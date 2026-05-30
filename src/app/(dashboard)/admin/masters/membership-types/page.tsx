import { createClient } from '@/lib/supabase/server'
import { AddMembershipTypeDialog } from '@/components/admin/AddMembershipTypeDialog'
import { MembershipTypeTable } from '@/components/admin/MembershipTypeTable'
import { AddPackageTypeDialog } from '@/components/admin/AddPackageTypeDialog'
import { PackageTypeTable } from '@/components/admin/PackageTypeTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Package, CalendarDays, Eye } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MastersNav } from '@/components/admin/MastersNav'

export const dynamic = 'force-dynamic'

export default async function MembershipTypesPage() {
    const supabase = await createClient()

    const { data: allTypes } = await supabase
        .from('membership_types')
        .select(`
            *,
            default_lesson:lesson_masters!default_lesson_master_id (
                name
            )
        `)
        .order('display_order', { ascending: true })

    // 月次プランとパッケージプランを分離
    const monthlyTypes = (allTypes || []).filter((t: any) => !t.is_package)
    const packageTypes = (allTypes || []).filter((t: any) => t.is_package)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
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
                <Button variant="outline" className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 shadow-sm" asChild>
                    <a href="/enroll?preview=true" target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 text-slate-500" />
                        入会フォームのプレビュー
                    </a>
                </Button>
            </div>

            <MastersNav />

            <Tabs defaultValue="monthly" className="w-full">
                <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
                    <TabsTrigger value="monthly" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        月次プラン
                    </TabsTrigger>
                    <TabsTrigger value="package" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        パッケージ
                    </TabsTrigger>
                </TabsList>

                {/* 月次プランタブ */}
                <TabsContent value="monthly">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">月次プラン一覧</h2>
                            <p className="text-sm text-slate-500 mt-0.5">毎月の継続課金プランを管理します。</p>
                        </div>
                        <AddMembershipTypeDialog />
                    </div>
                    <MembershipTypeTable types={monthlyTypes as any} />
                </TabsContent>

                {/* パッケージプランタブ */}
                <TabsContent value="package">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">パッケージプラン一覧</h2>
                            <p className="text-sm text-slate-500 mt-0.5">一括払いのチケット制プランを管理します。決済完了時にチケットが自動付与されます。</p>
                        </div>
                        <AddPackageTypeDialog />
                    </div>
                    <PackageTypeTable types={packageTypes as any} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
