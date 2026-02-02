import { CreditCard, AlertCircle, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function MembershipGuide() {
    return (
        <section className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <CreditCard className="h-6 w-6 text-blue-600" />
                会員種別の変更と請求
            </h2>
            <p className="text-gray-700">
                生徒詳細画面から会員種別を変更する際、「今すぐ変更」と「来月から予約」の2つのパターンを選択できます。
            </p>

            <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700 text-lg">
                            <AlertCircle className="h-5 w-5" />
                            今すぐ変更
                        </CardTitle>
                        <CardDescription>即時適用・特典利用開始</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 space-y-2">
                        <p><strong>適用タイミング:</strong> ボタンを押したその瞬間から変更されます。</p>
                        <p><strong>請求:</strong> 翌月1日に新プランの料金が請求されます。</p>
                        <div><strong>当月の扱い:</strong>
                            <ul className="list-disc ml-5 mt-1 text-gray-600">
                                <li>新規入会の場合、変更日から月末までは<strong>無料（日割りなし）</strong>です。</li>
                                <li>既存会員のプラン変更でも、当月分の差額請求は発生しません。</li>
                            </ul>
                        </div>
                        <div className="bg-red-50 p-2 rounded mt-2 text-red-800 text-xs">
                            今すぐレッスンを受けたい生徒や、月の途中からの入会に利用してください。
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700 text-lg">
                            <Calendar className="h-5 w-5" />
                            来月から予約
                        </CardTitle>
                        <CardDescription>翌月1日適用・予約変更</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 space-y-2">
                        <p><strong>適用タイミング:</strong> 翌月1日の深夜に自動的に切り替わります。</p>
                        <p><strong>請求:</strong> 翌月1日に新プランの料金が請求されます。</p>
                        <div><strong>当月の扱い:</strong>
                            <ul className="list-disc ml-5 mt-1 text-gray-600">
                                <li>今月中は現在のステータス（例: 単発会員）が維持されます。</li>
                                <li>誤って今月から課金を開始したくない場合に最適です。</li>
                            </ul>
                        </div>
                        <div className="bg-blue-50 p-2 rounded mt-2 text-blue-800 text-xs">
                            会計期間をきっちり分けたい場合や、事前にコース変更が決まっている場合に推奨されます。
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
