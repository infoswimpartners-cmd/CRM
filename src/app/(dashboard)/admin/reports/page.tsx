import { AllReportsTable } from '@/components/admin/AllReportsTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const isAdmin = profile?.role === 'admin'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={isAdmin ? "/admin" : "/coach"}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-3">
                    <Image
                        src="/logo_wide.png"
                        alt="Swim Partners Logo"
                        width={200}
                        height={40}
                        className="object-contain"
                    />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {isAdmin ? '全レッスン報告' : 'レッスン報告一覧'}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {isAdmin ? '全コーチのレッスン実施履歴' : '自分もしくは担当生徒のレッスン報告が全て閲覧できます。'}
                        </p>
                    </div>
                </div>
            </div>

            <AllReportsTable />
        </div>
    )
}
