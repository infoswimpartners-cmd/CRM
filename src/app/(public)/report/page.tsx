import { PublicLessonReportForm } from '@/components/forms/PublicLessonReportForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

export default function PublicReportPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto space-y-6 md:space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Swim Partners</h1>
                    <p className="mt-2 text-sm text-slate-600">
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
