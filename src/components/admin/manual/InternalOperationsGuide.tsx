import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function InternalOperationsGuide() {
    return (
        <section className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <Info className="h-6 w-6 text-orange-600" />
                社内運用マニュアル
            </h2>
            <p className="text-gray-700">
                スタッフ向け指示書・運用ルール（自分用メモ）
            </p>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">業務名：会員の先行利用・追加利用時の対応フロー</CardTitle>
                    <CardDescription>
                        入会契約済みだが利用開始前、または月回数消化後に「おかわり」を希望する場合
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">適用ルール</h4>
                        <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                            <li>
                                <strong>価格:</strong> 契約コースの1回あたり単価（料金表参照）を適用する。<br />
                                <span className="text-red-600 font-bold">※決して正規の単発料金（9,000円等）やビジター料金を案内しないこと。</span>
                            </li>
                            <li>
                                <strong>決済:</strong> サブスクリプションには含めず、<span className="font-semibold">Stripe等の単発決済（インボイス）</span>で処理する。
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">システム操作手順</h4>
                        <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
                            <li>会員の契約コースを確認する（例：月2回・60分）。</li>
                            <li>
                                Stripe（またはCRM）で該当する以下の商品を呼び出す。
                                <div className="bg-white p-2 border rounded mt-1 shadow-sm">
                                    追加レッスン [60分/月2回用]：8,700円
                                </div>
                            </li>
                            <li>決済を実行（または請求書送付）し、入金確認後に予約を確定する。</li>
                        </ol>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-1">顧客への案内例</h4>
                        <p className="text-sm text-blue-900 italic">
                            「○○様は既にご入会済みですので、コース開始前ですが、会員様特別単価の8,700円にてご受講いただけます。」
                        </p>
                    </div>
                </CardContent>
            </Card>
        </section>
    )
}
