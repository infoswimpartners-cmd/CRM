import { CreditCard, BookOpen, CheckCircle, AlertTriangle, Coins } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function BillingSystemGuide() {
    return (
        <section className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800 mb-2">
                    <Coins className="h-6 w-6 text-amber-600" />
                    請求システム総合ガイド
                </h2>
                <p className="text-gray-600">
                    現在のシステムには、利用形態に合わせて3つの異なる請求フローが存在します。
                </p>
            </div>

            <Tabs defaultValue="monthly" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="monthly">1. 月次一括請求</TabsTrigger>
                    <TabsTrigger value="immediate">2. 都度即時請求</TabsTrigger>
                    <TabsTrigger value="approval">3. 承認・自動請求</TabsTrigger>
                </TabsList>

                {/* 1. Monthly Billing */}
                <TabsContent value="monthly" className="mt-4 space-y-4">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                                <CalendarIcon />
                                定期会員向け・月次処理
                            </CardTitle>
                            <CardDescription>
                                毎月1日に実行されるメインの請求フローです。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-700">
                            <div>
                                <h4 className="font-bold mb-1">対象となる請求:</h4>
                                <ul className="list-disc ml-5 space-y-1">
                                    <li><strong>月会費:</strong> 当月分の会費（サブスクリプション）</li>
                                    <li><strong>レッスン料:</strong> 前月に実施完了したレッスンの利用料（回数消化や追加分）</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <h4 className="font-bold text-blue-800 mb-1">処理の流れ:</h4>
                                <ol className="list-decimal ml-5 space-y-1 text-blue-900">
                                    <li>毎月1日（深夜）にバッチ処理が自動起動</li>
                                    <li>前月のレッスン実績を集計</li>
                                    <li>会費と合算して Stripe で決済実行</li>
                                    <li>（失敗時）自動で再試行または管理者に通知</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. Immediate Billing */}
                <TabsContent value="immediate" className="mt-4 space-y-4">
                    <Card className="border-l-4 border-l-amber-500 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-amber-700 flex items-center gap-2">
                                <CreditCardIcon />
                                スポット利用・都度払い
                            </CardTitle>
                            <CardDescription>
                                単発レッスンやビジター利用など、その場で決済を求めるフローです。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-700">
                            <div>
                                <h4 className="font-bold mb-1">特徴:</h4>
                                <ul className="list-disc ml-5 space-y-1">
                                    <li>管理画面から「請求メール送信」ボタン等で手動トリガー</li>
                                    <li>生徒に請求書URL付きのメールが即時送信される</li>
                                    <li>サブスクリプションとは別会計で決済される</li>
                                </ul>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg">
                                <h4 className="font-bold text-amber-800 mb-1">利用シーン:</h4>
                                <ul className="list-disc ml-5 text-amber-900">
                                    <li>体験レッスンの事前決済</li>
                                    <li>非会員（ビジター）のレッスン料徴収</li>
                                    <li>未払い分の再請求</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Approval Billing */}
                <TabsContent value="approval" className="mt-4 space-y-4">
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                                <CheckCircleIcon />
                                承認制・システム自動連携
                            </CardTitle>
                            <CardDescription>
                                追加レッスン予約などを管理者が承認し、自動で請求データを作成する新しいフローです。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-700">
                            <div>
                                <h4 className="font-bold mb-1">仕組み:</h4>
                                <ol className="list-decimal ml-5 space-y-1">
                                    <li>生徒またはコーチが「追加レッスン」枠で予定登録</li>
                                    <li>管理画面の「請求・決済管理」に「承認待ち」として表示</li>
                                    <li>管理者が<strong>承認</strong>すると、請求予約状態になる</li>
                                    <li>レッスンの7日前（または承認直後）にシステムが自動でStripeに請求項目(Invoice Item)を作成</li>
                                </ol>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-green-700 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-green-800 mb-1">重要ポイント:</h4>
                                        <p className="text-green-900 mb-2">
                                            このフローで作成された請求は、即座にメール請求されるわけではありません。
                                            <br />
                                            次回（翌月1日）の定期請求と合算して決済されます。
                                        </p>
                                        <p className="text-xs text-green-700">
                                            ※キャンセル規定（前日正午まで無料）もシステムが自動判定し、必要に応じて請求の無効化（Void）を行います。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="mt-8">
                <h3 className="font-bold text-lg mb-4 text-slate-700">料金体系（参考）</h3>
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-gray-600">会員種別</th>
                                        <th className="p-3 text-left font-semibold text-gray-600">月謝</th>
                                        <th className="p-3 text-left font-semibold text-gray-600">追加レッスン単価</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {/* 60分コース */}
                                    <tr className="bg-slate-50/50">
                                        <td className="p-3 font-bold text-slate-700" colSpan={3}>60分コース</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3">月2回</td>
                                        <td className="p-3">17,400円/月</td>
                                        <td className="p-3">8,700円/回</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3">月4回</td>
                                        <td className="p-3">34,000円/月</td>
                                        <td className="p-3">8,500円/回</td>
                                    </tr>

                                    {/* 90分コース */}
                                    <tr className="bg-slate-50/50">
                                        <td className="p-3 font-bold text-slate-700" colSpan={3}>90分コース</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3">月2回</td>
                                        <td className="p-3">25,400円/月</td>
                                        <td className="p-3">12,700円/回</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3">月4回</td>
                                        <td className="p-3">50,000円/月</td>
                                        <td className="p-3">12,500円/回</td>
                                    </tr>

                                    {/* 単発会員 */}
                                    <tr className="bg-slate-50/50">
                                        <td className="p-3 font-bold text-slate-700" colSpan={3}>単発会員・ビジター</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3">単発 (60分)</td>
                                        <td className="p-3 text-gray-400">-</td>
                                        <td className="p-3">9,000円/回</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3">単発 (90分)</td>
                                        <td className="p-3 text-gray-400">-</td>
                                        <td className="p-3">13,000円/回</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}

function CalendarIcon() {
    return <CreditCard className="h-5 w-5" />
}

function CreditCardIcon() {
    return <BookOpen className="h-5 w-5" />
}

function CheckCircleIcon() {
    return <CheckCircle className="h-5 w-5" />
}
