import React from 'react'
import { CheckCircle2, UserPlus, CreditCard, Sparkles, AlertCircle, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function EnrollmentGuide() {
    return (
        <section className="space-y-6 animate-in fade-in duration-500">
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <UserPlus className="h-6 w-6 text-green-600" />
                    顧客オンライン入会フロー
                </h2>
                <p className="text-slate-500 mt-1">
                    生徒がLINEまたはWebから入会手続きを行い、決済完了からシステムへの反映・チケット付与までの一連の流れです。
                </p>
            </div>

            {/* ステップ別フロー */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">1. オンライン入会手続きの全体像</h3>
                
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="relative overflow-hidden border-t-4 border-t-blue-500 shadow-sm">
                        <CardContent className="pt-6">
                            <span className="absolute top-2 right-2 text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">STEP 1</span>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-5 w-5 text-blue-500" />
                                <h4 className="font-bold text-slate-700">フォームアクセス</h4>
                            </div>
                            <p className="text-xs text-slate-600">
                                LINE公式アカウントのリッチメニューや案内リンクから、入会ページ（`/enroll`）にアクセスします（LINEログインによる本人認証が自動で行われます）。
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-t-4 border-t-indigo-500 shadow-sm">
                        <CardContent className="pt-6">
                            <span className="absolute top-2 right-2 text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">STEP 2</span>
                            <div className="flex items-center gap-2 mb-2">
                                <UserPlus className="h-5 w-5 text-indigo-500" />
                                <h4 className="font-bold text-slate-700">情報入力＆プラン選択</h4>
                            </div>
                            <p className="text-xs text-slate-600">
                                氏名・メールアドレス・電話番号を入力し、「月次プラン」「単発プラン」または「パッケージプラン」を選択の上、利用規約に同意します。
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-t-4 border-t-purple-500 shadow-sm">
                        <CardContent className="pt-6">
                            <span className="absolute top-2 right-2 text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">STEP 3</span>
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-5 w-5 text-purple-500" />
                                <h4 className="font-bold text-slate-700">Stripe決済完了</h4>
                            </div>
                            <p className="text-xs text-slate-600">
                                Stripe Checkoutへ遷移し、クレジットカード情報を登録・決済を実行します。決済完了後、サンクスページへ自動で戻ります。
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-t-4 border-t-green-500 shadow-sm">
                        <CardContent className="pt-6">
                            <span className="absolute top-2 right-2 text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">STEP 4</span>
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <h4 className="font-bold text-slate-700">自動反映＆チケット付要</h4>
                            </div>
                            <p className="text-xs text-slate-600">
                                Webhookを介して生徒ステータスが「アクティブ」になり、パッケージプランの場合はチケットが自動で即時付与されます。
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* プラン別の挙動比較 */}
            <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-slate-800">2. プランに応じた入会時の挙動</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="shadow-sm">
                        <CardHeader className="bg-slate-50 py-3">
                            <CardTitle className="text-base text-slate-700">月次継続・単発プランの場合</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-sm text-slate-600 space-y-2">
                            <p><strong>決済形式:</strong> サブスクリプション課金（月謝）またはその都度課金（単発）</p>
                            <p><strong>DBへの設定:</strong> 会員種別ID（`membership_type_id`）が設定され、顧客のステータスが「Active」になります。</p>
                            <p><strong>利用ルール:</strong> 月次規定回数（月4回、月2回等）を毎月利用します。単発プランの場合は登録時の決済金額は0円で、レッスン予約承認時に自動決済されます。</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-l-4 border-l-orange-500">
                        <CardHeader className="bg-orange-50/50 py-3">
                            <CardTitle className="text-base text-orange-800 flex items-center gap-1">
                                <Sparkles className="h-4 w-4" />
                                パッケージプランの場合
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-sm text-slate-600 space-y-2">
                            <p><strong>決済形式:</strong> 一括払い（ワンタイム決済）</p>
                            <p><strong>自動チケット付与:</strong> 決済成功後、マスタで設定されたチケット枚数（例: 25m完泳パッケージなら12回分）が即時で `current_tickets` カラムに付与されます。</p>
                            <p><strong>履歴記録:</strong> `ticket_transactions` テーブルに「パッケージ入会（プラン名）」として履歴が自動保存されます。</p>
                            <p><strong>保証分（4回等）の手動付与:</strong> 12回を消化した後に完泳条件に達しなかった場合などの保証分は、管理者が生徒詳細画面から手動でチケットを追加付与します。</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* チケット残数の確認方法 */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        チケット残数の表示場所
                    </CardTitle>
                    <CardDescription>
                        パッケージプランや回数券を購入した生徒のチケット残数は、以下の各画面でリアルタイムに確認できます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-slate-700">
                    <div className="flex items-start gap-2 border-b pb-2">
                        <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold mt-0.5">全体スケジュール / 予約登録</div>
                        <div>レッスンの新規予約を登録する際、生徒を選択すると右側に「所持チケット: X 枚」と分かりやすく表示されます。</div>
                    </div>
                    <div className="flex items-start gap-2 border-b pb-2">
                        <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold mt-0.5">顧客詳細ページ</div>
                        <div>顧客管理から該当の生徒を開くと、「基本情報」ブロックに「所持チケット数: X枚」およびこれまでのチケット増減トランザクション履歴（理由・日時等）が一覧表示されます。</div>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold mt-0.5">コーチ専用ページ</div>
                        <div>コーチ専用画面の「本日のレッスン」などのレッスン詳細・予約一覧においても、生徒名の横に現在のチケット残数が表示されます。</div>
                    </div>
                </CardContent>
            </Card>

            {/* 注意事項 */}
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex gap-3 text-sm text-orange-900">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold">管理者・運営上の重要な注意事項</p>
                    <ul className="list-disc ml-5 space-y-1 text-xs">
                        <li><strong>チケットの消費:</strong> パッケージプランの生徒がレッスンを受講した際、システムが自動的にチケットをマイナス消費するわけではありません。レッスン消化時は、管理者が「チケット履歴」や受講完了ステータスに基づいて適宜管理してください。</li>
                        <li><strong>新規生徒の自動起票:</strong> LINE連携されていない、またはLINEを持っていない顧客で、マニュアルで管理者が登録を行う場合は、「顧客管理 ➔ 新規追加」から直接登録が可能です。</li>
                        <li><strong>保証分の手動付与手順:</strong> 会員番号0035「テスト太郎」等の生徒がパッケージを契約し、保証チケット（4回）を付与する場合は、該当生徒の詳細ページにある「チケット管理」セクションから「+4枚」と入力し、理由に「25m完泳保証枠の適用」などと入力して保存してください。</li>
                    </ul>
                </div>
            </div>
        </section>
    )
}
