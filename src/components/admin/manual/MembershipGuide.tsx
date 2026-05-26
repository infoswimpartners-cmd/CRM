import { CreditCard, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function MembershipGuide() {
    return (
        <section className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <CreditCard className="h-6 w-6 text-blue-600" />
                会員種別の変更と請求
            </h2>
            <p className="text-gray-700">
                生徒詳細画面から会員種別を即座に変更できます。変更による即時決済（引き落とし）は発生せず、すべて翌月の定期請求に自動合算されます。
            </p>

            <div className="max-w-2xl">
                <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-700 text-lg">
                            <AlertCircle className="h-5 w-5" />
                            即時変更（翌月合算）
                        </CardTitle>
                        <CardDescription>即時適用・料金翌月合算</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 space-y-2">
                        <p><strong>適用タイミング:</strong> ボタンを押したその瞬間から変更（即時適用）されます。</p>
                        <p><strong>請求:</strong> 翌月1日に新プランの料金が自動請求されます。</p>
                        <div><strong>当月の扱い:</strong>
                            <ul className="list-disc ml-5 mt-1 text-gray-600">
                                <li>新規入会の場合、変更日から月末までは<strong>日割り料金なし</strong>でプラン特典をご利用いただけます。</li>
                                <li>既存会員のプラン変更に伴う日割り差額（案分）が発生する場合、即時引き落としは発生せず、すべて翌月の月謝請求に合算されます。</li>
                            </ul>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded mt-2 text-indigo-800 text-xs">
                            生徒詳細の「契約・支払い情報」ブロックから会員種別を選択して「変更する」をクリックするだけで、安全に変更が完了します。
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
