import { PublicLessonReportForm } from '@/components/forms/PublicLessonReportForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'

export default function PublicReportPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto space-y-6 md:space-y-8">
                <div className="flex flex-col items-center text-center">
                    <div className="relative h-14 w-60 mb-2">
                        <Image
                            src="/logo_wide.png"
                            alt="Swim Partners"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <p className="text-sm text-slate-600">
                        レッスン報告フォーム
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>レポート作成</CardTitle>
                        <CardDescription>
                            ログインせずに報告を作成します。<br />
                            担当コーチを選択してから生徒を選んでください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PublicLessonReportForm />
                    </CardContent>
                </Card>

                <div className="text-center text-sm">
                    <Link href="/login" className="text-blue-600 hover:text-blue-500">
                        管理者・コーチログインはこちら
                    </Link>
                </div>
            </div>
        </div>
    )
}
