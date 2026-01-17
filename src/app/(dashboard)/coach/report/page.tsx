import { LessonReportForm } from '@/components/forms/LessonReportForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportPage() {
    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">レッスン報告</h1>
                <p className="text-gray-500">レッスン詳細を入力してください。</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>レッスン詳細</CardTitle>
                </CardHeader>
                <CardContent>
                    <LessonReportForm />
                </CardContent>
            </Card>
        </div>
    )
}
