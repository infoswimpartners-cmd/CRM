import { BookOpen, AlertCircle, Calendar, CreditCard, CheckCircle, Info, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function AdminManualPage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">管理者マニュアル</h1>
                <p className="text-gray-500">システムの使用方法、特に会員管理と請求に関するガイドです。</p>
            </div>

            <div className="grid gap-6">

                {/* Section 1: Membership Changes */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-blue-600" />
                        会員種別の変更と請求
                    </h2>
                    <p className="text-gray-700">
                        生徒詳細画面から会員種別を変更する際、「今すぐ変更」と「来月から予約」の2つのパターンを選択できます。
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-l-4 border-l-red-500">
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

                        <Card className="border-l-4 border-l-blue-500">
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

                <Separator />

                {/* Section 2: Lesson Reports */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-green-600" />
                        レッスン報告と単発請求
                    </h2>
                    <p className="text-gray-700">
                        レッスン実施後の報告（カルテ入力）により、単発会員の請求データが作成されます。
                    </p>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">請求実行の流れ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-gray-100 p-2 rounded-full">1</div>
                                <div>
                                    <h4 className="font-semibold">レッスン報告の提出</h4>
                                    <p className="text-sm text-gray-600">コーチまたは管理者がレッスン完了報告を行います。</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="bg-gray-100 p-2 rounded-full">2</div>
                                <div>
                                    <h4 className="font-semibold">請求額の確定</h4>
                                    <p className="text-sm text-gray-600">
                                        月会員の場合：請求額は<strong>0円</strong>になります。<br />
                                        単発会員の場合：設定されたレッスン単価が請求額になります。
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="bg-gray-100 p-2 rounded-full">3</div>
                                <div>
                                    <h4 className="font-semibold">月次請求処理（翌月1日）</h4>
                                    <p className="text-sm text-gray-600">
                                        翌月1日に自動プログラムが走り、前月分のレッスン料金をまとめてStripeへ請求データ（Invoice Item）として登録します。<br />
                                        その後、サブスクリプション料金と合算されて決済されます。
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <Separator />

                {/* Section: Automatic Billing System */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-amber-600" />
                        自動請求システム (System 2.0)
                    </h2>
                    <p className="text-gray-700">
                        スケジュール登録時に自動でStripe請求書を発行し、キャンセル時にも自動処理を行うシステムです。
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-l-4 border-l-green-500">
                            <CardHeader>
                                <CardTitle className="text-lg text-green-700">自動請求フロー</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <ol className="list-decimal ml-5 space-y-1 text-gray-700">
                                    <li><strong>予定登録:</strong> スケジュール画面で生徒を選択してレッスン予定を登録</li>
                                    <li><strong>自動検知:</strong> システムがレッスン7日前から未請求予定を検知</li>
                                    <li><strong>請求書作成:</strong> Stripeで請求書を自動作成・送信（支払期日: 前日）</li>
                                    <li><strong>入金管理:</strong> Stripeで入金状況を自動追跡</li>
                                </ol>
                                <div className="bg-green-50 p-2 rounded mt-2 text-green-800 text-xs">
                                    Cronジョブが10〜30分間隔で実行され、条件を満たす予定を自動処理します。
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-red-500">
                            <CardHeader>
                                <CardTitle className="text-lg text-red-700">キャンセル規定</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5 flex-shrink-0"></div>
                                        <div>
                                            <strong>前日正午まで:</strong><br />
                                            <span className="text-gray-600">無料キャンセル。請求書は自動で無効化（Void）されます。</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-4 h-4 rounded-full bg-red-500 mt-0.5 flex-shrink-0"></div>
                                        <div>
                                            <strong>前日正午以降:</strong><br />
                                            <span className="text-gray-600">キャンセル料（レッスン料同額）が発生します。</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-red-50 p-2 rounded mt-2 text-red-800 text-xs">
                                    スケジュール削除時にシステムが期限を判定し、自動で処理を切り替えます。
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">料金体系</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-left">会員種別</th>
                                            <th className="p-2 text-left">月謝</th>
                                            <th className="p-2 text-left">追加レッスン</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* 60分コース */}
                                        <tr className="bg-slate-100">
                                            <td className="p-2 font-semibold" colSpan={3}>60分コース</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">月2回 (60分)</td>
                                            <td className="p-2">17,400円/月</td>
                                            <td className="p-2">8,700円/回</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">月4回 (60分)</td>
                                            <td className="p-2">34,000円/月</td>
                                            <td className="p-2">8,500円/回</td>
                                        </tr>

                                        {/* 90分コース */}
                                        <tr className="bg-slate-100">
                                            <td className="p-2 font-semibold" colSpan={3}>90分コース</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">月2回 (90分)</td>
                                            <td className="p-2">25,400円/月</td>
                                            <td className="p-2">12,700円/回</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">月4回 (90分)</td>
                                            <td className="p-2">50,000円/月</td>
                                            <td className="p-2">12,500円/回</td>
                                        </tr>

                                        {/* 単発会員 */}
                                        <tr className="bg-slate-100">
                                            <td className="p-2 font-semibold" colSpan={3}>単発会員 (ビジター)</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">単発 (60分)</td>
                                            <td className="p-2">-</td>
                                            <td className="p-2">9,000円/回</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">単発 (90分)</td>
                                            <td className="p-2">-</td>
                                            <td className="p-2">13,000円/回</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="p-2">単発 (120分)</td>
                                            <td className="p-2">-</td>
                                            <td className="p-2">17,000円/回</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <Separator />

                {/* Section 3: Monthly Operations */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-purple-600" />
                        毎月の運用スケジュール
                    </h2>
                    <div className="border rounded-md overflow-hidden">
                        <div className="bg-gray-50 p-3 border-b font-semibold grid grid-cols-4 gap-4">
                            <div className="col-span-1">タイミング</div>
                            <div className="col-span-3">システム処理・アクション</div>
                        </div>
                        <div className="p-3 border-b grid grid-cols-4 gap-4 items-center">
                            <div className="col-span-1 font-bold text-blue-600">毎月1日 (深夜)</div>
                            <div className="col-span-3 text-sm">
                                <p className="font-semibold">月次更新バッチ実行</p>
                                <ul className="list-disc ml-5 text-gray-600">
                                    <li>「来月から予約」されていた会員種別の適用</li>
                                    <li>前月分の単発レッスン料金の集計・請求データ作成</li>
                                    <li>Stripeによる決済実行（サブスク + 単発）</li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-3 grid grid-cols-4 gap-4 items-center">
                            <div className="col-span-1 font-bold">随時</div>
                            <div className="col-span-3 text-sm">
                                <p>レッスン報告、新規入会対応、会員種別変更（即時/予約）</p>
                            </div>
                        </div>
                    </div>
                </section>

                <Separator />

                {/* Section: Coach Management */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <User className="h-6 w-6 text-indigo-600" />
                        コーチ管理・アカウント発行
                    </h2>
                    <p className="text-gray-700">
                        従来の「パスワード通知」方式は廃止され、セキュリティの高い「招待リンク」方式に変更されました。
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-l-4 border-l-indigo-500">
                            <CardHeader>
                                <CardTitle className="text-lg text-indigo-700">招待フロー (アカウント作成)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <ol className="list-decimal ml-5 space-y-2 text-gray-700">
                                    <li>
                                        <strong>管理者による招待:</strong><br />
                                        「コーチ管理」→「コーチを追加」で氏名・メールを入力して送信。<br />
                                        <span className="text-xs text-gray-500">※ステータスは「招待中」になります。パスワードは設定しません。</span>
                                    </li>
                                    <li>
                                        <strong>招待メール受信:</strong><br />
                                        コーチにメールが届きます。リンクの有効期限は<strong>24時間</strong>です。
                                    </li>
                                    <li>
                                        <strong>パスワード設定:</strong><br />
                                        コーチ自身がリンクを開き、パスワードを設定すると登録完了です。
                                    </li>
                                </ol>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500">
                            <CardHeader>
                                <CardTitle className="text-lg text-amber-700">再招待・リンク切れ対応</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="space-y-3">
                                    <div>
                                        <strong>リンクが切れた場合:</strong><br />
                                        <span className="text-gray-600">24時間を過ぎるとリンクは無効になります。</span>
                                    </div>
                                    <div>
                                        <strong>再招待の手順:</strong><br />
                                        <span className="text-gray-600">
                                            コーチ一覧の「招待中」ステータス横にある<br />
                                            <strong>「再招待ボタン（紙飛行機アイコン）」</strong>でメール再送、<br />
                                            <strong>「リンクコピー（鎖アイコン）」</strong>でURLをコピーできます。
                                        </span>
                                    </div>
                                    <div className="bg-amber-50 p-2 rounded mt-2 text-amber-800 text-xs">
                                        ※既に「有効（Active）」なコーチには再招待できません。「パスワードをお忘れですか？」を利用するよう案内してください。
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-rose-500">
                            <CardHeader>
                                <CardTitle className="text-lg text-rose-700">登録リンクの発行 (氏名・メール指定なし)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p className="text-gray-700">
                                    「コーチ管理」画面右上の<strong>「登録リンクを発行」</strong>ボタンから、氏名やメールを指定しない招待URLを作成できます。
                                </p>
                                <ul className="list-disc ml-5 space-y-1 text-gray-700">
                                    <li>LINEグループ等で多数の人に一斉に共有する場合に便利です。</li>
                                    <li>アクセスした人が自分で氏名・メール・パスワードを入力して登録します。</li>
                                    <li>有効期限は<strong>3日間</strong>です。</li>
                                </ul>
                                <div className="bg-rose-50 p-2 rounded mt-2 text-rose-800 text-xs font-bold">
                                    ※このリンクを知っている人は誰でもアカウントを作成できてしまうため、共有範囲には十分注意してください。
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Separator />

                {/* Section 4: Internal Operations Manual */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Info className="h-6 w-6 text-orange-600" />
                        社内運用マニュアル
                    </h2>
                    <p className="text-gray-700">
                        スタッフ向け指示書・運用ルール（自分用メモ）
                    </p>

                    <Card>
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
            </div>
        </div>
    )
}
