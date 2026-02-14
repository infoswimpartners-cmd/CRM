import { AllReportsTable } from '@/components/admin/AllReportsTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function AdminReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">全レッスン報告</h1>
                        <p className="text-slate-500">全コーチのレッスン実施履歴</p>
                    </div>
                </div>
            </div>

            <AllReportsTable />
        </div>
    )
}
