import { Metadata } from 'next'
import { RewardSettingsManager } from '@/components/admin/RewardSettingsManager'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
    title: '報酬設定マスタ | 管理画面',
    description: 'コーチ報酬の計算パラメータを管理します。',
}

export default function RewardMasterPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Link href="/admin/masters" className="hover:text-slate-800 transition-colors flex items-center gap-1 text-sm font-medium">
                        <ChevronLeft className="h-4 w-4" />
                        マスタ管理一覧
                    </Link>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">報酬設定マスタ</h1>
                <p className="text-slate-500 mt-2">
                    ランク毎の報酬比率や、体験レッスンの固定報酬額、各種手当の金額を設定します。
                    設定内容は、レッスン報告時の概算表示および月次の支払計算に反映されます。
                </p>
            </div>

            <RewardSettingsManager />
        </div>
    )
}
